import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

export function ensureJwtSecret(envPath) {
  const contents = readFileSync(envPath, 'utf8');
  const existing = dotenv.parse(contents).JWT_SECRET;
  if (existing) {
    if (existing.length < 32) throw new Error('JWT_SECRET is already set but is too short. It was left unchanged.');
    return false;
  }
  const line = `JWT_SECRET=${randomBytes(48).toString('hex')}`;
  const declaration = /^(?:export\s+)?JWT_SECRET\s*=.*$/gm;
  const updated = declaration.test(contents)
    ? contents.replace(declaration, line)
    : `${contents}${contents.endsWith('\n') ? '' : '\n'}${line}\n`;
  writeFileSync(envPath, updated, { mode: 0o600 });
  return true;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const created = ensureJwtSecret(fileURLToPath(new URL('../../.env', import.meta.url)));
    console.info(created
      ? 'Created a private server signing secret in .env. Its value has not been printed.'
      : 'JWT_SECRET is already configured and was kept unchanged.');
  } catch (error) {
    console.error(error.code === 'ENOENT'
      ? 'Create the root .env file first by copying .env.example.'
      : 'JWT_SECRET could not be configured. Check the existing value and file permissions; no existing secret was replaced.');
    process.exitCode = 1;
  }
}
