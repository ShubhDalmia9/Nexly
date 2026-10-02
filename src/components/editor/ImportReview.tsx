import { ArrowLeft, Check, CircleAlert, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { LIMITS } from '../../../shared/constants';
import type { ImportableField, LinkedInImportResult, ProfileInput } from '../../../shared/types';
import { useCurrentUser } from '../../context/AuthContext';
import { useMeta } from '../../hooks/useMeta';
import { formatPeriod, formatYears, roleLine } from '../../utils/format';
import { Button } from '../ui/Button';
import { TextAreaField, TextField } from '../ui/Field';
import { TagInput } from '../ui/TagInput';
import { type BackgroundPart, BackgroundSection } from './BackgroundSection';
import { PhotoUploader } from './PhotoUploader';
import { BasicsSection, ExpertiseSection, GoalsSection, ProjectsSection } from './ProfileSections';
import type { FieldErrors } from './profileDraft';

const FIELD_NAMES: Record<ImportableField, string> = {
  fullName: 'Name',
  headline: 'Headline',
  profession: 'Profession',
  workplace: 'Current work',
  location: 'Location',
  about: 'About',
  skills: 'Skills',
  interests: 'Interests',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  certifications: 'Certifications',
};

interface ImportReviewProps {
  result: LinkedInImportResult;
  draft: ProfileInput;
  update: (patch: Partial<ProfileInput>) => void;
  errors: FieldErrors;
  formError: string;
  onImportAgain: () => void;
  onConfirm: () => void;
  confirming: boolean;
  confirmLabel: string;
}

function Block({ title, empty, onEdit, children }: { title: string; empty?: string; onEdit: () => void; children?: ReactNode }) {
  return (
    <section className="review-block">
      <header>
        <h3>{title}</h3>
        <button type="button" className="text-link" onClick={onEdit}>
          Edit
        </button>
      </header>
      {children ?? <p className="review-block__empty">{empty}</p>}
    </section>
  );
}

function Part({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="review__part">
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

/**
 * "Review your profile", in two parts. First, everything read from the LinkedIn file, laid out
 * as the profile it would create, where the member can remove items or add a photo. Second,
 * "Complete your profile": editable fields for everything else. Nothing is saved until they
 * confirm.
 */
export function ImportReview({
  result,
  draft,
  update,
  errors,
  formError,
  onImportAgain,
  onConfirm,
  confirming,
  confirmLabel,
}: ImportReviewProps) {
  const user = useCurrentUser();
  const meta = useMeta();
  const [editing, setEditing] = useState(false);
  const edit = () => {
    setEditing(true);
    window.scrollTo({ top: 0 });
  };
  const sectionProps = { draft, update, errors };
  const hasErrors = Object.keys(errors).length > 0;
  // Decided once from what the import returned, so fields do not move while the member types.
  const has = (field: ImportableField) => result.imported.includes(field);
  const backgroundParts = (['experience', 'education', 'certifications'] as BackgroundPart[]).filter((part) => !has(part));

  const actions = (
    <div className="review__actions">
      <Button variant="ghost" onClick={onImportAgain} disabled={confirming}>
        <RefreshCw aria-hidden />
        Import again
      </Button>
      {editing ? (
        <Button onClick={() => setEditing(false)} disabled={confirming}>
          <ArrowLeft aria-hidden />
          Back to preview
        </Button>
      ) : (
        <Button onClick={edit} disabled={confirming}>
          <Pencil aria-hidden />
          Edit profile
        </Button>
      )}
      <Button variant="primary" size="lg" onClick={onConfirm} loading={confirming}>
        {confirming ? 'Saving profile…' : confirmLabel}
      </Button>
    </div>
  );

  return (
    <div className="review">
      <div className="review__source">
        <span className="review__source-icon" aria-hidden>
          <Check />
        </span>
        <div>
          <p className="review__source-title">Profile imported</p>
          <p>
            Your details were filled in from <strong>{result.fileName}</strong>.
          </p>
          <ul className="review__fields" aria-label="Details that were imported">
            {result.imported.map((field) => (
              <li key={field} className="badge badge--mint">
                <Check aria-hidden />
                {FIELD_NAMES[field]}
              </li>
            ))}
          </ul>
          {result.notes.length > 0 && (
            <ul className="review__notes">
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(formError || hasErrors) && (
        <p className="notice notice--error" role="alert">
          <CircleAlert aria-hidden />
          <span>{formError || 'Some details need another look. Check the marked fields below, or open “Edit profile” to see everything.'}</span>
        </p>
      )}

      {editing ? (
        <div className="editor__form">
          <section className="card card--pad">
            <header className="editor__section-head">
              <h2>About you</h2>
            </header>
            <BasicsSection {...sectionProps} />
          </section>
          <section className="card card--pad">
            <header className="editor__section-head">
              <h2>Skills and interests</h2>
            </header>
            <ExpertiseSection {...sectionProps} />
          </section>
          <section className="card card--pad">
            <header className="editor__section-head">
              <h2>Experience and education</h2>
            </header>
            <BackgroundSection {...sectionProps} />
          </section>
          <section className="card card--pad">
            <header className="editor__section-head">
              <h2>Projects</h2>
            </header>
            <ProjectsSection {...sectionProps} />
          </section>
          <section className="card card--pad">
            <header className="editor__section-head">
              <h2>Goals and who you want to meet</h2>
            </header>
            <GoalsSection {...sectionProps} />
          </section>
        </div>
      ) : (
        <>
          <div className="card card--pad review__profile">
            <header className="review__section-head">
              <h2>Information imported from LinkedIn</h2>
              <p className="muted">Filled in for you automatically. Change or remove anything that is not right.</p>
            </header>

            <div className="review__header">
              <div className="review__photo">
                <PhotoUploader name={draft.fullName} />
              </div>
              <div className="review__identity">
                <h3>{draft.fullName || user.profile.fullName}</h3>
                {draft.headline && <p className="review__headline">{draft.headline}</p>}
                {roleLine(draft.profession, draft.workplace) && <p className="review__role">{roleLine(draft.profession, draft.workplace)}</p>}
                {draft.location && <p className="muted">{draft.location}</p>}
                <button type="button" className="text-link" onClick={edit}>
                  Edit name, headline and work
                </button>
              </div>
            </div>

            {has('about') && (
              <Block title="About" empty="No summary added" onEdit={edit}>
                {draft.about ? <p className="profile__text">{draft.about}</p> : undefined}
              </Block>
            )}

            {has('skills') && (
              <section className="review-block">
                <TagInput
                  label="Skills"
                  value={draft.skills}
                  onChange={(skills) => update({ skills })}
                  suggestions={meta.skills}
                  max={LIMITS.skills}
                  placeholder="Type a skill and press Enter"
                  error={errors.skills}
                />
              </section>
            )}
            {has('interests') && (
              <section className="review-block">
                <TagInput
                  label="Interests"
                  value={draft.interests}
                  onChange={(interests) => update({ interests })}
                  suggestions={meta.interests}
                  max={LIMITS.interests}
                  placeholder="Type an interest and press Enter"
                  error={errors.interests}
                />
              </section>
            )}

            {has('experience') && (
              <Block title="Experience" empty="No experience added" onEdit={edit}>
                {draft.experience.length > 0 ? (
                  <ol className="timeline">
                    {draft.experience.map((role, index) => (
                      <li key={`${role.title}-${index}`} className="review-item">
                        <div>
                          <h4>{role.title}</h4>
                          <p className="timeline__meta">{[role.company, formatPeriod(role.startDate, role.endDate), role.location].filter(Boolean).join(' · ')}</p>
                          {role.description && <p className="timeline__text">{role.description}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`Remove ${role.title}`}
                          onClick={() => update({ experience: draft.experience.filter((_, position) => position !== index) })}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ol>
                ) : undefined}
              </Block>
            )}

            {has('education') && (
              <Block title="Education" empty="No education added" onEdit={edit}>
                {draft.education.length > 0 ? (
                  <ol className="timeline">
                    {draft.education.map((item, index) => (
                      <li key={`${item.school}-${index}`} className="review-item">
                        <div>
                          <h4>{item.school}</h4>
                          <p className="timeline__meta">
                            {[[item.degree, item.field].filter(Boolean).join(', '), formatYears(item.startYear, item.endYear)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`Remove ${item.school}`}
                          onClick={() => update({ education: draft.education.filter((_, position) => position !== index) })}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ol>
                ) : undefined}
              </Block>
            )}

            {has('projects') && (
              <Block title="Projects" empty="No projects added" onEdit={edit}>
                {draft.projects.length > 0 ? (
                  <ol className="timeline">
                    {draft.projects.map((project, index) => (
                      <li key={`${project.title}-${index}`} className="review-item">
                        <div>
                          <h4>
                            {project.title} <span className="badge">{project.type}</span>
                          </h4>
                          {project.description && <p className="timeline__text">{project.description}</p>}
                          {project.skills.length > 0 && <p className="timeline__meta">Skills: {project.skills.join(', ')}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`Remove ${project.title}`}
                          onClick={() => update({ projects: draft.projects.filter((_, position) => position !== index) })}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ol>
                ) : undefined}
              </Block>
            )}

            {has('certifications') && (
              <Block title="Certifications" empty="No certifications added" onEdit={edit}>
                {draft.certifications.length > 0 ? (
                  <ul className="timeline timeline--plain">
                    {draft.certifications.map((item, index) => (
                      <li key={`${item.name}-${index}`} className="review-item">
                        <div>
                          <h4>{item.name}</h4>
                          {(item.issuer || item.year) && <p className="timeline__meta">{[item.issuer, item.year].filter(Boolean).join(' · ')}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`Remove ${item.name}`}
                          onClick={() => update({ certifications: draft.certifications.filter((_, position) => position !== index) })}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : undefined}
              </Block>
            )}
          </div>

          <div className="card card--pad review__complete">
            <header className="review__section-head">
              <h2>Complete your profile</h2>
              <p className="muted">
                Add any additional information you’d like to include in your professional profile. You can change all of it later.
              </p>
            </header>

            <Part title="Professional details">
              <div className="editor__grid">
                {!has('profession') && (
                  <TextField
                    label="Profession"
                    value={draft.profession}
                    onChange={(event) => update({ profession: event.target.value })}
                    error={errors.profession}
                    maxLength={LIMITS.shortText}
                    placeholder="e.g. Robotics Software Engineer"
                  />
                )}
                {!has('headline') && (
                  <TextField
                    label="Headline"
                    optional
                    value={draft.headline}
                    onChange={(event) => update({ headline: event.target.value })}
                    error={errors.headline}
                    maxLength={LIMITS.headline}
                    placeholder="One line that sums up what you do"
                  />
                )}
                {!has('workplace') && (
                  <TextField
                    label="Current work"
                    optional
                    value={draft.workplace}
                    onChange={(event) => update({ workplace: event.target.value })}
                    error={errors.workplace}
                    maxLength={LIMITS.shortText}
                    placeholder="Company, university or “Independent”"
                  />
                )}
                <TextField
                  label="Specialisation"
                  optional
                  value={draft.specialisation}
                  onChange={(event) => update({ specialisation: event.target.value })}
                  error={errors.specialisation}
                  maxLength={LIMITS.shortText}
                  placeholder="e.g. Autonomous navigation"
                  hint="Your area of focus. It appears on your card under your name."
                />
                {!has('location') && (
                  <TextField
                    label="Location"
                    optional
                    value={draft.location}
                    onChange={(event) => update({ location: event.target.value })}
                    error={errors.location}
                    maxLength={LIMITS.shortText}
                    placeholder="City, country"
                  />
                )}
              </div>
              {!has('about') && (
                <TextAreaField
                  label="About"
                  optional
                  value={draft.about}
                  onChange={(event) => update({ about: event.target.value })}
                  error={errors.about}
                  maxLength={LIMITS.about}
                  rows={4}
                  placeholder="Two or three sentences on what you do and what you enjoy working on."
                />
              )}
            </Part>

            {(!has('skills') || !has('interests')) && (
              <Part title={has('skills') || has('interests') ? undefined : 'Skills and interests'}>
                {!has('skills') && (
                  <TagInput
                    label="Skills"
                    value={draft.skills}
                    onChange={(skills) => update({ skills })}
                    suggestions={meta.skills}
                    max={LIMITS.skills}
                    placeholder="Type a skill and press Enter"
                    hint="Shared and complementary skills are the strongest signal in your recommendations."
                    error={errors.skills}
                  />
                )}
                {!has('interests') && (
                  <TagInput
                    label="Interests"
                    value={draft.interests}
                    onChange={(interests) => update({ interests })}
                    suggestions={meta.interests}
                    max={LIMITS.interests}
                    placeholder="Fields and topics you follow"
                    hint="Interests bring in people outside your own discipline, such as a designer for a robotics enthusiast."
                    error={errors.interests}
                  />
                )}
              </Part>
            )}

            {backgroundParts.length > 0 && (
              <Part>
                <BackgroundSection {...sectionProps} parts={backgroundParts} />
              </Part>
            )}

            {!has('projects') && (
              <Part title="Projects">
                <ProjectsSection {...sectionProps} />
              </Part>
            )}

            <Part title="Career goals and the people you want to meet">
              <GoalsSection {...sectionProps} />
            </Part>
          </div>
        </>
      )}

      {actions}
    </div>
  );
}
