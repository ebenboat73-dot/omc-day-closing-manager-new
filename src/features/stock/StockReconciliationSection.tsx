/**
 * Stock / Dipping Reconciliation Section
 * Version 3.2 • Camera at Dipping, OCR Dip Reading, Editable Unit Price & Cash in Till Summary
 */

import React from 'react';
import { DailyReport, ReportStockEntry, ConfiguredProduct, HubtelDetails } from '../../types/report';
import { Layers, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Camera, Eye, X, Sparkles, DollarSign, Wallet } from 'lucide-react';
import { formatNumberWithCommas, formatVariance } from '../sharing/reportFormatter';

interface StockReconciliationProps {
  report: DailyReport;
  products: ConfiguredProduct[];
  onUpdateStock: (stockId: string, updated: Partial<ReportStockEntry>) => void;
  onUpdateUnitPrice: (productCode: string, newPrice: number) => void;
  onUpdateHubtel: (updated: Partial<HubtelDetails>) => void;
  onOpenCameraForDipping: (stock: ReportStockEntry) => void;
  onPreviewPhoto?: (url: string, title: string) => void;
}

export const StockReconciliationSection: React.FC<StockReconciliationProps> = ({
  report,
  products,
  onUpdateStock,
  onUpdateUnitPrice,
  onUpdateHubtel,
  onOpenCameraForDipping,
  onPreviewPhoto,
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
        variance: variance !== null ? Math.round(variance * 100) / 100 : null,
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
      variance: variance !== null ? Math.round(variance * 100) / 100 : null,
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
        variance: Math.round(variance * 100) / 100,
      });
    }
  };

  const handleDipMmChange = (stock: ReportStockEntry, valStr: string) => {
    const val = parseFloat(valStr);
    onUpdateStock(stock.id, {
      dipReadingMm: !isNaN(val) ? val : undefined,
    });
  };

  const totalSalesGhs = report.totalSalesGhs || 0;
  const totalExpensesGhs = report.totalExpensesGhs || 0;
  const cashToBank = report.cashToBankOrTill ?? (totalSalesGhs - totalExpensesGhs);
  const hubtel = report.hubtel || { hubtelAccount: '', dashboardAmount: null, bankingWithHubtel: null };

  return (
    <div className="space-y-6">
      {/* Stock Cards Section */}
      <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>Tank Stock Dipping & Reconciliation</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Take photo of dipstick/gauge, verify physical stock, and set current unit price (UP)
            </p>
          </div>

          <div className="text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 self-start sm:self-auto font-medium">
            {report.stocks.length} Tank(s) Configured
          </div>
        </div>

        {/* Stock Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.stocks.map((stock) => {
            const prodMeta = products.find((p) => p.code === stock.productCodeSnapshot);
            const unitPrice = report.productPrices?.[stock.productCodeSnapshot] ?? (stock.productCodeSnapshot === 'PMS' ? 16.59 : stock.productCodeSnapshot === 'AGO' ? 18.39 : 15.00);
            const productSalesGhs = Math.round(stock.daySales * unitPrice);

            const isNegativeVariance = stock.variance !== null && stock.variance < -30;
            const isBalanced = stock.variance !== null && Math.abs(stock.variance) <= 30;

            return (
              <div
                key={stock.id}
                className="bg-slate-950/70 rounded-2xl border border-slate-800 p-4 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Header with Camera Button */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: prodMeta?.color || '#f59e0b' }}
                      />
                      <h3 className="font-extrabold text-base text-slate-100">
                        {stock.productCodeSnapshot}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({stock.tankLabel})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Dipping Camera Button */}
                      <button
                        type="button"
                        onClick={() => onOpenCameraForDipping(stock)}
                        className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Take photo of dipstick / tank gauge"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="hidden sm:inline text-[11px]">Dip Photo</span>
                      </button>

                      {stock.physicalClosingStock !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono-numbers flex items-center gap-1 ${
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
                  </div>

                  {/* Attached Dipstick Photo Preview */}
                  {stock.photoDataUrl && (
                    <div className="mt-3 p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={stock.photoDataUrl}
                          alt="Dipstick reading"
                          className="w-10 h-10 rounded-lg object-cover border border-slate-700 cursor-pointer"
                          onClick={() => onPreviewPhoto?.(stock.photoDataUrl!, `${stock.productCodeSnapshot} Dipstick Photo`)}
                        />
                        <span className="text-xs text-slate-300 font-semibold">Dipstick Photo Attached</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onPreviewPhoto?.(stock.photoDataUrl!, `${stock.productCodeSnapshot} Dipstick Photo`)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStock(stock.id, { photoDataUrl: undefined })}
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Editable Unit Price Field */}
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-300">
                      Current Unit Price (¢/L)
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400 font-bold">¢</span>
                      <input
                        type="number"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => {
                          const p = parseFloat(e.target.value);
                          if (!isNaN(p) && p > 0) {
                            onUpdateUnitPrice(stock.productCodeSnapshot, p);
                          }
                        }}
                        className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-amber-500/40 text-amber-300 font-mono font-bold text-right text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Inputs Grid */}
                  <div className="mt-3.5 space-y-2.5 text-xs">
                    {/* Opening Stock */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Opening Stock</span>
                      <div className="w-32 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={stock.openingStock !== null ? stock.openingStock : ''}
                          onChange={(e) => handleOpeningChange(stock, e.target.value)}
                          placeholder="0"
                          className={`w-full border rounded-lg px-2.5 py-1 text-right font-mono-numbers text-xs focus:outline-none ${
                            stock.openingStock === null
                              ? 'bg-amber-950/20 border-amber-500/50 text-amber-300'
                              : 'bg-slate-900 border-slate-700 text-slate-200'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Receipts */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">+ Tanker Receipts</span>
                      <div className="w-32 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={stock.receipts || ''}
                          onChange={(e) => handleReceiptsChange(stock, e.target.value)}
                          placeholder="0"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1 text-right text-slate-200 font-mono-numbers text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Day Sales Litres */}
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

                    {/* Total Product Sales in GHS */}
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300 font-semibold text-xs">
                        {stock.productCodeSnapshot} Sales Amount
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ¢ {productSalesGhs.toLocaleString()}
                      </span>
                    </div>

                    {/* Theoretical Closing */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300 font-semibold text-xs">
                        Theoretical Closing
                      </span>
                      <span className="font-mono-numbers font-bold text-white text-sm">
                        {stock.theoreticalClosingStock !== null
                          ? `${formatNumberWithCommas(stock.theoreticalClosingStock, 2)} L`
                          : '— L'}
                      </span>
                    </div>

                    {/* Physical Closing Stock Input */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-200 font-semibold">
                          Physical Stock (Dipping)
                        </label>
                        <span className="text-[10px] text-slate-400">Stock = {stock.physicalClosingStock ? formatNumberWithCommas(stock.physicalClosingStock, 0) : '—'}</span>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={stock.physicalClosingStock !== null ? stock.physicalClosingStock : ''}
                          onChange={(e) => handlePhysicalChange(stock, e.target.value)}
                          placeholder="e.g. 12710"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm font-mono-numbers text-white focus:outline-none font-bold"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono-numbers">
                          L
                        </span>
                      </div>
                    </div>

                    {/* Dip Stick Height (mm) */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">Dip Height (mm)</span>
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

                {/* Variance Output Card */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between mt-3 ${
                    stock.physicalClosingStock === null
                      ? 'bg-slate-900/50 border-slate-800 text-slate-500'
                      : isNegativeVariance
                      ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                      : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  }`}
                >
                  <span className="font-semibold">Stock Variance</span>
                  <span className="font-mono-numbers text-sm font-bold">
                    {formatVariance(stock.variance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CASH ACCOUNT & HUBTEL RECONCILIATION CARD */}
      <section className="bg-slate-900/70 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-base text-white">Cash Account & Bank Reconciliation</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Cash to Bank: ¢ {Math.round(cashToBank).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Total Sales */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              TOTAL SALES
            </span>
            <span className="font-mono text-xl font-black text-white">
              ¢ {Math.round(totalSalesGhs).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block">Sum of PMS & AGO fuel revenue</span>
          </div>

          {/* Less Expenses */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              LESS TOTAL EXPENSES
            </span>
            <span className="font-mono text-xl font-black text-rose-400">
              ¢ {formatNumberWithCommas(totalExpensesGhs, 2)}
            </span>
            <span className="text-[10px] text-slate-500 block">{report.expenses.length} expense items recorded</span>
          </div>

          {/* Cash to Bank / in Till */}
          <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-500/40 space-y-1">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
              CASH TO BANK (OR IN TILL)
            </span>
            <span className="font-mono text-xl font-black text-emerald-400">
              ¢ {Math.round(cashToBank).toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-300/80 block">Net physical cash on hand</span>
          </div>
        </div>

        {/* Hubtel Collection Fields */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
            Hubtel Electronic Payment Reconciliation
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Hubtel Account / ID
              </label>
              <input
                type="text"
                placeholder="e.g. MOMO 0244..."
                value={hubtel.hubtelAccount || ''}
                onChange={(e) => onUpdateHubtel({ hubtelAccount: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Hubtel Dashboard Amount (¢)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="¢ 0.00"
                value={hubtel.dashboardAmount !== null && hubtel.dashboardAmount !== undefined ? hubtel.dashboardAmount : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateHubtel({ dashboardAmount: !isNaN(val) ? val : null });
                }}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Banking with Hubtel (¢)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="¢ 0.00"
                value={hubtel.bankingWithHubtel !== null && hubtel.bankingWithHubtel !== undefined ? hubtel.bankingWithHubtel : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateHubtel({ bankingWithHubtel: !isNaN(val) ? val : null });
                }}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
