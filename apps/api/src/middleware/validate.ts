import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';

export const validateBody = <S extends ZodTypeAny>(
  schema: S,
): RequestHandler<unknown, unknown, z.infer<S>> => {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    req.body = parsed.data;
    next();
  };
};
