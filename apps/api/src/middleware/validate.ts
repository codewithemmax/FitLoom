import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { HttpError } from './error-handler.js';

export const validateBody = <T>(schema: ZodType<T>): RequestHandler =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(new HttpError(400, 'INVALID_REQUEST', 'The request data is invalid.'));
      return;
    }

    request.body = result.data;
    next();
  };
