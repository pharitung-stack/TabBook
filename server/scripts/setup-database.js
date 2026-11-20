import '../environment.js';
import mongoose from 'mongoose';
import { connectDatabase, databaseErrorMessage } from '../database.js';

try {
  const result = await connectDatabase();
  console.info(`Database ready: ${result.database}`);
  console.info(`Collections and indexes ready: ${result.collections.join(', ')}`);
  console.info('No sample accounts, books, sections, or tabs were inserted. Existing data was kept.');
} catch (error) {
  console.error(databaseErrorMessage(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
