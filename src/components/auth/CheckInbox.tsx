import { MailCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, errorMessage } from '../../api/client';
import { useAuthOptions } from '../../hooks/useAuthOptions';
import { Button, buttonClass } from '../ui/Button';

const RESEND_WAIT_SECONDS = 45;

interface CheckInboxProps {
  email: string;
  onResend: () => Promise<unknown>;
  onChangeEmail: () => void;
}

/**
 * Shown after a password-reset link has been requested. The wording never says whether the
 * address has an account, and follows where the message actually is: in the person's own inbox,
 * or in the inbox on this computer, which is then one click away.
 */
export function CheckInbox({ email, onResend, onChangeEmail }: CheckInboxProps) {
  const options = useAuthOptions();
  const local = options?.localInbox ?? false;
  const [wait, setWait] = useState(RESEND_WAIT_SECONDS);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const resend = async () => {
    setSending(true);
    setMessage(null);
    try {
      await onResend();
      setMessage({ tone: 'ok', text: local ? 'A new link is ready. Earlier links no longer work.' : 'A new email is on its way. Earlier links no longer work.' });
      setWait(RESEND_WAIT_SECONDS);
    } catch (caught) {
      setMessage({ tone: 'error', text: errorMessage(caught) });
      if (caught instanceof ApiError && caught.status === 429) setWait(RESEND_WAIT_SECONDS);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="auth__form">
      <div className="inbox-card">
        <span className="inbox-card__icon" aria-hidden>
          <MailCheck />
        </span>
        <p>
          If an account exists for <strong>{email}</strong>
          {local ? ', its reset link is ready.' : ', we emailed it a reset link.'} Open the link to choose a new password. It expires in 30 minutes
          and works once.
        </p>
      </div>

      {local && (
        <Link to="/inbox" className={buttonClass({ variant: 'primary', size: 'lg', block: true })}>
          Open inbox
        </Link>
      )}

      {message && (
        <p className={message.tone === 'error' ? 'notice notice--error' : 'notice'} role={message.tone === 'error' ? 'alert' : 'status'}>
          <span>{message.text}</span>
        </p>
      )}

      {!local && (
        <p className="auth__fineprint" style={{ textAlign: 'left' }}>
          Nothing there? Check your spam folder, and make sure the address above is right.
        </p>
      )}
      <Button block loading={sending} disabled={wait > 0} onClick={resend}>
        {sending ? 'Sending…' : wait > 0 ? `Resend in ${wait}s` : local ? 'Send a new link' : 'Resend email'}
      </Button>
      <button type="button" className={buttonClass({ variant: 'ghost', block: true })} onClick={onChangeEmail}>
        Use a different email address
      </button>
    </div>
  );
}
