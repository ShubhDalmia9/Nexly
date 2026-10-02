import { CircleAlert, FileDown } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { computeCompletion } from '../../shared/completion';
import type { LinkedInImportResult, ProfileInput } from '../../shared/types';
import { api } from '../api';
import { ApiError, errorMessage } from '../api/client';
import { BackgroundSection } from '../components/editor/BackgroundSection';
import { LinkedInImport } from '../components/editor/LinkedInImport';
import { BasicsSection, ExpertiseSection, GoalsSection, ProjectsSection } from '../components/editor/ProfileSections';
import { type FieldErrors, mergeImport, profileToInput, withoutBlankEntries } from '../components/editor/profileDraft';
import { Button, buttonClass } from '../components/ui/Button';
import { ProgressRing } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { useAuth, useCurrentUser } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { plural } from '../utils/format';

const SECTIONS = [
  { id: 'basics', title: 'About you', text: 'Shown at the top of your card.' },
  { id: 'expertise', title: 'Skills and interests', text: 'The strongest signals in your recommendations.' },
  { id: 'background', title: 'Experience and education', text: 'Your work history, studies and certifications.' },
  { id: 'goals', title: 'Goals and who you want to meet', text: 'Used to recommend people who are looking for the reverse.' },
  { id: 'projects', title: 'Projects', text: 'Your card features the project most relevant to each viewer.' },
] as const;

export function EditProfile() {
  usePageTitle('Edit profile');
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<ProfileInput>(() => profileToInput(user.profile));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<LinkedInImportResult | null>(null);

  const saved = useMemo(() => JSON.stringify(profileToInput(user.profile)), [user.profile]);
  const dirty = JSON.stringify(draft) !== saved;
  const completion = computeCompletion({ ...withoutBlankEntries(draft), photoUrl: user.profile.photoUrl });

  const update = (patch: Partial<ProfileInput>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const { user: updated } = await api.profile.save(withoutBlankEntries(draft));
      setUser(updated);
      setDraft(profileToInput(updated.profile));
      setErrors({});
      toast('Profile saved. Your recommendations have been updated.');
      navigate('/profile');
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fields).length > 0) {
        setErrors(caught.fields);
        setFormError('Some details need another look. They are marked below.');
      } else {
        setFormError(errorMessage(caught));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  /** Lays the import over the form. The member still has to press Save for it to reach their profile. */
  const applyImport = (mode: 'fill' | 'replace') => {
    if (!imported) return;
    setDraft((current) => mergeImport(current, imported.draft, mode));
    setImported(null);
    toast('Imported details added to the form. Review them, then save your changes.');
  };

  const sectionProps = { draft, update, errors };

  return (
    <div className="page-narrow editor">
      <header className="page-head">
        <div>
          <h1>Edit profile</h1>
          <p>Changes update your card and your recommendations as soon as you save.</p>
        </div>
        <div className="editor__strength">
          <ProgressRing value={completion.percent} size={56} stroke={6} label={`Profile ${completion.percent}% complete`} />
          <span>Profile strength</span>
        </div>
      </header>

      <div className="card editor__import">
        <span className="tile__icon">
          <FileDown aria-hidden />
        </span>
        <div>
          <strong>Import from LinkedIn</strong>
          <p className="muted">Upload your LinkedIn PDF or data export ZIP to fill in your experience, education and skills. You review everything before saving.</p>
        </div>
        <Button size="sm" onClick={() => setImporting(true)}>
          Import
        </Button>
      </div>

      {formError && (
        <p className="notice notice--error" role="alert">
          <CircleAlert aria-hidden />
          <span>{formError}</span>
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="editor__form">
        {SECTIONS.map((section) => (
          <section key={section.id} className="card card--pad" aria-labelledby={`edit-${section.id}`}>
            <header className="editor__section-head">
              <h2 id={`edit-${section.id}`}>{section.title}</h2>
              <p className="muted">{section.text}</p>
            </header>
            {section.id === 'basics' && <BasicsSection {...sectionProps} />}
            {section.id === 'expertise' && <ExpertiseSection {...sectionProps} />}
            {section.id === 'background' && <BackgroundSection {...sectionProps} />}
            {section.id === 'goals' && <GoalsSection {...sectionProps} />}
            {section.id === 'projects' && <ProjectsSection {...sectionProps} />}
          </section>
        ))}

        <div className="save-bar">
          <span className="save-bar__status" role="status">
            {dirty ? 'You have unsaved changes' : 'All changes saved'}
          </span>
          <Link to="/profile" className={buttonClass({ variant: 'ghost' })}>
            Cancel
          </Link>
          <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
            {saving ? 'Saving profile…' : 'Save changes'}
          </Button>
        </div>
      </form>

      {/* Rendered outside the form above: React submit events bubble through portals to their React parent. */}
      <Modal open={importing} onClose={() => setImporting(false)} title="Import your LinkedIn profile" wide>
        <LinkedInImport
          cancelLabel="Cancel"
          onCancel={() => setImporting(false)}
          onResult={(result) => {
            setImporting(false);
            setImported(result);
          }}
        />
      </Modal>

      <Modal
        open={imported !== null}
        onClose={() => setImported(null)}
        title="Profile imported"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImported(null)}>
              Discard
            </Button>
            <Button onClick={() => applyImport('replace')}>Replace my details</Button>
            <Button variant="primary" onClick={() => applyImport('fill')}>
              Fill empty fields only
            </Button>
          </>
        }
      >
        {imported && (
          <div className="stack" style={{ gap: 14 }}>
            <p>
              Imported from <strong>{imported.fileName}</strong>: {plural(imported.imported.length, 'section', 'sections')}, including{' '}
              {[
                imported.draft.experience?.length ? plural(imported.draft.experience.length, 'role', 'roles') : '',
                imported.draft.skills?.length ? plural(imported.draft.skills.length, 'skill', 'skills') : '',
                imported.draft.education?.length ? plural(imported.draft.education.length, 'school', 'schools') : '',
                imported.draft.projects?.length ? plural(imported.draft.projects.length, 'project', 'projects') : '',
              ]
                .filter(Boolean)
                .join(', ') || 'your name'}
              .
            </p>
            {imported.notes.length > 0 && (
              <ul className="review__notes">
                {imported.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              The details go into the form on this page. Nothing changes on your profile until you press Save changes.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
