import { createApp } from './app.js';
import { loadConfig } from './lib/config.js';
import { connectDb, disconnectDb, syncAllIndexes } from './lib/db.js';
import { createLogger } from './lib/logger.js';
import { ALL_MODELS } from './models/registry.js';

const main = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger(config.LOG_LEVEL);
  const app = createApp(config);

  connectDb(config.MONGODB_URI)
    .then(async () => {
      if (config.SYNC_INDEXES) {
        const results = await syncAllIndexes(ALL_MODELS);
        logger.info({ results }, 'indexes synchronised');
      }
    })
    .catch((err: unknown) => {
      logger.error({ err }, 'initial DB connection failed');
    });

  const server = app.listen(config.PORT, () => {
    logger.info(`API listening on :${config.PORT} (${config.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutdown requested');
    server.close(() => {
      disconnectDb()
        .catch((err: unknown) => logger.error({ err }, 'disconnect failed'))
        .finally(() => process.exit(0));
    });
    setTimeout(() => {
      logger.warn('forced shutdown after 10s');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
