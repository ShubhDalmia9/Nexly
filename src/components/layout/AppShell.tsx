import { Bell, ChevronDown, Compass, House, LogOut, Pencil, Search, Settings, User, Users } from 'lucide-react';
import { type FormEvent, useCallback, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useCurrentUser } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useDismiss } from '../../hooks/useDismiss';
import { Avatar } from '../ui/Avatar';
import { Logo } from '../ui/Logo';
import { NotificationBell } from './NotificationBell';

function UserMenu() {
  const user = useCurrentUser();
  const { logOut } = useAuth();
  const navigate = useNavigate();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(anchorRef, open, close);

  const signOut = () => {
    close();
    // Leave the protected page first; otherwise its guard would redirect to the login page as the session ends.
    navigate('/');
    void logOut();
  };

  return (
    <div className="popover-anchor" ref={anchorRef}>
      <button
        type="button"
        className="user-button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <Avatar name={user.profile.fullName} photoUrl={user.profile.photoUrl} size={34} />
        <ChevronDown aria-hidden />
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu__header">
            <strong>{user.profile.fullName}</strong>
            <span>{user.email}</span>
          </div>
          <div className="menu__divider" />
          <Link to="/profile" className="menu__item" role="menuitem" onClick={close}>
            <User aria-hidden />
            View profile
          </Link>
          <Link to="/profile/edit" className="menu__item" role="menuitem" onClick={close}>
            <Pencil aria-hidden />
            Edit profile
          </Link>
          <Link to="/settings" className="menu__item" role="menuitem" onClick={close}>
            <Settings aria-hidden />
            Settings
          </Link>
          <div className="menu__divider" />
          <button type="button" className="menu__item" role="menuitem" onClick={signOut}>
            <LogOut aria-hidden />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function NavSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
    setQuery('');
  };

  return (
    <form className="topnav__search" role="search" onSubmit={onSubmit}>
      <Search aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search people, skills, projects"
        aria-label="Search people"
      />
    </form>
  );
}

/** The signed-in frame: top bar on every screen, plus a bottom tab bar on phones. */
export function AppShell() {
  const { unread, pendingRequests } = useNotifications();
  const location = useLocation();
  const onSearchPage = location.pathname === '/search';

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topnav">
        <div className="container topnav__inner">
          <Link to="/home" aria-label="Nexly home">
            <Logo />
          </Link>
          <nav className="topnav__links" aria-label="Main">
            <NavLink to="/home" className="nav-link">
              <House aria-hidden />
              Home
            </NavLink>
            <NavLink to="/discover" className="nav-link">
              <Compass aria-hidden />
              Discover
            </NavLink>
            <NavLink to="/connections" className="nav-link">
              <Users aria-hidden />
              Connections
              {pendingRequests > 0 && (
                <span className="count-dot" aria-label={`${pendingRequests} pending`}>
                  {pendingRequests}
                </span>
              )}
            </NavLink>
          </nav>
          {onSearchPage ? <div className="topnav__spacer" /> : <NavSearch />}
          <div className="topnav__tools">
            <Link to="/search" className="icon-button topnav__mobile-search" aria-label="Search">
              <Search aria-hidden />
            </Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <main id="main" className="app__main" tabIndex={-1}>
        <div className="container page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <nav className="tabbar" aria-label="Main">
        <NavLink to="/home" className="tabbar__item">
          <House aria-hidden />
          Home
        </NavLink>
        <NavLink to="/discover" className="tabbar__item">
          <Compass aria-hidden />
          Discover
        </NavLink>
        <NavLink to="/connections" className="tabbar__item">
          <Users aria-hidden />
          Connections
          {pendingRequests > 0 && (
            <span className="count-dot" aria-label={`${pendingRequests} pending`}>
              {pendingRequests}
            </span>
          )}
        </NavLink>
        <NavLink to="/notifications" className="tabbar__item">
          <Bell aria-hidden />
          Alerts
          {unread > 0 && (
            <span className="count-dot" aria-label={`${unread} unread`}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </NavLink>
        <NavLink to="/profile" className="tabbar__item">
          <User aria-hidden />
          Profile
        </NavLink>
      </nav>
    </div>
  );
}
