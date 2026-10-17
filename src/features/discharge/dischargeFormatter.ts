import { DischargeReport, ReportFormatSettings, DEFAULT_REPORT_FORMAT_SETTINGS } from '../../types/report';

export function formatBeforeDischargeText(
  report: DischargeReport,
  settings: ReportFormatSettings = DEFAULT_REPORT_FORMAT_SETTINGS
): string {
  const cfg = { ...DEFAULT_REPORT_FORMAT_SETTINGS, ...settings };
  const lines: string[] = [];

  lines.push(`*DISCHARGE REPORT (${report.productCode})*`);
  if (report.stationName) {
    const sName = cfg.stationHeaderCase === 'titlecase'
      ? report.stationName.toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : report.stationName.toUpperCase();
    lines.push(`*STATION* : ${sName}`);
  }
  lines.push(`*DATE* : ${report.date}`);
  lines.push(`*TIME* : ${report.beforeTime}`);
  if (cfg.dischargeIncludeTruckDriver && (report.truckNumber || report.driverName)) {
    lines.push(`*TRUCK* : ${[report.truckNumber, report.driverName].filter(Boolean).join(' • ')}`);
  }
  lines.push('');
  lines.push(`*${cfg.dischargeBeforeTitle || 'BEFORE DISCHARGE'}*`);
  lines.push('');
  lines.push(`*STOCK UNDERGROUND*= ${report.stockUndergroundBefore.toLocaleString()}${cfg.volumeUnit ? ` ${cfg.volumeUnit}` : ''}`);
  lines.push(`*INVOICE* =${report.invoiceQuantity.toLocaleString()}${cfg.volumeUnit ? ` ${cfg.volumeUnit}` : ''}`);
  lines.push(`*EXPECTED* =${report.expectedStock.toLocaleString()}${cfg.volumeUnit ? ` ${cfg.volumeUnit}` : ''}`);
  lines.push('');
  lines.push('*OPENING METRES*');

  const sep = cfg.pumpSeparator || '=';
  if (report.openingMeters && report.openingMeters.length > 0) {
    report.openingMeters.forEach((m) => {
      lines.push(`${m.pumpLabel}${sep}${m.meter.toFixed(cfg.pumpDecimals ?? 2)}`);
    });
  } else {
    lines.push('None recorded');
  }

  lines.push('');
  lines.push(`*TOTAL*= ${report.totalOpeningMeters.toFixed(cfg.pumpDecimals ?? 2)}`);

  return lines.join('\n');
}

export function formatAfterDischargeText(
  report: DischargeReport,
  settings: ReportFormatSettings = DEFAULT_REPORT_FORMAT_SETTINGS
): string {
  const cfg = { ...DEFAULT_REPORT_FORMAT_SETTINGS, ...settings };
  const lines: string[] = [];

  lines.push(`*DISCHARGE REPORT (${report.productCode})*`);
  if (report.stationName) {
    const sName = cfg.stationHeaderCase === 'titlecase'
      ? report.stationName.toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : report.stationName.toUpperCase();
    lines.push(`*STATION* : ${sName}`);
  }
  lines.push(`*DATE* :${report.date}`);
  lines.push(`*TIME* :  ${report.afterTime || 'N/A'}`);
  lines.push('');
  lines.push(`*${cfg.dischargeAfterTitle || 'AFTER DISCHARGE'}*`);
  lines.push('');
  lines.push(`*STOCK AFTER DISCHARGE*= ${(report.stockAfterDischarge ?? 0).toLocaleString()}${cfg.volumeUnit ? ` ${cfg.volumeUnit}` : ''}`);
  lines.push(`*LITRES SOLD* = ${(report.litresSoldDuringDischarge || 0).toLocaleString()}${cfg.volumeUnit ? ` ${cfg.volumeUnit}` : ''}`);
  lines.push(`*THEORETICAL STOCK*=${(report.theoreticalStock ?? 0).toLocaleString()}${cfg.volumeUnit ? ` ${cfg.volumeUnit}` : ''}`);

  const diff = report.overageOrShortage ?? 0;
  const overageLabel = cfg.dischargeOverageLabel || 'OVERAGE';
  const shortageLabel = cfg.dischargeShortageLabel || 'SHORTAGE';
  const varianceLabel = diff >= 0 ? `*${overageLabel}* = +${diff.toLocaleString()}` : `*${shortageLabel}* = ${diff.toLocaleString()}`;
  lines.push(varianceLabel);

  lines.push('');
  lines.push('*CLOSING METRES*');

  const sep = cfg.pumpSeparator || '=';
  if (report.closingMeters && report.closingMeters.length > 0) {
    report.closingMeters.forEach((m) => {
      lines.push(`${m.pumpLabel.padEnd(5, ' ')}${m.meter.toFixed(cfg.pumpDecimals ?? 2)}`);
    });
  } else {
    lines.push('None recorded');
  }

  lines.push(`*TOTAL*= ${report.totalClosingMeters.toFixed(cfg.pumpDecimals ?? 2)}`);

  return lines.join('\n');
}

export function formatCompleteDischargeText(
  report: DischargeReport,
  settings: ReportFormatSettings = DEFAULT_REPORT_FORMAT_SETTINGS
): string {
  return `${formatBeforeDischargeText(report, settings)}\n\n---\n\n${formatAfterDischargeText(report, settings)}`;
}

