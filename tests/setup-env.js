// Runs before every test file. Sets a safe, isolated configuration.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.API_KEY = 'test-api-key-0123456789';

if (process.env.MONGODB_URI_TEST) {
  // A real MongoDB server: use it exactly as production would (default pool size).
  process.env.MONGODB_URI = process.env.MONGODB_URI_TEST;
} else {
  // Fallback used while authoring this volume: FerretDB (MongoDB-compatible, SQLite backend).
  // Measured: it LOSES concurrent updates to one document (50 parallel $inc +1 ended at 2..12).
  // Real MongoDB guarantees single-document atomicity. A pool of ONE connection serialises each
  // individual operation (restoring that guarantee) while still letting different requests
  // interleave BETWEEN their awaits - which is exactly the race we want the tests to expose.
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/library_test';
  process.env.MONGODB_MAX_POOL_SIZE = '1';
}
