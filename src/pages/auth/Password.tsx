import { CircleAlert, CircleCheck } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { ApiError, errorMessage } from '../../api/client';
import { CheckInbox } from '../../components/auth/CheckInbox';
import { PasswordSetup } from '../../components/auth/PasswordSetup';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button, buttonClass } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { usePageTitle } from '../../hooks/usePageTitle';
import { meetsPasswordRules } from '../../utils/password';

const backToLogin = (
  <>
    Remembered it?{' '}
    <Link to="/login" className="text-link">
      Back to log in
    </Link>
  </>
);

/** "Forgot password?": asks for the address and sends a reset link to it. */
export function ForgotPassword() {
  usePageTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.auth.forgotPassword(email.trim());
      setSentTo(email.trim());
    } catch (caught) {
      setError(caught instanceof ApiError && caught.fields.email ? caught.fields.email : errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout title="Check your inbox" subtitle="Use the link to choose a new password." footer={backToLogin}>
        <CheckInbox
          email={sentTo}
          onResend={() => api.auth.forgotPassword(sentTo)}
          onChangeEmail={() => setSentTo(null)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter the email you signed up with and we will send you a reset link." footer={backToLogin}>
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error}
          placeholder="you@example.com"
        />
        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          {submitting ? 'Sending reset email…' : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  );
}

type ResetState = { step: 'checking' } | { step: 'ready'; email: string } | { step: 'invalid'; code: string; message: string } | { step: 'done' };

const checks = new Map<string, Promise<{ email: string }>>();

/** Where the link in the reset email lands: "Create a new password". */
export function ResetPassword() {
  usePageTitle('Create a new password');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<ResetState>({ step: 'checking' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check the link before showing the form, so an expired link is reported straight away.
  useEffect(() => {
    if (!token) {
      setState({ step: 'invalid', code: 'TOKEN_INVALID', message: 'This reset link is incomplete. Open the link from your email again.' });
      return;
    }
    let active = true;
    let request = checks.get(token);
    if (!request) {
      request = api.auth.checkResetToken(token);
      checks.set(token, request);
    }
    request.then(
      (result) => active && setState({ step: 'ready', email: result.email }),
      (caught) => active && setState({ step: 'invalid', code: caught instanceof ApiError ? caught.code : 'UNKNOWN', message: errorMessage(caught) }),
    );
    return () => {
      active = false;
    };
  }, [token]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const invalid: typeof errors = {};
    if (!meetsPasswordRules(password)) invalid.password = 'Choose a password that meets all the requirements below.';
    else if (password !== confirm) invalid.confirm = 'The two passwords are not the same.';
    setErrors(invalid);
    setFormError('');
    if (Object.keys(invalid).length > 0) return;

    setSubmitting(true);
    try {
      await api.auth.resetPassword(token, password);
      setState({ step: 'done' });
    } catch (caught) {
      if (caught instanceof ApiError && caught.fields.password) setErrors({ password: caught.fields.password });
      else if (caught instanceof ApiError && caught.code.startsWith('TOKEN_')) setState({ step: 'invalid', code: caught.code, message: caught.message });
      else setFormError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.step === 'checking') {
    return (
      <AuthLayout title="Checking your link" subtitle="This only takes a moment.">
        <div className="auth__status" role="status">
          <span className="spinner spinner--lg" aria-hidden />
          Checking your link…
        </div>
      </AuthLayout>
    );
  }

  if (state.step === 'invalid') {
    return (
      <AuthLayout
        title={state.code === 'TOKEN_EXPIRED' ? 'This link has expired' : state.code === 'TOKEN_USED' ? 'This link has already been used' : 'This link is not valid'}
        subtitle={state.message}
        footer={backToLogin}
      >
        <Link to="/forgot-password" className={buttonClass({ variant: 'primary', size: 'lg', block: true })}>
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  if (state.step === 'done') {
    return (
      <AuthLayout title="Password updated" subtitle="Your new password is saved, and every device has been signed out.">
        <div className="auth__form">
          <p className="notice notice--success" role="status">
            <CircleCheck aria-hidden />
            <span>You can now log in with your new password.</span>
          </p>
          <Link to="/login" className={buttonClass({ variant: 'primary', size: 'lg', block: true })}>
            Go to log in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create a new password" subtitle={<>For {state.email}. Choose something you have not used before.</>} footer={backToLogin}>
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {formError && (
          <p className="notice notice--error" role="alert">
            <CircleAlert aria-hidden />
            <span>{formError}</span>
          </p>
        )}
        <input type="email" name="email" autoComplete="username" value={state.email} readOnly hidden />
        <PasswordSetup password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} errors={errors} label="New password" />
        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          {submitting ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
