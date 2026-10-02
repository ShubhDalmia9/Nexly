import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { get } from '../db/connection';
import { HttpError, unauthorized } from '../lib/errors';
import { createSession, findSession } from '../services/auth.service';

export interface AuthUser {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionToken?: string;
      sessionId?: number;
    }
  }
}

/** Resolves the session cookie, if any, into `req.user`. Never rejects on its own. */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[config.cookieName];
  if (typeof token === 'string' && token.length > 0) {
    const session = findSession(token);
    if (session) {
      req.user = { id: session.id, email: session.email };
      req.sessionToken = token;
      req.sessionId = session.sessionId;
    }
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw unauthorized();
  next();
}

/** Discovery and connecting are only available once a profile is complete enough to be shown to others. */
export function requireOnboarded(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw unauthorized();
  const row = get<{ onboarded: number }>('SELECT onboarded FROM profiles WHERE user_id = ?', req.user.id);
  if (!row || row.onboarded !== 1) {
    throw new HttpError(403, 'PROFILE_INCOMPLETE', 'Finish setting up your profile to continue.');
  }
  next();
}

/** The authenticated user's id. Only call from routes behind `requireAuth`. */
export function currentUserId(req: Request): number {
  if (!req.user) throw unauthorized();
  return req.user.id;
}

const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: config.cookieSecure, path: '/' };

export function startSession(req: Request, res: Response, userId: number): void {
  res.cookie(config.cookieName, createSession(userId, req.get('user-agent') ?? ''), {
    ...cookieOptions,
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.cookieName, cookieOptions);
}
