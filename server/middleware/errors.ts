import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorBody } from '../../shared/types';
import { HttpError } from '../lib/errors';

export function apiNotFound(_req: Request, res: Response): void {
  const body: ApiErrorBody = { error: { code: 'NOT_FOUND', message: 'That endpoint does not exist.' } };
  res.status(404).json(body);
}

// Express recognises error handlers by their four-argument signature.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let body: ApiErrorBody = { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' } };

  if (error instanceof HttpError) {
    status = error.status;
    body = { error: { code: error.code, message: error.message, fields: error.fields } };
  } else if (isBodyParserError(error)) {
    status = error.status;
    body = {
      error: {
        code: error.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
        message: error.status === 413 ? 'That file is too large to upload.' : 'The request could not be read.',
      },
    };
  } else {
    console.error('[nexly] Unhandled error:', error);
  }

  res.status(status).json(body);
}

function isBodyParserError(error: unknown): error is { status: number; type: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number' &&
    (error as { status: number }).status >= 400 &&
    (error as { status: number }).status < 500
  );
}
