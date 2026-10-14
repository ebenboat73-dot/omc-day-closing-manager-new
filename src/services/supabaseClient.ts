/**
 * Supabase Client Wrapper
 * Supports both VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars
 * and custom credentials configured in the Account Settings modal.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'omc_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored Supabase config:', e);
  }

  return { url: '', anonKey: '' };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  supabaseClientInstance = null; // reset client to re-initialize
}

export function clearStoredSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
  supabaseClientInstance = null;
}

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (!supabaseClientInstance) {
    try {
      supabaseClientInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error('Error creating Supabase client:', err);
      return null;
    }
  }

  return supabaseClientInstance;
}

export function isSupabaseConnected(): boolean {
  return getSupabaseClient() !== null;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const tempClient = createClient(url, anonKey);
    const { error } = await tempClient.from('workspaces').select('id').limit(1);
    if (error && error.code !== 'PGRST116' && !error.message.includes('relation "public.workspaces" does not exist')) {
      // If table doesn't exist yet, connection is still valid!
      if (error.message.includes('fetch failed')) {
        return { success: false, message: 'Network error: could not connect to Supabase URL.' };
      }
      if (error.message.includes('JWT') || error.message.includes('invalid API key')) {
        return { success: false, message: 'Invalid Anon Key.' };
      }
    }
    return { success: true, message: 'Successfully connected to Supabase project!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection failed.' };
  }
}
