/**
 * Discharge Report Plain-Text Formatter
 * Formats Before Discharge and After Discharge reports into exact executive WhatsApp / SMS text
 * following OMC Station Manager standards.
 */

import { DischargeReport } from '../../types/report';

export function formatBeforeDischargeText(report: DischargeReport): string {
  const lines: string[] = [];

  lines.push(`*DISCHARGE REPORT (${report.productCode})*`);
  if (report.stationName) {
    lines.push(`*STATION* : ${report.stationName}`);
  }
  lines.push(`*DATE* : ${report.date}`);
  lines.push(`*TIME* : ${report.beforeTime}`);
  if (report.truckNumber || report.driverName) {
    lines.push(`*TRUCK* : ${[report.truckNumber, report.driverName].filter(Boolean).join(' • ')}`);
  }
  lines.push('');
  lines.push('*BEFORE DISCHARGE*');
  lines.push('');
  lines.push(`*STOCK UNDERGROUND*= ${report.stockUndergroundBefore.toLocaleString()}`);
  lines.push(`*INVOICE* =${report.invoiceQuantity.toLocaleString()}`);
  lines.push(`*EXPECTED* =${report.expectedStock.toLocaleString()}`);
  lines.push('');
  lines.push('*OPENING METRES*');

  if (report.openingMeters && report.openingMeters.length > 0) {
    report.openingMeters.forEach((m) => {
      lines.push(`${m.pumpLabel}=${m.meter.toFixed(2)}`);
    });
  } else {
    lines.push('None recorded');
  }

  lines.push('');
  lines.push(`*TOTAL*= ${report.totalOpeningMeters.toFixed(2)}`);

  return lines.join('\n');
}

export function formatAfterDischargeText(report: DischargeReport): string {
  const lines: string[] = [];

  lines.push(`*DISCHARGE REPORT (${report.productCode})*`);
  if (report.stationName) {
    lines.push(`*STATION* : ${report.stationName}`);
  }
  lines.push(`*DATE* :${report.date}`);
  lines.push(`*TIME* :  ${report.afterTime || 'N/A'}`);
  lines.push('');
  lines.push('*AFTER DISCHARGE*');
  lines.push('');
  lines.push(`*STOCK AFTER DISCHARGE*= ${(report.stockAfterDischarge ?? 0).toLocaleString()}`);
  lines.push(`*LITRES SOLD* = ${(report.litresSoldDuringDischarge || 0).toLocaleString()}`);
  lines.push(`*THEORETICAL STOCK*=${(report.theoreticalStock ?? 0).toLocaleString()}`);

  const diff = report.overageOrShortage ?? 0;
  const varianceLabel = diff >= 0 ? `*OVERAGE* = +${diff.toLocaleString()}` : `*SHORTAGE* = ${diff.toLocaleString()}`;
  lines.push(varianceLabel);

  lines.push('');
  lines.push('*CLOSING METRES*');

  if (report.closingMeters && report.closingMeters.length > 0) {
    report.closingMeters.forEach((m) => {
      lines.push(`${m.pumpLabel.padEnd(5, ' ')}${m.meter.toFixed(2)}`);
    });
  } else {
    lines.push('None recorded');
  }

  lines.push(`*TOTAL*= ${report.totalClosingMeters.toFixed(2)}`);

  return lines.join('\n');
}

export function formatCompleteDischargeText(report: DischargeReport): string {
  return `${formatBeforeDischargeText(report)}\n\n---\n\n${formatAfterDischargeText(report)}`;
}
