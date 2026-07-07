import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
    log: Logger;
  }
}

export const requestContext = (baseLogger: Logger): RequestHandler => {
  return (req, res, next) => {
    const headerId = req.headers['x-request-id'];
    const reqId =
      typeof headerId === 'string' && headerId.length > 0
        ? headerId
        : randomUUID();
    req.id = reqId;
    req.log = baseLogger.child({ reqId });
    res.setHeader('x-request-id', reqId);
    next();
  };
};
