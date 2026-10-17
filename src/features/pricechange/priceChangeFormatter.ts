/**
 * Price Change Report Plain-Text Formatter
 * Generates WhatsApp / SMS executive report for fuel price revisions and stock revaluations.
 */

import { PriceChangeReport } from '../../types/report';

export function formatPriceChangeText(report: PriceChangeReport): string {
  const lines: string[] = [];

  lines.push(`*PRICE CHANGE REPORT (${report.productCode})*`);
  if (report.stationName) {
    lines.push(`*STATION* : ${report.stationName}`);
  }
  lines.push(`*DATE* : ${report.date}`);
  lines.push(`*TIME* : ${report.effectiveTime}`);
  lines.push('');
  lines.push('*PRICE CHANGE*');
  lines.push(`OLD PRICE = ¢${report.oldPrice.toFixed(2)}`);
  lines.push(`NEW PRICE = ¢${report.newPrice.toFixed(2)}`);
  const diffSign = report.priceDifference >= 0 ? '+' : '';
  lines.push(`DIFFERENCE = ${diffSign}¢${report.priceDifference.toFixed(2)}`);
  lines.push('');
  lines.push('*METRES AT PRICE CHANGE*');

  let totalMeters = 0;
  if (report.meterReadingsAtChange && report.meterReadingsAtChange.length > 0) {
    report.meterReadingsAtChange.forEach((m) => {
      lines.push(`${m.pumpLabel}=${m.closingMeter.toFixed(2)} (Sold: ${m.litresSold.toFixed(2)} L)`);
      totalMeters += m.closingMeter;
    });
  } else {
    lines.push('None recorded');
  }

  lines.push('');
  lines.push(`*TOTAL LITRES SOLD AT OLD PRICE*= ${report.totalLitresSoldAtOldPrice.toFixed(2)} L`);
  lines.push('');
  lines.push('*STOCK AT CHANGE*');
  lines.push(`PHYSICAL STOCK = ${report.physicalStockAtChange.toLocaleString()} L`);
  const revalSign = report.stockGainOrLossValueGhs >= 0 ? '+' : '';
  lines.push(`STOCK REVALUATION = ${revalSign}¢${Math.round(report.stockGainOrLossValueGhs).toLocaleString()}`);

  return lines.join('\n');
}
