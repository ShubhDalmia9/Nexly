import { CircleAlert } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, errorMessage } from '../../api/client';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';

export function Login() {
  usePageTitle('Log in');
  const { logIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // On success the route guard (PublicOnly in App.tsx) redirects, so there is nothing to navigate here.
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const missing: Record<string, string> = {};
    if (!email.trim()) missing.email = 'Enter your email address.';
    if (!password) missing.password = 'Enter your password.';
    setFields(missing);
    setFormError('');
    if (Object.keys(missing).length > 0) return;

    setSubmitting(true);
    try {
      await logIn(email, password);
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fields).length > 0) setFields(caught.fields);
      else setFormError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see who has been recommended for you."
      footer={
        <>
          Don&rsquo;t have an account?{' '}
          <Link to="/signup" className="text-link">
            Sign up
          </Link>
        </>
      }
    >
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {formError && (
          <p className="notice notice--error" role="alert">
            <CircleAlert aria-hidden />
            <span>{formError}</span>
          </p>
        )}
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
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fields.password}
        />
        <Link to="/forgot-password" className="text-link auth__forgot">
          Forgot password?
        </Link>
        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          {submitting ? 'Signing in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
