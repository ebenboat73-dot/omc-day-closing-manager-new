import { PriceChangeReport, ReportFormatSettings, DEFAULT_REPORT_FORMAT_SETTINGS } from '../../types/report';

export function formatPriceChangeText(
  report: PriceChangeReport,
  settings: ReportFormatSettings = DEFAULT_REPORT_FORMAT_SETTINGS
): string {
  const cfg = { ...DEFAULT_REPORT_FORMAT_SETTINGS, ...settings };
  const lines: string[] = [];
  const curr = cfg.currencySymbol || '¢';
  const volUnit = cfg.volumeUnit ? ` ${cfg.volumeUnit}` : ' L';
  const sep = cfg.pumpSeparator || '=';

  lines.push(`*${cfg.priceChangeTitle || 'PRICE CHANGE REPORT'} (${report.productCode})*`);
  if (report.stationName) {
    const sName = cfg.stationHeaderCase === 'titlecase'
      ? report.stationName.toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : report.stationName.toUpperCase();
    lines.push(`*STATION* : ${sName}`);
  }
  lines.push(`*DATE* : ${report.date}`);
  lines.push(`*TIME* : ${report.effectiveTime}`);
  lines.push('');
  lines.push('*PRICE CHANGE*');
  lines.push(`OLD PRICE = ${curr}${report.oldPrice.toFixed(2)}`);
  lines.push(`NEW PRICE = ${curr}${report.newPrice.toFixed(2)}`);
  const diffSign = report.priceDifference >= 0 ? '+' : '';
  lines.push(`DIFFERENCE = ${diffSign}${curr}${report.priceDifference.toFixed(2)}`);
  lines.push('');
  lines.push('*METRES AT PRICE CHANGE*');

  let totalMeters = 0;
  if (report.meterReadingsAtChange && report.meterReadingsAtChange.length > 0) {
    report.meterReadingsAtChange.forEach((m) => {
      lines.push(`${m.pumpLabel}${sep}${m.closingMeter.toFixed(cfg.pumpDecimals ?? 2)} (Sold: ${m.litresSold.toFixed(2)}${volUnit})`);
      totalMeters += m.closingMeter;
    });
  } else {
    lines.push('None recorded');
  }

  lines.push('');
  lines.push(`*TOTAL LITRES SOLD AT OLD PRICE*= ${report.totalLitresSoldAtOldPrice.toFixed(2)}${volUnit}`);
  lines.push('');
  lines.push('*STOCK AT CHANGE*');
  lines.push(`PHYSICAL STOCK = ${report.physicalStockAtChange.toLocaleString()}${volUnit}`);

  if (cfg.showStockRevaluationGhs) {
    const revalSign = report.stockGainOrLossValueGhs >= 0 ? '+' : '';
    lines.push(`STOCK REVALUATION = ${revalSign}${curr}${Math.round(report.stockGainOrLossValueGhs).toLocaleString()}`);
  }

  if (cfg.footerCustomNote && cfg.footerCustomNote.trim()) {
    lines.push('');
    lines.push(`— ${cfg.footerCustomNote.trim()} —`);
  }

  return lines.join('\n');
}

