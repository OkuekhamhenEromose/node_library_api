// const mongoose = require('mongoose');
// const logger = require('../lib/logger');
// const env = require('./env');

// async function connectDb(uri) {
//   mongoose.connection.on('disconnected', () => logger.warn('mongodb disconnected'));
//   mongoose.connection.on('reconnected', () => logger.info('mongodb reconnected'));
//   mongoose.connection.on('error', (err) => logger.error('mongodb error', { err: err.message }));
//   await mongoose.connect(uri, {
//     serverSelectionTimeoutMS: 5000,
//     maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
//   });
//   logger.info('mongodb connected');
// }

// async function disconnectDb() {
//   await mongoose.disconnect();
// }

// module.exports = { connectDb, disconnectDb };








































const mongoose = require('mongoose')
const logger = require('../lib/logger')

async function connectDb(uri) {
  mongoose.connection.on('disconnected', ()=> logger.warn('mongoose disconnected'))
  mongoose.connection.on('reconnected', ()=> logger.info('mongoose reconnected'))
  mongoose.connection.on('error', (err)=> logger.error('error', {err: err.message}))
  await mongoose.connect(uri, {serverSelectionTimeoutMS: 5000})
  logger.info('connected')
}
async function disconnectDb {
  mongoose.disconnect('disconnected')
}
module.exports = {connectDb, disconnectDb}
