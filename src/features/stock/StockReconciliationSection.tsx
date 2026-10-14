/**
 * Stock / Dipping Reconciliation Section
 * PRD v3.1 Section 10:
 * Theoretical closing stock = Opening stock + Receipts - Day sales
 * Variance = Physical closing stock - Theoretical closing stock
 */

import React from 'react';
import { DailyReport, ReportStockEntry, ConfiguredProduct } from '../../types/report';
import { Layers, HelpCircle, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatVariance } from '../sharing/reportFormatter';

interface StockReconciliationProps {
  report: DailyReport;
  products: ConfiguredProduct[];
  onUpdateStock: (stockId: string, updated: Partial<ReportStockEntry>) => void;
}

export const StockReconciliationSection: React.FC<StockReconciliationProps> = ({
  report,
  products,
  onUpdateStock,
}) => {
  const handleOpeningChange = (stock: ReportStockEntry, valStr: string) => {
    if (valStr.trim() === '') {
      onUpdateStock(stock.id, {
        openingStock: null,
        theoreticalClosingStock: null,
        variance: null,
      });
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const theoretical = val + stock.receipts - stock.daySales;
      const variance = stock.physicalClosingStock !== null ? stock.physicalClosingStock - theoretical : null;
      onUpdateStock(stock.id, {
        openingStock: val,
        theoreticalClosingStock: Math.round(theoretical * 100) / 100,
        variance: variance !== null ? Math.round(variance * 10) / 10 : null,
      });
    }
  };

  const handleReceiptsChange = (stock: ReportStockEntry, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const opening = stock.openingStock ?? 0;
    const theoretical = opening + val - stock.daySales;
    const variance = stock.physicalClosingStock !== null ? stock.physicalClosingStock - theoretical : null;
    onUpdateStock(stock.id, {
      receipts: val,
      theoreticalClosingStock: Math.round(theoretical * 100) / 100,
      variance: variance !== null ? Math.round(variance * 10) / 10 : null,
    });
  };

  const handlePhysicalChange = (stock: ReportStockEntry, valStr: string) => {
    if (valStr.trim() === '') {
      onUpdateStock(stock.id, {
        physicalClosingStock: null,
        variance: null,
      });
      return;
    }
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const theoretical = stock.theoreticalClosingStock ?? (stock.openingStock ?? 0) + stock.receipts - stock.daySales;
      const variance = val - theoretical;
      onUpdateStock(stock.id, {
        physicalClosingStock: val,
        variance: Math.round(variance * 10) / 10,
      });
    }
  };

  const handleDipMmChange = (stock: ReportStockEntry, valStr: string) => {
    const val = parseFloat(valStr);
    onUpdateStock(stock.id, {
      dipReadingMm: !isNaN(val) ? val : undefined,
    });
  };

  return (
    <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>Tank Stock & Dipping Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Formula: Theoretical Closing = Opening + Receipts − Day Sales • Variance = Physical − Theoretical
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 self-start sm:self-auto font-medium">
          {report.stocks.length} Configured Tank(s)
        </div>
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {report.stocks.map((stock) => {
          const prodMeta = products.find((p) => p.code === stock.productCodeSnapshot);

          const isNegativeVariance = stock.variance !== null && stock.variance < -30;
          const isBalanced = stock.variance !== null && Math.abs(stock.variance) <= 30;
          const isSignificant = stock.variance !== null && Math.abs(stock.variance) > 100;

          return (
            <div
              key={stock.id}
              className="bg-slate-950/70 rounded-2xl border border-slate-800 p-4 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: prodMeta?.color || '#f59e0b' }}
                    />
                    <h3 className="font-bold text-base text-slate-100">
                      {stock.productCodeSnapshot}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({stock.tankLabel})
                    </span>
                  </div>

                  {stock.physicalClosingStock !== null ? (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono-numbers flex items-center gap-1 ${
                        isNegativeVariance
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isBalanced
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {isNegativeVariance ? (
                        <TrendingDown className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5" />
                      )}
                      <span>Var: {formatVariance(stock.variance)}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Dipping Pending
                    </span>
                  )}
                </div>

                {/* Input Fields */}
                <div className="mt-3.5 space-y-2.5 text-xs">
                  {/* Opening Stock */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Opening Stock (L)</span>
                    <div className="w-32 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={stock.openingStock !== null ? stock.openingStock : ''}
                        onChange={(e) => handleOpeningChange(stock, e.target.value)}
                        placeholder="0.0"
                        className={`w-full border rounded-lg px-2.5 py-1 text-right font-mono-numbers text-xs focus:outline-none ${
                          stock.openingStock === null
                            ? 'bg-amber-950/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Tanker Receipts */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">+ Tanker Receipts (L)</span>
                    <div className="w-32 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={stock.receipts || ''}
                        onChange={(e) => handleReceiptsChange(stock, e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1 text-right text-slate-200 font-mono-numbers text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Day Sales from Pumps */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <span>− Day Sales</span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded font-semibold">
                        Pumps
                      </span>
                    </div>
                    <div className="font-mono-numbers font-bold text-amber-400 text-right pr-2">
                      {stock.daySales.toLocaleString(undefined, { minimumFractionDigits: 2 })} L
                    </div>
                  </div>

                  {/* Theoretical Closing */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 font-semibold text-xs">
                      Theoretical Closing
                    </span>
                    <span className="font-mono-numbers font-bold text-white text-sm">
                      {stock.theoreticalClosingStock !== null
                        ? `${Math.round(stock.theoreticalClosingStock).toLocaleString()} L`
                        : '— L'}
                    </span>
                  </div>

                  {/* Physical Closing Stock */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-200 font-semibold">
                        Physical Closing Stock
                      </label>
                      <span className="text-[10px] text-slate-400">Dip Chart Litres</span>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={stock.physicalClosingStock !== null ? stock.physicalClosingStock : ''}
                        onChange={(e) => handlePhysicalChange(stock, e.target.value)}
                        placeholder="e.g. 15420"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm font-mono-numbers text-white focus:outline-none font-bold"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono-numbers">
                        L
                      </span>
                    </div>
                  </div>

                  {/* Dip Stick Height (mm) */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">Dip Stick Height (mm)</span>
                    <input
                      type="number"
                      value={stock.dipReadingMm || ''}
                      onChange={(e) => handleDipMmChange(stock, e.target.value)}
                      placeholder="e.g. 1750"
                      className="w-24 bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-0.5 text-right text-slate-400 font-mono-numbers text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Variance Status Banner */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between mt-3 ${
                  stock.physicalClosingStock === null
                    ? 'bg-slate-900/50 border-slate-800 text-slate-500'
                    : isSignificant
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : isNegativeVariance
                    ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                    : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {stock.physicalClosingStock === null ? (
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                  ) : isNegativeVariance ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="font-semibold">Stock Variance</span>
                </div>

                <span className="font-mono-numbers text-sm font-bold">
                  {formatVariance(stock.variance)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
