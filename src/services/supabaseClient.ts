/**
 * Supabase client configured from build-time Vite environment variables.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseClientInstance: SupabaseClient | null = null;
let persistAuthSession = true;

const authStorage = {
  getItem(key: string) {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue !== null) {
      persistAuthSession = false;
      return sessionValue;
    }

    const persistentValue = localStorage.getItem(key);
    if (persistentValue !== null) {
      persistAuthSession = true;
    }
    return persistentValue;
  },
  setItem(key: string, value: string) {
    if (persistAuthSession) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem(key: string) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export function setAuthSessionPersistence(persistent: boolean) {
  persistAuthSession = persistent;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: authStorage,
      },
    });
  }
  return supabaseClientInstance;
}
