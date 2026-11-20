// Explicit opt-in: exercises the configured Atlas database using disposable
// accounts created only by this run. Never run against someone else's database.
import '../environment.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDatabase, databaseErrorMessage } from '../database.js';
import { User, userRepository } from '../models/User.js';

test('Atlas account lifecycle: registration, stored hash, duplicates, login, restored sessions, logout', { timeout: 60000 }, async (t) => {
  assert.ok(process.env.JWT_SECRET?.length >= 32, 'Configure JWT_SECRET before running the live account test.');
  try {
    await connectDatabase();
  } catch (error) {
    await mongoose.disconnect();
    assert.fail(databaseErrorMessage(error));
  }

  const runId = randomUUID();
  const email = `tabbook-auth-check-${runId}@example.invalid`;
  const raceEmail = `tabbook-auth-race-${runId}@example.invalid`;
  const password = randomBytes(24).toString('hex');
  const values = { name: 'Temporary authentication check', email, password };
  const makeApp = () => createApp({ users: userRepository, secret: process.env.JWT_SECRET,
    origin: process.env.APP_ORIGIN || 'http://127.0.0.1:5173',
    ready: () => mongoose.connection.readyState === 1,
  });
  const app = makeApp();
  const agent = request.agent(app);
  let sessionCookie;

  try {
    await t.test('registration writes a hashed password to the configured Users collection', async () => {
      const result = await agent.post('/api/auth/register').send(values).expect(201);
      assert.equal(result.body.user.email, email);
      assert.equal(result.body.user.password, undefined);
      assert.equal(result.body.token, undefined);
      assert.equal(User.collection.collectionName, 'Users');
      const saved = await User.findOne({ email }).select('+password');
      assert.ok(saved, 'The registered account must exist in Atlas.');
      assert.ok(saved.password !== password, 'Atlas must store a password hash.');
      assert.ok(await bcrypt.compare(password, saved.password));
      const session = result.headers['set-cookie'].find((value) => value.startsWith('tabbook_session='));
      assert.ok(session, 'A successful registration must set a session cookie.');
      assert.match(session, /HttpOnly/);
      sessionCookie = session.split(';')[0];
    });

    await t.test('registration signs in; the session restores on a fresh server instance', async () => {
      const current = await agent.get('/api/auth/me').expect(200);
      assert.equal(current.body.user.email, email);
      const restored = await request(makeApp()).get('/api/auth/me').set('Cookie', sessionCookie).expect(200);
      assert.equal(restored.body.user.email, email);
    });

    await t.test('normalized duplicate email and simultaneous duplicate registrations are rejected', async () => {
      await request(app).post('/api/auth/register').send({ ...values, email: ` ${email.toUpperCase()} ` }).expect(409);
      const results = await Promise.all([
        request(app).post('/api/auth/register').send({ ...values, email: raceEmail }),
        request(app).post('/api/auth/register').send({ ...values, email: raceEmail.toUpperCase() }),
      ]);
      assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
      assert.equal(await User.countDocuments({ email: raceEmail }), 1);
    });

    await t.test('logout clears the browser session and login reads the persisted account', async () => {
      await agent.post('/api/auth/logout').send({}).expect(200);
      await agent.get('/api/auth/me').expect(401);
      await agent.post('/api/auth/login').send({ email, password: 'incorrect-password' }).expect(401);
      const result = await agent.post('/api/auth/login').send({ email: email.toUpperCase(), password }).expect(200);
      assert.equal(result.body.user.email, email);
      await agent.get('/api/auth/me').expect(200);
      await agent.post('/api/auth/logout').send({}).expect(200);
      await agent.get('/api/auth/me').expect(401);
    });
  } finally {
    // Exact unique addresses generated above limit cleanup to this run's records.
    // Keep the connection alive until cleanup completes, even after a failed test.
    try {
      await User.deleteMany({ email: { $in: [email, raceEmail] } });
      assert.equal(await User.countDocuments({ email: { $in: [email, raceEmail] } }), 0);
    } finally {
      await mongoose.disconnect();
    }
  }
});
