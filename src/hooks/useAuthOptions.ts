import { useEffect, useState } from 'react';
import type { AuthOptions } from '../../shared/types';
import { api } from '../api';

let cached: Promise<AuthOptions> | null = null;

/** How this server is set up for sign-in and email. Fetched once; null until it arrives. */
export function useAuthOptions(): AuthOptions | null {
  const [options, setOptions] = useState<AuthOptions | null>(null);
  useEffect(() => {
    let active = true;
    cached ??= api.auth.options().catch((error) => {
      cached = null;
      throw error;
    });
    cached.then(
      (value) => active && setOptions(value),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);
  return options;
}
