const env = require('./config/env');
const logger = require('./lib/logger');
const { connectDb, disconnectDb } = require('./config/db');
const createApp = require('./app');

async function main() {
  await connectDb(env.MONGODB_URI);
  const server = createApp().listen(env.PORT, () =>
    logger.info('server listening', { port: env.PORT, env: env.NODE_ENV }),
  );

  let shuttingDown = false;
  async function shutdown(reason, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutting down', { reason });
    // Safety net: never hang forever waiting for connections to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
    server.close(async () => {          // stop accepting; wait for in-flight requests
      await disconnectDb().catch(() => {});
      process.exit(exitCode);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  // After these events the process state is unknown: log, then exit and let a supervisor restart us.
  process.on('unhandledRejection', (err) => {
    logger.error('unhandledRejection', { err: String(err), stack: err?.stack });
    shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (err) => {
    logger.error('uncaughtException', { err: err.message, stack: err.stack });
    shutdown('uncaughtException', 1);
  });
}

main().catch((err) => {
  logger.error('startup failed', { err: err.message });
  process.exit(1);
});
