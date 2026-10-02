import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_VERSION } from '../../shared/constants';
import type { SessionUser } from '../../shared/types';
import { api } from '../api';
import { ApiError, SESSION_EXPIRED_EVENT } from '../api/client';
import { invalidateMeta } from '../hooks/useMeta';

/**
 * Whether this page and the server answering it belong together:
 *  - 'restart': the server is an older copy than this page (or its code changed since it started);
 *  - 'reload':  the server is newer than this page.
 */
export type ServerState = 'ok' | 'restart' | 'reload';

/** A sign-in answer without an account in it means the server speaks an older version of the API. */
function signedIn(response: { user?: SessionUser | null }): SessionUser {
  if (!response?.user) throw new ApiError(0, 'UNEXPECTED_RESPONSE', 'Nexly could not complete that. Reload the page and try again.');
  return response.user;
}

interface AuthContextValue {
  user: SessionUser | null;
  serverState: ServerState;
  /** True while the initial session check is in flight. */
  loading: boolean;
  setUser: (user: SessionUser) => void;
  logIn: (email: string, password: string) => Promise<SessionUser>;
  /** Creates an account and signs it in. */
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<SessionUser>;
  logOut: () => Promise<void>;
  /** Forgets the session locally, after the account was deleted or signed out elsewhere. */
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverState, setServerState] = useState<ServerState>('ok');

  useEffect(() => {
    let active = true;
    api.auth
      .me()
      .then((session) => {
        if (!active) return;
        if (typeof session.api !== 'number' || session.api < API_VERSION || session.restartNeeded) setServerState('restart');
        else if (session.api > API_VERSION) setServerState('reload');
        setUserState(session.user);
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => setUserState(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const setUser = useCallback((next: SessionUser) => {
    invalidateMeta();
    setUserState(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      serverState,
      loading,
      setUser,
      logIn: async (email, password) => {
        const next = signedIn(await api.auth.logIn({ email, password }));
        setUserState(next);
        return next;
      },
      signUp: async (input) => {
        const next = signedIn(await api.auth.signUp(input));
        setUserState(next);
        return next;
      },
      logOut: async () => {
        await api.auth.logOut().catch(() => undefined);
        setUserState(null);
      },
      clearUser: () => setUserState(null),
    }),
    [user, serverState, loading, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

/** For pages that only render for signed-in users (everything inside the app shell). */
export function useCurrentUser(): SessionUser {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser requires a signed-in user.');
  return user;
}
