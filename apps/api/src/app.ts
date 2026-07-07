import express, { type Express } from 'express';
import type { Config } from './lib/config.js';
import { createLogger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { requestContext } from './middleware/requestContext.js';
import { securityMiddleware } from './middleware/security.js';
import { healthRouter } from './modules/health/health.routes.js';

export const createApp = (config: Config): Express => {
  const app = express();
  const logger = createLogger(config.LOG_LEVEL);

  app.disable('x-powered-by');
  app.use(requestContext(logger));
  for (const mw of securityMiddleware(config.corsOrigins)) {
    app.use(mw);
  }

  app.use(healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
