import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getFriendlyAuthError, updatePassword } from '../../services/authService';
import { AuthMessage, AuthPageLayout, SubmitButton } from './AuthPageLayout';
import { PasswordField } from './PasswordField';
import { useAuth } from './AuthContext';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(false);
  const { isPasswordRecovery, clearPasswordRecovery } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!PASSWORD_PATTERN.test(password)) return setError('Password must be at least 8 characters and include a letter and a number.');
    if (password !== confirmPassword) return setError('The passwords do not match.');
    setSubmitting(true);
    try {
      await updatePassword(password);
      clearPasswordRecovery();
      setUpdated(true);
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout title="Choose a new password" description="Create a new password for your OMC Manager account.">
      {updated ? (
        <div className="space-y-4">
          <AuthMessage kind="success">Your password has been updated.</AuthMessage>
          <Link to="/app" className="flex min-h-12 items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400">Continue to dashboard</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {!isPasswordRecovery && <AuthMessage>Open this page using the password reset link from your email. If the link expired, request a new one.</AuthMessage>}
          {error && <AuthMessage>{error}</AuthMessage>}
          <PasswordField id="reset-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
          <PasswordField id="reset-confirm-password" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
          <SubmitButton loading={submitting}>Update password</SubmitButton>
        </form>
      )}
    </AuthPageLayout>
  );
}
