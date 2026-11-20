import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../app.js';
import { Book, Category, Tab } from '../models/Library.js';
import { User } from '../models/User.js';

const secret = 'test-only-secret-which-is-over-thirty-two-characters';
const origin = 'http://127.0.0.1:5173';
// An isolated repository exercises HTTP/session behavior without a live Atlas account.
// These tests do not claim to verify a remote MongoDB connection.
function fixture(options = {}) {
  const rows = [];
  const users = {
    findByEmail: async (email) => rows.find((row) => row.email === email),
    findById: async (id) => rows.find((row) => row._id === id),
    create: async (values) => {
      const row = { ...values, _id: String(rows.length + 1), password: await bcrypt.hash(values.password, 4) };
      rows.push(row); return row;
    },
  };
  return { rows, app: createApp({ users, secret, origin, ...options }) };
}
const values = { name: 'Curious Learner', email: 'learner@example.com', password: 'a-strong-password' };

test('registration normalizes email, returns safe user data, and restores a cookie session', async () => {
  const { app, rows } = fixture();
  const agent = request.agent(app);
  const result = await agent.post('/api/auth/register').set('Origin', origin).send({ ...values, email: ' Learner@Example.com ' }).expect(201);
  assert.equal(result.body.user.email, values.email);
  assert.equal(result.body.user.name, values.name);
  assert.equal(result.body.user.password, undefined);
  assert.equal(result.body.token, undefined);
  assert.notEqual(rows[0].password, values.password);
  assert.match(result.headers['set-cookie'][0], /HttpOnly/);
  assert.match(result.headers['set-cookie'][0], /SameSite=Strict/);
  const me = await agent.get('/api/auth/me').expect(200);
  assert.equal(me.body.user.id, result.body.user.id);
  await agent.post('/api/auth/logout').send({}).expect(200);
  await agent.get('/api/auth/me').expect(401);
});
test('duplicate accounts are rejected, including case variations', async () => {
  const { app } = fixture();
  await request(app).post('/api/auth/register').send(values).expect(201);
  await request(app).post('/api/auth/register').send({ ...values, email: values.email.toUpperCase() }).expect(409);
});
test('login accepts the correct password and rejects wrong or unknown credentials', async () => {
  const { app } = fixture();
  await request(app).post('/api/auth/register').send(values).expect(201);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: values.email.toUpperCase(), password: values.password }).expect(200);
  await agent.get('/api/auth/me').expect(200);
  const wrong = await request(app).post('/api/auth/login').send({ email: values.email, password: 'incorrect' }).expect(401);
  const missing = await request(app).post('/api/auth/login').send({ email: 'missing@example.com', password: 'incorrect' }).expect(401);
  assert.equal(wrong.body.error, missing.body.error);
});
test('invalid inputs, operator injection, and bcrypt truncation are rejected', async () => {
  const { app } = fixture();
  for (const change of [{ name: '' }, { name: 'x'.repeat(81) }, { email: 'bad' }, { email: { $ne: null } }, { password: 'short' }, { password: '🪴'.repeat(30) }]) {
    await request(app).post('/api/auth/register').send({ ...values, ...change }).expect(400);
  }
  await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: 'x' }).expect(400);
});
test('cross-origin mutations and non-JSON requests are rejected', async () => {
  const { app } = fixture();
  await request(app).post('/api/auth/register').set('Origin', 'https://other.example').send(values).expect(403);
  await request(app).post('/api/auth/logout').type('form').send('test=x').expect(415);
  await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{broken').expect(400);
});
test('invalid, expired, and removed-user sessions cannot access the account', async () => {
  const { app } = fixture();
  await request(app).get('/api/auth/me').expect(401);
  await request(app).get('/api/auth/me').set('Cookie', 'tabbook_session=invalid').expect(401);
  const expired = jwt.sign({}, secret, { subject: '1', issuer: 'tabbook', audience: 'tabbook-web', expiresIn: -1 });
  await request(app).get('/api/auth/me').set('Cookie', `tabbook_session=${expired}`).expect(401);
  const removed = jwt.sign({}, secret, { subject: 'gone', issuer: 'tabbook', audience: 'tabbook-web', expiresIn: 60 });
  await request(app).get('/api/auth/me').set('Cookie', `tabbook_session=${removed}`).expect(401);
});
test('account endpoints explain missing database setup and logout still works', async () => {
  const { app } = fixture({ ready: () => false });
  await request(app).get('/api/health').expect(503);
  await request(app).post('/api/auth/register').send(values).expect(503);
  await request(app).post('/api/auth/logout').send({}).expect(200);
});
test('database failures return a generic error without exposing connection details', async () => {
  const app = createApp({ secret, users: { findByEmail: async () => { throw new Error('mongodb://secret:credentials@private-host'); } } });
  const result = await request(app).post('/api/auth/login').send(values).expect(500);
  assert.doesNotMatch(JSON.stringify(result.body), /credentials|private-host|mongodb/);
});
test('repeated authentication attempts are limited', async () => {
  const { app } = fixture();
  for (let i = 0; i < 30; i++) await request(app).post('/api/auth/login').send({}).expect(400);
  await request(app).post('/api/auth/login').send({}).expect(429);
});
test('production cookies use HTTPS-only protection', async () => {
  const { app } = fixture({ production: true });
  const result = await request(app).post('/api/auth/register').send(values).expect(201);
  assert.match(result.headers['set-cookie'][0], /; Secure/);
});
test('models require owners and user-entered names; tabs only allow web URLs', async () => {
  await assert.rejects(new Book({ name: 'My own title' }).validate(), /owner/);
  await assert.rejects(new Category({}).validate(), /name/);
  await assert.rejects(new User({ name: '', email: 'a@example.com', password: 'hash' }).validate(), /name/);
  const owner = '507f1f77bcf86cd799439011';
  await new Book({ owner, name: 'Astronomy and tea' }).validate();
  await new Category({ owner, book: owner, name: 'My own section' }).validate();
  await assert.rejects(new Tab({ owner, category: owner, title: 'Unsafe', url: 'javascript:alert(1)' }).validate(), /http/);
  await new Tab({ owner, category: owner, title: 'A resource', url: 'https://example.com' }).validate();
});
