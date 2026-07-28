import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../errors/app-error.js';

export const validateBody = <T>(schema: ZodType<T>): RequestHandler =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(new AppError(400, 'INVALID_REQUEST', 'The request data is invalid.'));
      return;
    }

    request.body = result.data;
    next();
  };

export const validateQuery = <T>(schema: ZodType<T>): RequestHandler =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      next(new AppError(400, 'INVALID_REQUEST', 'The request data is invalid.'));
      return;
    }

    request.query = result.data as Request['query'];
    next();
  };

export const validateVendorResponse = <T>(schema: ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }

  return result.data;
};
