import type { RequestHandler } from 'express';

import { createFailure, createSuccess } from '../contracts/api.js';

export const getCurrentUser: RequestHandler = (request, response): void => {
  const userId = request.auth?.userId;

  if (userId === undefined) {
    response.status(500).json(createFailure('INTERNAL_ERROR', 'An unexpected error occurred.'));
    return;
  }

  response.status(200).json(createSuccess({ userId }));
};
