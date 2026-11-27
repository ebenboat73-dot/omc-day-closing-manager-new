import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import App from './App';
import { useAuth } from './features/auth/AuthContext';
import { isSupabaseConfigured } from './services/supabaseClient';
import LoginPage from './features/auth/LoginPage';
import SignUpPage from './features/auth/SignUpPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import CheckEmailPage from './features/auth/CheckEmailPage';

function ConfigurationScreen() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-lg font-black text-slate-950">
          O
        </div>
        <h1 className="text-2xl font-bold">App not configured</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Authentication is unavailable until the Supabase environment variables are set for this deployment.
        </p>
        <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-6 text-amber-200">
          VITE_SUPABASE_URL<br />
          VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)
        </p>
        <p className="mt-4 text-xs leading-5 text-slate-400">
          Add both values in your Vercel project settings and redeploy. Use your project URL and public anon/publishable key only.
        </p>
      </section>
    </main>
  );
}

function LandingPage() {
  const { user } = useAuth();
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="OMC Manager home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950">O</span>
          <span className="font-bold tracking-tight">OMC Manager</span>
        </Link>
        {!user && (
          <Link to="/login" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900">
            Sign in
          </Link>
        )}
      </header>
      <section className="mx-auto flex max-w-6xl flex-col items-start px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-300">
          ONYXMA ENERGY · DAILY OPERATIONS
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Close the day with confidence.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Record meter readings, reconcile tank stock, track expenses, and prepare clear station reports from any device.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {user ? (
            <Link to="/app" className="rounded-xl bg-amber-500 px-6 py-3 text-center text-sm font-bold text-slate-950 hover:bg-amber-400">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-xl bg-amber-500 px-6 py-3 text-center text-sm font-bold text-slate-950 hover:bg-amber-400">
                Sign in to your account
              </Link>
              <Link to="/signup" className="rounded-xl border border-slate-700 px-6 py-3 text-center text-sm font-semibold text-slate-200 hover:bg-slate-900">
                Create an account
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to="/app" replace /> : children;
}

function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  }
  return <App />;
}

function RouteTable() {
  if (!isSupabaseConfigured) return <ConfigurationScreen />;
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
      <Route path="/signup" element={<GuestOnlyRoute><SignUpPage /></GuestOnlyRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/app" element={<ProtectedRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteTable />
    </BrowserRouter>
  );
}
