import mongoose from 'mongoose';
import { User } from './models/User.js';
import { Book, Category, Tab } from './models/Library.js';

export const libraryModels = [User, Book, Category, Tab];

export function databaseOptions(env = process.env) {
  return {
    dbName: env.MONGODB_DB?.trim() || 'TabBook_DB',
    serverSelectionTimeoutMS: 5000,
    autoCreate: true,
    autoIndex: true,
  };
}

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw Object.assign(new Error('MONGODB_URI is missing.'), { code: 'DB_URI_MISSING' });
  }
  if (/<(?:db_password|password|db_username|username)>/i.test(process.env.MONGODB_URI)) {
    throw Object.assign(new Error('The connection string contains an unfinished credentials placeholder.'), { code: 'DB_URI_PLACEHOLDER' });
  }
  await mongoose.connect(process.env.MONGODB_URI, databaseOptions());
  // init() creates missing collections and declared indexes. It does not seed
  // records or drop existing data/indexes, unlike a destructive reset or sync.
  await Promise.all(libraryModels.map((model) => model.init()));
  return {
    database: mongoose.connection.name,
    collections: libraryModels.map((model) => model.collection.collectionName),
  };
}

export function databaseErrorMessage(error) {
  if (error.code === 'DB_URI_MISSING') return 'Add MONGODB_URI to the root .env file, then rerun npm run db:setup.';
  if (error.code === 'DB_URI_PLACEHOLDER') {
    return 'Replace the username/password placeholder in MONGODB_URI in your local .env with your Atlas database user credentials, URL-encoding special characters. Keep credentials private, then rerun npm run db:setup.';
  }
  if (error.code === 18 || error.codeName === 'AuthenticationFailed' ||
      (error.code === 8000 && /bad auth|authentication/i.test(error.message || ''))) {
    return 'Database sign-in failed. Check the database username and password in MONGODB_URI.';
  }
  if (error.code === 13 || error.codeName === 'Unauthorized') {
    return 'The database user needs read/write access to the configured database, including collection and index creation.';
  }
  if (error.code === 11000) {
    return 'An index could not be created because existing data contains duplicate values. Existing records were kept.';
  }
  return 'Database setup could not finish. Check MONGODB_URI, Atlas Network Access for this computer, and the cluster status. Connection details have not been printed.';
}
