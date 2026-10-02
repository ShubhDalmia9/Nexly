import { CircleAlert } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { LIMITS } from '../../../shared/constants';
import { ApiError, errorMessage } from '../../api/client';
import { PasswordSetup } from '../../components/auth/PasswordSetup';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { meetsPasswordRules } from '../../utils/password';

const logInLink = (
  <>
    Already have an account?{' '}
    <Link to="/login" className="text-link">
      Log in
    </Link>
  </>
);

/** Create an account with a name, an email address and a password. */
export function Signup() {
  usePageTitle('Create your account');
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // On success the route guard (PublicOnly in App.tsx) moves the new member on to setting up their profile.
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const invalid: Record<string, string> = {};
    if (fullName.trim().length < 2) invalid.fullName = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) invalid.email = 'Enter a valid email address.';
    if (!password) invalid.password = 'Enter a password.';
    else if (!meetsPasswordRules(password)) invalid.password = 'Choose a password that meets all the requirements below.';
    else if (password !== confirm) invalid.confirm = 'The two passwords are not the same.';
    setFields(invalid);
    setFormError('');
    if (Object.keys(invalid).length > 0) return;

    setSubmitting(true);
    try {
      await signUp({ fullName: fullName.trim(), email: email.trim(), password });
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fields).length > 0) setFields(caught.fields);
      else setFormError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join Nexly to find relevant professional connections faster." footer={logInLink}>
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {formError && (
          <p className="notice notice--error" role="alert">
            <CircleAlert aria-hidden />
            <span>{formError}</span>
          </p>
        )}
        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={fields.fullName}
          maxLength={LIMITS.name}
          placeholder="Jordan Lee"
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fields.email}
          placeholder="you@example.com"
        />
        <PasswordSetup password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} errors={fields} />
        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          {submitting ? 'Creating your account…' : 'Create account'}
        </Button>
        <p className="auth__fineprint">Your email is only shown to people you are connected with.</p>
      </form>
    </AuthLayout>
  );
}
