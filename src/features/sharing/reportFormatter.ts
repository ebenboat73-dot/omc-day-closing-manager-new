import { DailyReport, ReportFormatSettings, DEFAULT_REPORT_FORMAT_SETTINGS } from '../../types/report';

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

export function formatReportDateDDMMYYYY(dateStr: string, format: string = 'DD/MM/YYYY'): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(month, 10) - 1;
      const monthName = monthNames[monthIdx] || month;

      if (format === 'DD-MM-YYYY') return `${day}-${month}-${year}`;
      if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
      if (format === 'D MMM YYYY') return `${parseInt(day, 10)} ${monthName} ${year}`;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatReportDate(dateStr: string, format = 'DD/MM/YYYY'): string {
  return formatReportDateDDMMYYYY(dateStr, format);
}

/**
 * Generates the authentic station closing report formatted for WhatsApp, SMS, or Telegram,
 * customized per manager according to their ReportFormatSettings.
 */
export function generateStandardReportText(
  report: DailyReport,
  settings: ReportFormatSettings = DEFAULT_REPORT_FORMAT_SETTINGS
): string {
  const cfg = { ...DEFAULT_REPORT_FORMAT_SETTINGS, ...settings };
  const formattedDate = formatReportDateDDMMYYYY(report.reportDate, cfg.dateFormat);

  let rawStation = report.stationNameSnapshot || 'OBORPAH ASESEWA';
  const stationHeader =
    cfg.stationHeaderCase === 'titlecase'
      ? rawStation
          .toLowerCase()
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : rawStation.toUpperCase();

  const shiftHeader = report.shiftType || 'Evening Report';
  const curr = cfg.currencySymbol || '¢';
  const volUnit = cfg.volumeUnit ? ` ${cfg.volumeUnit}` : '';
  const sep = cfg.pumpSeparator || '=';
  const pDecimals = cfg.pumpDecimals ?? 2;

  const headerLines: string[] = [];
  if (cfg.headerCustomNote && cfg.headerCustomNote.trim()) {
    headerLines.push(`[${cfg.headerCustomNote.trim()}]`);
  }
  headerLines.push(stationHeader);
  if (cfg.includeLocation) {
    headerLines.push('Station Branch / Location');
  }
  headerLines.push(shiftHeader);
  headerLines.push(formattedDate);
  if (cfg.includeTimestamp) {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    headerLines.push(`Time: ${timeNow}`);
  }

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

    // Pump closing readings lines e.g. S1=25332.02 or S1: 25,332.02
    const pumpLines = pumpsForProduct
      .map((p) => {
        const val = p.closingMeter;
        const valStr = val !== null && val !== undefined ? formatNumberWithCommas(val, pDecimals) : '—';
        let line = `${p.pumpLabelSnapshot}${sep}${valStr}${volUnit}`;

        if (cfg.showOpeningMetersInDaily && p.openingMeter !== null && p.openingMeter !== undefined) {
          line = `${p.pumpLabelSnapshot}: Open ${formatNumberWithCommas(p.openingMeter, pDecimals)} -> Close ${valStr}`;
        }
        if (cfg.showIndividualPumpSold && p.litresSold !== null && p.litresSold !== undefined) {
          line += ` (Sold: ${formatNumberWithCommas(p.litresSold, 2)}${volUnit})`;
        }
        return line;
      })
      .join('\n');

    const totalLitres = pumpsForProduct.reduce((sum, p) => sum + (p.litresSold || 0), 0);
    const totalGhs = Math.round(totalLitres * unitPrice);

    const varianceVal = stock?.variance !== null && stock?.variance !== undefined
      ? formatVariance(stock.variance)
      : '—';

    const blockLines: string[] = [`${code}`];
    if (cfg.showPhysicalStock) {
      blockLines.push(`Stock = ${stockVal}${volUnit}`);
    }
    if (cfg.showUnitPrice) {
      blockLines.push(`Current Price @ ${curr}${unitPrice.toFixed(2)}`);
    }
    blockLines.push('');
    blockLines.push(pumpLines);
    blockLines.push('');

    if (cfg.showTotalLitresSoldLine) {
      blockLines.push(`Litres Sold = ${Math.round(totalLitres)}${volUnit}`);
      blockLines.push(`Total Litres Sold= ${formatNumberWithCommas(totalLitres, 2)}${volUnit}@ ${curr}${unitPrice.toFixed(2)}`);
    }
    if (cfg.showProductSalesGhs) {
      blockLines.push(`${code} Sales = ${curr}${totalGhs.toLocaleString()}`);
    }
    if (cfg.showVariance) {
      blockLines.push('');
      blockLines.push(`${cfg.varianceLabel} = ${varianceVal}${volUnit}`);
    }

    productBlocks.push(blockLines.join('\n'));

    // Analogue / mechanical totalizer readings
    if (cfg.showAnalogueSection) {
      const pumpsWithAnalogue = pumpsForProduct.filter((p) => p.analogueMeter && p.analogueMeter.trim() !== '');
      if (pumpsWithAnalogue.length > 0) {
        const aLines = pumpsWithAnalogue.map((p) => `${p.pumpLabelSnapshot}-${p.analogueMeter}`).join('\n');
        analogueBlocks.push(`${code}\n${aLines}`);
      }
    }
  });

  // Cash Account Section
  const totalSalesGhs = report.totalSalesGhs || 0;
  const totalExpensesGhs = report.totalExpensesGhs || 0;
  const cashToBank = report.cashToBankOrTill ?? (totalSalesGhs - totalExpensesGhs);

  const cashLines: string[] = [
    cfg.cashAccountTitle || 'CASH ACCOUNT',
    `${(cfg.totalSalesLabel || 'TOTAL- SALES').padEnd(35, ' ')}${curr}${Math.round(totalSalesGhs).toLocaleString()}`,
  ];

  if (cfg.expensesStyle !== 'hidden') {
    cashLines.push('');
    cashLines.push('Less  Expenses: ');
    if (cfg.expensesStyle === 'itemized' && report.expenses.length > 0) {
      const expenseItemLines = report.expenses
        .filter((e) => e.amountGhs > 0 || e.description.trim() !== '')
        .map((e) => `  - ${e.description || e.category}: ${curr}${formatNumberWithCommas(e.amountGhs, 2)}`)
        .join('\n');
      if (expenseItemLines) {
        cashLines.push(expenseItemLines);
      }
    }
    cashLines.push(`TOTAL EXPENSES     =${curr}${totalExpensesGhs > 0 ? formatNumberWithCommas(totalExpensesGhs, 2) : ''}`);
  }

  cashLines.push('');
  cashLines.push(`${(cfg.cashToBankLabel || 'CASH TO BANK(or IN TILL)').padEnd(32, ' ')}= ${curr} ${Math.round(cashToBank).toLocaleString()}`);

  if (cfg.showHubtelSection) {
    const hubtel = report.hubtel || { hubtelAccount: '', dashboardAmount: null, bankingWithHubtel: null };
    const hubtelAccStr = hubtel.hubtelAccount ? `(${hubtel.hubtelAccount})` : '( )';
    const hubtelDashStr = hubtel.dashboardAmount !== null && hubtel.dashboardAmount !== undefined
      ? `${curr} ${formatNumberWithCommas(hubtel.dashboardAmount, 2)}`
      : `${curr} `;
    const bankingHubtelStr = hubtel.bankingWithHubtel !== null && hubtel.bankingWithHubtel !== undefined
      ? `${curr} ${formatNumberWithCommas(hubtel.bankingWithHubtel, 2)}`
      : `${curr} `;

    cashLines.push('');
    cashLines.push(`HUBTEL${hubtelAccStr}= `);
    cashLines.push('');
    cashLines.push(`HUBTEL DASHBOARD AMOUNT= ${hubtelDashStr}`);
    cashLines.push('');
    cashLines.push(`BANKING WITH HUBTEL  = ${bankingHubtelStr}`);
  }

  const analogueSection = analogueBlocks.length > 0
    ? `\nANALOGUE READING\n${analogueBlocks.join('\n\n')}`
    : '';

  const reportParts = [
    headerLines.join('\n'),
    '',
    ...productBlocks,
    '',
    cashLines.join('\n'),
    analogueSection,
  ];

  if (cfg.footerCustomNote && cfg.footerCustomNote.trim()) {
    reportParts.push('');
    reportParts.push(`\n— ${cfg.footerCustomNote.trim()} —`);
  }

  return reportParts.filter((p) => p !== '').join('\n');
}

export function getShareUrls(reportText: string) {
  const encoded = encodeURIComponent(reportText);
  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encoded}`,
    telegram: `https://t.me/share/url?text=${encoded}`,
    sms: `sms:?body=${encoded}`,
  };
}

