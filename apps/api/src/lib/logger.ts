import pino, { type Logger } from 'pino';

export const createLogger = (level: string): Logger =>
  pino({
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        '*.password',
        'token',
        '*.token',
      ],
      censor: '[REDACTED]',
    },
  });
