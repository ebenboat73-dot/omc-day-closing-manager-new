/**
 * Station Closing Report Formatter
 * Generates the exact Ghanaian OMC station report format specified by the station manager.
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
  if (val === null || val === undefined || isNaN(val)) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatReportDateDDMMYYYY(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatReportDate(dateStr: string): string {
  return formatReportDateDDMMYYYY(dateStr);
}

/**
 * Generates the authentic station closing report formatted for WhatsApp, SMS, or Telegram
 */
export function generateStandardReportText(report: DailyReport): string {
  const formattedDate = formatReportDateDDMMYYYY(report.reportDate);
  const stationHeader = (report.stationNameSnapshot || 'OBORPAH ASESEWA').toUpperCase();
  const shiftHeader = report.shiftType || 'Evening Report';

  const productCodes = Array.from(
    new Set([
      ...report.pumps.map((p) => p.productCodeSnapshot),
      ...report.stocks.map((s) => s.productCodeSnapshot),
    ])
  );

  const productBlocks: string[] = [];
  const analogueBlocks: string[] = [];

  productCodes.forEach((code) => {
    const pumpsForProduct = report.pumps.filter((p) => p.productCodeSnapshot === code && !p.isIdleOrOptional);
    const stock = report.stocks.find((s) => s.productCodeSnapshot === code);
    const unitPrice = report.productPrices?.[code] ?? (code === 'PMS' ? 16.59 : code === 'AGO' ? 18.39 : 15.00);

    const stockVal = stock?.physicalClosingStock !== null && stock?.physicalClosingStock !== undefined
      ? formatNumberWithCommas(stock.physicalClosingStock, 0)
      : '—';

    // Pump closing readings lines e.g. S1=25332.02
    const pumpLines = pumpsForProduct
      .map((p) => {
        const val = p.closingMeter;
        const valStr = val !== null && val !== undefined ? formatNumberWithCommas(val, 2) : '—';
        return `${p.pumpLabelSnapshot}=${valStr}`;
      })
      .join('\n');

    const totalLitres = pumpsForProduct.reduce((sum, p) => sum + (p.litresSold || 0), 0);
    const totalGhs = Math.round(totalLitres * unitPrice);

    const varianceVal = stock?.variance !== null && stock?.variance !== undefined
      ? formatVariance(stock.variance)
      : '—';

    const block = [
      `${code}`,
      `Stock = ${stockVal}`,
      `Current Price @ ¢${unitPrice.toFixed(2)}`,
      '',
      pumpLines,
      '',
      `Litres Sold = ${Math.round(totalLitres)}`,
      `Total Litres Sold= ${formatNumberWithCommas(totalLitres, 2)}@ ¢${unitPrice.toFixed(2)}`,
      `${code} Sales = ¢${totalGhs.toLocaleString()}`,
      '',
      `Variance = ${varianceVal}`,
    ].join('\n');

    productBlocks.push(block);

    // Analogue / mechanical totalizer readings
    const pumpsWithAnalogue = pumpsForProduct.filter((p) => p.analogueMeter && p.analogueMeter.trim() !== '');
    if (pumpsWithAnalogue.length > 0) {
      const aLines = pumpsWithAnalogue.map((p) => `${p.pumpLabelSnapshot}-${p.analogueMeter}`).join('\n');
      analogueBlocks.push(`${code}\n${aLines}`);
    }
  });

  // Cash Account Section
  const totalSalesGhs = report.totalSalesGhs || 0;
  const totalExpensesGhs = report.totalExpensesGhs || 0;
  const cashToBank = report.cashToBankOrTill ?? (totalSalesGhs - totalExpensesGhs);

  const expenseItemLines = report.expenses.length > 0
    ? report.expenses
        .filter((e) => e.amountGhs > 0 || e.description.trim() !== '')
        .map((e) => `  - ${e.description || e.category}: ¢${formatNumberWithCommas(e.amountGhs, 2)}`)
        .join('\n')
    : '';

  const hubtel = report.hubtel || { hubtelAccount: '', dashboardAmount: null, bankingWithHubtel: null };
  const hubtelAccStr = hubtel.hubtelAccount ? `(${hubtel.hubtelAccount})` : '( )';
  const hubtelDashStr = hubtel.dashboardAmount !== null && hubtel.dashboardAmount !== undefined
    ? `¢ ${formatNumberWithCommas(hubtel.dashboardAmount, 2)}`
    : '¢ ';
  const bankingHubtelStr = hubtel.bankingWithHubtel !== null && hubtel.bankingWithHubtel !== undefined
    ? `¢ ${formatNumberWithCommas(hubtel.bankingWithHubtel, 2)}`
    : '¢ ';

  const cashAccountBlock = [
    'CASH ACCOUNT',
    `TOTAL- SALES                             ¢${Math.round(totalSalesGhs).toLocaleString()}`,
    '',
    'Less  Expenses: ',
    expenseItemLines,
    '',
    `TOTAL EXPENSES     =¢${totalExpensesGhs > 0 ? formatNumberWithCommas(totalExpensesGhs, 2) : ''}`,
    '',
    `CASH TO BANK(or IN TILL)        = ¢ ${Math.round(cashToBank).toLocaleString()}`,
    '',
    `HUBTEL${hubtelAccStr}= `,
    '',
    `HUBTEL DASHBOARD AMOUNT= ${hubtelDashStr}`,
    '',
    `BANKING WITH HUBTEL  = ${bankingHubtelStr}`,
  ].join('\n');

  const analogueSection = analogueBlocks.length > 0
    ? `\nANALOGUE READING\n${analogueBlocks.join('\n\n')}`
    : '';

  return [
    stationHeader,
    shiftHeader,
    formattedDate,
    '',
    ...productBlocks,
    '',
    cashAccountBlock,
    analogueSection,
  ].join('\n');
}

export function getShareUrls(reportText: string) {
  const encoded = encodeURIComponent(reportText);
  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encoded}`,
    telegram: `https://t.me/share/url?text=${encoded}`,
    sms: `sms:?body=${encoded}`,
  };
}
