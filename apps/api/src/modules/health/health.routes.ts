import { Router } from 'express';
import { isDbConnected } from '../../lib/db.js';

const bootTime = Date.now();

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptimeSec: Math.floor((Date.now() - bootTime) / 1000),
    db: isDbConnected(),
  });
});
