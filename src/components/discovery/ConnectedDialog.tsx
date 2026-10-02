import { UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Person, Profile } from '../../../shared/types';
import { firstName } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { Button, buttonClass } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ConnectedDialogProps {
  person: Person | null;
  me: Profile;
  onClose: () => void;
}

/** Shown when Connect was pressed on someone who had already sent a request: the request is accepted. */
export function ConnectedDialog({ person, me, onClose }: ConnectedDialogProps) {
  if (!person) return null;
  const name = firstName(person.profile.fullName);
  return (
    <Modal open onClose={onClose} title={`Connection request accepted: you and ${name} are connected`} hideTitle>
      <div className="connected-dialog">
        <div className="connected-dialog__avatars" aria-hidden>
          <Avatar name={me.fullName} photoUrl={me.photoUrl} size={88} />
          <span className="connected-dialog__link">
            <UserCheck />
          </span>
          <Avatar name={person.profile.fullName} photoUrl={person.profile.photoUrl} size={88} />
        </div>
        <p className="eyebrow" style={{ color: 'var(--mint-700)' }}>
          Connection request accepted
        </p>
        <h3 className="connected-dialog__title">You and {name} are now connected</h3>
        <p className="muted">
          {name} had already sent you a connection request, so you have accepted it. {name} has been notified
          {person.contactEmail ? ', and you can now see each other’s contact details.' : '.'}
        </p>
        <div className="connected-dialog__actions">
          <Link to={`/people/${person.profile.userId}`} className={buttonClass({ variant: 'secondary' })}>
            View {name}&rsquo;s profile
          </Link>
          <Button variant="primary" onClick={onClose}>
            Keep discovering
          </Button>
        </div>
      </div>
    </Modal>
  );
}
