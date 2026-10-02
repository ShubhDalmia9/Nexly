import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { buttonClass } from '../ui/Button';
import { Logo } from '../ui/Logo';

export function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="public-header">
      <div className="container public-header__inner">
        <Link to="/" aria-label="Nexly home">
          <Logo />
        </Link>
        <nav className="public-header__nav" aria-label="Main">
          <div className="public-header__links">
            <a href="/#how-it-works" className="nav-link">
              How it works
            </a>
            <a href="/#features" className="nav-link">
              Features
            </a>
          </div>
          {user ? (
            <Link to={user.profile.onboarded ? '/home' : '/onboarding'} className={buttonClass({ variant: 'dark' })}>
              Open Nexly
            </Link>
          ) : (
            <>
              <Link to="/login" className={buttonClass({ variant: 'ghost' })}>
                Log in
              </Link>
              <Link to="/signup" className={buttonClass({ variant: 'dark' })}>
                Create profile
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo />
          <p>Discover relevant professional connections faster, through concise profile cards ranked for you.</p>
        </div>
        <div>
          <h3>Product</h3>
          <ul>
            <li>
              <a href="/#problem">Why Nexly</a>
            </li>
            <li>
              <a href="/#how-it-works">How it works</a>
            </li>
            <li>
              <a href="/#features">Features</a>
            </li>
          </ul>
        </div>
        <div>
          <h3>Get started</h3>
          <ul>
            <li>
              <Link to="/signup">Create a profile</Link>
            </li>
            <li>
              <Link to="/login">Log in</Link>
            </li>
            <li>
              <Link to="/discover">Start discovering</Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>About</h3>
          <ul>
            <li>
              <a href="/#preview">Preview a profile card</a>
            </li>
            <li>
              <Link to="/forgot-password">Reset a password</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer__base">
        <span>© {new Date().getFullYear()} Nexly. An ICT project.</span>
        <span>The profiles shown on this page are illustrative.</span>
      </div>
    </footer>
  );
}
