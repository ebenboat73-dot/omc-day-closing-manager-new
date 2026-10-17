/**
 * Daily Report Header Navigation & Status Bar
 * Conforms to PRD v3.1 Section 6, 13 & 15
 */

import React from 'react';
import { DailyReport, ReportStatus, UserProfile, StationWorkspace } from '../../types/report';
import { Calendar, History, Sliders, CheckCircle2, AlertCircle, Send, Save, Building, User, RefreshCw, CloudCheck, LogOut } from 'lucide-react';

interface ReportHeaderProps {
  report: DailyReport;
  currentUser: UserProfile;
  workspace: StationWorkspace;
  onDateChange: (newDate: string) => void;
  onOpenHistory: () => void;
  onOpenPumpSetup: () => void;
  onOpenAccount: () => void;
  onOpenReview: () => void;
  onSignOut?: () => void;
  onOpenFormatSettings?: () => void;
  isAutoSaving?: boolean;
}

const STATUS_COLORS: Record<ReportStatus, { bg: string; text: string; border: string }> = {
  Draft: { bg: 'bg-slate-700/60', text: 'text-slate-300', border: 'border-slate-600' },
  'In Progress': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  'Ready for Review': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  'Ready to Send': { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40' },
  Sent: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
};

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  report,
  currentUser,
  workspace,
  onDateChange,
  onOpenHistory,
  onOpenPumpSetup,
  onOpenAccount,
  onOpenReview,
  onSignOut,
  onOpenFormatSettings,
  isAutoSaving = false,
}) => {
  const statusStyle = STATUS_COLORS[report.status] || STATUS_COLORS.Draft;

  // Calculate live metrics
  const totalPumps = report.pumps.length;
  let totalSales = 0;
  let missingClosingCount = 0;
  let missingOpeningCount = 0;

  report.pumps.forEach((p) => {
    totalSales += p.litresSold || 0;
    if (p.closingMeter === null) missingClosingCount++;
    if (p.openingMeter === null) missingOpeningCount++;
  });

  const totalExpenses = report.expenses.reduce((sum, e) => sum + (e.amountGhs || 0), 0);

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 space-y-3">
        {/* Main Brand & Action Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Active Station */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40 shrink-0">
                <span className="font-extrabold text-slate-950 text-xl tracking-tight">O</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-extrabold text-base sm:text-lg text-slate-100 tracking-tight leading-none">
                    {workspace.omcBrand.toUpperCase()}
                  </h1>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                  >
                    {report.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                  <span className="font-medium text-slate-300 truncate max-w-[220px] sm:max-w-xs">
                    {report.stationNameSnapshot || workspace.stationName}
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px]">
                    {report.shiftType || 'Evening Report'}
                  </span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={onOpenAccount}
                    className="text-slate-300 hover:text-amber-400 flex items-center gap-1 shrink-0 transition-colors"
                    title="Account & Station Workspace"
                  >
                    <User className="w-3 h-3 text-amber-400" />
                    <span>{currentUser.fullName}</span>
                  </button>
                </p>
              </div>
            </div>

            {/* Mobile Fast Review Button */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenAccount}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                title="Account Settings"
              >
                <Building className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onOpenReview}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Review</span>
              </button>
            </div>
          </div>

          {/* Date Selector, Save Status & Desktop Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Date Picker */}
            <div className="flex items-center bg-slate-800/90 rounded-xl border border-slate-700 px-3 py-1.5 shadow-inner">
              <Calendar className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
              <input
                id="input-reporting-date"
                type="date"
                value={report.reportDate}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="bg-transparent text-xs sm:text-sm text-slate-200 font-mono-numbers focus:outline-none cursor-pointer"
              />
            </div>

            {/* Save Status Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/80 text-[11px] text-slate-300">
              {isAutoSaving ? (
                <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Saved</span>
                </span>
              )}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenPumpSetup}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Configure pumps, add nozzles, or reorder"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Pump Setup</span>
              </button>

              {onOpenFormatSettings && (
                <button
                  type="button"
                  onClick={onOpenFormatSettings}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Customize station report formats and layout"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Report Formats</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenHistory}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>History</span>
              </button>

              <button
                type="button"
                onClick={onOpenAccount}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Account</span>
              </button>

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-700 text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Sign out of station"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenReview}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Review & Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800 flex flex-col justify-center">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              Total Day Sales
            </span>
            <span className="font-mono text-base font-bold text-amber-400">
              {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-normal text-slate-400">L</span>
            </span>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800 flex flex-col justify-center">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              Meters Recorded
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-bold text-white">
                {totalPumps - missingClosingCount} / {totalPumps}
              </span>
              {missingClosingCount > 0 ? (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-semibold">
                  {missingClosingCount} pending
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
                  All done
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800 flex flex-col justify-center">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              Opening Readings
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-bold text-white">
                {totalPumps - missingOpeningCount} / {totalPumps}
              </span>
              {missingOpeningCount > 0 ? (
                <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-semibold">
                  {missingOpeningCount} missing
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
                  Carried fwd
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800 flex flex-col justify-center">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              Total Expenses
            </span>
            <span className="font-mono text-base font-bold text-white">
              GHS {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
