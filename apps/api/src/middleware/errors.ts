import type { ErrorRequestHandler, RequestHandler } from 'express';

import { createFailure } from '../contracts/api.js';
import { AppError } from '../errors/app-error.js';

export const notFoundHandler: RequestHandler = (_request, response): void => {
  response.status(404).json(createFailure('NOT_FOUND', 'Route not found.'));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json(createFailure(error.code, error.message));
    return;
  }

  response.status(500).json(createFailure('INTERNAL_ERROR', 'An unexpected error occurred.'));
};
