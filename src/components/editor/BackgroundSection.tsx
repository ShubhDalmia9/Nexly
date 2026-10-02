import { Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { LIMITS } from '../../../shared/constants';
import type { Certification, Education, Experience } from '../../../shared/types';
import { Button } from '../ui/Button';
import { TextAreaField, TextField } from '../ui/Field';
import { type SectionProps, emptyCertification, emptyEducation, emptyExperience } from './profileDraft';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface PartialDateProps {
  label: string;
  /** '', 'YYYY' or 'YYYY-MM'. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/** A month (optional) and a year, because people often remember only the year a role began. */
function PartialDateField({ label, value, onChange, error, disabled }: PartialDateProps) {
  const id = useId();
  const [year = '', savedMonth = ''] = value.split('-');
  // A month chosen before the year has nowhere to live in the value yet, so it is held here until the year arrives.
  const [pendingMonth, setPendingMonth] = useState('');
  const month = year ? savedMonth : pendingMonth;
  const set = (nextYear: string, nextMonth: string) => {
    setPendingMonth(nextMonth);
    onChange(nextYear ? (nextMonth ? `${nextYear}-${nextMonth}` : nextYear) : '');
  };
  return (
    <div className="field">
      <span className="field__label" id={`${id}-label`}>
        {label}
      </span>
      <div className="date-pair" role="group" aria-labelledby={`${id}-label`}>
        <select className="select" aria-label={`${label}: month`} value={month} disabled={disabled} onChange={(event) => set(year, event.target.value)}>
          <option value="">Month</option>
          {MONTHS.map((name, index) => (
            <option key={name} value={String(index + 1).padStart(2, '0')}>
              {name}
            </option>
          ))}
        </select>
        <input
          className="input"
          aria-label={`${label}: year`}
          type="number"
          inputMode="numeric"
          min={1950}
          max={2100}
          placeholder="Year"
          value={year}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(event) => set(event.target.value.slice(0, 4), month)}
        />
      </div>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const yearValue = (value: string): number | null => (value === '' ? null : Number(value));

export type BackgroundPart = 'experience' | 'education' | 'certifications';

const ALL_PARTS: BackgroundPart[] = ['experience', 'education', 'certifications'];

/**
 * Work history, education and certifications. All optional; all feed the relevance ranking.
 * `parts` limits the form to some of the three, for screens that show the others elsewhere.
 */
export function BackgroundSection({ draft, update, errors, parts = ALL_PARTS }: SectionProps & { parts?: BackgroundPart[] }) {
  const setRole = (index: number, patch: Partial<Experience>) =>
    update({ experience: draft.experience.map((role, position) => (position === index ? { ...role, ...patch } : role)) });
  const setSchool = (index: number, patch: Partial<Education>) =>
    update({ education: draft.education.map((item, position) => (position === index ? { ...item, ...patch } : item)) });
  const setCertification = (index: number, patch: Partial<Certification>) =>
    update({ certifications: draft.certifications.map((item, position) => (position === index ? { ...item, ...patch } : item)) });

  return (
    <div className="editor__fields">
      {parts.includes('experience') && (
      <div className="editor__group">
        <h3 className="editor__group-title">Experience</h3>
        {draft.experience.length === 0 && <p className="editor__empty">No experience added. Add the roles you have held, most recent first.</p>}
        {draft.experience.map((role, index) => (
            <fieldset key={role.id ?? `new-${index}`} className="project-editor">
              <legend className="sr-only">Role {index + 1}</legend>
              <div className="project-editor__head">
                <span className="eyebrow">Role {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ experience: draft.experience.filter((_, position) => position !== index) })}
                  aria-label={`Remove role ${index + 1}`}
                >
                  <Trash2 aria-hidden />
                  Remove
                </Button>
              </div>
              <div className="editor__grid">
                <TextField
                  label="Title"
                  value={role.title}
                  onChange={(event) => setRole(index, { title: event.target.value })}
                  error={errors[`experience.${index}.title`]}
                  maxLength={100}
                  placeholder="e.g. Robotics Engineer"
                />
                <TextField
                  label="Company or organisation"
                  optional
                  value={role.company}
                  onChange={(event) => setRole(index, { company: event.target.value })}
                  error={errors[`experience.${index}.company`]}
                  maxLength={100}
                />
                <PartialDateField label="Started" value={role.startDate} onChange={(startDate) => setRole(index, { startDate })} error={errors[`experience.${index}.startDate`]} />
                <div className="stack" style={{ gap: 8 }}>
                  <PartialDateField
                    label="Ended"
                    value={role.endDate}
                    onChange={(endDate) => setRole(index, { endDate })}
                    error={errors[`experience.${index}.endDate`]}
                  />
                  <p className="field__hint">Leave the end empty if you still hold this role.</p>
                </div>
                <TextField
                  label="Location"
                  optional
                  value={role.location}
                  onChange={(event) => setRole(index, { location: event.target.value })}
                  maxLength={LIMITS.shortText}
                  placeholder="City, country"
                />
              </div>
              <TextAreaField
                label="What you did"
                optional
                value={role.description}
                onChange={(event) => setRole(index, { description: event.target.value })}
                error={errors[`experience.${index}.description`]}
                maxLength={600}
                rows={2}
              />
            </fieldset>
        ))}
        {draft.experience.length < LIMITS.experience && (
          <Button variant="soft" onClick={() => update({ experience: [...draft.experience, emptyExperience()] })} style={{ alignSelf: 'flex-start' }}>
            <Plus aria-hidden />
            Add {draft.experience.length === 0 ? 'a role' : 'another role'}
          </Button>
        )}
      </div>
      )}

      {parts.includes('education') && (
      <div className="editor__group">
        <h3 className="editor__group-title">Education</h3>
        {draft.education.length === 0 && <p className="editor__empty">No education added.</p>}
        {draft.education.map((item, index) => (
          <fieldset key={item.id ?? `new-${index}`} className="project-editor">
            <legend className="sr-only">School {index + 1}</legend>
            <div className="project-editor__head">
              <span className="eyebrow">School {index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update({ education: draft.education.filter((_, position) => position !== index) })}
                aria-label={`Remove school ${index + 1}`}
              >
                <Trash2 aria-hidden />
                Remove
              </Button>
            </div>
            <div className="editor__grid">
              <TextField
                label="School or university"
                value={item.school}
                onChange={(event) => setSchool(index, { school: event.target.value })}
                error={errors[`education.${index}.school`]}
                maxLength={120}
              />
              <TextField label="Degree" optional value={item.degree} onChange={(event) => setSchool(index, { degree: event.target.value })} maxLength={100} placeholder="e.g. BSc" />
              <TextField
                label="Field of study"
                optional
                value={item.field}
                onChange={(event) => setSchool(index, { field: event.target.value })}
                maxLength={100}
                placeholder="e.g. Computer Science"
              />
              <div className="date-pair">
                <TextField
                  label="From"
                  optional
                  type="number"
                  inputMode="numeric"
                  min={1950}
                  max={2100}
                  value={item.startYear ?? ''}
                  onChange={(event) => setSchool(index, { startYear: yearValue(event.target.value) })}
                  error={errors[`education.${index}.startYear`]}
                />
                <TextField
                  label="To"
                  optional
                  type="number"
                  inputMode="numeric"
                  min={1950}
                  max={2100}
                  value={item.endYear ?? ''}
                  onChange={(event) => setSchool(index, { endYear: yearValue(event.target.value) })}
                  error={errors[`education.${index}.endYear`]}
                />
              </div>
            </div>
          </fieldset>
        ))}
        {draft.education.length < LIMITS.education && (
          <Button variant="soft" onClick={() => update({ education: [...draft.education, emptyEducation()] })} style={{ alignSelf: 'flex-start' }}>
            <Plus aria-hidden />
            Add {draft.education.length === 0 ? 'education' : 'another school'}
          </Button>
        )}
      </div>
      )}

      {parts.includes('certifications') && (
      <div className="editor__group">
        <h3 className="editor__group-title">Certifications</h3>
        {draft.certifications.length === 0 && <p className="editor__empty">No certifications added.</p>}
        {draft.certifications.map((item, index) => (
          <div key={item.id ?? `new-${index}`} className="certification-row">
            <TextField
              label="Certification"
              value={item.name}
              onChange={(event) => setCertification(index, { name: event.target.value })}
              error={errors[`certifications.${index}.name`]}
              maxLength={120}
            />
            <TextField label="Issued by" optional value={item.issuer} onChange={(event) => setCertification(index, { issuer: event.target.value })} maxLength={100} />
            <TextField
              label="Year"
              optional
              type="number"
              inputMode="numeric"
              min={1950}
              max={2100}
              value={item.year ?? ''}
              onChange={(event) => setCertification(index, { year: yearValue(event.target.value) })}
              error={errors[`certifications.${index}.year`]}
            />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={() => update({ certifications: draft.certifications.filter((_, position) => position !== index) })}
              aria-label={`Remove certification ${index + 1}`}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        {draft.certifications.length < LIMITS.certifications && (
          <Button variant="soft" onClick={() => update({ certifications: [...draft.certifications, emptyCertification()] })} style={{ alignSelf: 'flex-start' }}>
            <Plus aria-hidden />
            Add a certification
          </Button>
        )}
      </div>
      )}
    </div>
  );
}
