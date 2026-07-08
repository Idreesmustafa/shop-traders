import { loadConfig } from '../lib/config.js';
import { connectDb, disconnectDb, syncAllIndexes } from '../lib/db.js';
import { createLogger } from '../lib/logger.js';
import { ALL_MODELS } from '../models/registry.js';

const main = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger(config.LOG_LEVEL);

  logger.info('connecting to database...');
  await connectDb(config.MONGODB_URI);

  logger.info(`syncing indexes for ${ALL_MODELS.length} models...`);
  const results = await syncAllIndexes(ALL_MODELS);

  for (const r of results) {
    logger.info(
      { model: r.modelName, dropped: r.droppedIndexes },
      `synced ${r.modelName}`,
    );
  }

  await disconnectDb();
  logger.info('done');
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
