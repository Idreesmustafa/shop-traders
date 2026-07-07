import cors from 'cors';
import express, { type RequestHandler } from 'express';
import helmet from 'helmet';

export const securityMiddleware = (
  allowedOrigins: string[],
): RequestHandler[] => {
  const corsOptions =
    allowedOrigins.length === 0
      ? { origin: false as const }
      : { origin: allowedOrigins, credentials: true };
  return [helmet(), cors(corsOptions), express.json({ limit: '1mb' })];
};
