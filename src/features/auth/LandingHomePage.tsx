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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Fuel className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">FORECOURT PRO</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Global Edition
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Free Starter
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Day Closing • AI Vision Meter Reading • Stock Reconciliation</p>
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

      {/* Subscription Promo Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-b border-amber-500/20 py-2 px-4 text-center text-xs">
        <span className="font-bold text-amber-300">✨ Universal Access: </span>
        <span className="text-slate-300">
          Built for every filling station, petrol dealership, and gas forecourt worldwide. Start <strong>100% Free</strong> with unlimited pump entries and automated reconciliation!
        </span>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 px-4 sm:px-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          {/* Left Column: Value Prop */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>The Premier Platform for Fuel Stations & Forecourts Worldwide</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Master Your Station’s Day Closing with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                Precision AI Vision
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Empowering filling station managers across the globe—from independent local forecourts to international oil marketing companies (OMCs). 
              Eliminate math mistakes forever, scan mechanical & digital pump counters with state-of-the-art AI Vision, balance tank dipsticks with underground inventory in 2 minutes, and broadcast audit-ready executive reports directly to WhatsApp & SMS.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                <span className="text-xs text-slate-400 block font-medium">Daily Shift Close</span>
                <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">under 3 min</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                <span className="text-xs text-slate-400 block font-medium">Math Errors</span>
                <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">0.00% Zero</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                <span className="text-xs text-slate-400 block font-medium">Starter Plan</span>
                <span className="text-lg sm:text-xl font-black text-blue-400 font-mono">100% Free</span>
              </div>
            </div>

            {/* Quick Demo Launchers */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  One-Click Station Experience:
                </span>
                <span className="text-[11px] text-amber-400">Instant Access • No Setup Required</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin(DEMO_USERS[0])}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-amber-300 flex items-center gap-2 transition-all hover:border-amber-500/50"
                >
                  <Fuel className="w-4 h-4 text-amber-400" />
                  <span>Oborpah Asesewa Forecourt</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin(DEMO_USERS[1])}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-2 transition-all hover:border-slate-500"
                >
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Tema Port Retail Terminal</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin(DEMO_USERS[2])}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-2 transition-all hover:border-slate-500"
                >
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Metro Express Station #14</span>
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
                    {authMode === 'login' ? 'Station Manager Sign In' : 'Register Any Filling Station'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {authMode === 'login'
                      ? 'Access your private station records & reports'
                      : 'Free subscription • Any station brand in the world'}
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
                  Start Free Account
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
            Global Forecourt Architecture
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How Forecourt Pro Solves Everyday Retail Fuel Headaches
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Station managers worldwide juggle mechanical dispenser wheels, calculator math errors, underground dipstick charts, tanker delivery discharges, and headquarters updates. Forecourt Pro automates the entire closing workflow in under 3 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1: No Math Errors */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Instant Math & Live Cash Till</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zero manual subtraction slips. Opening meters carry forward automatically. Litres sold, revenue per pump, total volume, and expected cash in till calculate dynamically as you type.
            </p>
          </div>

          {/* Feature 2: Gemini AI Vision */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">AI Vision Meter Scanner</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Powered by multimodal Gemini AI. Snap photos of mechanical roller wheels or digital LCD totalizers to read exact numerical values with decimal precision. Rejects unclear or glared photos without guessing to protect audit trust.
            </p>
          </div>

          {/* Feature 3: WhatsApp & SMS Standard Text */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">1-Click Executive WhatsApp & SMS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Formats clean executive dispatch summaries formatted to your station’s exact preferred style. Send straight to area managers, managing directors, or WhatsApp groups with a single click.
            </p>
          </div>

          {/* Feature 4: Discharge Reports */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Tanker Discharge Delivery Logs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Log fuel tanker deliveries before and after discharge. Reconciles invoice volume against theoretical dipstick measurements and automatically detects delivery overages or shortages.
            </p>
          </div>

          {/* Feature 5: Price Change Reports */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Price Revision & Stock Revaluation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When fuel prices update, record meters at the cut-off moment. Calculates sales at the old price and tracks capital gain or loss across remaining underground inventory.
            </p>
          </div>

          {/* Feature 6: Universal Station Compatibility & Free Subscription */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Free Subscription & Any Brand</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Suitable for any filling station worldwide (Shell, TotalEnergies, BP, GOIL, Puma, independent kiosks). Customize pumps, currencies, and formats. Free forever starter plan with pro upgrades.
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
