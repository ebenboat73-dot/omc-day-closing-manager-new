import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFriendlyAuthError, signUp } from '../../services/authService';
import { AuthMessage, AuthPageLayout, SubmitButton } from './AuthPageLayout';
import { PasswordField } from './PasswordField';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function passwordStrength(password: string) {
  if (!password) return { text: 'Use at least 8 characters, including a letter and a number.', color: 'text-slate-400' };
  if (PASSWORD_PATTERN.test(password) && password.length >= 12) return { text: 'Strong password', color: 'text-emerald-300' };
  if (PASSWORD_PATTERN.test(password)) return { text: 'Good password', color: 'text-amber-300' };
  return { text: 'Add 8 characters with at least one letter and one number.', color: 'text-rose-300' };
}

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [stationName, setStationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const strength = passwordStrength(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address.');
    if (!PASSWORD_PATTERN.test(password)) return setError('Password must be at least 8 characters and include a letter and a number.');
    if (password !== confirmPassword) return setError('The passwords do not match.');
    if (!fullName.trim() || !stationName.trim()) return setError('Enter your name and station name.');

    setSubmitting(true);
    try {
      await signUp(email, password, fullName, stationName);
      navigate('/check-email', { replace: true, state: { email: email.trim() } });
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Create your account"
      description="Set up secure access for your station."
      footer={<>Already registered? <Link to="/login" className="font-semibold text-amber-300 hover:text-amber-200">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <AuthMessage>{error}</AuthMessage>}
        <div>
          <label htmlFor="signup-name" className="mb-1.5 block text-sm font-semibold text-slate-200">Full name</label>
          <input id="signup-name" name="name" type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" />
        </div>
        <div>
          <label htmlFor="signup-station" className="mb-1.5 block text-sm font-semibold text-slate-200">Station name</label>
          <input id="signup-station" name="organization" type="text" value={stationName} onChange={(event) => setStationName(event.target.value)} autoComplete="organization" required className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" />
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-1.5 block text-sm font-semibold text-slate-200">Email address</label>
          <input id="signup-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" required className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" />
        </div>
        <div>
          <PasswordField id="signup-password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" />
          <p className={`mt-1.5 text-xs ${strength.color}`} aria-live="polite">{strength.text}</p>
        </div>
        <PasswordField id="signup-confirm-password" label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
        <SubmitButton loading={submitting}>Create account</SubmitButton>
      </form>
    </AuthPageLayout>
  );
}
