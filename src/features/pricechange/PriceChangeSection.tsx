/**
 * Price Change Report Section
 * Version 3.2 • Station Manager Price Change Workflow
 * Records cutover meter readings, computes litres sold at old price,
 * and calculates stock gain/loss revaluation in GHS.
 */

import React, { useState } from 'react';
import {
  PriceChangeReport,
  ConfiguredProduct,
  ConfiguredPump,
  StationWorkspace,
  PriceChangePumpReading,
} from '../../types/report';
import {
  DollarSign,
  Plus,
  Copy,
  Check,
  Share2,
  Trash2,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  Fuel,
  FileText,
} from 'lucide-react';
import { formatPriceChangeText } from './priceChangeFormatter';

interface PriceChangeSectionProps {
  userId: string;
  workspace: StationWorkspace;
  products: ConfiguredProduct[];
  pumps: ConfiguredPump[];
  priceChangeReports: PriceChangeReport[];
  onSaveReport: (report: PriceChangeReport) => void;
  onDeleteReport: (reportId: string) => void;
}

export const PriceChangeSection: React.FC<PriceChangeSectionProps> = ({
  userId,
  workspace,
  products,
  pumps,
  priceChangeReports,
  onSaveReport,
  onDeleteReport,
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string>(
    priceChangeReports[0]?.id || ''
  );
  const [copiedText, setCopiedText] = useState(false);

  const activeReport =
    priceChangeReports.find((r) => r.id === selectedReportId) || priceChangeReports[0];

  const handleCreateNew = (productCode = 'PMS') => {
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const timeStr = '11:59PM';

    // Current price from product config
    const prodConfig = products.find((p) => p.code === productCode);
    const oldPrice = prodConfig?.unitPrice || (productCode === 'PMS' ? 16.59 : 18.39);
    const newPrice = oldPrice + 0.60;

    // Active pumps for this product
    const prodPumps = pumps.filter((p) => p.productCode === productCode && p.isActive);
    const readings: PriceChangePumpReading[] =
      prodPumps.length > 0
        ? prodPumps.map((p) => ({ pumpLabel: p.label, closingMeter: 0, litresSold: 0 }))
        : [
            { pumpLabel: productCode === 'PMS' ? 'S1' : 'D1', closingMeter: 0, litresSold: 0 },
            { pumpLabel: productCode === 'PMS' ? 'S2' : 'D2', closingMeter: 0, litresSold: 0 },
          ];

    const newReport: PriceChangeReport = {
      id: `pc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspaceId: workspace.id,
      stationName: workspace.stationName || 'OBORPAH ASESEWA',
      productCode,
      date: dateStr,
      effectiveTime: timeStr,
      oldPrice,
      newPrice,
      priceDifference: Math.round((newPrice - oldPrice) * 100) / 100,
      meterReadingsAtChange: readings,
      totalLitresSoldAtOldPrice: 0,
      physicalStockAtChange: 12000,
      stockGainOrLossValueGhs: Math.round(12000 * (newPrice - oldPrice) * 100) / 100,
      status: 'Sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveReport(newReport);
    setSelectedReportId(newReport.id);
  };

  const updateCurrentReport = (updates: Partial<PriceChangeReport>) => {
    if (!activeReport) return;

    const merged = { ...activeReport, ...updates };

    // Recompute price difference
    const diff = Math.round((merged.newPrice - merged.oldPrice) * 100) / 100;
    merged.priceDifference = diff;

    // Recompute total litres sold
    const totalSold = Math.round(
      (merged.meterReadingsAtChange || []).reduce((sum, m) => sum + (m.litresSold || 0), 0) * 100
    ) / 100;
    merged.totalLitresSoldAtOldPrice = totalSold;

    // Recompute stock gain / loss revaluation
    const stockVal = merged.physicalStockAtChange || 0;
    merged.stockGainOrLossValueGhs = Math.round(stockVal * diff * 100) / 100;

    onSaveReport(merged);
  };

  const handleUpdatePumpReading = (index: number, field: 'closingMeter' | 'litresSold', val: number) => {
    if (!activeReport) return;
    const newReadings = [...(activeReport.meterReadingsAtChange || [])];
    newReadings[index] = { ...newReadings[index], [field]: val };
    updateCurrentReport({ meterReadingsAtChange: newReadings });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleShareWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Fuel Price Change Reports</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Price Shift & Stock Revaluation
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record meters at the effective cutover time and calculate station stock gain or loss value in GHS.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCreateNew('PMS')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New PMS Price Shift</span>
          </button>
          <button
            type="button"
            onClick={() => handleCreateNew('AGO')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New AGO Price Shift</span>
          </button>
        </div>
      </div>

      {/* Selector Pills */}
      {priceChangeReports.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap pl-1">Past Price Shifts:</span>
          {priceChangeReports.map((r) => {
            const isSelected = r.id === activeReport?.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReportId(r.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 border transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{r.productCode}</span>
                <span className="opacity-80">({r.date})</span>
                <span className="text-[10px] px-1 rounded font-mono bg-slate-950/40">
                  {r.priceDifference >= 0 ? `+¢${r.priceDifference.toFixed(2)}` : `-¢${Math.abs(r.priceDifference).toFixed(2)}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor & Preview */}
      {activeReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Edit Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header / Timing card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  Price Change Timing & Details
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this price change report?')) {
                      onDeleteReport(activeReport.id);
                    }
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Product</label>
                  <select
                    value={activeReport.productCode}
                    onChange={(e) => updateCurrentReport({ productCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="PMS">PMS (Super)</option>
                    <option value="AGO">AGO (Diesel)</option>
                    <option value="KERO">KERO (Kerosene)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date</label>
                  <input
                    type="text"
                    value={activeReport.date}
                    onChange={(e) => updateCurrentReport({ date: e.target.value })}
                    placeholder="15/10/2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Effective Time</label>
                  <input
                    type="text"
                    value={activeReport.effectiveTime}
                    onChange={(e) => updateCurrentReport({ effectiveTime: e.target.value })}
                    placeholder="11:59PM"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Station</label>
                  <input
                    type="text"
                    value={activeReport.stationName}
                    onChange={(e) => updateCurrentReport({ stationName: e.target.value })}
                    placeholder="OBORPAH ASESEWA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Price shift & revaluation numbers */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400 block pb-1 border-b border-slate-800">
                Price Adjustment & Stock Revaluation
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Old Price (¢/L)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={activeReport.oldPrice || ''}
                    onChange={(e) => updateCurrentReport({ oldPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="16.59"
                    className="w-full bg-transparent text-lg font-bold text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">New Price (¢/L)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={activeReport.newPrice || ''}
                    onChange={(e) => updateCurrentReport({ newPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="17.20"
                    className="w-full bg-transparent text-lg font-bold text-cyan-400 font-mono focus:outline-none"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Price Difference</span>
                  <span className={`text-lg font-black font-mono block ${activeReport.priceDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeReport.priceDifference >= 0 ? `+¢${activeReport.priceDifference.toFixed(2)}` : `-¢${Math.abs(activeReport.priceDifference).toFixed(2)}`}
                  </span>
                  <span className="text-[10px] text-slate-500">per litre change</span>
                </div>
              </div>

              {/* Physical Stock & Stock Revaluation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Physical Stock in Tank (L)</span>
                  <input
                    type="number"
                    step="any"
                    value={activeReport.physicalStockAtChange || ''}
                    onChange={(e) =>
                      updateCurrentReport({ physicalStockAtChange: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="12710"
                    className="w-full bg-transparent text-lg font-bold text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Physical dipping reading at cutover</span>
                </div>

                <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                  activeReport.stockGainOrLossValueGhs >= 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider block">
                      Stock Revaluation ({activeReport.stockGainOrLossValueGhs >= 0 ? 'Stock Gain' : 'Stock Loss'})
                    </span>
                    <span className="text-[10px] opacity-80">Physical Stock × Price Difference</span>
                  </div>
                  <span className="text-xl font-black font-mono mt-1">
                    {activeReport.stockGainOrLossValueGhs >= 0
                      ? `+¢ ${Math.round(activeReport.stockGainOrLossValueGhs).toLocaleString()}`
                      : `-¢ ${Math.round(Math.abs(activeReport.stockGainOrLossValueGhs)).toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Pump meter readings at cutover */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block pb-1 border-b border-slate-800">
                Pump Meters at Price Cutover
              </span>

              <div className="space-y-2">
                {(activeReport.meterReadingsAtChange || []).map((m, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span className="col-span-2 font-bold text-cyan-400 font-mono">{m.pumpLabel}</span>
                    <div className="col-span-5 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Closing:</span>
                      <input
                        type="number"
                        step="any"
                        value={m.closingMeter || ''}
                        onChange={(e) =>
                          handleUpdatePumpReading(idx, 'closingMeter', parseFloat(e.target.value) || 0)
                        }
                        placeholder="25332.02"
                        className="w-full bg-transparent font-mono text-white text-right focus:outline-none"
                      />
                    </div>
                    <div className="col-span-5 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Sold:</span>
                      <input
                        type="number"
                        step="any"
                        value={m.litresSold || ''}
                        onChange={(e) =>
                          handleUpdatePumpReading(idx, 'litresSold', parseFloat(e.target.value) || 0)
                        }
                        placeholder="342.49"
                        className="w-full bg-transparent font-mono text-amber-400 text-right focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500">L</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                <span className="font-bold text-slate-400">TOTAL LITRES SOLD AT OLD PRICE:</span>
                <span className="font-black text-amber-400 text-sm">
                  {activeReport.totalLitresSoldAtOldPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} L
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: WhatsApp Formatted Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 sticky top-20 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Formatted WhatsApp Preview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(formatPriceChangeText(activeReport))}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied!' : 'Copy WhatsApp Text'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap select-all leading-relaxed">
                  {formatPriceChangeText(activeReport)}
                </pre>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(formatPriceChangeText(activeReport))}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <DollarSign className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No price change reports recorded yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "New PMS Price Shift" or "New AGO Price Shift" above to record a price shift cutover.
          </p>
        </div>
      )}
    </div>
  );
};
