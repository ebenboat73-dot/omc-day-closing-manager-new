/**
 * OMC Data Service • Version 3.1
 * Unified persistence layer supporting private-by-default multi-user workspaces.
 * Interacts with Supabase (PostgreSQL + RLS + Auth) when configured,
 * with strict isolated client-side per-user workspaces as local/offline fallback.
 */

import {
  UserProfile,
  StationWorkspace,
  ConfiguredProduct,
  ConfiguredPump,
  DailyReport,
  ReportPumpReading,
  ReportStockEntry,
  ReportIndexEntry,
  DEFAULT_INITIAL_PRODUCTS,
  DEFAULT_INITIAL_PUMPS_TEMPLATE,
} from '../types/report';
import { recalculateReport } from '../utils/calculations';
import { getSupabaseClient } from './supabaseClient';

const AUTH_USER_STORAGE_KEY = 'omc_active_user';

// Demo initial users available for immediate multi-user isolation verification
const DEMO_USERS: UserProfile[] = [
  {
    id: 'user_kwame_01',
    email: 'kwame.ansah@onyxmaenergy.com',
    fullName: 'Kwame Ansah (Manager A)',
    role: 'Station Manager',
  },
  {
    id: 'user_abena_02',
    email: 'abena.boateng@onyxmaenergy.com',
    fullName: 'Abena Boateng (Manager B)',
    role: 'Station Manager',
  },
];

// Helper to get active user
export function getActiveUser(): UserProfile {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse active user:', e);
  }
  // Default to Manager A initially
  const defaultUser = DEMO_USERS[0];
  setActiveUser(defaultUser);
  return defaultUser;
}

export function setActiveUser(user: UserProfile) {
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export function listAvailableDemoUsers(): UserProfile[] {
  return DEMO_USERS;
}

export function registerNewUser(email: string, fullName: string): UserProfile {
  const newUser: UserProfile = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: email.trim(),
    fullName: fullName.trim() || 'Station Manager',
    role: 'Station Manager',
    createdAt: new Date().toISOString(),
  };
  setActiveUser(newUser);
  return newUser;
}

// Scoped storage keys for strict private isolation per user ID
function userKey(userId: string, suffix: string): string {
  return `omc_u_${userId}_${suffix}`;
}

// ----------------------------------------------------------------------
// WORKSPACE MANAGEMENT
// ----------------------------------------------------------------------

export function getOrCreateWorkspace(userId: string): StationWorkspace {
  const key = userKey(userId, 'workspace');
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch (e) {
      console.warn('Failed to parse workspace:', e);
    }
  }

  // Determine station name based on user
  const stationName = userId === 'user_kwame_01'
    ? 'Onyxma Energy - Airport Bypass Station'
    : userId === 'user_abena_02'
    ? 'Onyxma Energy - Tema Industrial Highway'
    : 'Onyxma Energy - Service Station';

  const initialWorkspace: StationWorkspace = {
    id: `ws_${userId}`,
    ownerUserId: userId,
    stationName,
    stationLocation: 'Greater Accra, Ghana',
    omcBrand: 'Onyxma Energy',
    managerName: getActiveUser().fullName,
    currencySymbol: 'GHS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(key, JSON.stringify(initialWorkspace));

  // Initialize initial products and pumps for this brand new workspace
  initializeWorkspaceProductsAndPumps(initialWorkspace.id, userId);

  return initialWorkspace;
}

export function updateWorkspace(userId: string, updates: Partial<StationWorkspace>): StationWorkspace {
  const ws = getOrCreateWorkspace(userId);
  const updated: StationWorkspace = {
    ...ws,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(userKey(userId, 'workspace'), JSON.stringify(updated));
  return updated;
}

// ----------------------------------------------------------------------
// DYNAMIC PRODUCTS & PUMPS CONFIGURATION
// ----------------------------------------------------------------------

export function initializeWorkspaceProductsAndPumps(workspaceId: string, userId: string) {
  const prodKey = userKey(userId, 'products');
  const pumpKey = userKey(userId, 'pumps');

  // Products
  const products: ConfiguredProduct[] = DEFAULT_INITIAL_PRODUCTS.map((p, idx) => ({
    ...p,
    id: `prod_${userId}_${p.code.toLowerCase()}`,
    workspaceId,
  }));
  localStorage.setItem(prodKey, JSON.stringify(products));

  // Pumps (Default PMS1-4, AGO1-6, KERO1-2)
  const productMap = new Map(products.map((p) => [p.code, p.id]));
  const pumps: ConfiguredPump[] = DEFAULT_INITIAL_PUMPS_TEMPLATE.map((pt, idx) => ({
    id: `pump_${userId}_${pt.label.toLowerCase()}`,
    workspaceId,
    productId: productMap.get(pt.productCode) || products[0].id,
    productCode: pt.productCode,
    label: pt.label,
    displayOrder: pt.displayOrder,
    isActive: true,
    defaultCapacity: 100000,
  }));
  localStorage.setItem(pumpKey, JSON.stringify(pumps));
}

export function getWorkspaceProducts(userId: string): ConfiguredProduct[] {
  const key = userKey(userId, 'products');
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse products:', e);
    }
  }
  // If missing, initialize
  const ws = getOrCreateWorkspace(userId);
  initializeWorkspaceProductsAndPumps(ws.id, userId);
  return JSON.parse(localStorage.getItem(key)!);
}

export function getWorkspacePumps(userId: string): ConfiguredPump[] {
  const key = userKey(userId, 'pumps');
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const list: ConfiguredPump[] = JSON.parse(raw);
      return list.sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (e) {
      console.warn('Failed to parse pumps:', e);
    }
  }
  const ws = getOrCreateWorkspace(userId);
  initializeWorkspaceProductsAndPumps(ws.id, userId);
  return JSON.parse(localStorage.getItem(key)!);
}

export function saveWorkspacePumps(userId: string, pumps: ConfiguredPump[]) {
  localStorage.setItem(userKey(userId, 'pumps'), JSON.stringify(pumps));
}

export function addPump(
  userId: string,
  productCode: string,
  label: string,
  displayOrder?: number
): ConfiguredPump {
  const currentPumps = getWorkspacePumps(userId);
  const products = getWorkspaceProducts(userId);
  const prod = products.find((p) => p.code === productCode) || products[0];

  const order = displayOrder ?? (currentPumps.length + 1);
  const newPump: ConfiguredPump = {
    id: `pump_${userId}_${Date.now()}`,
    workspaceId: `ws_${userId}`,
    productId: prod.id,
    productCode: prod.code,
    label: label.trim(),
    displayOrder: order,
    isActive: true,
    defaultCapacity: 100000,
  };

  const updatedList = [...currentPumps, newPump];
  saveWorkspacePumps(userId, updatedList);
  return newPump;
}

export function updatePump(
  userId: string,
  pumpId: string,
  updates: Partial<ConfiguredPump>
): ConfiguredPump[] {
  const pumps = getWorkspacePumps(userId);
  const updated = pumps.map((p) => (p.id === pumpId ? { ...p, ...updates } : p));
  saveWorkspacePumps(userId, updated);
  return updated;
}

export function togglePumpActive(userId: string, pumpId: string, isActive: boolean): ConfiguredPump[] {
  // PRD Rule 7 & 21: Deactivation preserves history; do not delete
  return updatePump(userId, pumpId, { isActive });
}

export function reorderPumps(userId: string, orderedIds: string[]): ConfiguredPump[] {
  const pumps = getWorkspacePumps(userId);
  const pumpMap = new Map(pumps.map((p) => [p.id, p]));
  const reordered: ConfiguredPump[] = [];

  orderedIds.forEach((id, index) => {
    const p = pumpMap.get(id);
    if (p) {
      reordered.push({ ...p, displayOrder: index + 1 });
      pumpMap.delete(id);
    }
  });

  // Append any remainder
  pumpMap.forEach((p) => {
    reordered.push({ ...p, displayOrder: reordered.length + 1 });
  });

  saveWorkspacePumps(userId, reordered);
  return reordered;
}

// ----------------------------------------------------------------------
// REPORT CREATION, CARRY FORWARD & PERSISTENCE
// ----------------------------------------------------------------------

/**
 * Searches past reports strictly in this user's private workspace
 * to find the most recent valid confirmed closing meter reading for a given pump.
 */
export function findMostRecentClosingReading(
  userId: string,
  pumpId: string,
  beforeDate: string
): number | null {
  const reports = listAllUserReports(userId);
  // Sort descending by date
  const pastReports = reports
    .filter((r) => r.reportDate < beforeDate)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));

  for (const rep of pastReports) {
    const reading = rep.pumps.find((p) => p.pumpId === pumpId);
    if (reading && reading.closingMeter !== null && !isNaN(reading.closingMeter)) {
      return reading.closingMeter;
    }
  }

  return null;
}

/**
 * Creates a new blank report for date, carrying forward previous closing readings
 * for matching pumps. New pumps with no history get openingMeter: null.
 */
export function createNewDailyReport(userId: string, reportDate: string): DailyReport {
  const ws = getOrCreateWorkspace(userId);
  const products = getWorkspaceProducts(userId).filter((p) => p.isActive);
  const activePumps = getWorkspacePumps(userId).filter((p) => p.isActive);

  // Group pumps by product display order
  const sortedPumps = [...activePumps].sort((a, b) => {
    const prodA = products.find((p) => p.code === a.productCode)?.displayOrder || 99;
    const prodB = products.find((p) => p.code === b.productCode)?.displayOrder || 99;
    if (prodA !== prodB) return prodA - prodB;
    return a.displayOrder - b.displayOrder;
  });

  // Build pump readings with carry-forward
  const pumpReadings: ReportPumpReading[] = sortedPumps.map((pump) => {
    const previousClosing = findMostRecentClosingReading(userId, pump.id, reportDate);

    return {
      id: `reading_${Date.now()}_${pump.id}`,
      pumpId: pump.id,
      pumpLabelSnapshot: pump.label,
      productCodeSnapshot: pump.productCode,
      productIdSnapshot: pump.productId,
      openingMeter: previousClosing, // null if no prior reading!
      closingMeter: null,
      litresSold: null,
      candidateOcrReading: null,
      ocrStatus: 'idle',
      isConfirmed: false,
      isRollover: false,
      rolloverCapacity: pump.defaultCapacity || 100000,
      notes: '',
      warning: previousClosing === null ? 'Missing opening meter — please input initial reading' : null,
    };
  });

  // Build initial stock entries for each active product
  const stockEntries: ReportStockEntry[] = products.map((prod) => {
    // Attempt carry-forward of yesterday's physical closing stock as today's opening stock
    let prevStockOpening: number | null = null;
    const pastReports = listAllUserReports(userId)
      .filter((r) => r.reportDate < reportDate)
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate));

    if (pastReports.length > 0) {
      const prevEntry = pastReports[0].stocks.find((s) => s.productCodeSnapshot === prod.code);
      if (prevEntry && prevEntry.physicalClosingStock !== null) {
        prevStockOpening = prevEntry.physicalClosingStock;
      }
    }

    return {
      id: `stock_${Date.now()}_${prod.code}`,
      productId: prod.id,
      productCodeSnapshot: prod.code,
      productNameSnapshot: prod.fullName,
      tankLabel: 'Main Tank',
      openingStock: prevStockOpening,
      receipts: 0,
      daySales: 0,
      physicalClosingStock: null,
      theoreticalClosingStock: null,
      variance: null,
      warning: prevStockOpening === null ? 'Missing opening stock' : null,
    };
  });

  const freshReport: DailyReport = {
    id: `rep_${userId}_${reportDate}`,
    workspaceId: ws.id,
    reportDate,
    stationNameSnapshot: ws.stationName,
    status: 'Draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pumps: pumpReadings,
    stocks: stockEntries,
    expenses: [],
    warnings: [],
    saveStatus: 'saved',
    lastSavedAt: new Date().toLocaleTimeString(),
  };

  return recalculateReport(freshReport, products);
}

export function getReportByDate(userId: string, reportDate: string): DailyReport {
  const key = userKey(userId, `report_${reportDate}`);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed: DailyReport = JSON.parse(stored);
      return parsed;
    } catch (e) {
      console.warn('Failed to parse report:', e);
    }
  }

  // If not found, create new and save
  const newReport = createNewDailyReport(userId, reportDate);
  saveDailyReport(userId, newReport);
  return newReport;
}

export function saveDailyReport(userId: string, report: DailyReport): DailyReport {
  const key = userKey(userId, `report_${report.reportDate}`);
  const updatedReport: DailyReport = {
    ...report,
    updatedAt: new Date().toISOString(),
    saveStatus: 'saved',
    lastSavedAt: new Date().toLocaleTimeString(),
  };

  localStorage.setItem(key, JSON.stringify(updatedReport));

  // Update report index
  updateReportIndex(userId, updatedReport);

  // Attempt Supabase sync asynchronously if client is available
  syncReportToSupabase(updatedReport).catch((err) => {
    console.warn('Background Supabase sync notice:', err);
  });

  return updatedReport;
}

function updateReportIndex(userId: string, report: DailyReport) {
  const indexKey = userKey(userId, 'report_index');
  let index: ReportIndexEntry[] = [];
  try {
    const raw = localStorage.getItem(indexKey);
    if (raw) index = JSON.parse(raw);
  } catch (e) {
    index = [];
  }

  const totalSales = report.pumps.reduce((sum, p) => sum + (p.litresSold || 0), 0);
  const totalExpenses = report.expenses.reduce((sum, e) => sum + (e.amountGhs || 0), 0);

  const entry: ReportIndexEntry = {
    id: report.id,
    date: report.reportDate,
    status: report.status,
    stationName: report.stationNameSnapshot,
    totalSalesLitres: Math.round(totalSales * 100) / 100,
    totalExpensesGhs: Math.round(totalExpenses * 100) / 100,
    updatedAt: report.updatedAt,
    sentAt: report.sentAt,
  };

  const existingIdx = index.findIndex((i) => i.date === report.reportDate);
  if (existingIdx >= 0) {
    index[existingIdx] = entry;
  } else {
    index.push(entry);
  }

  // Sort descending by date
  index.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(indexKey, JSON.stringify(index));
}

export function listUserReportIndex(userId: string): ReportIndexEntry[] {
  const indexKey = userKey(userId, 'report_index');
  try {
    const raw = localStorage.getItem(indexKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse index:', e);
  }
  return [];
}

export function listAllUserReports(userId: string): DailyReport[] {
  const index = listUserReportIndex(userId);
  const reports: DailyReport[] = [];
  index.forEach((item) => {
    const raw = localStorage.getItem(userKey(userId, `report_${item.date}`));
    if (raw) {
      try {
        reports.push(JSON.parse(raw));
      } catch (e) {
        // ignore
      }
    }
  });
  return reports;
}

// ----------------------------------------------------------------------
// SEED REALISTIC INITIAL REPORTS FOR DEMO MANAGERS (SEPARATE WORKSPACES)
// ----------------------------------------------------------------------

export function seedDemoWorkspacesIfEmpty() {
  const seededKey = 'omc_seeded_v3_1';
  if (localStorage.getItem(seededKey)) return;

  // 1. Seed Kwame (Manager A)
  const kwame = DEMO_USERS[0];
  const kwameWs = getOrCreateWorkspace(kwame.id);
  const kwamePumps = getWorkspacePumps(kwame.id);

  // Kwame's Report for 2026-10-11 (yesterday)
  const kwameRep1 = createNewDailyReport(kwame.id, '2026-10-11');
  kwameRep1.status = 'Sent';
  kwameRep1.sentAt = '2026-10-11T20:15:00.000Z';
  kwameRep1.sentVia = 'WhatsApp';

  // Seed realistic baseline closing meters
  const kwameBaselines: Record<string, { open: number; close: number }> = {
    PMS1: { open: 41250.0, close: 42110.5 },
    PMS2: { open: 38920.0, close: 39855.0 },
    PMS3: { open: 22100.0, close: 22980.0 },
    PMS4: { open: 19450.0, close: 20215.5 },
    AGO1: { open: 55400.0, close: 56780.0 },
    AGO2: { open: 61200.0, close: 62540.0 },
    AGO3: { open: 48900.0, close: 50120.0 },
    AGO4: { open: 44300.0, close: 45410.0 },
    AGO5: { open: 39800.0, close: 40990.0 },
    AGO6: { open: 32150.0, close: 33200.0 },
    KERO1: { open: 12400.0, close: 12650.0 },
    KERO2: { open: 11100.0, close: 11320.0 },
  };

  kwameRep1.pumps = kwameRep1.pumps.map((p) => {
    const base = kwameBaselines[p.pumpLabelSnapshot];
    if (base) {
      return {
        ...p,
        openingMeter: base.open,
        closingMeter: base.close,
        litresSold: Math.round((base.close - base.open) * 100) / 100,
        isConfirmed: true,
      };
    }
    return p;
  });

  kwameRep1.stocks = kwameRep1.stocks.map((s) => {
    if (s.productCodeSnapshot === 'PMS') {
      return {
        ...s,
        openingStock: 15400,
        receipts: 0,
        daySales: 3471,
        theoreticalClosingStock: 11929,
        physicalClosingStock: 11910,
        variance: -19,
      };
    } else if (s.productCodeSnapshot === 'AGO') {
      return {
        ...s,
        openingStock: 22000,
        receipts: 13500, // tanker discharge
        daySales: 7040,
        theoreticalClosingStock: 28460,
        physicalClosingStock: 28485,
        variance: +25,
      };
    } else {
      return {
        ...s,
        openingStock: 4500,
        receipts: 0,
        daySales: 470,
        theoreticalClosingStock: 4030,
        physicalClosingStock: 4025,
        variance: -5,
      };
    }
  });

  kwameRep1.expenses = [
    { id: 'exp_1', category: 'Staff/Meals', description: 'Pump Attendants Lunch Allowance', amountGhs: 180 },
    { id: 'exp_2', category: 'Utilities', description: 'ECG Prepaid Power Recharge', amountGhs: 350 },
  ];

  saveDailyReport(kwame.id, kwameRep1);

  // Kwame's Today Report (2026-10-12) with carried forward opening meters!
  const kwameRepToday = createNewDailyReport(kwame.id, '2026-10-12');
  kwameRepToday.status = 'In Progress';
  saveDailyReport(kwame.id, kwameRepToday);

  // 2. Seed Abena (Manager B) in separate isolated workspace with different station name!
  const abena = DEMO_USERS[1];
  const abenaWs = getOrCreateWorkspace(abena.id);
  const abenaRep = createNewDailyReport(abena.id, '2026-10-12');
  abenaRep.stationNameSnapshot = abenaWs.stationName;
  saveDailyReport(abena.id, abenaRep);

  localStorage.setItem(seededKey, 'true');
}

// Background Supabase Sync helper
async function syncReportToSupabase(report: DailyReport) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    // Upsert report master
    const { error: repErr } = await supabase
      .from('reports')
      .upsert(
        {
          id: report.id,
          workspace_id: report.workspaceId,
          report_date: report.reportDate,
          station_name_snapshot: report.stationNameSnapshot,
          status: report.status,
          notes: report.notes || null,
          sent_at: report.sentAt || null,
          sent_by: report.sentBy || null,
          sent_via: report.sentVia || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,report_date' }
      );

    if (repErr) {
      console.warn('Supabase reports upsert error:', repErr);
    }
  } catch (err) {
    console.warn('Supabase sync exception:', err);
  }
}
