import type { Request } from 'express';

export type AuthTokenPayload = {
  sub: string;
  username: string;
  role?: string | null;
  nombre?: string | null;
  tokenType?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
};

export type AuthenticatedRequest = Request & {
  user?: AuthTokenPayload;
};
