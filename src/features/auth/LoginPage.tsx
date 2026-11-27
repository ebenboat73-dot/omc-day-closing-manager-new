import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AuthMessage, AuthPageLayout, SubmitButton } from './AuthPageLayout';
import { PasswordField } from './PasswordField';
import { getFriendlyAuthError, signIn } from '../../services/authService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { from?: string; message?: string } | null;
  const destination = state?.from?.startsWith('/') && state.from !== '/login' ? state.from : '/app';

  useEffect(() => {
    if (user && redirectAfterLogin) navigate(destination, { replace: true });
  }, [user, redirectAfterLogin, destination, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await signIn(email, password, stayLoggedIn);
      if (!result.session) {
        setError('Please confirm your email before signing in. Check your inbox for the confirmation link.');
      } else {
        setRedirectAfterLogin(true);
      }
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Welcome back"
      description="Sign in to manage your station’s daily close."
      footer={<>New to OMC Manager? <Link to="/signup" className="font-semibold text-amber-300 hover:text-amber-200">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {state?.message && <AuthMessage kind="success">{state.message}</AuthMessage>}
        {error && <AuthMessage>{error}</AuthMessage>}
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-200">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            required
            className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
        <PasswordField id="login-password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <label className="flex min-h-11 items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={stayLoggedIn}
            onChange={(event) => setStayLoggedIn(event.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-400"
          />
          Stay logged in on this device
        </label>
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-semibold text-amber-300 hover:text-amber-200">Forgot password?</Link>
        </div>
        <SubmitButton loading={submitting}>Sign in</SubmitButton>
      </form>
    </AuthPageLayout>
  );
}
