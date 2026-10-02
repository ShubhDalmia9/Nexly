import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const POLL_INTERVAL_MS = 12_000;

interface Summary {
  unread: number;
  pendingRequests: number;
}

interface NotificationsContextValue extends Summary {
  /** Bumps whenever the counts change, so open lists know to refetch. */
  version: number;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const EMPTY: Summary = { unread: 0, pendingRequests: 0 };

/**
 * Keeps the notification and request badges current. The counts are polled
 * while the tab is visible and refreshed immediately when the user returns to
 * it, which is enough for a request sent in one browser to appear in another
 * within seconds.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [version, setVersion] = useState(0);
  const latest = useRef<Summary>(EMPTY);
  const userId = user?.id ?? null;

  const apply = useCallback((next: Summary) => {
    if (latest.current.unread === next.unread && latest.current.pendingRequests === next.pendingRequests) return;
    latest.current = next;
    setSummary(next);
    setVersion((current) => current + 1);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await api.notifications.summary());
    } catch {
      // A failed poll is not worth interrupting the user for; the next one will retry.
    }
  }, [apply]);

  useEffect(() => {
    if (userId === null) {
      apply(EMPTY);
      return;
    }
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = window.setInterval(onVisible, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [userId, refresh, apply]);

  const value = useMemo(() => ({ ...summary, version, refresh }), [summary, version, refresh]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used inside <NotificationsProvider>.');
  return context;
}
