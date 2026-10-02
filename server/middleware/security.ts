import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { HttpError, forbidden } from '../lib/errors';

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (config.isProduction) {
    // The dev server injects inline scripts for hot reloading, so the policy applies to production builds only.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
  }
  next();
}

/**
 * CSRF defence in depth for the cookie session. A state-changing API call must come from this
 * site when the browser sends an Origin header, and must not use one of the three content types
 * an HTML form can send cross-site without a preflight. (JSON, image and file uploads all need a
 * preflight, which a foreign site cannot pass. The session cookie is also SameSite=Lax.)
 */
export function sameOriginOnly(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin) {
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      // An unparseable Origin header is treated as cross-site.
    }
    if (originHost !== req.get('host')) throw forbidden('Cross-site requests are not allowed.');
  }
  const hasBody = Number(req.get('content-length') ?? 0) > 0;
  const formLike = !req.get('content-type') || Boolean(req.is(['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain']));
  if (hasBody && formLike) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'That content type is not accepted.');
  next();
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** A small in-memory limiter for sign-in style endpoints. */
export function rateLimit(options: { windowMs: number; max: number; key?: (req: Request) => string }) {
  const buckets = new Map<string, Bucket>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (buckets.size > 5000) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    }
    const key = `${req.ip}|${options.key?.(req) ?? ''}`;
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a few minutes and try again.');
    }
    next();
  };
}
