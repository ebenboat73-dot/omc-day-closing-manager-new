/**
 * OMC Manager Day Sales & Stock Reporting - Landing Homepage & Authentication
 * Professional, high-contrast, station-manager focused design.
 * Explains how the platform eases retail station management and enables secure login / registration.
 */

import React, { useState } from 'react';
import {
  Fuel,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Camera,
  Layers,
  Send,
  Truck,
  DollarSign,
  ArrowRight,
  Lock,
  Mail,
  User,
  Building2,
  Clock,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { UserProfile } from '../../types/report';
import { loginUser, registerNewUser, DEMO_USERS } from '../../services/dataService';

interface LandingHomePageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LandingHomePage: React.FC<LandingHomePageProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [stationName, setStationName] = useState('OBORPAH ASESEWA');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    try {
      if (authMode === 'login') {
        const user = loginUser(email, rememberMe);
        onLoginSuccess(user);
      } else {
        if (!fullName.trim()) {
          setErrorMessage('Please enter your name');
          return;
        }
        if (!stationName.trim()) {
          setErrorMessage('Please enter your station name or location');
          return;
        }
        const user = registerNewUser(email, fullName, stationName, rememberMe);
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    }
  };

  const handleQuickDemoLogin = (demoUser: (typeof DEMO_USERS)[0]) => {
    const user = loginUser(demoUser.email, rememberMe);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Fuel className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">OMC MANAGER</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Retail Ops
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Day Sales • Stock Dipping • Reconciliation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('auth-card');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Manager Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          {/* Left Column: Brief & Value Prop */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Oil Marketing Company (OMC) Operational Software</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Fast, Error-Free Daily Sales & Stock Reporting for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                Station Managers
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Designed specifically for retail fuel stations across Ghana (Oborpah Asesewa, Tema Highway, and OMC dealer networks).
              Eliminates manual calculator errors, reconciles pump meter readings with tank dipping in 2 minutes, and formats instant, executive-grade WhatsApp & SMS daily reports.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                <span className="text-xs text-slate-400 block font-medium">Daily Closing</span>
                <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">under 3 min</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                <span className="text-xs text-slate-400 block font-medium">Math Errors</span>
                <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">0.00%</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                <span className="text-xs text-slate-400 block font-medium">Report Ready</span>
                <span className="text-lg sm:text-xl font-black text-blue-400 font-mono">WhatsApp 1-Tap</span>
              </div>
            </div>

            {/* Quick Demo Launchers */}
            <div className="pt-2 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Instant One-Click Station Demo:
              </span>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin(DEMO_USERS[0])}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-amber-300 flex items-center gap-2 transition-all hover:border-amber-500/50"
                >
                  <Fuel className="w-4 h-4 text-amber-400" />
                  <span>Oborpah Asesewa Station (Live Demo)</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin(DEMO_USERS[1])}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-2 transition-all hover:border-slate-500"
                >
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Tema Industrial Station</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div id="auth-card" className="lg:col-span-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
              <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {authMode === 'login' ? 'Station Manager Sign In' : 'Create Station Workspace'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {authMode === 'login'
                      ? 'Access your private station records & reports'
                      : 'Set up your pumps, products & daily ledger'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              {/* Toggle Login / Register */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'login' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'register'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register Station
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Manager Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Kwaku Mensah"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Station Name / Location
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={stationName}
                          onChange={(e) => setStationName(e.target.value)}
                          placeholder="e.g. OBORPAH ASESEWA"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 uppercase"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Manager Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={authMode === 'login' ? 'manager.asesewa@station.com' : 'your.email@omc.com'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password / Access PIN
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Stay logged in on device choice */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="remember-me-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-xs text-slate-300 font-medium">Stay logged in on this device</span>
                  </label>
                  <span className="text-[11px] text-amber-400/90 font-medium">(Recommended)</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
                >
                  <span>{authMode === 'login' ? 'Sign In to Station Workspace' : 'Create & Open Station'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Demo note */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
                <p className="text-[11px] text-slate-400">
                  Quick try: enter <code className="text-amber-400">manager.asesewa@station.com</code> or use the demo buttons above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT EASES THE MANAGER'S WORK IN PREPARING REPORTS */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Field-Tested Reliability
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How It Eases The Station Manager’s Work Every Evening
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Retail station managers spend up to 2 hours every evening dealing with mechanical meter totalizers, calculator errors, tank dip calculations, tanker discharges, and area manager messages. OMC Manager automates the friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1: No Math Errors */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Instant Automatic Calculations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No manual subtraction or calculator slips. Previous closing meters auto-carry forward as opening meters. Litres sold and revenue in GHS calculate in real time as you type.
            </p>
          </div>

          {/* Feature 2: Dipping & Camera at Stock Dipping */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">In-App Camera at Pumps & Dipping</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Snap high-resolution photos of pump meters and tank dipsticks right from the phone. On-device OCR reads the figures with full manager verification fallback.
            </p>
          </div>

          {/* Feature 3: WhatsApp & SMS Standard Text */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Exact WhatsApp Executive Format</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Formats daily reports directly into the exact layout expected by OMC Area Managers and Managing Directors. Copy with 1 click or send via WhatsApp / SMS instantly.
            </p>
          </div>

          {/* Feature 4: Discharge Reports */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Dedicated Discharge Reports</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Log fuel tanker deliveries before and after discharge. Records stock underground, invoice volume, expected stock, opening/closing meters, and exact overage or shortage.
            </p>
          </div>

          {/* Feature 5: Price Change Reports */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Price Change & Stock Revaluation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When fuel pricing shifts, record meters at the cut-off time. Calculates litres sold at the old price and computes total stock gain/loss value in GHS immediately.
            </p>
          </div>

          {/* Feature 6: Private Workspaces & Dynamic Pumps */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Private Station Workspaces</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each manager’s station data is completely isolated. Configure your station’s pumps (S1–S4, D1–D4), remove unused pumps, edit unit prices, and reconcile Cash in Till.
            </p>
          </div>
        </div>
      </section>

      {/* Report Formats Preview Section */}
      <section className="py-12 px-4 sm:px-6 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-amber-400 font-mono uppercase tracking-wider font-bold">Real Field Reports</span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">Standard WhatsApp Formats Generated By The App</h3>
            </div>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin(DEMO_USERS[0])}
              className="self-start md:self-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2"
            >
              <span>Test Live in Demo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Sales Card Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-2 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-amber-400 font-sans font-bold">
                <span>Daily Sales & Dipping Report Format</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Evening Shift</span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-300">
{`*OBORPAH ASESEWA*
*DATE*: 14/10/2026
*EVENING REPORT*

*PMS*
S1=25332.02
S2=40470.79
S3=61632.08
S4=58649.49
*LITRES SOLD* = 342.49
*SALES* = 5682
*STOCK* = 12710

*AGO*
D1=232477.00
D2=427498.60
D3=165704.46
D4=202374.21
*LITRES SOLD* = 516.60
*SALES* = 9500
*STOCK* = 18840

*TOTAL SALES* = 15182
*CASH TO BANK* = 15182`}
              </pre>
            </div>

            {/* Discharge Report Card Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-2 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-amber-400 font-sans font-bold">
                <span>Fuel Discharge Report (Before & After)</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">Tanker Delivery</span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-300">
{`*DISCHARGE REPORT (AGO)*
*DATE* : 10/10/2026
*TIME* : 2:30PM

*BEFORE DISCHARGE*
*STOCK UNDERGROUND*= 3,820
*INVOICE* =18000
*EXPECTED* =21820

*OPENING METRES*
S3=232341.57
D2=424577.35
*TOTAL*= 656918.92

--- AFTER DISCHARGE (3:33 PM) ---
*STOCK AFTER DISCHARGE*= 21,880
*LITRES SOLD* = 0
*THEORETICAL STOCK*=21880
*OVERAGE* = +60`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-400">OMC Manager Day Sales & Stock Reporting</span>
            <span>•</span>
            <span>Version 3.2</span>
          </div>
          <p>© 2026 Retail Service Station Management. Private-by-default multi-user workspaces.</p>
        </div>
      </footer>
    </div>
  );
};
