import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthPageLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-7 inline-flex items-center gap-3" aria-label="OMC Manager home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950">O</span>
          <span className="font-bold tracking-tight">OMC Manager</span>
        </Link>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 border-t border-slate-800 pt-5 text-center text-sm text-slate-400">{footer}</div>}
        </section>
      </div>
    </main>
  );
}

export function AuthMessage({ children, kind = 'error' }: { children: ReactNode; kind?: 'error' | 'success' }) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`rounded-xl border px-3.5 py-3 text-sm leading-5 ${
        kind === 'error'
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      }`}
    >
      {children}
    </div>
  );
}

export function SubmitButton({
  loading,
  children,
  onClick,
}: {
  loading: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={loading}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />}
      {loading ? 'Please wait…' : children}
    </button>
  );
}
