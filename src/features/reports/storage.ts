/**
 * Reports Storage Adapter
 * Bridges legacy helpers to the v3.1 multi-user isolated dataService.
 */

import { DailyReport, ReportIndexEntry } from '../../types/report';
import {
  getActiveUser,
  getReportByDate,
  saveDailyReport,
  listUserReportIndex,
  listAllUserReports,
  createNewDailyReport,
} from '../../services/dataService';

export function getReportStorageKey(date: string): string {
  const user = getActiveUser();
  return `omc_u_${user.id}_report_${date}`;
}

export function loadReportFromStorage(date: string): DailyReport | null {
  const user = getActiveUser();
  return getReportByDate(user.id, date);
}

export function saveReportToStorage(report: DailyReport) {
  const user = getActiveUser();
  saveDailyReport(user.id, report);
}

export function createEmptyReport(date: string, _previousReport?: DailyReport | null): DailyReport {
  const user = getActiveUser();
  return createNewDailyReport(user.id, date);
}

export function findPreviousDayReport(currentDate: string): DailyReport | null {
  const user = getActiveUser();
  const allReports = listAllUserReports(user.id);
  const earlier = allReports
    .filter((r) => r.reportDate < currentDate)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));

  return earlier[0] || null;
}

export function getReportsIndex(): ReportIndexEntry[] {
  const user = getActiveUser();
  return listUserReportIndex(user.id);
}

export function initializeSampleDataIfEmpty() {
  // Handled automatically in dataService
}

export function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}
