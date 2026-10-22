const mongoose = require('mongoose');
const { connectDb, disconnectDb } = require('../../src/config/db');
const env = require('../../src/config/env');

async function startDb(models = []) {
  await connectDb(env.MONGODB_URI);
  for (const m of models) await m.init(); // make sure indexes (esp. unique ones) really exist
}
async function clearDb(models = []) {
  for (const m of models) await m.deleteMany({});
}
async function stopDb() {
  await disconnectDb();
}
module.exports = { startDb, clearDb, stopDb, mongoose };
