import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AppError } from '../errors/app-error.js';
import type { SupabaseAuthService } from '../services/supabase-auth-service.js';

const readBearerToken = (request: Request): string => {
  const authorization = request.header('authorization');

  if (authorization === undefined || !authorization.startsWith('Bearer ')) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (token.length === 0 || token.includes(' ')) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  return token;
};

export const createAuthenticateMiddleware = (authService: SupabaseAuthService): RequestHandler =>
  async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    try {
      const token = readBearerToken(request);
      const verifiedUser = await authService.getVerifiedUser(token);

      if (verifiedUser === null) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
      }

      request.auth = { userId: verifiedUser.id };
      next();
    } catch (error: unknown) {
      next(error instanceof AppError ? error : new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'));
    }
  };
