import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getFriendlyAuthError, resendConfirmation } from '../../services/authService';
import { AuthMessage, AuthPageLayout, SubmitButton } from './AuthPageLayout';

export default function CheckEmailPage() {
  const location = useLocation();
  const state = location.state as { email?: string } | null;
  const email = state?.email ?? '';
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  async function handleResend() {
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      await resendConfirmation(email);
      setFeedback('A new confirmation email has been sent.');
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout title="Check your email" description="We sent a confirmation link to complete your account setup.">
      <div className="space-y-5">
        {email && <p className="break-all rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-slate-200">{email}</p>}
        {feedback && <AuthMessage kind="success">{feedback}</AuthMessage>}
        {error && <AuthMessage>{error}</AuthMessage>}
        <p className="text-sm leading-6 text-slate-400">Open the link in your email to confirm your address, then sign in.</p>
        <SubmitButton loading={submitting} onClick={handleResend}>Resend confirmation email</SubmitButton>
        <p className="text-center text-sm"><Link to="/login" className="font-semibold text-amber-300 hover:text-amber-200">Go to sign in</Link></p>
      </div>
    </AuthPageLayout>
  );
}
