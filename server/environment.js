import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Always resolve the project's .env, even if Node is launched from another folder.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
