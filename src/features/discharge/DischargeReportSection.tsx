/**
 * Fuel Discharge Report Section
 * Version 3.2 • Before & After Discharge reconciliation according to OMC Standards
 * Calculates Stock Underground, Invoice, Expected Stock, Litres Sold, Theoretical Stock, and Overage / Shortage.
 */

import React, { useState } from 'react';
import {
  DischargeReport,
  ConfiguredProduct,
  ConfiguredPump,
  StationWorkspace,
  DischargePumpMeter,
} from '../../types/report';
import {
  Truck,
  Plus,
  Copy,
  Check,
  Share2,
  Trash2,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Fuel,
  Calendar,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import {
  formatBeforeDischargeText,
  formatAfterDischargeText,
  formatCompleteDischargeText,
} from './dischargeFormatter';

interface DischargeReportSectionProps {
  userId: string;
  workspace: StationWorkspace;
  products: ConfiguredProduct[];
  pumps: ConfiguredPump[];
  dischargeReports: DischargeReport[];
  onSaveReport: (report: DischargeReport) => void;
  onDeleteReport: (reportId: string) => void;
}

export const DischargeReportSection: React.FC<DischargeReportSectionProps> = ({
  userId,
  workspace,
  products,
  pumps,
  dischargeReports,
  onSaveReport,
  onDeleteReport,
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string>(
    dischargeReports[0]?.id || ''
  );
  const [copiedBefore, setCopiedBefore] = useState(false);
  const [copiedAfter, setCopiedAfter] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const activeReport = dischargeReports.find((r) => r.id === selectedReportId) || dischargeReports[0];

  const handleCreateNew = (productCode = 'AGO') => {
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const timeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Initial default meters from active pumps for this product
    const prodPumps = pumps.filter((p) => p.productCode === productCode && p.isActive);
    const initialMeters: DischargePumpMeter[] = prodPumps.length > 0
      ? prodPumps.map((p) => ({ pumpLabel: p.label, meter: 0 }))
      : [
          { pumpLabel: productCode === 'AGO' ? 'D1' : 'S1', meter: 0 },
          { pumpLabel: productCode === 'AGO' ? 'D2' : 'S2', meter: 0 },
        ];

    const newReport: DischargeReport = {
      id: `disch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspaceId: workspace.id,
      stationName: workspace.stationName || 'OBORPAH ASESEWA',
      productCode,
      date: dateStr,
      beforeTime: timeStr,
      truckNumber: '',
      driverName: '',
      waybillNumber: '',
      stockUndergroundBefore: 0,
      invoiceQuantity: 18000,
      expectedStock: 18000,
      openingMeters: initialMeters,
      totalOpeningMeters: 0,
      afterTime: '',
      stockAfterDischarge: null,
      litresSoldDuringDischarge: 0,
      theoreticalStock: null,
      overageOrShortage: null,
      closingMeters: initialMeters.map((m) => ({ ...m })),
      totalClosingMeters: 0,
      status: 'Before Discharge',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveReport(newReport);
    setSelectedReportId(newReport.id);
  };

  const updateCurrentReport = (updates: Partial<DischargeReport>) => {
    if (!activeReport) return;

    const merged = { ...activeReport, ...updates };

    // Auto-compute Before Discharge expected stock
    const stockUnderground = merged.stockUndergroundBefore || 0;
    const invoice = merged.invoiceQuantity || 0;
    merged.expectedStock = stockUnderground + invoice;

    // Auto-compute total opening meters
    merged.totalOpeningMeters = Math.round(
      (merged.openingMeters || []).reduce((sum, m) => sum + (m.meter || 0), 0) * 100
    ) / 100;

    // Auto-compute After Discharge calculations if stockAfterDischarge is given
    const litresSold = merged.litresSoldDuringDischarge || 0;
    const theoretical = merged.expectedStock - litresSold;
    merged.theoreticalStock = theoretical;

    if (merged.stockAfterDischarge !== null && merged.stockAfterDischarge !== undefined) {
      merged.overageOrShortage = Math.round((merged.stockAfterDischarge - theoretical) * 100) / 100;
      merged.status = 'Completed';
    }

    // Auto-compute total closing meters
    merged.totalClosingMeters = Math.round(
      (merged.closingMeters || []).reduce((sum, m) => sum + (m.meter || 0), 0) * 100
    ) / 100;

    onSaveReport(merged);
  };

  const handleUpdateOpeningMeter = (index: number, val: number) => {
    if (!activeReport) return;
    const newMeters = [...(activeReport.openingMeters || [])];
    newMeters[index] = { ...newMeters[index], meter: val };
    updateCurrentReport({ openingMeters: newMeters });
  };

  const handleAddOpeningMeter = () => {
    if (!activeReport) return;
    const newLabel = prompt('Enter Pump Label (e.g. S1, D1):', 'D1');
    if (!newLabel) return;
    const newMeters = [...(activeReport.openingMeters || []), { pumpLabel: newLabel.trim().toUpperCase(), meter: 0 }];
    updateCurrentReport({ openingMeters: newMeters });
  };

  const handleRemoveOpeningMeter = (index: number) => {
    if (!activeReport) return;
    const newMeters = activeReport.openingMeters.filter((_, i) => i !== index);
    updateCurrentReport({ openingMeters: newMeters });
  };

  const handleUpdateClosingMeter = (index: number, val: number) => {
    if (!activeReport) return;
    const newMeters = [...(activeReport.closingMeters || [])];
    newMeters[index] = { ...newMeters[index], meter: val };
    updateCurrentReport({ closingMeters: newMeters });
  };

  const handleAddClosingMeter = () => {
    if (!activeReport) return;
    const newLabel = prompt('Enter Pump Label (e.g. S1, D1):', 'D1');
    if (!newLabel) return;
    const newMeters = [...(activeReport.closingMeters || []), { pumpLabel: newLabel.trim().toUpperCase(), meter: 0 }];
    updateCurrentReport({ closingMeters: newMeters });
  };

  const handleRemoveClosingMeter = (index: number) => {
    if (!activeReport) return;
    const newMeters = activeReport.closingMeters.filter((_, i) => i !== index);
    updateCurrentReport({ closingMeters: newMeters });
  };

  const handleCopyText = (text: string, type: 'before' | 'after' | 'full') => {
    navigator.clipboard.writeText(text);
    if (type === 'before') {
      setCopiedBefore(true);
      setTimeout(() => setCopiedBefore(false), 2000);
    } else if (type === 'after') {
      setCopiedAfter(true);
      setTimeout(() => setCopiedAfter(false), 2000);
    } else {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    }
  };

  const handleShareWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Selector */}
      <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Fuel Tanker Discharge Reports</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                OMC Tanker Delivery
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Reconcile stock underground before & after discharge with invoice quantity and overage/shortage.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Product quick buttons */}
          <button
            type="button"
            onClick={() => handleCreateNew('AGO')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New AGO Discharge</span>
          </button>
          <button
            type="button"
            onClick={() => handleCreateNew('PMS')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New PMS Discharge</span>
          </button>
        </div>
      </div>

      {/* Report History / Selector pills */}
      {dischargeReports.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap pl-1">Recent Deliveries:</span>
          {dischargeReports.map((r) => {
            const isSelected = r.id === activeReport?.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReportId(r.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 border transition-all ${
                  isSelected
                    ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{r.productCode}</span>
                <span className="opacity-80">({r.date})</span>
                {r.overageOrShortage !== null && r.overageOrShortage !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      r.overageOrShortage >= 0
                        ? isSelected
                          ? 'bg-emerald-400 text-slate-950'
                          : 'text-emerald-400 bg-emerald-500/10'
                        : isSelected
                        ? 'bg-rose-400 text-slate-950'
                        : 'text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {r.overageOrShortage >= 0 ? `+${r.overageOrShortage}` : r.overageOrShortage} L
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Active Discharge Report Form */}
      {activeReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Edit Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* General Delivery Info Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                    Station & Waybill Details
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this discharge report?')) {
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
                    <option value="AGO">AGO (Diesel)</option>
                    <option value="PMS">PMS (Super)</option>
                    <option value="KERO">KERO (Kerosene)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date</label>
                  <input
                    type="text"
                    value={activeReport.date}
                    onChange={(e) => updateCurrentReport({ date: e.target.value })}
                    placeholder="10/10/2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Truck #</label>
                  <input
                    type="text"
                    value={activeReport.truckNumber || ''}
                    onChange={(e) => updateCurrentReport({ truckNumber: e.target.value })}
                    placeholder="GN-4921-22"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Waybill #</label>
                  <input
                    type="text"
                    value={activeReport.waybillNumber || ''}
                    onChange={(e) => updateCurrentReport({ waybillNumber: e.target.value })}
                    placeholder="WB-AGO-8819"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* PHASE 1: BEFORE DISCHARGE */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Phase 1: Before Discharge
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={activeReport.beforeTime}
                    onChange={(e) => updateCurrentReport({ beforeTime: e.target.value })}
                    placeholder="2:30PM"
                    className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Stock Underground (L)</span>
                  <input
                    type="number"
                    step="any"
                    value={activeReport.stockUndergroundBefore || ''}
                    onChange={(e) =>
                      updateCurrentReport({ stockUndergroundBefore: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="3820"
                    className="w-full bg-transparent text-lg font-bold text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Invoice Quantity (L)</span>
                  <input
                    type="number"
                    step="any"
                    value={activeReport.invoiceQuantity || ''}
                    onChange={(e) =>
                      updateCurrentReport({ invoiceQuantity: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="18000"
                    className="w-full bg-transparent text-lg font-bold text-amber-400 font-mono focus:outline-none"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Expected Stock (L)</span>
                  <span className="text-lg font-black text-emerald-400 font-mono block">
                    {activeReport.expectedStock.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">Underground + Invoice</span>
                </div>
              </div>

              {/* Opening Pump Meters */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Opening Meters (Discharge Pumps)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOpeningMeter}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Pump</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(activeReport.openingMeters || []).map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                    >
                      <span className="font-bold text-amber-400 font-mono text-xs w-12">{m.pumpLabel}</span>
                      <input
                        type="number"
                        step="any"
                        value={m.meter || ''}
                        onChange={(e) => handleUpdateOpeningMeter(idx, parseFloat(e.target.value) || 0)}
                        placeholder="232341.57"
                        className="flex-1 bg-transparent text-right font-mono text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOpeningMeter(idx)}
                        className="text-slate-600 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
                  <span className="font-bold text-slate-400">TOTAL OPENING METRES:</span>
                  <span className="font-black text-white text-sm">
                    {activeReport.totalOpeningMeters.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Phase 1 */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyText(formatBeforeDischargeText(activeReport), 'before')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedBefore ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBefore ? 'Copied Before Discharge!' : 'Copy Before Discharge Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(formatBeforeDischargeText(activeReport))}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp (Before)</span>
                </button>
              </div>
            </div>

            {/* PHASE 2: AFTER DISCHARGE */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Phase 2: After Discharge
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={activeReport.afterTime || ''}
                    onChange={(e) => updateCurrentReport({ afterTime: e.target.value })}
                    placeholder="3:33 PM"
                    className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-emerald-300 font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Stock After Discharge (L)</span>
                  <input
                    type="number"
                    step="any"
                    value={activeReport.stockAfterDischarge ?? ''}
                    onChange={(e) =>
                      updateCurrentReport({
                        stockAfterDischarge: e.target.value !== '' ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="21880"
                    className="w-full bg-transparent text-lg font-bold text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Litres Sold During Discharge</span>
                  <input
                    type="number"
                    step="any"
                    value={activeReport.litresSoldDuringDischarge || ''}
                    onChange={(e) =>
                      updateCurrentReport({
                        litresSoldDuringDischarge: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    className="w-full bg-transparent text-lg font-bold text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Theoretical Stock (L)</span>
                  <span className="text-lg font-black text-slate-200 font-mono block">
                    {(activeReport.theoreticalStock ?? activeReport.expectedStock).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">Expected - Sold</span>
                </div>
              </div>

              {/* OVERAGE OR SHORTAGE HIGHLIGHT */}
              {activeReport.overageOrShortage !== null && activeReport.overageOrShortage !== undefined && (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    activeReport.overageOrShortage >= 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {activeReport.overageOrShortage >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-rose-400" />
                    )}
                    <div>
                      <span className="text-xs uppercase font-extrabold tracking-wider block">
                        {activeReport.overageOrShortage >= 0 ? 'Delivery Overage' : 'Delivery Shortage'}
                      </span>
                      <span className="text-[11px] opacity-80">
                        Actual Physical Stock vs Theoretical Stock
                      </span>
                    </div>
                  </div>
                  <span className="text-2xl font-black font-mono">
                    {activeReport.overageOrShortage >= 0
                      ? `+${activeReport.overageOrShortage.toLocaleString()}`
                      : activeReport.overageOrShortage.toLocaleString()}{' '}
                    L
                  </span>
                </div>
              )}

              {/* Closing Pump Meters */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Closing Meters (Discharge Pumps)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddClosingMeter}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Pump</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(activeReport.closingMeters || []).map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                    >
                      <span className="font-bold text-emerald-400 font-mono text-xs w-12">{m.pumpLabel}</span>
                      <input
                        type="number"
                        step="any"
                        value={m.meter || ''}
                        onChange={(e) => handleUpdateClosingMeter(idx, parseFloat(e.target.value) || 0)}
                        placeholder="232341.57"
                        className="flex-1 bg-transparent text-right font-mono text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveClosingMeter(idx)}
                        className="text-slate-600 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
                  <span className="font-bold text-slate-400">TOTAL CLOSING METRES:</span>
                  <span className="font-black text-white text-sm">
                    {activeReport.totalClosingMeters.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Phase 2 */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyText(formatAfterDischargeText(activeReport), 'after')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedAfter ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAfter ? 'Copied After Discharge!' : 'Copy After Discharge Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(formatAfterDischargeText(activeReport))}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp (After)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Formatted Executive Plain-Text Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 sticky top-20 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Formatted WhatsApp Preview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(formatCompleteDischargeText(activeReport), 'full')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFull ? 'Full Copied!' : 'Copy Complete Log'}</span>
                </button>
              </div>

              {/* Before Discharge Text Box */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-amber-400 uppercase font-mono font-bold block mb-1">
                  -- BEFORE DISCHARGE MESSAGE --
                </span>
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap select-all leading-relaxed">
                  {formatBeforeDischargeText(activeReport)}
                </pre>
              </div>

              {/* After Discharge Text Box */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block mb-1">
                  -- AFTER DISCHARGE MESSAGE --
                </span>
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap select-all leading-relaxed">
                  {formatAfterDischargeText(activeReport)}
                </pre>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(formatCompleteDischargeText(activeReport))}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send Full Discharge Report via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Truck className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No discharge reports recorded yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "New AGO Discharge" or "New PMS Discharge" above to record a fuel tanker delivery.
          </p>
        </div>
      )}
    </div>
  );
};
