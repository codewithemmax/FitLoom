import type { ErrorRequestHandler, RequestHandler } from 'express';

import type { ApiFailure } from '../contracts/api.js';

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  public constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  const body: ApiFailure = {
    data: null,
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
  };
  response.status(404).json(body);
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    const body: ApiFailure = {
      data: null,
      error: { code: error.code, message: error.message },
    };
    response.status(error.statusCode).json(body);
    return;
  }

  response.status(500).json({
    data: null,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' },
  } satisfies ApiFailure);
};
