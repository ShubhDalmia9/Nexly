import { ExternalLink, Inbox as InboxIcon, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ApiError } from '../api/client';
import { Button, buttonClass } from '../components/ui/Button';
import { EmptyState, PageLoader } from '../components/ui/Feedback';
import { Logo } from '../components/ui/Logo';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { cx, timeAgo } from '../utils/format';
import { NotFound } from './NotFound';

/** The password-reset link inside an email, so it can be opened in one click. */
function actionLink(html: string): string | null {
  const match = /href="(https?:\/\/[^"]+\/reset-password\?token=[^"]+)"/.exec(html);
  return match ? match[1].replace(/&amp;/g, '&') : null;
}

/**
 * The inbox on this computer: the emails Nexly has written while it is not connected to an email
 * provider, so a password-reset link can be opened here. Once a provider is connected, emails
 * go to people's own inboxes and this page no longer exists.
 */
export function Inbox() {
  usePageTitle('Inbox');
  const { data, loading, error, reload } = useAsync(() => api.inbox.list(), []);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  const emails = data?.emails ?? [];
  const selected = emails.find((email) => email.id === selectedId) ?? emails[0] ?? null;
  const link = selected ? actionLink(selected.html) : null;

  const clear = async () => {
    setClearing(true);
    await api.inbox.clear().catch(() => undefined);
    await reload();
    setClearing(false);
  };

  if (error instanceof ApiError && error.status === 404) return <NotFound />;

  return (
    <div className="mailbox">
      <header className="mailbox__top">
        <Link to="/" aria-label="Nexly home">
          <Logo />
        </Link>
        <div className="mailbox__tools">
          <Button size="sm" onClick={() => void reload()}>
            <RefreshCw aria-hidden />
            Refresh
          </Button>
          {emails.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clear} loading={clearing}>
              <Trash2 aria-hidden />
              Clear
            </Button>
          )}
        </div>
      </header>

      <main className="mailbox__main">
        <div>
          <h1>Inbox</h1>
          <p className="muted">Emails from Nexly on this computer. Open one to continue.</p>
        </div>

        {loading && !data && <PageLoader label="Loading your inbox" />}
        {data && emails.length === 0 && (
          <div className="card">
            <EmptyState icon={InboxIcon} title="No emails yet" text="Emails from Nexly appear here.">
              <Link to="/login" className={buttonClass({ variant: 'primary' })}>
                Log in
              </Link>
            </EmptyState>
          </div>
        )}

        {selected && (
          <div className="mailbox__grid">
            <ul className="mailbox__list card" aria-label="Emails">
              {emails.map((email) => (
                <li key={email.id}>
                  <button
                    type="button"
                    className={cx('mailbox__item', email.id === selected.id && 'is-selected')}
                    aria-current={email.id === selected.id}
                    onClick={() => setSelectedId(email.id)}
                  >
                    <strong>{email.subject}</strong>
                    <span>To {email.to}</span>
                    <small>{timeAgo(email.createdAt)}</small>
                  </button>
                </li>
              ))}
            </ul>

            <section className="mailbox__preview card" aria-label="Email preview">
              <div className="mailbox__meta">
                <div>
                  <h2>{selected.subject}</h2>
                  <p className="muted">
                    To {selected.to} · {timeAgo(selected.createdAt)}
                  </p>
                </div>
                {link && (
                  <a href={link} className={buttonClass({ variant: 'primary' })}>
                    Open the link in this email
                    <ExternalLink aria-hidden />
                  </a>
                )}
              </div>
              {/* The email is rendered in a sandboxed frame: its HTML cannot run scripts or touch this page. */}
              <iframe title={`Email: ${selected.subject}`} sandbox="" srcDoc={selected.html} className="mailbox__frame" />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
