import type { RequestHandler } from 'express';

import { createSuccess } from '../contracts/api.js';

export const getHealth: RequestHandler = (_request, response): void => {
  response.status(200).json(createSuccess({ status: 'ok' }));
};
