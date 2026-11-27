import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getFriendlyAuthError, sendPasswordReset } from '../../services/authService';
import { AuthMessage, AuthPageLayout, SubmitButton } from './AuthPageLayout';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(false);
    setError('');
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (authError) {
      const message = getFriendlyAuthError(authError);
      if (/user not found|email not found/i.test(message)) {
        setSent(true);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout title="Reset your password" description="Enter the email address linked to your account.">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {sent && <AuthMessage kind="success">If an account exists for that email, we’ll send a password reset link shortly.</AuthMessage>}
        {error && <AuthMessage>{error}</AuthMessage>}
        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-semibold text-slate-200">Email address</label>
          <input id="forgot-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" required className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" />
        </div>
        <SubmitButton loading={submitting}>Send reset link</SubmitButton>
        <p className="text-center text-sm"><Link to="/login" className="font-semibold text-amber-300 hover:text-amber-200">Back to sign in</Link></p>
      </form>
    </AuthPageLayout>
  );
}
