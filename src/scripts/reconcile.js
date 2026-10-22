// Usage:  node src/scripts/reconcile.js          (report only)
//         node src/scripts/reconcile.js --fix    (repair)
const env = require('../config/env');
const { connectDb, disconnectDb } = require('../config/db');
const { findDrift, fixDrift } = require('../services/reconcile.service');

(async () => {
  await connectDb(env.MONGODB_URI);
  const drift = process.argv.includes('--fix') ? await fixDrift() : await findDrift();
  console.log(drift.length ? JSON.stringify(drift, null, 2) : 'No inventory drift found.');
  await disconnectDb();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
