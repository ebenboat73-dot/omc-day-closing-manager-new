import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { UserProfile } from '../types/report';
import { getSupabaseClient, setAuthSessionPersistence } from './supabaseClient';

function requireSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('App not configured. Add VITE_SUPABASE_URL and a Supabase publishable key to the deployment environment.');
  }
  return client;
}

export function mapSupabaseUser(user: SupabaseUser): UserProfile {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: typeof metadata.full_name === 'string' ? metadata.full_name : '',
    stationName: typeof metadata.station_name === 'string' ? metadata.station_name : '',
    role: 'Station Manager',
    createdAt: user.created_at,
  };
}

export function getFriendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials') || normalized.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox for the confirmation link.';
  }
  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (normalized.includes('password') && (
    normalized.includes('weak') ||
    normalized.includes('at least') ||
    normalized.includes('should be')
  )) {
    return 'Choose a stronger password with at least 8 characters, including a letter and a number.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests') || normalized.includes('429')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (
    error instanceof TypeError ||
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('fetch error')
  ) {
    return 'Unable to reach the authentication service. Check your internet connection and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}

function throwFriendlyAuthError(error: unknown): never {
  throw new Error(getFriendlyAuthError(error));
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  stationName: string
) {
  const { data, error } = await requireSupabaseClient().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        station_name: stationName.trim(),
      },
    },
  });
  if (error) throwFriendlyAuthError(error);
  return {
    user: data.user ? mapSupabaseUser(data.user) : null,
    confirmationRequired: !data.session,
  };
}

export async function signIn(email: string, password: string, persistSession = true) {
  setAuthSessionPersistence(persistSession);
  const { data, error } = await requireSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throwFriendlyAuthError(error);
  return {
    user: data.user ? mapSupabaseUser(data.user) : null,
    session: data.session,
  };
}

export async function signOut() {
  const { error } = await requireSupabaseClient().auth.signOut();
  if (error) throwFriendlyAuthError(error);
}

export async function sendPasswordReset(email: string) {
  const { error } = await requireSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throwFriendlyAuthError(error);
}

export async function updatePassword(password: string) {
  const { error } = await requireSupabaseClient().auth.updateUser({ password });
  if (error) throwFriendlyAuthError(error);
}

export async function resendConfirmation(email: string) {
  const { error } = await requireSupabaseClient().auth.resend({
    type: 'signup',
    email: email.trim(),
  });
  if (error) throwFriendlyAuthError(error);
}
