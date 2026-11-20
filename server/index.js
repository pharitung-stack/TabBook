import './environment.js';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { userRepository } from './models/User.js';
import { connectDatabase, databaseErrorMessage } from './database.js';

const production = process.env.NODE_ENV === 'production';
const secret = process.env.JWT_SECRET;
const uri = process.env.MONGODB_URI;
const validSecret = typeof secret === 'string' && secret.length >= 32;
if (!validSecret || !uri) {
  console.info('Account setup pending: copy .env.example to .env and add MONGODB_URI and a random JWT_SECRET of at least 32 characters. The login page can still be previewed.');
  if (production) process.exit(1);
}
let indexesReady = false;
if (uri && validSecret) {
  try {
    await connectDatabase();
    indexesReady = true;
    console.info('TabBook database connected.');
  } catch (error) {
    console.error(databaseErrorMessage(error));
    if (production) process.exit(1);
  }
}
const app = createApp({ users: userRepository, secret: validSecret ? secret : null,
  origin: process.env.APP_ORIGIN || 'http://127.0.0.1:5173', production,
  ready: () => validSecret && indexesReady && mongoose.connection.readyState === 1,
});
const server = app.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.info(`TabBook API: http://127.0.0.1:${process.env.PORT || 3001}`));
async function shutdown() { server.close(); await mongoose.disconnect(); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
