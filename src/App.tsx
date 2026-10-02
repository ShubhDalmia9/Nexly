import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { PageLoader } from './components/ui/Feedback';
import { useAuth } from './context/AuthContext';
import { Connections } from './pages/Connections';
import { Dashboard } from './pages/Dashboard';
import { Inbox } from './pages/Inbox';
import { Discover } from './pages/Discover';
import { EditProfile } from './pages/EditProfile';
import { Landing } from './pages/Landing';
import { NotFound } from './pages/NotFound';
import { Notifications } from './pages/Notifications';
import { Onboarding } from './pages/Onboarding';
import { ProfilePage } from './pages/ProfilePage';
import { Search } from './pages/Search';
import { ServerNotice } from './pages/ServerNotice';
import { Settings } from './pages/Settings';
import { Login } from './pages/auth/Login';
import { ForgotPassword, ResetPassword } from './pages/auth/Password';
import { Signup } from './pages/auth/Signup';

interface LocationState {
  from?: string;
}

/** Pages for signed-out visitors. A signed-in user is sent on to where they were going. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (user) {
    const from = (location.state as LocationState | null)?.from;
    return <Navigate to={user.profile.onboarded ? (from ?? '/home') : '/onboarding'} replace />;
  }
  return children;
}

/** Requires a session. `onboarded` additionally requires (or forbids) a finished profile. */
function Protected({ children, onboarded }: { children: ReactNode; onboarded: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search } satisfies LocationState} />;
  if (onboarded && !user.profile.onboarded) return <Navigate to="/onboarding" replace />;
  // Finishing onboarding flips `onboarded`, and this guard is what carries the new member into Discover.
  if (!onboarded && user.profile.onboarded) return <Navigate to="/discover" replace />;
  return children;
}

export function App() {
  const { serverState } = useAuth();
  // A page and a server from different versions cannot work together; say so instead of half-working.
  if (serverState !== 'ok') return <ServerNotice kind={serverState} />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/inbox" element={<Inbox />} />

      <Route path="/onboarding" element={<Protected onboarded={false}><Onboarding /></Protected>} />

      <Route element={<Protected onboarded><AppShell /></Protected>}>
        <Route path="/home" element={<Dashboard />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/search" element={<Search />} />
        <Route path="/people/:id" element={<ProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
