import type { ApiErrorBody } from '../../shared/types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Fired when the server says the session is no longer valid, so the app can return to the sign-in page. */
export const SESSION_EXPIRED_EVENT = 'nexly:session-expired';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach Nexly. Check your connection and try again.');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (response.ok) return payload as T;

  const error = (payload as ApiErrorBody | null)?.error;
  if (response.status === 401 && !path.startsWith('/auth/')) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  throw new ApiError(
    response.status,
    error?.code ?? 'UNKNOWN_ERROR',
    error?.message ?? 'Something went wrong. Please try again.',
    error?.fields,
  );
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * Sends a file as the request body and reports upload progress (0 to 1). `fetch` cannot report
 * progress, so this one call uses XMLHttpRequest.
 */
export function upload<T>(method: 'PUT' | 'POST', path: string, body: Blob, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `/api${path}`);
    xhr.setRequestHeader('Content-Type', body.type || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'The upload was interrupted. Check your connection and try again.'));
    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        // A non-JSON reply is handled below as a generic failure.
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T);
        return;
      }
      const error = (payload as ApiErrorBody | null)?.error;
      if (xhr.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      reject(new ApiError(xhr.status, error?.code ?? 'UPLOAD_FAILED', error?.message ?? 'The upload failed. Please try again.', error?.fields));
    };
    xhr.send(body);
  });
}
