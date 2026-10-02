import { Check, Plus, Trash2 } from 'lucide-react';
import { CONNECTION_TYPES, type ConnectionTypeId, LIMITS, PROJECT_TYPES } from '../../../shared/constants';
import type { Project } from '../../../shared/types';
import { useMeta } from '../../hooks/useMeta';
import { cx } from '../../utils/format';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { TagInput } from '../ui/TagInput';
import { PhotoUploader } from './PhotoUploader';
import { ProjectImageField } from './ProjectImageField';
import { type SectionProps, emptyProject } from './profileDraft';

const SKILL_PICKS = ['Python', 'JavaScript', 'Figma', 'CAD', 'Machine Learning', 'Product Strategy', 'Research', 'Robotics', 'Data Analysis', 'Growth Marketing'];
const INTEREST_PICKS = ['AI', 'Startups', 'Robotics', 'Open Source', 'Climate Tech', 'FinTech', 'Education', 'Design Systems'];

export function BasicsSection({ draft, update, errors }: SectionProps) {
  return (
    <div className="editor__fields">
      <PhotoUploader name={draft.fullName} />
      <div className="editor__grid">
        <TextField
          label="Full name"
          value={draft.fullName}
          onChange={(event) => update({ fullName: event.target.value })}
          error={errors.fullName}
          maxLength={LIMITS.name}
          autoComplete="name"
        />
        <TextField
          label="Profession"
          value={draft.profession}
          onChange={(event) => update({ profession: event.target.value })}
          error={errors.profession}
          maxLength={LIMITS.shortText}
          placeholder="e.g. Robotics Software Engineer"
        />
        <TextField
          label="Headline"
          optional
          value={draft.headline}
          onChange={(event) => update({ headline: event.target.value })}
          error={errors.headline}
          maxLength={LIMITS.headline}
          placeholder="One line that sums up what you do"
        />
        <TextField
          label="Current work"
          optional
          value={draft.workplace}
          onChange={(event) => update({ workplace: event.target.value })}
          error={errors.workplace}
          maxLength={LIMITS.shortText}
          placeholder="Company, university or “Independent”"
        />
        <TextField
          label="Specialisation"
          optional
          value={draft.specialisation}
          onChange={(event) => update({ specialisation: event.target.value })}
          error={errors.specialisation}
          maxLength={LIMITS.shortText}
          placeholder="e.g. Autonomous navigation"
        />
        <TextField
          label="Location"
          optional
          value={draft.location}
          onChange={(event) => update({ location: event.target.value })}
          error={errors.location}
          maxLength={LIMITS.shortText}
          placeholder="City, country"
          autoComplete="address-level2"
        />
        <TextField
          label="LinkedIn profile link"
          optional
          type="url"
          value={draft.linkedinUrl}
          onChange={(event) => update({ linkedinUrl: event.target.value })}
          error={errors.linkedinUrl}
          placeholder="https://www.linkedin.com/in/your-name"
        />
      </div>
      <TextAreaField
        label="About"
        optional
        value={draft.about}
        onChange={(event) => update({ about: event.target.value })}
        error={errors.about}
        maxLength={LIMITS.about}
        rows={4}
        placeholder="Two or three sentences on what you do and what you enjoy working on."
        hint="Shown on your full profile, not on your card."
      />
    </div>
  );
}

export function ExpertiseSection({ draft, update, errors }: SectionProps) {
  const meta = useMeta();
  return (
    <div className="editor__fields">
      <TagInput
        label="Skills"
        value={draft.skills}
        onChange={(skills) => update({ skills })}
        suggestions={meta.skills}
        max={LIMITS.skills}
        placeholder="Type a skill and press Enter"
        hint="Shared and complementary skills are the strongest signal in your recommendations. Add at least three."
        error={errors.skills}
        quickPicks={SKILL_PICKS}
      />
      <TagInput
        label="Interests"
        value={draft.interests}
        onChange={(interests) => update({ interests })}
        suggestions={meta.interests}
        max={LIMITS.interests}
        placeholder="Fields and topics you follow"
        hint="Interests surface people outside your own discipline, such as a designer for a robotics enthusiast."
        error={errors.interests}
        quickPicks={INTEREST_PICKS}
      />
    </div>
  );
}

export function GoalsSection({ draft, update, errors }: SectionProps) {
  const meta = useMeta();
  const toggle = (id: ConnectionTypeId) => {
    update({ lookingFor: draft.lookingFor.includes(id) ? draft.lookingFor.filter((item) => item !== id) : [...draft.lookingFor, id] });
  };

  return (
    <div className="editor__fields">
      <TextAreaField
        label="Career aspirations"
        optional
        value={draft.aspirations}
        onChange={(event) => update({ aspirations: event.target.value })}
        error={errors.aspirations}
        maxLength={LIMITS.aspirations}
        rows={3}
        placeholder="Where do you want your career to go next?"
      />
      <TagInput
        label="Career goals"
        optional
        value={draft.goals}
        onChange={(goals) => update({ goals })}
        suggestions={meta.goals}
        max={LIMITS.goals}
        placeholder="e.g. Launch a startup"
        hint="Short goals are compared with other members' goals."
        error={errors.goals}
        quickPicks={meta.goals.slice(0, 6)}
      />
      <fieldset className="choice-group">
        <legend className="field__label">
          <span>
            Who do you want to connect with? <span className="field__optional">(choose any)</span>
          </span>
        </legend>
        <p className="field__hint">
          You are shown people looking for the reverse: choose “Mentors” and you will see people who chose “Mentees”.
        </p>
        <div className="choice-grid">
          {CONNECTION_TYPES.map((type) => {
            const selected = draft.lookingFor.includes(type.id);
            return (
              <button key={type.id} type="button" className={cx('choice', selected && 'is-selected')} aria-pressed={selected} onClick={() => toggle(type.id)}>
                <span className="choice__check" aria-hidden>
                  <Check />
                </span>
                <span>
                  <strong>{type.label}</strong>
                  <small>{type.hint}</small>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

export function ProjectsSection({ draft, update, errors }: SectionProps) {
  const meta = useMeta();
  const projects = draft.projects;
  const setProject = (index: number, patch: Partial<Project>) => {
    update({ projects: projects.map((project, position) => (position === index ? { ...project, ...patch } : project)) });
  };
  const remove = (index: number) => update({ projects: projects.filter((_, position) => position !== index) });

  return (
    <div className="editor__fields">
      {projects.length === 0 && (
        <p className="editor__empty">
          No projects yet. A project shows what you have actually built, and your card features the one most relevant to each viewer.
        </p>
      )}
      {projects.map((project, index) => (
        <fieldset key={project.id ?? `new-${index}`} className="project-editor">
          <legend className="sr-only">Project {index + 1}</legend>
          <div className="project-editor__head">
            <span className="eyebrow">Project {index + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => remove(index)} aria-label={`Remove project ${index + 1}`}>
              <Trash2 aria-hidden />
              Remove
            </Button>
          </div>
          <div className="editor__grid">
            <TextField
              label="Title"
              value={project.title}
              onChange={(event) => setProject(index, { title: event.target.value })}
              error={errors[`projects.${index}.title`]}
              maxLength={LIMITS.projectTitle}
              placeholder="e.g. Low-cost robotic arm"
            />
            <SelectField
              label="Type"
              value={project.type}
              onChange={(event) => setProject(index, { type: event.target.value })}
              options={PROJECT_TYPES.map((type) => ({ value: type, label: type }))}
            />
            <TextField
              label="Your role"
              optional
              value={project.role}
              onChange={(event) => setProject(index, { role: event.target.value })}
              error={errors[`projects.${index}.role`]}
              maxLength={LIMITS.shortText}
              placeholder="e.g. Lead designer"
            />
            <TextField
              label="Year"
              optional
              type="number"
              inputMode="numeric"
              min={1970}
              max={2100}
              value={project.year ?? ''}
              onChange={(event) => setProject(index, { year: event.target.value === '' ? null : Number(event.target.value) })}
              error={errors[`projects.${index}.year`]}
            />
          </div>
          <TextAreaField
            label="What was it?"
            optional
            value={project.description}
            onChange={(event) => setProject(index, { description: event.target.value })}
            error={errors[`projects.${index}.description`]}
            maxLength={LIMITS.projectDescription}
            rows={2}
            placeholder="One or two sentences on what you built and the result."
          />
          <TagInput
            label="Skills used"
            optional
            value={project.skills}
            onChange={(skills) => setProject(index, { skills })}
            suggestions={meta.skills}
            max={LIMITS.projectSkills}
            placeholder="e.g. CAD, 3D Printing"
            error={errors[`projects.${index}.skills`]}
          />
          <TextField
            label="Link"
            optional
            type="url"
            value={project.url}
            onChange={(event) => setProject(index, { url: event.target.value })}
            error={errors[`projects.${index}.url`]}
            placeholder="https://"
          />
          <ProjectImageField label="Project image" imageUrl={project.imageUrl} onChange={(imageUrl) => setProject(index, { imageUrl })} />
        </fieldset>
      ))}
      {projects.length < LIMITS.projects && (
        <Button variant="soft" onClick={() => update({ projects: [...projects, emptyProject()] })} style={{ alignSelf: 'flex-start' }}>
          <Plus aria-hidden />
          Add {projects.length === 0 ? 'a project' : 'another project'}
        </Button>
      )}
      {errors.projects && (
        <p className="field__error" role="alert">
          {errors.projects}
        </p>
      )}
    </div>
  );
}
