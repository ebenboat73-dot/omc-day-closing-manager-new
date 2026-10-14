/**
 * Dynamic Plain-Text Report Formatter
 * Conforms strictly to PRD v3.1 Section 12:
 * "Report generation must reflect actual user-configured pumps and products, not a fixed list."
 */

import { DailyReport } from '../../types/report';

export function formatNumberWithCommas(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatVariance(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—L';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toLocaleString('en-US', { maximumFractionDigits: 1 })}L`;
}

export function formatReportDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generates the standardized OMC Daily Station Report string
 * suitable for WhatsApp, SMS, Telegram, or Clipboard export.
 */
export function generateStandardReportText(report: DailyReport): string {
  const formattedDate = formatReportDate(report.reportDate);
  const stationHeader = `${(report.stationNameSnapshot || 'DAILY STATION REPORT').toUpperCase()} — ${formattedDate}`;

  // Find unique products in this report
  const productCodes = Array.from(
    new Set([
      ...report.pumps.map((p) => p.productCodeSnapshot),
      ...report.stocks.map((s) => s.productCodeSnapshot),
    ])
  );

  const productBlocks: string[] = [];

  productCodes.forEach((code) => {
    // 1. Pumps for this product
    const pumpsForProduct = report.pumps.filter((p) => p.productCodeSnapshot === code);
    const pumpMeters = pumpsForProduct
      .map((p) => {
        const val = p.closingMeter;
        const formatted = val !== null && val !== undefined ? `${formatNumberWithCommas(val, 2)}L` : '…L';
        return `${p.pumpLabelSnapshot} Closing Meter ${formatted}`;
      })
      .join('; ');

    const totalSales = pumpsForProduct.reduce((sum, p) => sum + (p.litresSold || 0), 0);

    // 2. Stock for this product
    const stockEntries = report.stocks.filter((s) => s.productCodeSnapshot === code);
    const primaryStock = stockEntries[0];

    const physical = primaryStock?.physicalClosingStock !== null && primaryStock?.physicalClosingStock !== undefined
      ? `${primaryStock.physicalClosingStock.toLocaleString('en-US')}L`
      : '…L';
    const theoretical = primaryStock?.theoreticalClosingStock !== null && primaryStock?.theoreticalClosingStock !== undefined
      ? `${Math.round(primaryStock.theoreticalClosingStock).toLocaleString('en-US')}L`
      : '…L';
    const variance = primaryStock ? formatVariance(primaryStock.variance) : '—L';

    const line = `${code}: ${pumpMeters || 'No pumps'}. Total ${code} Sales: ${formatNumberWithCommas(totalSales, 2)}L. Physical Stock: ${physical}. Theoretical Stock: ${theoretical}. Variance: ${variance}.`;
    productBlocks.push(line);
  });

  // Expenses Section
  const validExpenses = report.expenses.filter((e) => e.amountGhs > 0 || e.description.trim() !== '');
  const expenseItems = validExpenses
    .map((e) => `${e.description || e.category} — GHS ${formatNumberWithCommas(e.amountGhs, 2)}`)
    .join('; ');

  const totalExpenses = report.expenses.reduce((sum, e) => sum + (e.amountGhs || 0), 0);
  const expensesLine = expenseItems
    ? `EXPENSES: ${expenseItems}. Total Expenses: GHS ${formatNumberWithCommas(totalExpenses, 2)}.`
    : `EXPENSES: None recorded. Total Expenses: GHS 0.00.`;

  // Status line
  const statusLine = `STATUS: ${report.status}`;

  // Warnings line if any unresolved
  const warningsLine = report.warnings.length > 0
    ? `\nWARNINGS: ${report.warnings.join('; ')}`
    : '';

  return [
    stationHeader,
    '',
    ...productBlocks.flatMap((block) => [block, '']),
    expensesLine,
    '',
    statusLine,
    warningsLine,
  ]
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
    .join('\n');
}

export function getShareUrls(reportText: string) {
  const encoded = encodeURIComponent(reportText);
  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encoded}`,
    telegram: `https://t.me/share/url?text=${encoded}`,
    sms: `sms:?body=${encoded}`,
  };
}
