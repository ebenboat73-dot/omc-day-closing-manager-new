/**
 * Dynamic Meter Sequence Grid
 * Conforms to PRD v3.1 Section 7 & 9:
 * Dynamic products and pumps grouped in configured display order.
 */

import React from 'react';
import { DailyReport, ReportPumpReading, ConfiguredProduct } from '../../types/report';
import { PumpMeterCard } from './PumpMeterCard';
import { Fuel, UploadCloud, Sparkles, CheckCircle2, Sliders } from 'lucide-react';

interface MeterSequenceGridProps {
  report: DailyReport;
  products: ConfiguredProduct[];
  onUpdatePump: (readingId: string, updated: Partial<ReportPumpReading>) => void;
  onOpenCamera: (reading: ReportPumpReading) => void;
  onOpenBulkUpload?: () => void;
  onPreviewPhoto?: (url: string, title: string) => void;
}

export const MeterSequenceGrid: React.FC<MeterSequenceGridProps> = ({
  report,
  products,
  onUpdatePump,
  onOpenCamera,
  onOpenBulkUpload,
  onPreviewPhoto,
}) => {
  // Extract distinct product codes in the current report's pumps
  const productCodes = Array.from(new Set(report.pumps.map((p) => p.productCodeSnapshot)));

  // Total station progress
  const totalPumps = report.pumps.length;
  const recordedCount = report.pumps.filter((p) => p.closingMeter !== null).length;
  const verifiedCount = report.pumps.filter((p) => p.isConfirmed && p.closingMeter !== null).length;
  const totalSales = report.pumps.reduce((sum, p) => sum + (p.litresSold || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Section Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">
              Pump Meter Readings & Day Sales
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Progress: <span className="text-amber-400 font-bold">{recordedCount}/{totalPumps}</span> recorded •{' '}
            <span className="text-emerald-400 font-bold">{verifiedCount}</span> verified • Total Sales:{' '}
            <span className="text-white font-mono font-bold">{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })} L</span>
          </p>
        </div>

        {onOpenBulkUpload && (
          <button
            type="button"
            id="btn-trigger-bulk-modal"
            onClick={onOpenBulkUpload}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            <UploadCloud className="w-4 h-4 text-blue-400" />
            <span>Batch Photo OCR</span>
          </button>
        )}
      </div>

      {/* Render Product Sections */}
      {productCodes.map((code) => {
        const prodMeta = products.find((p) => p.code === code);
        const pumpsForProduct = report.pumps.filter((p) => p.productCodeSnapshot === code);

        const prodSales = pumpsForProduct.reduce((sum, p) => sum + (p.litresSold || 0), 0);
        const prodCompleted = pumpsForProduct.filter((p) => p.closingMeter !== null).length;
        const missingOpening = pumpsForProduct.filter((p) => p.openingMeter === null).length;

        return (
          <section
            key={code}
            id={`product-section-${code}`}
            className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4 shadow-sm"
          >
            {/* Product Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: prodMeta?.color || '#f59e0b' }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-100 tracking-tight">
                      {code}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      ({prodMeta?.fullName || code})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {pumpsForProduct.length} configured nozzles
                  </span>
                </div>
              </div>

              {/* Product Subtotals */}
              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                    Total {code} Sales
                  </span>
                  <span className="font-mono text-base font-bold text-amber-400">
                    {prodSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-normal text-slate-400">L</span>
                  </span>
                </div>

                <div className="pl-3 border-l border-slate-800 text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                    Completed
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    {prodCompleted}/{pumpsForProduct.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning if any opening meter is missing */}
            {missingOpening > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-center justify-between">
                <span>⚠️ {missingOpening} pump(s) missing opening readings. Please enter manually.</span>
              </div>
            )}

            {/* Grid of Pumps for this Product */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pumpsForProduct.map((pump, idx) => (
                <PumpMeterCard
                  key={pump.id}
                  reading={pump}
                  positionNumber={idx + 1}
                  product={prodMeta}
                  onUpdate={(updated) => onUpdatePump(pump.id, updated)}
                  onPreviewPhoto={onPreviewPhoto}
                  onOpenCamera={onOpenCamera}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
