import { ArrowLeft, ArrowRight, Check, CircleAlert, FileDown, LogOut, PenLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeCompletion, onboardingBlockers } from '../../shared/completion';
import type { LinkedInImportResult, Person, ProfileInput } from '../../shared/types';
import { api } from '../api';
import { ApiError, errorMessage } from '../api/client';
import { DeckCard } from '../components/discovery/DeckCard';
import { BackgroundSection } from '../components/editor/BackgroundSection';
import { ImportReview } from '../components/editor/ImportReview';
import { LinkedInImport } from '../components/editor/LinkedInImport';
import { BasicsSection, ExpertiseSection, GoalsSection, ProjectsSection } from '../components/editor/ProfileSections';
import { type FieldErrors, mergeImport, profileToInput, withoutBlankEntries } from '../components/editor/profileDraft';
import { Button } from '../components/ui/Button';
import { ProgressRing } from '../components/ui/Feedback';
import { Logo } from '../components/ui/Logo';
import { useAuth, useCurrentUser } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { cx, firstName } from '../utils/format';

const STEPS = [
  { id: 'basics', label: 'About you', title: 'The basics', text: 'This is what people see first on your card.' },
  { id: 'expertise', label: 'Expertise', title: 'What you know and follow', text: 'Skills and interests drive most of your recommendations.' },
  { id: 'background', label: 'Background', title: 'Where you have been', text: 'Optional. Work history and education help us find people with a related background.' },
  { id: 'goals', label: 'Goals', title: 'Where you are heading', text: 'Tell us what you want next and who could help you get there.' },
  { id: 'projects', label: 'Projects', title: 'What you have built', text: 'Optional, but projects are the best proof of what you can do.' },
  { id: 'review', label: 'Review', title: 'Your card', text: 'This is how you will appear to other members in Discover.' },
] as const;

type StepId = (typeof STEPS)[number]['id'];
type Mode = 'choose' | 'import' | 'review' | 'form';

/** Checks the fields a step is responsible for before moving on. */
function validateStep(step: StepId, draft: ProfileInput): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 'basics') {
    if (draft.fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
    if (!draft.profession.trim()) errors.profession = 'Enter your profession so people know what you do.';
  }
  if (step === 'expertise' && draft.skills.length === 0) errors.skills = 'Add at least one skill.';
  return errors;
}

export function Onboarding() {
  usePageTitle('Set up your profile');
  const user = useCurrentUser();
  const { setUser, logOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [mode, setMode] = useState<Mode>('choose');
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ProfileInput>(() => profileToInput(user.profile));
  const [imported, setImported] = useState<LinkedInImportResult | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const completion = computeCompletion({ ...withoutBlankEntries(draft), photoUrl: user.profile.photoUrl });

  const applyImport = (result: LinkedInImportResult) => {
    setImported(result);
    // The imported details replace the (still empty) draft; the member's sign-up name is kept if the import has none.
    setDraft((current) => mergeImport(current, result.draft, 'replace'));
    setErrors({});
    setFormError('');
    setMode('review');
  };

  // Move focus to the new screen's heading so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [stepIndex, mode]);

  const update = (patch: Partial<ProfileInput>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  const reportFailure = (caught: unknown) => {
    if (caught instanceof ApiError && Object.keys(caught.fields).length > 0) {
      setErrors(caught.fields);
      setFormError('Some details need another look. They are marked in the form.');
    } else {
      setFormError(errorMessage(caught));
    }
  };

  /** Saves the profile for good. The route guard in App.tsx then moves the new member into Discover. */
  const createProfile = async () => {
    const input = withoutBlankEntries(draft);
    const blockers = onboardingBlockers(input);
    setFormError('');
    if (blockers.length > 0) {
      setFormError(`Add ${blockers.join(' and ')} to create your profile.`);
      return;
    }
    setSaving(true);
    try {
      const { user: updated } = await api.profile.save(input, true);
      toast(`You are in, ${firstName(updated.profile.fullName)}. Here are the people recommended for you.`);
      setUser(updated);
    } catch (caught) {
      reportFailure(caught);
      setSaving(false);
    }
  };

  const goNext = async () => {
    const stepErrors = validateStep(step.id, draft);
    setErrors(stepErrors);
    setFormError('');
    if (Object.keys(stepErrors).length > 0) return;
    if (isLast) {
      await createProfile();
      return;
    }
    setSaving(true);
    try {
      // Each step is saved as you go, so a refresh never loses work.
      const { user: updated } = await api.profile.save(withoutBlankEntries(draft), false);
      setUser(updated);
      setDraft(profileToInput(updated.profile));
      setStepIndex((current) => current + 1);
    } catch (caught) {
      reportFailure(caught);
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    // Leave the protected page first; otherwise its guard would redirect to the login page as the session ends.
    navigate('/');
    void logOut();
  };

  const preview: Person = {
    profile: { ...user.profile, ...draft },
    relevance: { score: 0, tier: 'low', reasons: [], sharedSkills: [], sharedInterests: [], sharedGoals: [], complementarySkills: [], relevantProjects: [] },
    connection: { id: null, status: 'self', since: null },
  };

  const sectionProps = { draft, update, errors };

  return (
    <div className="onboarding">
      <header className="onboarding__top">
        <Logo />
        <button type="button" className="btn btn--ghost btn--sm" onClick={signOut}>
          <LogOut aria-hidden />
          Log out
        </button>
      </header>

      <main className="onboarding__main">
        {mode === 'choose' && (
          <section className="onboarding__panel page-enter">
            <p className="eyebrow">Welcome, {firstName(user.profile.fullName)}</p>
            <h1 ref={headingRef} tabIndex={-1}>
              Create your profile
            </h1>
            <p className="onboarding__lead">
              It takes about three minutes. Your profile decides who is recommended to you and why, so the more you add, the better your
              recommendations.
            </p>
            <div className="start-options">
              <button type="button" className="start-option" onClick={() => setMode('import')}>
                <span className="tile__icon">
                  <FileDown aria-hidden />
                </span>
                <strong>Import from LinkedIn</strong>
                <span>Upload your LinkedIn PDF or data export and your experience, education and skills are filled in for you to review.</span>
                <span className="start-option__cta">
                  Import <ArrowRight aria-hidden />
                </span>
              </button>
              <button type="button" className="start-option" onClick={() => setMode('form')}>
                <span className="tile__icon">
                  <PenLine aria-hidden />
                </span>
                <strong>Start from scratch</strong>
                <span>Fill in a short, guided form. You can skip anything optional.</span>
                <span className="start-option__cta">
                  Begin <ArrowRight aria-hidden />
                </span>
              </button>
            </div>
          </section>
        )}

        {mode === 'import' && (
          <section className="onboarding__panel page-enter">
            <h1 ref={headingRef} tabIndex={-1}>
              Import your LinkedIn profile
            </h1>
            <p className="onboarding__lead">Upload your LinkedIn PDF or data export ZIP to quickly create your professional profile.</p>
            <div className="card card--pad">
              <LinkedInImport onResult={applyImport} onCancel={() => setMode('choose')} />
            </div>
          </section>
        )}

        {mode === 'review' && imported && (
          <section className="onboarding__panel page-enter">
            <h1 ref={headingRef} tabIndex={-1}>
              Review your profile
            </h1>
            <p className="onboarding__lead">Review and complete your professional profile before continuing.</p>
            <ImportReview
              result={imported}
              draft={draft}
              update={update}
              errors={errors}
              formError={formError}
              onImportAgain={() => setMode('import')}
              onConfirm={createProfile}
              confirming={saving}
              confirmLabel="Create profile"
            />
          </section>
        )}

        {mode === 'form' && (
          <section className="onboarding__panel page-enter" key={step.id}>
            <ol className="stepper" aria-label="Profile setup progress">
              {STEPS.map((item, index) => (
                <li
                  key={item.id}
                  className={cx('stepper__item', index === stepIndex && 'is-current', index < stepIndex && 'is-done')}
                  aria-current={index === stepIndex ? 'step' : undefined}
                >
                  <span className="stepper__dot" aria-hidden>
                    {index < stepIndex ? <Check /> : index + 1}
                  </span>
                  <span className="stepper__label">{item.label}</span>
                </li>
              ))}
            </ol>

            <div className="onboarding__heading">
              <div>
                <p className="eyebrow">
                  Step {stepIndex + 1} of {STEPS.length}
                </p>
                <h1 ref={headingRef} tabIndex={-1}>
                  {step.title}
                </h1>
                <p className="onboarding__lead">{step.text}</p>
              </div>
              <div className="onboarding__ring">
                <ProgressRing value={completion.percent} size={64} stroke={6} label={`Profile ${completion.percent}% complete`} />
                <span>Profile strength</span>
              </div>
            </div>

            {formError && (
              <p className="notice notice--error" role="alert" style={{ marginBottom: 16 }}>
                <CircleAlert aria-hidden />
                <span>{formError}</span>
              </p>
            )}

            <form
              className="card card--pad"
              onSubmit={(event) => {
                event.preventDefault();
                void goNext();
              }}
              noValidate
            >
              {step.id === 'basics' && <BasicsSection {...sectionProps} />}
              {step.id === 'expertise' && <ExpertiseSection {...sectionProps} />}
              {step.id === 'background' && <BackgroundSection {...sectionProps} />}
              {step.id === 'goals' && <GoalsSection {...sectionProps} />}
              {step.id === 'projects' && <ProjectsSection {...sectionProps} />}
              {step.id === 'review' && (
                <div className="card-review">
                  <div className="card-review__card" aria-label="Preview of your discovery card">
                    <DeckCard person={preview} preview />
                  </div>
                  <div className="card-review__side">
                    <h2 className="card__title">Profile strength: {completion.percent}%</h2>
                    <ul className="checklist">
                      {completion.items.map((item) => (
                        <li key={item.key} className={cx(item.done && 'is-done')}>
                          <span className="checklist__mark" aria-hidden>
                            {item.done && <Check />}
                          </span>
                          <span>
                            {item.label}
                            {!item.done && <small>{item.hint}</small>}
                          </span>
                          <span className="sr-only">{item.done ? ' (done)' : ' (missing)'}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                      You can finish now and add the rest later from your profile.
                    </p>
                  </div>
                </div>
              )}

              <div className="onboarding__nav">
                <Button
                  variant="ghost"
                  onClick={() => (stepIndex === 0 ? setMode('choose') : setStepIndex((current) => current - 1))}
                  disabled={saving}
                >
                  <ArrowLeft aria-hidden />
                  Back
                </Button>
                <Button type="submit" variant="primary" size="lg" loading={saving}>
                  {saving ? 'Saving profile…' : isLast ? 'Create profile' : 'Save and continue'}
                  {!isLast && !saving && <ArrowRight aria-hidden />}
                </Button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
