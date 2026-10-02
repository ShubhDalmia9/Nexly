import { CircleAlert, KeyRound, LogOut, MonitorSmartphone, Trash2 } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LIMITS } from '../../shared/constants';
import type { UserSettings } from '../../shared/types';
import { api } from '../api';
import { ApiError, errorMessage } from '../api/client';
import { PasswordSetup } from '../components/auth/PasswordSetup';
import { Button, buttonClass } from '../components/ui/Button';
import { ErrorState, Skeleton } from '../components/ui/Feedback';
import { TextField } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useAuth, useCurrentUser } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { timeAgo } from '../utils/format';
import { meetsPasswordRules } from '../utils/password';

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="card card--pad settings__section" aria-labelledby={id}>
      <header className="settings__head">
        <h2 id={id}>{title}</h2>
        <p className="muted">{description}</p>
      </header>
      {children}
    </section>
  );
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, description, checked, disabled, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div>
        <p className="toggle-row__label" id={`${id}-label`}>
          {label}
        </p>
        <p className="toggle-row__text" id={`${id}-text`}>
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-text`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden />
      </button>
    </div>
  );
}

export function Settings() {
  usePageTitle('Settings');
  const user = useCurrentUser();
  const { setUser, logOut, clearUser } = useAuth();
  const { toast, error: toastError } = useToast();
  const navigate = useNavigate();
  const security = useAsync(() => api.account.security(), []);

  // ---- Account: name
  const [name, setName] = useState(user.profile.fullName);
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const saveName = async (event: FormEvent) => {
    event.preventDefault();
    setNameError('');
    setSavingName(true);
    try {
      setUser((await api.account.saveName(name)).user);
      toast('Name updated.');
    } catch (caught) {
      setNameError(caught instanceof ApiError && caught.fields.fullName ? caught.fields.fullName : errorMessage(caught));
    } finally {
      setSavingName(false);
    }
  };

  // ---- Account: password
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{ currentPassword?: string; password?: string; confirm?: string }>({});
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const closePassword = () => {
    setPasswordOpen(false);
    setCurrentPassword('');
    setPassword('');
    setConfirm('');
    setPasswordErrors({});
    setPasswordError('');
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    const invalid: typeof passwordErrors = {};
    if (!currentPassword) invalid.currentPassword = 'Enter your current password.';
    if (!meetsPasswordRules(password)) invalid.password = 'Choose a password that meets all the requirements below.';
    else if (password !== confirm) invalid.confirm = 'The two passwords are not the same.';
    setPasswordErrors(invalid);
    setPasswordError('');
    if (Object.keys(invalid).length > 0) return;

    setSavingPassword(true);
    try {
      const { user: updated } = await api.account.changePassword({ currentPassword, newPassword: password });
      setUser(updated);
      closePassword();
      toast('Password changed. Other devices have been signed out.');
      void security.reload();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fields).length > 0) {
        setPasswordErrors({ currentPassword: caught.fields.currentPassword, password: caught.fields.newPassword });
      } else setPasswordError(errorMessage(caught));
    } finally {
      setSavingPassword(false);
    }
  };

  // ---- Settings toggles: saved the moment they are changed
  const [settings, setSettings] = useState<UserSettings>(user.settings);
  const [savingSetting, setSavingSetting] = useState(false);
  const change = async (patch: Partial<UserSettings>) => {
    const previous = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSavingSetting(true);
    try {
      setUser((await api.account.saveSettings(next)).user);
    } catch (caught) {
      setSettings(previous);
      toastError(`That setting was not saved. ${errorMessage(caught)}`);
    } finally {
      setSavingSetting(false);
    }
  };

  // ---- Security
  const [revoking, setRevoking] = useState(false);
  const signOutOthers = async () => {
    setRevoking(true);
    try {
      const { revoked, security: updated } = await api.account.signOutOtherSessions();
      security.setData(updated);
      toast(revoked === 0 ? 'No other devices were signed in.' : `Signed out of ${revoked} other ${revoked === 1 ? 'device' : 'devices'}.`);
    } catch (caught) {
      toastError(errorMessage(caught));
    } finally {
      setRevoking(false);
    }
  };

  const signOut = () => {
    navigate('/');
    void logOut();
  };

  // ---- Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteValue, setDeleteValue] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  // The session is cleared only once this page has been left. Clearing it while the page is still
  // showing would make the route guard send the browser to the login page instead of the home page.
  const deleted = useRef(false);
  useEffect(
    () => () => {
      if (deleted.current) clearUser();
    },
    [clearUser],
  );
  const deleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    setDeleteError('');
    setDeleting(true);
    try {
      await api.account.deleteAccount({ password: deleteValue });
      deleted.current = true;
      navigate('/', { replace: true });
      toast('Your account has been deleted.');
    } catch (caught) {
      setDeleteError(errorMessage(caught));
      setDeleting(false);
    }
  };

  return (
    <div className="page-narrow settings">
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Your account, privacy, notifications and security.</p>
        </div>
      </header>

      <Section title="Account" description="Who you are and how you sign in.">
        <form className="settings__inline" onSubmit={saveName} noValidate>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} error={nameError} maxLength={LIMITS.name} autoComplete="name" />
          <Button type="submit" loading={savingName} disabled={name.trim() === user.profile.fullName}>
            Save name
          </Button>
        </form>

        <div className="settings__row">
          <div>
            <p className="settings__label">Email</p>
            <p>{user.email}</p>
          </div>
        </div>

        <div className="settings__row">
          <div>
            <p className="settings__label">Password</p>
            <p className="muted">
              {security.data?.passwordChangedAt ? `Last changed ${timeAgo(security.data.passwordChangedAt).toLowerCase()}.` : 'Used to log in to your account.'}
            </p>
          </div>
          <Button size="sm" onClick={() => setPasswordOpen(true)}>
            <KeyRound aria-hidden />
            Change password
          </Button>
        </div>
      </Section>

      <Section title="Profile" description="What other members can see.">
        <Toggle
          label="Profile visibility"
          description={
            settings.discoverable
              ? 'Your profile appears in other members’ Discover lists and in search.'
              : 'Your profile is hidden from Discover and search. People you are connected with can still see it.'
          }
          checked={settings.discoverable}
          disabled={savingSetting}
          onChange={(discoverable) => change({ discoverable })}
        />
        <div className="settings__row">
          <div>
            <p className="settings__label">Profile information</p>
            <p className="muted">Profile strength {user.completion.percent}%. Edit your details, photo, experience and projects.</p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/profile" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
              View
            </Link>
            <Link to="/profile/edit" className={buttonClass({ size: 'sm' })}>
              Edit profile
            </Link>
          </div>
        </div>
      </Section>

      <Section title="Notifications" description="Choose what you hear about, in the app and by email.">
        <h3 className="settings__subhead">Connection notifications (in Nexly)</h3>
        <Toggle
          label="New connection requests"
          description="Show a notification when someone sends you a connection request."
          checked={settings.notifyRequests}
          disabled={savingSetting}
          onChange={(notifyRequests) => change({ notifyRequests })}
        />
        <Toggle
          label="Accepted requests"
          description="Show a notification when someone accepts your connection request."
          checked={settings.notifyAccepted}
          disabled={savingSetting}
          onChange={(notifyAccepted) => change({ notifyAccepted })}
        />
        <h3 className="settings__subhead">Email notifications</h3>
        <Toggle
          label="Email me about new connection requests"
          description={`Sent to ${user.email}.`}
          checked={settings.emailRequests}
          disabled={savingSetting}
          onChange={(emailRequests) => change({ emailRequests })}
        />
        <Toggle
          label="Email me when a request is accepted"
          description={`Sent to ${user.email}.`}
          checked={settings.emailAccepted}
          disabled={savingSetting}
          onChange={(emailAccepted) => change({ emailAccepted })}
        />
        <p className="muted settings__note">Security emails, such as password changes, are always sent.</p>
      </Section>

      <Section title="Security" description="Where your account is signed in.">
        {security.loading && !security.data && (
          <div className="stack" style={{ gap: 10 }} aria-hidden>
            <Skeleton height={44} radius={12} />
            <Skeleton height={44} radius={12} />
          </div>
        )}
        {security.error && !security.data && <ErrorState message={errorMessage(security.error)} onRetry={security.reload} />}
        {security.data && (
          <>
            <ul className="session-list">
              {security.data.sessions.map((session) => (
                <li key={session.id}>
                  <MonitorSmartphone aria-hidden />
                  <div>
                    <p className="settings__label">
                      {session.device}
                      {session.current && <span className="badge badge--iris">This device</span>}
                    </p>
                    <p className="muted">
                      Signed in {timeAgo(session.createdAt).toLowerCase()}
                      {session.lastSeenAt && !session.current ? ` · last active ${timeAgo(session.lastSeenAt).toLowerCase()}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="settings__buttons">
              {security.data.sessions.length > 1 && (
                <Button size="sm" loading={revoking} onClick={signOutOthers}>
                  Sign out of other devices
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={signOut}>
                <LogOut aria-hidden />
                Sign out
              </Button>
            </div>
            <p className="muted settings__note">
              You stay signed in on a device for 14 days. Changing or resetting your password signs out your other devices.
            </p>
          </>
        )}
      </Section>

      {!user.isSeeded && (
        <Section title="Account management" description="Permanent actions.">
          <div className="settings__row">
            <div>
              <p className="settings__label">Delete account</p>
              <p className="muted">Permanently removes your profile, photos, connections and notifications.</p>
            </div>
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 aria-hidden />
              Delete account
            </Button>
          </div>
        </Section>
      )}

      <Modal open={passwordOpen} onClose={closePassword} title="Change password">
        <form className="auth__form" onSubmit={savePassword} noValidate>
          {passwordError && (
            <p className="notice notice--error" role="alert">
              <CircleAlert aria-hidden />
              <span>{passwordError}</span>
            </p>
          )}
          <input type="email" name="email" autoComplete="username" value={user.email} readOnly hidden />
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            error={passwordErrors.currentPassword}
          />
          <PasswordSetup password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} errors={passwordErrors} label="New password" />
          <div className="settings__buttons" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={closePassword}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingPassword}>
              {savingPassword ? 'Saving…' : 'Save password'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <form className="auth__form" onSubmit={deleteAccount} noValidate>
          <p>
            This permanently deletes your account, profile, photos, connections and notifications. <strong>It cannot be undone.</strong>
          </p>
          <TextField
            label="Enter your password to confirm"
            type="password"
            autoComplete="current-password"
            value={deleteValue}
            onChange={(event) => setDeleteValue(event.target.value)}
            error={deleteError}
          />
          <div className="settings__buttons" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Keep my account
            </Button>
            <Button type="submit" variant="danger" loading={deleting} disabled={!deleteValue}>
              {deleting ? 'Deleting…' : 'Delete account permanently'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
