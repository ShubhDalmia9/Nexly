import { useEffect, useState } from 'react';
import type { Meta } from '../../shared/types';
import { api } from '../api';

const EMPTY: Meta = { skills: [], interests: [], goals: [], professions: [], workplaces: [], specialisations: [] };

let cached: Promise<Meta> | null = null;

/** Tag vocabularies and filter options. Fetched once and shared by every form and filter. */
export function useMeta(): Meta {
  const [meta, setMeta] = useState<Meta>(EMPTY);
  useEffect(() => {
    let active = true;
    cached ??= api.profile.meta().catch((error) => {
      cached = null;
      throw error;
    });
    cached.then(
      (value) => active && setMeta(value),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);
  return meta;
}

export function invalidateMeta(): void {
  cached = null;
}
