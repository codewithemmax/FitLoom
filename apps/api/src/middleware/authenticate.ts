import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { HttpError } from './error-handler.js';

type IdentityClient = Pick<SupabaseClient, 'auth'>;

const bearerToken = (request: Request): string => {
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token || token.includes(' ')) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return token;
};

export const createAuthenticate = (client: IdentityClient): RequestHandler =>
  async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    try {
      const token = bearerToken(request);
      const { data, error } = await client.auth.getUser(token);
      const user: User | null = data.user;

      if (error || !user) {
        throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.');
      }

      request.identity = { id: user.id, role: user.role };
      next();
    } catch (error: unknown) {
      next(error instanceof HttpError ? error : new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.'));
    }
  };
