export type ErrorDetails = Record<string, unknown>;

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
  };
};

export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details: ErrorDetails | undefined;

  constructor(
    code: string,
    httpStatus: number,
    message: string,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }

  toEnvelope(): ErrorEnvelope {
    const envelope: ErrorEnvelope = {
      error: {
        code: this.code,
        message: this.message,
      },
    };
    if (this.details !== undefined) {
      envelope.error.details = this.details;
    }
    return envelope;
  }
}

export const ErrorCode = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL: 'INTERNAL',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
