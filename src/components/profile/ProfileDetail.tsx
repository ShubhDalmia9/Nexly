import { Crosshair, ExternalLink, Link2, Mail, MapPin, UserCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { connectionType } from '../../../shared/constants';
import type { Person, Project } from '../../../shared/types';
import { firstName, formatPeriod, formatYears, roleLine, timeAgo } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { ConnectionActions } from './ConnectionActions';
import { RelevanceBadge, ReasonList, TagList } from './Relevance';

interface ProfileDetailProps {
  person: Person;
  onChange: (person: Person) => void;
  /** Hides the connection buttons, for places that provide their own (Skip / Connect in discovery). */
  hideActions?: boolean;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="profile__section">
      <h3 className="profile__heading">{title}</h3>
      {children}
    </section>
  );
}

export function ProjectCard({ project, shared = [] }: { project: Project; shared?: string[] }) {
  const meta = [project.role, project.year ? String(project.year) : ''].filter(Boolean).join(' · ');
  return (
    <li className="project">
      {project.imageUrl && <img className="project__image" src={project.imageUrl} alt={`${project.title} project image`} loading="lazy" />}
      <div className="project__head">
        <h4 className="project__title">{project.title}</h4>
        <span className="badge">{project.type}</span>
      </div>
      {meta && <p className="project__meta">{meta}</p>}
      {project.description && <p className="project__text">{project.description}</p>}
      {project.skills.length > 0 && <TagList tags={project.skills} shared={shared} label="Skills used" />}
      {project.url && (
        <a className="text-link project__link" href={project.url} target="_blank" rel="noreferrer noopener">
          View project <ExternalLink size={14} aria-hidden />
        </a>
      )}
    </li>
  );
}

/** The full profile: everything the discovery card leaves out. Used on the profile page and in the discovery drawer. */
export function ProfileDetail({ person, onChange, hideActions }: ProfileDetailProps) {
  const { profile, relevance, connection } = person;
  const isSelf = connection.status === 'self';
  const name = firstName(profile.fullName);
  const sharedTags = [...relevance.sharedSkills, ...relevance.sharedInterests];

  return (
    <div className="profile">
      <header className="profile__header">
        <Avatar name={profile.fullName} photoUrl={profile.photoUrl} size={96} />
        <div className="profile__identity">
          <h1 className="profile__name">{profile.fullName}</h1>
          <p className="profile__role">{roleLine(profile.profession, profile.workplace) || 'Nexly member'}</p>
          {profile.headline && profile.headline !== roleLine(profile.profession, profile.workplace) && (
            <p className="profile__headline">{profile.headline}</p>
          )}
          <ul className="profile__facts">
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
            {connection.status === 'connected' && connection.since && (
              <li>
                <UserCheck aria-hidden />
                Connected {timeAgo(connection.since).toLowerCase()}
              </li>
            )}
          </ul>
        </div>
      </header>

      {!hideActions && (
        <div className="profile__actions">
          <ConnectionActions person={person} onChange={onChange} />
        </div>
      )}

      {!isSelf && (
        <section className="profile__why" aria-label={`Why ${name} is relevant to you`}>
          <div className="profile__why-head">
            <h3 className="profile__heading" style={{ margin: 0 }}>
              Why you might connect
            </h3>
            <RelevanceBadge relevance={relevance} />
          </div>
          <ReasonList reasons={relevance.reasons} />
        </section>
      )}

      {person.contactEmail && (
        <Section title="Contact">
          <a className="profile__contact" href={`mailto:${person.contactEmail}`}>
            <Mail aria-hidden />
            {person.contactEmail}
          </a>
          <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 6 }}>
            Contact details are only shared between connections.
          </p>
        </Section>
      )}

      {profile.about && (
        <Section title="About">
          <p className="profile__text">{profile.about}</p>
        </Section>
      )}

      {(profile.aspirations || profile.goals.length > 0) && (
        <Section title="Career aspirations">
          {profile.aspirations && <p className="profile__text">{profile.aspirations}</p>}
          {profile.goals.length > 0 && (
            <div style={{ marginTop: profile.aspirations ? 12 : 0 }}>
              <TagList tags={profile.goals} shared={relevance.sharedGoals} label="Career goals" />
            </div>
          )}
        </Section>
      )}

      {profile.experience.length > 0 && (
        <Section title="Experience">
          <ol className="timeline">
            {profile.experience.map((role, index) => (
              <li key={role.id ?? index}>
                <h4>{role.title}</h4>
                <p className="timeline__meta">
                  {[role.company, formatPeriod(role.startDate, role.endDate), role.location].filter(Boolean).join(' · ')}
                </p>
                {role.description && <p className="timeline__text">{role.description}</p>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {profile.education.length > 0 && (
        <Section title="Education">
          <ol className="timeline">
            {profile.education.map((item, index) => (
              <li key={item.id ?? index}>
                <h4>{item.school}</h4>
                <p className="timeline__meta">
                  {[[item.degree, item.field].filter(Boolean).join(', '), formatYears(item.startYear, item.endYear)].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {profile.certifications.length > 0 && (
        <Section title="Certifications">
          <ul className="timeline timeline--plain">
            {profile.certifications.map((item, index) => (
              <li key={item.id ?? index}>
                <h4>{item.name}</h4>
                {(item.issuer || item.year) && <p className="timeline__meta">{[item.issuer, item.year].filter(Boolean).join(' · ')}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {profile.lookingFor.length > 0 && (
        <Section title={isSelf ? 'You want to meet' : `${name} wants to meet`}>
          <ul className="wrap" style={{ gap: 6 }}>
            {profile.lookingFor.map((id) => (
              <li key={id} className="chip chip--outline chip--lg">
                {connectionType(id).label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {profile.skills.length > 0 && (
        <Section title="Skills">
          <TagList tags={profile.skills} shared={relevance.sharedSkills} label="Skills" />
        </Section>
      )}

      {profile.interests.length > 0 && (
        <Section title="Interests">
          <TagList tags={profile.interests} shared={relevance.sharedInterests} label="Interests" />
        </Section>
      )}

      {profile.projects.length > 0 && (
        <Section title="Projects">
          <ul className="projects">
            {profile.projects.map((project, index) => (
              <ProjectCard key={project.id ?? index} project={project} shared={sharedTags} />
            ))}
          </ul>
        </Section>
      )}

      {profile.linkedinUrl && (
        <Section title="Elsewhere">
          <a className="profile__contact" href={profile.linkedinUrl} target="_blank" rel="noreferrer noopener">
            <Link2 aria-hidden />
            LinkedIn profile
            <ExternalLink size={14} aria-hidden />
          </a>
        </Section>
      )}

      {!isSelf && sharedTags.length > 0 && (
        <p className="profile__legend">
          <span className="chip chip--shared" style={{ height: 22, fontSize: 'var(--text-xs)' }}>
            Highlighted
          </span>
          tags are ones you have in common.
        </p>
      )}
    </div>
  );
}
