import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '../../types/report';
import { getFriendlyAuthError, mapSupabaseUser } from '../../services/authService';
import { getSupabaseClient } from '../../services/supabaseClient';

interface AuthContextValue {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  sessionError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthLoadingScreen() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-xl font-black text-slate-950 shadow-lg shadow-amber-500/20">
          O
        </div>
        <h1 className="text-xl font-bold tracking-tight">OMC Manager</h1>
        <p className="mt-2 text-sm text-slate-400">Checking your secure session…</p>
        <div className="mx-auto mt-5 h-1 w-32 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400" />
        </div>
      </div>
    </main>
  );
}

function AuthSessionError({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center">
        <h1 className="text-lg font-bold">Unable to check your session</h1>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    let active = true;
    let authEventObserved = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      authEventObserved = true;
      if (!active) return;
      setSession(nextSession);
      setSessionError(null);
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }
      setLoading(false);
    });

    client.auth.getSession().then(({ data, error }) => {
      if (!active || authEventObserved) return;
      if (error) {
        setSessionError(getFriendlyAuthError(error));
        setSession(null);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active || authEventObserved) return;
      setSessionError(getFriendlyAuthError(error));
      setSession(null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);
  const user = useMemo(
    () => session?.user ? mapSupabaseUser(session.user) : null,
    [session]
  );
  const value = useMemo(
    () => ({ user, session, loading, isPasswordRecovery, clearPasswordRecovery, sessionError }),
    [user, session, loading, isPasswordRecovery, clearPasswordRecovery, sessionError]
  );

  if (loading) return <AuthLoadingScreen />;
  if (sessionError) return <AuthSessionError message={sessionError} />;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
