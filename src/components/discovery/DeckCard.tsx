import { ChevronRight, Crosshair, MapPin } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Person } from '../../../shared/types';
import { cx, firstName, hueFor, roleLine } from '../../utils/format';
import { RelevanceBadge, ReasonList, TagList } from '../profile/Relevance';
import { Avatar } from '../ui/Avatar';

interface DeckCardProps {
  person: Person;
  /** Opens the full profile. Omitted for non-interactive previews. */
  onOpen?: () => void;
  /** Shows the card as its owner sees it while editing: no relevance score or reasons. */
  preview?: boolean;
}

/**
 * The concise discovery card: just enough to decide whether someone is worth connecting with.
 * Lower-priority sections drop away on short screens (see the container queries in discover.css)
 * so the card never needs to scroll.
 */
export function DeckCard({ person, onOpen, preview }: DeckCardProps) {
  const { profile, relevance } = person;
  const name = firstName(profile.fullName);
  const incoming = person.connection.status === 'pending_received';
  const featured = profile.projects.find((project) => relevance.relevantProjects.includes(project.title)) ?? profile.projects[0];
  // The most recent earlier role and the latest school give a one-line sense of background.
  const previous = profile.experience.find((role) => role.endDate !== '') ?? null;
  const school = profile.education[0] ?? null;
  const style = { '--hue': hueFor(profile.fullName) } as CSSProperties;

  return (
    <article className={cx('deck-card', incoming && 'deck-card--incoming')} style={style}>
      <div className="deck-card__cover">{preview ? <span className="badge">Preview</span> : <RelevanceBadge relevance={relevance} />}</div>

      <header className="deck-card__head">
        <Avatar name={profile.fullName} photoUrl={profile.photoUrl} size={80} className="deck-card__avatar" />
        <div className="deck-card__identity">
          <h2 className="deck-card__name">{profile.fullName || 'Your name'}</h2>
          <p className="deck-card__role">{roleLine(profile.profession, profile.workplace) || (preview ? 'Your profession' : 'Nexly member')}</p>
        </div>
      </header>

      <div className="deck-card__body">
        {(profile.specialisation || profile.location) && (
          <ul className="deck-card__facts">
            {profile.specialisation && (
              <li>
                <Crosshair aria-hidden />
                <span className="sr-only">Specialisation: </span>
                {profile.specialisation}
              </li>
            )}
            {profile.location && (
              <li>
                <MapPin aria-hidden />
                <span className="sr-only">Location: </span>
                {profile.location}
              </li>
            )}
          </ul>
        )}

        {preview ? (
          <section className="deck-card__why">
            <h3 className="eyebrow">Why they&rsquo;re seeing you</h3>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Each viewer sees their own reasons here, such as the skills and interests you share.
            </p>
          </section>
        ) : (
          <section className="deck-card__why">
            <h3 className="eyebrow">Why you&rsquo;re seeing {name}</h3>
            <ReasonList reasons={relevance.reasons} limit={3} />
          </section>
        )}

        {profile.skills.length > 0 && (
          <section className="deck-card__section">
            <h3 className="eyebrow">Skills</h3>
            <TagList tags={profile.skills} shared={relevance.sharedSkills} limit={6} label="Skills" />
          </section>
        )}

        {featured && (
          <section className="deck-card__section deck-card__project">
            <h3 className="eyebrow">{profile.projects.length > 1 ? `Project · 1 of ${profile.projects.length}` : 'Project'}</h3>
            <p className="deck-card__project-title">
              {featured.title}
              <span className="badge">{featured.type}</span>
            </p>
            {featured.description && <p className="deck-card__project-text clamp-2">{featured.description}</p>}
          </section>
        )}

        {(previous || school) && (
          <section className="deck-card__section deck-card__background">
            <h3 className="eyebrow">Background</h3>
            <ul>
              {previous && (
                <li>
                  Previously {previous.title}
                  {previous.company ? ` at ${previous.company}` : ''}
                </li>
              )}
              {school && (
                <li>
                  {[school.degree, school.field].filter(Boolean).join(', ') || 'Studied'} · {school.school}
                </li>
              )}
            </ul>
          </section>
        )}

        {profile.interests.length > 0 && (
          <section className="deck-card__section deck-card__interests">
            <h3 className="eyebrow">Interests</h3>
            <TagList tags={profile.interests} shared={relevance.sharedInterests} limit={4} label="Interests" />
          </section>
        )}

        {profile.aspirations && (
          <section className="deck-card__section deck-card__goal">
            <h3 className="eyebrow">Aiming for</h3>
            <p className="clamp-2">{profile.aspirations}</p>
          </section>
        )}
      </div>

      {onOpen && (
        <footer className="deck-card__foot">
          <button type="button" className="deck-card__more" onClick={onOpen}>
            View full profile
            <ChevronRight aria-hidden />
          </button>
        </footer>
      )}
    </article>
  );
}
