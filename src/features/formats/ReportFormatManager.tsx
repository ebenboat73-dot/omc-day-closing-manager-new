/**
 * Report Format Manager
 * Version 3.2 • Per-Manager Customizable Report Format Studio
 * Responsive on mobile and PC with real-time live preview for Morning, Evening,
 * Price Change, and Fuel Discharge reports.
 */

import React, { useState, useMemo } from 'react';
import {
  DailyReport,
  ReportFormatSettings,
  DEFAULT_REPORT_FORMAT_SETTINGS,
  DischargeReport,
  PriceChangeReport,
} from '../../types/report';
import { REPORT_FORMAT_PRESETS } from '../../services/dataService';
import { generateStandardReportText } from '../sharing/reportFormatter';
import { formatBeforeDischargeText, formatAfterDischargeText } from '../discharge/dischargeFormatter';
import { formatPriceChangeText } from '../pricechange/priceChangeFormatter';
import {
  Sliders,
  Copy,
  Check,
  RotateCcw,
  Save,
  FileText,
  Truck,
  DollarSign,
  Fuel,
  Sparkles,
  HelpCircle,
  Eye,
  CheckCircle2,
  Smartphone,
  Laptop,
} from 'lucide-react';

interface ReportFormatManagerProps {
  currentSettings: ReportFormatSettings;
  onSaveSettings: (settings: ReportFormatSettings) => void;
  onResetSettings: () => void;
  sampleReport: DailyReport;
  sampleDischargeReport?: DischargeReport;
  samplePriceChangeReport?: PriceChangeReport;
}

export const ReportFormatManager: React.FC<ReportFormatManagerProps> = ({
  currentSettings,
  onSaveSettings,
  onResetSettings,
  sampleReport,
  sampleDischargeReport,
  samplePriceChangeReport,
}) => {
  const [settings, setSettings] = useState<ReportFormatSettings>({ ...currentSettings });
  const [activePreviewType, setActivePreviewType] = useState<
    'daily' | 'pricechange' | 'discharge_before' | 'discharge_after'
  >('daily');
  const [mobileTab, setMobileTab] = useState<'settings' | 'preview'>('settings');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Apply a preset
  const handleApplyPreset = (presetKey: string) => {
    const preset = REPORT_FORMAT_PRESETS[presetKey];
    if (preset) {
      const merged: ReportFormatSettings = {
        ...settings,
        ...preset,
        presetId: presetKey as any,
      };
      setSettings(merged);
      onSaveSettings(merged);
      triggerSaveNotice();
    }
  };

  const triggerSaveNotice = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Update a single setting
  const updateSetting = <K extends keyof ReportFormatSettings>(key: K, value: ReportFormatSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value, presetId: 'custom' as const };
      return next;
    });
  };

  // Save current settings as manager default
  const handleSave = () => {
    onSaveSettings(settings);
    triggerSaveNotice();
  };

  // Reset to default
  const handleReset = () => {
    if (window.confirm('Reset report format to standard Oborpah Asesewa defaults?')) {
      onResetSettings();
      setSettings({ ...DEFAULT_REPORT_FORMAT_SETTINGS });
      triggerSaveNotice();
    }
  };

  // Generate live preview text based on active preview report type
  const livePreviewText = useMemo(() => {
    if (activePreviewType === 'daily') {
      return generateStandardReportText(sampleReport, settings);
    }
    if (activePreviewType === 'pricechange') {
      if (samplePriceChangeReport) {
        return formatPriceChangeText(samplePriceChangeReport, settings);
      }
      return 'No Price Change Report data available to preview.';
    }
    if (activePreviewType === 'discharge_before') {
      if (sampleDischargeReport) {
        return formatBeforeDischargeText(sampleDischargeReport, settings);
      }
      return 'No Discharge Report data available to preview.';
    }
    if (activePreviewType === 'discharge_after') {
      if (sampleDischargeReport) {
        return formatAfterDischargeText(sampleDischargeReport, settings);
      }
      return 'No Discharge Report data available to preview.';
    }
    return '';
  }, [settings, activePreviewType, sampleReport, sampleDischargeReport, samplePriceChangeReport]);

  const handleCopy = () => {
    navigator.clipboard.writeText(livePreviewText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Description */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-slate-100">
              Station Report Format & Template Settings
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Customize the structure, field names, currency, and layout for WhatsApp and SMS reports.
            Your settings are private to your station workspace and apply to all Morning, Evening, Price Change, and Discharge reports.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            title="Reset to OMC Default Format"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Format</span>
          </button>
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Report format preferences successfully saved for your station workspace!</span>
        </div>
      )}

      {/* Mobile Toggle: Settings vs Live Preview */}
      <div className="flex lg:hidden items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setMobileTab('settings')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'settings'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Format Controls</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'preview'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Live Message Preview</span>
        </button>
      </div>

      {/* Main Two-Column Layout (Side-by-Side on PC / Large screen, Stacked/Toggled on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Configuration Controls (lg:col-span-7) */}
        <div
          className={`space-y-4 lg:col-span-7 ${
            mobileTab === 'settings' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Quick Presets */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                1-Click Format Presets
              </span>
              <span className="text-[11px] text-slate-400">Apply standard template</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'oborpah_default', label: 'Oborpah Default', desc: 'Standard Ghana OMC' },
                { id: 'omc_standard', label: 'Corporate OMC', desc: 'GH¢ + Title Case' },
                { id: 'compact', label: 'Compact WhatsApp', desc: 'Minimal text' },
                { id: 'detailed_audit', label: 'Detailed Audit', desc: 'Meters + Full Audit' },
              ].map((p) => {
                const isActive = settings.presetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{p.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Station Header & General Style */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Header & General Formatting</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Station Name Casing */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Station Name Style</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateSetting('stationHeaderCase', 'uppercase')}
                    className={`py-2 px-3 rounded-xl border font-mono text-center font-bold transition-all ${
                      settings.stationHeaderCase === 'uppercase'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    UPPERCASE
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting('stationHeaderCase', 'titlecase')}
                    className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                      settings.stationHeaderCase === 'titlecase'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Title Case
                  </button>
                </div>
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Date Format</label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => updateSetting('dateFormat', e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="DD/MM/YYYY">14/10/2026 (DD/MM/YYYY)</option>
                  <option value="DD-MM-YYYY">14-10-2026 (DD-MM-YYYY)</option>
                  <option value="YYYY-MM-DD">2026-10-14 (YYYY-MM-DD)</option>
                  <option value="D MMM YYYY">14 Oct 2026 (D MMM YYYY)</option>
                </select>
              </div>

              {/* Currency Symbol */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Currency Symbol</label>
                <div className="flex items-center gap-2">
                  {['¢', 'GH¢', 'GHS'].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => updateSetting('currencySymbol', sym)}
                      className={`flex-1 py-2 rounded-xl border text-center font-bold transition-all ${
                        settings.currencySymbol === sym
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Unit */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Volume Unit Display</label>
                <div className="flex items-center gap-2">
                  {[
                    { id: '', label: 'None (Default)' },
                    { id: 'L', label: 'L' },
                    { id: 'Litres', label: 'Litres' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateSetting('volumeUnit', id)}
                      className={`flex-1 py-2 rounded-xl border text-center font-medium transition-all ${
                        settings.volumeUnit === id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Header Toggles & Custom Note */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Include Station Location / Branch in Header</span>
                <input
                  type="checkbox"
                  checked={settings.includeLocation}
                  onChange={(e) => updateSetting('includeLocation', e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                >
                </input>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Include Current Closing Timestamp</span>
                <input
                  type="checkbox"
                  checked={settings.includeTimestamp}
                  onChange={(e) => updateSetting('includeTimestamp', e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                >
                </input>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">
                  Optional Header Announcement / Banner Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. OFFICIAL DAILY CLOSING • CONFIDENTIAL"
                  value={settings.headerCustomNote}
                  onChange={(e) => updateSetting('headerCustomNote', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Fuel Products & Pump Meters */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-400" />
              <span>Fuel Products & Pump Meter Layout</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Pump Reading Separator */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Pump Separator</label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {[
                    { sep: '=', label: 'S1=25332' },
                    { sep: ':', label: 'S1:25332' },
                    { sep: ' - ', label: 'S1 - 25332' },
                  ].map(({ sep, label }) => (
                    <button
                      key={sep}
                      type="button"
                      onClick={() => updateSetting('pumpSeparator', sep as any)}
                      className={`py-2 px-2 rounded-xl border text-center font-bold text-[11px] truncate transition-all ${
                        settings.pumpSeparator === sep
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pump Decimals */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Pump Decimals</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateSetting('pumpDecimals', 2)}
                    className={`py-2 px-3 rounded-xl border text-center font-mono font-bold transition-all ${
                      settings.pumpDecimals === 2
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    .00 (2 Decimals)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting('pumpDecimals', 0)}
                    className={`py-2 px-3 rounded-xl border text-center font-mono font-bold transition-all ${
                      settings.pumpDecimals === 0
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Whole Litres
                  </button>
                </div>
              </div>
            </div>

            {/* Fuel Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Display Physical Tank Dipping Stock</span>
                <input
                  type="checkbox"
                  checked={settings.showPhysicalStock}
                  onChange={(e) => updateSetting('showPhysicalStock', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                >
                </input>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Display Current Unit Price line (@ ¢16.59)</span>
                <input
                  type="checkbox"
                  checked={settings.showUnitPrice}
                  onChange={(e) => updateSetting('showUnitPrice', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                >
                </input>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Display Opening Meters in Daily Report</span>
                <input
                  type="checkbox"
                  checked={settings.showOpeningMetersInDaily}
                  onChange={(e) => updateSetting('showOpeningMetersInDaily', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                >
                </input>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Display Individual Pump Sold Litres</span>
                <input
                  type="checkbox"
                  checked={settings.showIndividualPumpSold}
                  onChange={(e) => updateSetting('showIndividualPumpSold', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                >
                </input>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Display Litres Sold & Total Litres Sold Lines</span>
                <input
                  type="checkbox"
                  checked={settings.showTotalLitresSoldLine}
                  onChange={(e) => updateSetting('showTotalLitresSoldLine', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                >
                </input>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Display Product Sales Revenue in GHS</span>
                <input
                  type="checkbox"
                  checked={settings.showProductSalesGhs}
                  onChange={(e) => updateSetting('showProductSalesGhs', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                >
                </input>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Display Tank Dipping Variance</span>
                <input
                  type="checkbox"
                  checked={settings.showVariance}
                  onChange={(e) => updateSetting('showVariance', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                >
                </input>
              </div>

              {settings.showVariance && (
                <div className="pt-1">
                  <label className="block text-slate-400 text-xs font-medium mb-1">Variance Label</label>
                  <input
                    type="text"
                    value={settings.varianceLabel}
                    onChange={(e) => updateSetting('varianceLabel', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Cash Account & Expenses */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>Cash Account, Expenses & Digital Banking</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Cash Account Header</label>
                <input
                  type="text"
                  value={settings.cashAccountTitle}
                  onChange={(e) => updateSetting('cashAccountTitle', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Total Sales Line Label</label>
                <input
                  type="text"
                  value={settings.totalSalesLabel}
                  onChange={(e) => updateSetting('totalSalesLabel', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Cash to Bank / Till Label</label>
                <input
                  type="text"
                  value={settings.cashToBankLabel}
                  onChange={(e) => updateSetting('cashToBankLabel', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Expenses Presentation</label>
                <select
                  value={settings.expensesStyle}
                  onChange={(e) => updateSetting('expensesStyle', e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="itemized">Itemized List & Total (Standard)</option>
                  <option value="total_only">Total Expenses Only</option>
                  <option value="hidden">Hide Expenses in Dispatch</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-300 font-medium block">Hubtel Digital Banking Section</span>
                  <span className="text-slate-500 text-[11px]">
                    Includes HUBTEL( ), HUBTEL DASHBOARD AMOUNT, and BANKING WITH HUBTEL
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showHubtelSection}
                  onChange={(e) => updateSetting('showHubtelSection', e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                >
                </input>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-300 font-medium block">Mechanical / Analogue Readings Section</span>
                  <span className="text-slate-500 text-[11px]">
                    Includes mechanical totalizer counters (e.g. S3-483179, D1-232567)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showAnalogueSection}
                  onChange={(e) => updateSetting('showAnalogueSection', e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                >
                </input>
              </div>
            </div>
          </div>

          {/* Section 4: Discharge & Price Change Formats */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-400" />
              <span>Fuel Discharge & Price Change Layout</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Before Discharge Title</label>
                <input
                  type="text"
                  value={settings.dischargeBeforeTitle}
                  onChange={(e) => updateSetting('dischargeBeforeTitle', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">After Discharge Title</label>
                <input
                  type="text"
                  value={settings.dischargeAfterTitle}
                  onChange={(e) => updateSetting('dischargeAfterTitle', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Overage Word / Label</label>
                <input
                  type="text"
                  value={settings.dischargeOverageLabel}
                  onChange={(e) => updateSetting('dischargeOverageLabel', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Shortage Word / Label</label>
                <input
                  type="text"
                  value={settings.dischargeShortageLabel}
                  onChange={(e) => updateSetting('dischargeShortageLabel', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Price Change Report Title</label>
                <input
                  type="text"
                  value={settings.priceChangeTitle}
                  onChange={(e) => updateSetting('priceChangeTitle', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-between pt-5">
                <span className="text-slate-300">Show Stock Revaluation in GHS</span>
                <input
                  type="checkbox"
                  checked={settings.showStockRevaluationGhs}
                  onChange={(e) => updateSetting('showStockRevaluationGhs', e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                >
                </input>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Include Truck Number & Driver Name in Discharge</span>
                <input
                  type="checkbox"
                  checked={settings.dischargeIncludeTruckDriver}
                  onChange={(e) => updateSetting('dischargeIncludeTruckDriver', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-500 accent-purple-500 cursor-pointer"
                >
                </input>
              </div>
            </div>
          </div>

          {/* Section 5: Sign-Off / Manager Footer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Manager Sign-Off / Footer Note</span>
            </h3>

            <p className="text-xs text-slate-400">
              Appends an authoritative signature or station contact number at the bottom of the WhatsApp report.
            </p>

            <textarea
              rows={2}
              placeholder="e.g. Report Prepared by Station Manager: Eben Boateng • Tel: 0244xxxxxx"
              value={settings.footerCustomNote}
              onChange={(e) => updateSetting('footerCustomNote', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Right Column: Sticky Live WhatsApp Message Preview (lg:col-span-5) */}
        <div
          className={`space-y-4 lg:col-span-5 lg:sticky lg:top-24 ${
            mobileTab === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Preview Box Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col space-y-3">
            {/* Preview Header & Report Type Switcher */}
            <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">Live Executive Dispatch Preview</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Segmented control for previewing different reports */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActivePreviewType('daily')}
                  className={`py-1.5 px-2 rounded-lg truncate transition-all ${
                    activePreviewType === 'daily'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Daily Shift
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewType('pricechange')}
                  className={`py-1.5 px-2 rounded-lg truncate transition-all ${
                    activePreviewType === 'pricechange'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Price Change
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewType('discharge_before')}
                  className={`py-1.5 px-2 rounded-lg truncate transition-all ${
                    activePreviewType === 'discharge_before'
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Before Disch.
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewType('discharge_after')}
                  className={`py-1.5 px-2 rounded-lg truncate transition-all ${
                    activePreviewType === 'discharge_after'
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  After Disch.
                </button>
              </div>
            </div>

            {/* Simulated WhatsApp Bubble / Dispatch Screen */}
            <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono-numbers text-xs text-slate-200 leading-relaxed max-h-[540px] overflow-y-auto whitespace-pre-wrap select-all shadow-inner scrollbar-thin scrollbar-thumb-slate-700">
              {livePreviewText}
            </div>

            {/* Live stats & Action row */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>{livePreviewText.length} characters • {livePreviewText.split('\n').length} lines</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync Enabled
              </span>
            </div>

            {/* Direct Save CTA inside Preview */}
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Apply & Save as Station Default</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
