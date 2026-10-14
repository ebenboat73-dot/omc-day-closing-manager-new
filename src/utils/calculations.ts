/**
 * Business Logic & Calculation Engine for OMC Daily Reporting
 * Version 3.1 • Authoritative Calculation Rules
 */

import {
  DailyReport,
  ReportPumpReading,
  ReportStockEntry,
  ConfiguredProduct,
} from '../types/report';

/**
 * Pump Day Sales = Closing Meter - Opening Meter (accounting for rollover if confirmed)
 * Missing readings return null (incomplete, NOT zero).
 */
export function computePumpLitresSold(
  opening: number | null,
  closing: number | null,
  isRollover: boolean,
  capacity = 100000
): { litresSold: number | null; warning: string | null } {
  if (opening === null || closing === null) {
    return {
      litresSold: null,
      warning: opening === null ? 'Missing opening meter' : 'Missing closing meter',
    };
  }

  if (closing < opening) {
    if (isRollover) {
      const sales = Math.max(0, (capacity - opening) + closing);
      return {
        litresSold: Math.round(sales * 100) / 100,
        warning: null,
      };
    } else {
      // Flag closing < opening for review; do not silently assume meter rollover
      return {
        litresSold: Math.max(0, closing - opening), // Or negative indicator
        warning: `Closing meter (${closing}) is lower than opening (${opening}). Check for typo or confirm rollover.`,
      };
    }
  }

  const normalDiff = closing - opening;
  return {
    litresSold: Math.round(normalDiff * 100) / 100,
    warning: null,
  };
}

/**
 * Theoretical Closing Stock = Opening Stock + Receipts - Day Sales
 */
export function computeTheoreticalClosing(
  openingStock: number | null,
  receipts: number,
  daySales: number
): number | null {
  if (openingStock === null) return null;
  const val = openingStock + receipts - daySales;
  return Math.round(val * 100) / 100;
}

/**
 * Variance = Physical Closing Stock - Theoretical Closing Stock
 */
export function computeVariance(
  physicalClosingStock: number | null,
  theoreticalClosingStock: number | null
): number | null {
  if (physicalClosingStock === null || theoreticalClosingStock === null) return null;
  const diff = physicalClosingStock - theoreticalClosingStock;
  return Math.round(diff * 10) / 10;
}

/**
 * Recalculate an entire DailyReport given current readings and product configurations
 */
export function recalculateReport(
  report: DailyReport,
  productsList: ConfiguredProduct[] = []
): DailyReport {
  const warnings: string[] = [];

  // 1. Recalculate each pump reading
  const updatedPumps: ReportPumpReading[] = report.pumps.map((pump) => {
    const { litresSold, warning } = computePumpLitresSold(
      pump.openingMeter,
      pump.closingMeter,
      pump.isRollover,
      pump.rolloverCapacity || 100000
    );

    if (warning) {
      warnings.push(`${pump.pumpLabelSnapshot}: ${warning}`);
    }

    return {
      ...pump,
      litresSold,
      warning,
    };
  });

  // 2. Sum sales by product code
  const productSalesMap: Record<string, number> = {};
  updatedPumps.forEach((p) => {
    const code = p.productCodeSnapshot;
    productSalesMap[code] = (productSalesMap[code] || 0) + (p.litresSold || 0);
  });

  // 3. Recalculate stock entries
  const updatedStocks: ReportStockEntry[] = report.stocks.map((stock) => {
    const totalProductSales = productSalesMap[stock.productCodeSnapshot] || 0;
    const theoretical = computeTheoreticalClosing(
      stock.openingStock,
      stock.receipts,
      totalProductSales
    );
    const variance = computeVariance(stock.physicalClosingStock, theoretical);

    let stockWarning: string | null = null;
    if (stock.openingStock === null) {
      stockWarning = 'Missing opening stock dip/record';
      warnings.push(`${stock.productCodeSnapshot} ${stock.tankLabel}: Missing opening stock`);
    } else if (stock.physicalClosingStock === null) {
      stockWarning = 'Pending physical closing stock dipping';
    } else if (variance !== null && Math.abs(variance) > 150) {
      stockWarning = `Significant variance detected (${variance > 0 ? '+' : ''}${variance}L)`;
      warnings.push(`${stock.productCodeSnapshot} ${stock.tankLabel}: High variance (${variance > 0 ? '+' : ''}${variance}L)`);
    }

    return {
      ...stock,
      daySales: Math.round(totalProductSales * 100) / 100,
      theoreticalClosingStock: theoretical,
      variance,
      warning: stockWarning,
    };
  });

  // 4. Determine auto status progression if currently Draft
  let currentStatus = report.status;
  const hasAnyClosingEntered = updatedPumps.some((p) => p.closingMeter !== null);
  const allClosingEntered = updatedPumps.length > 0 && updatedPumps.every((p) => p.closingMeter !== null);
  const allPhysicalStockEntered = updatedStocks.length > 0 && updatedStocks.every((s) => s.physicalClosingStock !== null);

  if (currentStatus === 'Draft' && hasAnyClosingEntered) {
    currentStatus = 'In Progress';
  }
  if (currentStatus === 'In Progress' && allClosingEntered && allPhysicalStockEntered && warnings.length === 0) {
    currentStatus = 'Ready for Review';
  }

  return {
    ...report,
    status: currentStatus,
    pumps: updatedPumps,
    stocks: updatedStocks,
    warnings,
    updatedAt: new Date().toISOString(),
  };
}
