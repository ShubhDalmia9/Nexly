import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const POINTS = [
  'Concise profile cards instead of long profile pages',
  'Ranked by shared skills, interests, projects and goals',
  'Press Connect to send a request, and they are notified at once',
];

/** The shared frame for sign-in, sign-up and password pages. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth">
      <main className="auth__main">
        <Link to="/" className="auth__logo" aria-label="Nexly home">
          <Logo />
        </Link>
        <div className="auth__card page-enter">
          <h1>{title}</h1>
          <p className="auth__subtitle">{subtitle}</p>
          {children}
        </div>
        {footer && <p className="auth__footer">{footer}</p>}
      </main>
      <aside className="auth__aside" aria-label="About Nexly">
        <div className="auth__aside-inner">
          <Logo inverted />
          <h2>Relevant people first.</h2>
          <ul>
            {POINTS.map((point) => (
              <li key={point}>
                <span>
                  <Check aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
