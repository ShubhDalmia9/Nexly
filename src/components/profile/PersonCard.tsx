import { Mail, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Person } from '../../../shared/types';
import { roleLine } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Feedback';
import { ConnectionActions } from './ConnectionActions';
import { RelevanceBadge, ReasonBadges, TagList } from './Relevance';

interface PersonCardProps {
  person: Person;
  onChange: (person: Person) => void;
  /** Search results: which fields the query was found in. */
  foundIn?: string[];
  /** A short line under the actions, such as "Connected 3 days ago". */
  note?: ReactNode;
  hideActions?: boolean;
}

/** The compact profile card used in search results, the dashboard and the connections lists. */
export function PersonCard({ person, onChange, foundIn, note, hideActions }: PersonCardProps) {
  const { profile, relevance } = person;
  const profileUrl = `/people/${profile.userId}`;
  const sharedTags = [...relevance.sharedSkills, ...relevance.sharedInterests];
  const tags = sharedTags.length > 0 ? sharedTags : profile.skills;

  return (
    <article className="person-card" aria-label={profile.fullName}>
      <div className="person-card__top">
        <Link to={profileUrl} tabIndex={-1} aria-hidden>
          <Avatar name={profile.fullName} photoUrl={profile.photoUrl} size={52} />
        </Link>
        <div className="person-card__identity">
          <Link to={profileUrl} className="person-card__name">
            {profile.fullName}
          </Link>
          <p className="person-card__role">{roleLine(profile.profession, profile.workplace) || 'Nexly member'}</p>
          {profile.specialisation && <p className="person-card__role muted">{profile.specialisation}</p>}
        </div>
      </div>

      <div className="person-card__meta">
        <RelevanceBadge relevance={relevance} compact />
        {foundIn?.map((field) => (
          <span key={field} className="badge badge--amber">
            <Search aria-hidden />
            {field}
          </span>
        ))}
      </div>

      <ReasonBadges reasons={relevance.reasons.filter((reason) => reason.kind !== 'skills' && reason.kind !== 'interests')} limit={2} />

      {tags.length > 0 && <TagList tags={tags} shared={sharedTags} limit={4} label={sharedTags.length > 0 ? 'In common' : 'Skills'} />}

      {person.contactEmail && (
        <a className="person-card__contact" href={`mailto:${person.contactEmail}`}>
          <Mail aria-hidden />
          <span>{person.contactEmail}</span>
        </a>
      )}

      <div className="person-card__footer">
        {!hideActions && <ConnectionActions person={person} onChange={onChange} size="sm" />}
        {note ? (
          <span className="person-card__note">{note}</span>
        ) : (
          <Link to={profileUrl} className="text-link" style={{ fontSize: 'var(--text-sm)' }}>
            View profile
          </Link>
        )}
      </div>
    </article>
  );
}

interface PersonRowProps {
  person: Person;
  /** Shown under the name instead of the role line. */
  detail?: ReactNode;
  trailing?: ReactNode;
}

/** A one-line person entry for dense lists. */
export function PersonRow({ person, detail, trailing }: PersonRowProps) {
  const { profile } = person;
  return (
    <div className="person-row">
      <Link to={`/people/${profile.userId}`} className="person-row__link">
        <Avatar name={profile.fullName} photoUrl={profile.photoUrl} size={40} />
        <span className="person-row__text">
          <strong>{profile.fullName}</strong>
          <span>{detail ?? (roleLine(profile.profession, profile.workplace) || 'Nexly member')}</span>
        </span>
      </Link>
      {trailing}
    </div>
  );
}

export function PersonCardSkeleton() {
  return (
    <div className="person-card" aria-hidden>
      <div className="person-card__top">
        <Skeleton width={52} height={52} radius={16} />
        <div className="person-card__identity stack" style={{ gap: 8, paddingTop: 4 }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="85%" height={12} />
        </div>
      </div>
      <Skeleton width={130} height={26} radius={999} />
      <div className="row" style={{ gap: 6 }}>
        <Skeleton width={70} height={28} radius={999} />
        <Skeleton width={90} height={28} radius={999} />
        <Skeleton width={60} height={28} radius={999} />
      </div>
      <div className="person-card__footer">
        <Skeleton width={110} height={34} radius={999} />
      </div>
    </div>
  );
}
