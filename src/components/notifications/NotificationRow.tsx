import { Check, Sparkles, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NotificationItem } from '../../../shared/types';
import { api } from '../../api';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { cx, firstName, timeAgo } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface NotificationRowProps {
  item: NotificationItem;
  /** Called after the row changed something on the server (read state or a request answer). */
  onChanged: () => void;
  /** Called when the user follows a link in the row, e.g. to close a popover. */
  onNavigate?: () => void;
}

export function NotificationRow({ item, onChanged, onNavigate }: NotificationRowProps) {
  const { toast, error: toastError } = useToast();
  const [busy, setBusy] = useState<'accept' | 'decline' | 'read' | null>(null);
  const actor = item.actor;

  const markRead = async () => {
    if (item.read) return;
    try {
      await api.notifications.markRead(item.id);
      onChanged();
    } catch {
      // Read state is a nicety; the row simply stays unread if this fails.
    }
  };

  const respond = async (action: 'accept' | 'decline') => {
    if (item.connectionId === null || !actor) return;
    setBusy(action);
    try {
      if (action === 'accept') {
        await api.connections.accept(item.connectionId);
        toast(`You and ${firstName(actor.fullName)} are now connected.`);
      } else {
        await api.connections.decline(item.connectionId);
        toast(`Request from ${firstName(actor.fullName)} declined. They will not be notified.`);
      }
      onChanged();
    } catch (caught) {
      toastError(errorMessage(caught));
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const follow = () => {
    void markRead();
    onNavigate?.();
  };

  const actorLink = actor && (
    <Link to={`/people/${actor.userId}`} onClick={follow}>
      {actor.fullName}
    </Link>
  );

  let text: ReactNode;
  if (item.type === 'welcome') {
    text = (
      <>
        <strong>Welcome to Nexly.</strong> The more complete your profile, the better your recommendations.{' '}
        <Link to="/profile/edit" className="text-link" onClick={follow}>
          Review your profile
        </Link>
      </>
    );
  } else if (item.type === 'connection_request') {
    text = <>You have a new connection request from {actorLink}.</>;
  } else {
    text = (
      <>
        Connection request accepted: you and {actorLink} are now connected.
      </>
    );
  }

  return (
    <li className={cx('notification', !item.read && 'notification--unread')}>
      {actor ? (
        <Link to={`/people/${actor.userId}`} onClick={follow} tabIndex={-1} aria-hidden>
          <Avatar name={actor.fullName} photoUrl={actor.photoUrl} size={44} />
        </Link>
      ) : (
        <span className="notification__icon" aria-hidden>
          <Sparkles size={20} />
        </span>
      )}
      <div className="notification__body">
        <p className="notification__text">
          {!item.read && <span className="sr-only">Unread: </span>}
          {text}
        </p>
        <p className="notification__meta">
          {actor?.profession ? `${actor.profession} · ` : ''}
          <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </p>

        {item.type === 'connection_request' && item.connectionStatus === 'pending_received' && (
          <div className="notification__actions">
            <Button variant="primary" size="sm" loading={busy === 'accept'} disabled={busy !== null} onClick={() => respond('accept')}>
              <Check aria-hidden />
              Accept
            </Button>
            <Button variant="secondary" size="sm" loading={busy === 'decline'} disabled={busy !== null} onClick={() => respond('decline')}>
              <X aria-hidden />
              Decline
            </Button>
          </div>
        )}
        {item.type === 'connection_request' && item.connectionStatus === 'connected' && (
          <div className="notification__actions">
            <span className="badge badge--mint">
              <Check aria-hidden />
              Accepted
            </span>
          </div>
        )}
        {item.type === 'connection_request' && item.connectionStatus === 'declined_by_me' && (
          <div className="notification__actions">
            <span className="badge">Declined</span>
          </div>
        )}
      </div>
      {!item.read && (
        <button type="button" className="btn btn--ghost btn--sm notification__read" onClick={markRead}>
          Mark read
        </button>
      )}
    </li>
  );
}
