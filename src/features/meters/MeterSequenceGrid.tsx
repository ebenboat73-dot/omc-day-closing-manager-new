/**
 * Dynamic Meter Sequence Grid
 * Version 3.2 • Real-time GHS sales, unit prices, analogue meters, and removable pumps
 */

import React from 'react';
import { DailyReport, ReportPumpReading, ConfiguredProduct } from '../../types/report';
import { PumpMeterCard } from './PumpMeterCard';
import { Fuel, UploadCloud, Sparkles, Sliders, DollarSign, Plus } from 'lucide-react';

interface MeterSequenceGridProps {
  report: DailyReport;
  products: ConfiguredProduct[];
  onUpdatePump: (readingId: string, updated: Partial<ReportPumpReading>) => void;
  onRemovePump?: (readingId: string) => void;
  onUpdateUnitPrice?: (productCode: string, newPrice: number) => void;
  onOpenCamera: (reading: ReportPumpReading) => void;
  onOpenPumpSetup?: () => void;
  onOpenBulkUpload?: () => void;
  onPreviewPhoto?: (url: string, title: string) => void;
}

export const MeterSequenceGrid: React.FC<MeterSequenceGridProps> = ({
  report,
  products,
  onUpdatePump,
  onRemovePump,
  onUpdateUnitPrice,
  onOpenCamera,
  onOpenPumpSetup,
  onOpenBulkUpload,
  onPreviewPhoto,
}) => {
  // Extract distinct product codes
  const productCodes = Array.from(new Set(report.pumps.map((p) => p.productCodeSnapshot)));

  // Total station progress
  const activePumps = report.pumps.filter((p) => !p.isIdleOrOptional);
  const recordedCount = activePumps.filter((p) => p.closingMeter !== null).length;
  const totalLitres = activePumps.reduce((sum, p) => sum + (p.litresSold || 0), 0);
  const totalSalesGhs = report.totalSalesGhs || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">
              Pump Meter Readings & Revenue
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Progress: <span className="text-amber-400 font-bold">{recordedCount}/{activePumps.length}</span> active nozzles recorded • Total Revenue:{' '}
            <span className="text-emerald-400 font-mono font-black">¢ {Math.round(totalSalesGhs).toLocaleString()}</span>{' '}
            ({totalLitres.toLocaleString(undefined, { minimumFractionDigits: 2 })} L)
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenPumpSetup && (
            <button
              type="button"
              onClick={onOpenPumpSetup}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Configure Pumps</span>
            </button>
          )}

          {onOpenBulkUpload && (
            <button
              type="button"
              id="btn-trigger-bulk-modal"
              onClick={onOpenBulkUpload}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <UploadCloud className="w-4 h-4 text-blue-400" />
              <span>Batch Photos</span>
            </button>
          )}
        </div>
      </div>

      {/* Render Product Sections */}
      {productCodes.map((code) => {
        const prodMeta = products.find((p) => p.code === code);
        const pumpsForProduct = report.pumps.filter((p) => p.productCodeSnapshot === code);
        const unitPrice = report.productPrices?.[code] ?? (code === 'PMS' ? 16.59 : code === 'AGO' ? 18.39 : 15.00);

        const prodLitres = pumpsForProduct.reduce((sum, p) => sum + (p.litresSold || 0), 0);
        const prodSalesGhs = Math.round(prodLitres * unitPrice);
        const prodCompleted = pumpsForProduct.filter((p) => p.closingMeter !== null).length;

        return (
          <section
            key={code}
            id={`product-section-${code}`}
            className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4 shadow-sm"
          >
            {/* Product Header with Unit Price Input */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
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
                    {pumpsForProduct.length} Nozzles Configured
                  </span>
                </div>
              </div>

              {/* Editable Unit Price & Total Revenue Pill */}
              <div className="flex flex-wrap items-center gap-4 self-end sm:self-center">
                {/* Editable Unit Price */}
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 font-semibold">Current Price @</span>
                  <span className="text-amber-400 font-bold">¢</span>
                  <input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && onUpdateUnitPrice) {
                        onUpdateUnitPrice(code, val);
                      }
                    }}
                    className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-300 font-mono font-bold text-xs text-right focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Subtotals */}
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                    {code} Revenue
                  </span>
                  <span className="font-mono text-base font-black text-emerald-400">
                    ¢ {prodSalesGhs.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono block">
                    ({prodLitres.toLocaleString(undefined, { minimumFractionDigits: 2 })} L)
                  </span>
                </div>
              </div>
            </div>

            {/* Grid of Pumps for this Product */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pumpsForProduct.map((pump, idx) => (
                <PumpMeterCard
                  key={pump.id}
                  reading={pump}
                  positionNumber={idx + 1}
                  product={prodMeta}
                  unitPrice={unitPrice}
                  onUpdate={(updated) => onUpdatePump(pump.id, updated)}
                  onRemovePump={onRemovePump}
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
