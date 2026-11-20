import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { connectDatabase, databaseErrorMessage, databaseOptions, libraryModels } from '../database.js';
import { ensureJwtSecret } from '../scripts/create-jwt-secret.js';

test('database selection defaults to TabBook_DB and supports an explicit environment override', () => {
  assert.equal(databaseOptions({}).dbName, 'TabBook_DB');
  assert.equal(databaseOptions({ MONGODB_DB: '   ' }).dbName, 'TabBook_DB');
  assert.equal(databaseOptions({ MONGODB_DB: ' tabbook_test ' }).dbName, 'tabbook_test');
  assert.equal(databaseOptions({}).autoCreate, true);
  assert.equal(databaseOptions({}).autoIndex, true);
  assert.deepEqual(libraryModels.map((model) => model.collection.collectionName), ['Users', 'Books', 'Categories', 'Tabs']);
});

test('secret generation preserves other settings, survives reruns, and supports a missing declaration', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tabbook-secret-test-'));
  const envPath = join(directory, '.env');
  try {
    for (const declaration of ['', 'JWT_SECRET=\n', 'export JWT_SECRET=""\n']) {
      writeFileSync(envPath, `# Private configuration\nMONGODB_URI=mongodb://example/test\n${declaration}`);
      assert.equal(ensureJwtSecret(envPath), true);
      const saved = readFileSync(envPath, 'utf8');
      assert.match(dotenv.parse(saved).JWT_SECRET, /^[a-f0-9]{96}$/);
      assert.equal(dotenv.parse(saved).MONGODB_URI, 'mongodb://example/test');
      assert.ok(saved.startsWith('# Private configuration\n'));
      assert.equal(ensureJwtSecret(envPath), false);
      assert.equal(readFileSync(envPath, 'utf8'), saved);
    }
    writeFileSync(envPath, 'JWT_SECRET=short-but-user-supplied\n');
    assert.throws(() => ensureJwtSecret(envPath), /left unchanged/);
    assert.equal(readFileSync(envPath, 'utf8'), 'JWT_SECRET=short-but-user-supplied\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('unfinished Atlas credentials are rejected before connecting and errors keep secrets private', async () => {
  const previous = process.env.MONGODB_URI;
  try {
    process.env.MONGODB_URI = 'mongodb+srv://test-user:<db_password>@example.invalid/';
    await assert.rejects(connectDatabase(), { code: 'DB_URI_PLACEHOLDER' });
    const message = databaseErrorMessage({ code: 'DB_URI_PLACEHOLDER' });
    assert.match(message, /placeholder/);
    assert.doesNotMatch(message, /test-user|example.invalid/);
    delete process.env.MONGODB_URI;
    await assert.rejects(connectDatabase(), { code: 'DB_URI_MISSING' });
  } finally {
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  }
});
