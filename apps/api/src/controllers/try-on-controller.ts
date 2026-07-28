import type { RequestHandler } from 'express';

import { createSuccess } from '../contracts/api.js';

export const createGenerateTryOnPlaceholder: RequestHandler = (_request, response): void => {
  response.status(202).json(
    createSuccess({
      status: 'accepted',
      message: 'Try-on generation orchestration will be implemented in the next unit.',
    }),
  );
};
