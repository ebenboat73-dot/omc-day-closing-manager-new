/**
 * Business Logic & Calculation Engine for OMC Daily Reporting
 * Version 3.2 • Real-time GHS Sales, Unit Price, and Cash to Bank Calculations
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
      warning: opening === null ? 'Missing opening meter' : null,
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
      return {
        litresSold: Math.max(0, closing - opening),
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
  return Math.round(diff * 100) / 100;
}

/**
 * Recalculate an entire DailyReport given current readings, editable unit prices, and expenses
 */
export function recalculateReport(
  report: DailyReport,
  productsList: ConfiguredProduct[] = []
): DailyReport {
  const warnings: string[] = [];

  // Build price lookup map (PMS: 16.59, AGO: 18.39 default)
  const priceMap: Record<string, number> = {
    PMS: 16.59,
    AGO: 18.39,
    KERO: 15.00,
    ...(report.productPrices || {}),
  };

  // If productsList provides updated prices, merge them
  productsList.forEach((p) => {
    if (p.unitPrice && !report.productPrices?.[p.code]) {
      priceMap[p.code] = p.unitPrice;
    }
  });

  // 1. Recalculate each pump reading and GHS sales
  const updatedPumps: ReportPumpReading[] = report.pumps.map((pump) => {
    const { litresSold, warning } = computePumpLitresSold(
      pump.openingMeter,
      pump.closingMeter,
      pump.isRollover,
      pump.rolloverCapacity || 100000
    );

    if (warning && !pump.isIdleOrOptional) {
      warnings.push(`${pump.pumpLabelSnapshot}: ${warning}`);
    }

    const unitPrice = priceMap[pump.productCodeSnapshot] || 16.59;
    const amountGhs = litresSold !== null ? Math.round(litresSold * unitPrice * 100) / 100 : null;

    return {
      ...pump,
      litresSold,
      unitPriceSnapshot: unitPrice,
      amountGhs,
      warning,
    };
  });

  // 2. Sum sales by product code (both litres and GHS)
  const productLitresMap: Record<string, number> = {};
  const productGhsMap: Record<string, number> = {};

  updatedPumps.forEach((p) => {
    const code = p.productCodeSnapshot;
    const litres = p.litresSold || 0;
    const ghs = p.amountGhs || 0;
    productLitresMap[code] = (productLitresMap[code] || 0) + litres;
    productGhsMap[code] = (productGhsMap[code] || 0) + ghs;
  });

  // 3. Recalculate stock entries
  const updatedStocks: ReportStockEntry[] = report.stocks.map((stock) => {
    const code = stock.productCodeSnapshot;
    const totalProductSales = productLitresMap[code] || 0;
    const unitPrice = priceMap[code] || 16.59;
    const productSalesGhs = Math.round(totalProductSales * unitPrice * 100) / 100;

    const theoretical = computeTheoreticalClosing(
      stock.openingStock,
      stock.receipts,
      totalProductSales
    );
    const variance = computeVariance(stock.physicalClosingStock, theoretical);

    let stockWarning: string | null = null;
    if (stock.openingStock === null) {
      stockWarning = 'Missing opening stock dip/record';
    } else if (stock.physicalClosingStock === null) {
      stockWarning = 'Pending physical closing stock dipping';
    } else if (variance !== null && Math.abs(variance) > 150) {
      stockWarning = `Significant variance (${variance > 0 ? '+' : ''}${variance}L)`;
      warnings.push(`${code} ${stock.tankLabel}: High variance (${variance > 0 ? '+' : ''}${variance}L)`);
    }

    return {
      ...stock,
      daySales: Math.round(totalProductSales * 100) / 100,
      unitPriceSnapshot: unitPrice,
      productSalesGhs,
      theoreticalClosingStock: theoretical,
      variance,
      warning: stockWarning,
    };
  });

  // 4. Calculate Cash Account totals
  // Total sales across all products
  let totalSalesGhs = 0;
  Object.values(productGhsMap).forEach((val) => {
    totalSalesGhs += val;
  });
  totalSalesGhs = Math.round(totalSalesGhs * 100) / 100;

  // Total expenses
  const totalExpensesGhs = report.expenses.reduce((sum, e) => sum + (e.amountGhs || 0), 0);

  // Cash to Bank / In Till = Total Sales - Total Expenses
  const cashToBankOrTill = Math.round((totalSalesGhs - totalExpensesGhs) * 100) / 100;

  // 5. Determine status
  let currentStatus = report.status;
  const hasAnyClosing = updatedPumps.some((p) => p.closingMeter !== null);
  if (currentStatus === 'Draft' && hasAnyClosing) {
    currentStatus = 'In Progress';
  }

  return {
    ...report,
    status: currentStatus,
    productPrices: priceMap,
    pumps: updatedPumps,
    stocks: updatedStocks,
    totalSalesGhs,
    totalExpensesGhs: Math.round(totalExpensesGhs * 100) / 100,
    cashToBankOrTill,
    warnings,
    updatedAt: new Date().toISOString(),
  };
}
