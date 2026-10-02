import { Check, Clock, Pencil, UserCheck, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Person } from '../../../shared/types';
import { api } from '../../api';
import { errorMessage } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import { useToast } from '../../context/ToastContext';
import { firstName } from '../../utils/format';
import { Button, type ButtonSize, buttonClass } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ConnectionActionsProps {
  person: Person;
  /** Called with the updated person after any change, so the parent can update its list. */
  onChange: (person: Person) => void;
  size?: ButtonSize;
}

type Action = 'connect' | 'accept' | 'decline' | 'remove';

/**
 * The right buttons for the current relationship with a person. Every button
 * calls the API; the UI only changes once the server has confirmed the change.
 */
export function ConnectionActions({ person, onChange, size = 'md' }: ConnectionActionsProps) {
  const { toast, error: toastError } = useToast();
  const notifications = useNotifications();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const { connection, profile } = person;
  const name = firstName(profile.fullName);

  const run = async (action: Action) => {
    setBusy(action);
    try {
      if (action === 'connect') {
        const result = await api.connections.connect(profile.userId);
        onChange(result.person);
        toast(result.outcome === 'connected' ? `You and ${name} are now connected.` : `Connection request sent to ${name}.`);
      } else if (connection.id !== null) {
        if (action === 'accept') {
          onChange((await api.connections.accept(connection.id)).person);
          toast(`You and ${name} are now connected.`);
        } else if (action === 'decline') {
          onChange((await api.connections.decline(connection.id)).person);
          toast(`Connection request from ${name} declined. They will not be notified.`);
        } else {
          const wasConnected = connection.status === 'connected';
          onChange((await api.connections.remove(connection.id)).person);
          toast(wasConnected ? `${name} was removed from your connections.` : `Connection request to ${name} withdrawn.`);
        }
      }
      void notifications.refresh();
    } catch (caught) {
      toastError(errorMessage(caught));
    } finally {
      setBusy(null);
      setConfirmingRemove(false);
    }
  };

  switch (connection.status) {
    case 'self':
      return (
        <div className="connection-actions">
          <Link to="/profile/edit" className={buttonClass({ variant: 'secondary', size })}>
            <Pencil aria-hidden />
            Edit profile
          </Link>
        </div>
      );

    case 'none':
      return (
        <div className="connection-actions">
          <Button variant="primary" size={size} loading={busy === 'connect'} onClick={() => run('connect')}>
            <UserPlus aria-hidden />
            Connect
          </Button>
        </div>
      );

    case 'pending_sent':
      return (
        <div className="connection-actions">
          <span className="badge badge--amber">
            <Clock aria-hidden />
            Request sent
          </span>
          <Button variant="ghost" size="sm" loading={busy === 'remove'} onClick={() => run('remove')}>
            Withdraw
          </Button>
        </div>
      );

    case 'pending_received':
      return (
        <div className="connection-actions">
          <Button variant="primary" size={size} loading={busy === 'accept'} disabled={busy !== null} onClick={() => run('accept')}>
            <Check aria-hidden />
            Accept
          </Button>
          <Button variant="secondary" size={size} loading={busy === 'decline'} disabled={busy !== null} onClick={() => run('decline')}>
            <X aria-hidden />
            Decline
          </Button>
        </div>
      );

    case 'declined_by_me':
      return (
        <div className="connection-actions">
          <span className="badge">Request declined</span>
          <Button variant="ghost" size="sm" loading={busy === 'connect'} onClick={() => run('connect')}>
            Connect anyway
          </Button>
        </div>
      );

    case 'connected':
      return (
        <div className="connection-actions">
          <span className="badge badge--mint">
            <UserCheck aria-hidden />
            Connected
          </span>
          <Button variant="ghost" size="sm" onClick={() => setConfirmingRemove(true)}>
            Remove
          </Button>
          <Modal
            open={confirmingRemove}
            onClose={() => setConfirmingRemove(false)}
            title={`Remove ${name} from your connections?`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setConfirmingRemove(false)}>
                  Keep connection
                </Button>
                <Button variant="danger" loading={busy === 'remove'} onClick={() => run('remove')}>
                  Remove connection
                </Button>
              </>
            }
          >
            <p className="muted">
              You will no longer see each other&rsquo;s contact details. {name} will not be notified, and either of you can send a new
              request later.
            </p>
          </Modal>
        </div>
      );
  }
}
