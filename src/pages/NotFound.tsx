import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonClass } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export function NotFound() {
  usePageTitle('Page not found');
  const { user } = useAuth();
  return (
    <main className="not-found">
      <Link to="/" aria-label="Nexly home">
        <Logo />
      </Link>
      <div className="card">
        <EmptyState icon={Compass} title="This page does not exist" text="The link may be old or mistyped. Let’s get you back to somewhere useful.">
          <Link to={user ? '/home' : '/'} className={buttonClass({ variant: 'primary' })}>
            {user ? 'Go to your dashboard' : 'Go to the homepage'}
          </Link>
        </EmptyState>
      </div>
    </main>
  );
}
