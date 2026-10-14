/**
 * OMC Data Service • Version 3.2
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
    id: 'user_station_manager_01',
    email: 'manager.asesewa@station.com',
    fullName: 'Station Manager (Oborpah Asesewa)',
    role: 'Station Manager',
  },
  {
    id: 'user_abena_02',
    email: 'abena.boateng@onyxmaenergy.com',
    fullName: 'Abena Boateng (Tema Station)',
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

  // Station name configured for Oborpah Asesewa
  const stationName = userId === 'user_station_manager_01'
    ? 'OBORPAH ASESEWA'
    : userId === 'user_abena_02'
    ? 'TEMA INDUSTRIAL HIGHWAY'
    : 'OBORPAH ASESEWA';

  const initialWorkspace: StationWorkspace = {
    id: `ws_${userId}`,
    ownerUserId: userId,
    stationName,
    stationLocation: 'Asesewa, Eastern Region, Ghana',
    omcBrand: 'Onyxma Energy',
    managerName: getActiveUser().fullName,
    currencySymbol: '¢',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(key, JSON.stringify(initialWorkspace));

  // Initialize initial products and pumps for this workspace
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

  // Products with default prices (PMS: 16.59, AGO: 18.39)
  const products: ConfiguredProduct[] = DEFAULT_INITIAL_PRODUCTS.map((p) => ({
    ...p,
    id: `prod_${userId}_${p.code.toLowerCase()}`,
    workspaceId,
  }));
  localStorage.setItem(prodKey, JSON.stringify(products));

  // Pumps: S1-S4 (PMS) & D1-D4 (AGO)
  const productMap = new Map(products.map((p) => [p.code, p.id]));
  const pumps: ConfiguredPump[] = DEFAULT_INITIAL_PUMPS_TEMPLATE.map((pt) => ({
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
  const ws = getOrCreateWorkspace(userId);
  initializeWorkspaceProductsAndPumps(ws.id, userId);
  return JSON.parse(localStorage.getItem(key)!);
}

export function saveWorkspaceProducts(userId: string, products: ConfiguredProduct[]) {
  localStorage.setItem(userKey(userId, 'products'), JSON.stringify(products));
}

export function updateProductPrice(userId: string, productCode: string, unitPrice: number): ConfiguredProduct[] {
  const products = getWorkspaceProducts(userId);
  const updated = products.map((p) => (p.code === productCode ? { ...p, unitPrice } : p));
  saveWorkspaceProducts(userId, updated);
  return updated;
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

export function deletePump(userId: string, pumpId: string): ConfiguredPump[] {
  const pumps = getWorkspacePumps(userId);
  const filtered = pumps.filter((p) => p.id !== pumpId);
  saveWorkspacePumps(userId, filtered);
  return filtered;
}

export function togglePumpActive(userId: string, pumpId: string, isActive: boolean): ConfiguredPump[] {
  return updatePump(userId, pumpId, { isActive });
}

// ----------------------------------------------------------------------
// REPORT CREATION, CARRY FORWARD & PERSISTENCE
// ----------------------------------------------------------------------

export function findMostRecentClosingReading(
  userId: string,
  pumpId: string,
  beforeDate: string
): number | null {
  const reports = listAllUserReports(userId);
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

  const priceMap: Record<string, number> = {};
  products.forEach((p) => {
    priceMap[p.code] = p.unitPrice || (p.code === 'PMS' ? 16.59 : p.code === 'AGO' ? 18.39 : 15.00);
  });

  // Build pump readings with carry-forward
  const pumpReadings: ReportPumpReading[] = sortedPumps.map((pump) => {
    const previousClosing = findMostRecentClosingReading(userId, pump.id, reportDate);
    const unitPrice = priceMap[pump.productCode] || 16.59;

    return {
      id: `reading_${Date.now()}_${pump.id}`,
      pumpId: pump.id,
      pumpLabelSnapshot: pump.label,
      productCodeSnapshot: pump.productCode,
      productIdSnapshot: pump.productId,
      openingMeter: previousClosing,
      closingMeter: null,
      litresSold: null,
      unitPriceSnapshot: unitPrice,
      amountGhs: null,
      analogueMeter: null,
      candidateOcrReading: null,
      ocrStatus: 'idle',
      isConfirmed: false,
      isRollover: false,
      rolloverCapacity: pump.defaultCapacity || 100000,
      notes: '',
      isIdleOrOptional: false,
      warning: null,
    };
  });

  // Build initial stock entries
  const stockEntries: ReportStockEntry[] = products.map((prod) => {
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

    const unitPrice = priceMap[prod.code] || 16.59;

    return {
      id: `stock_${Date.now()}_${prod.code}`,
      productId: prod.id,
      productCodeSnapshot: prod.code,
      productNameSnapshot: prod.fullName,
      tankLabel: 'Main Tank',
      openingStock: prevStockOpening ?? (prod.code === 'PMS' ? 12710 : prod.code === 'AGO' ? 18840 : 5000),
      receipts: 0,
      daySales: 0,
      physicalClosingStock: null,
      theoreticalClosingStock: null,
      variance: null,
      unitPriceSnapshot: unitPrice,
      productSalesGhs: 0,
      warning: null,
    };
  });

  const freshReport: DailyReport = {
    id: `rep_${userId}_${reportDate}`,
    workspaceId: ws.id,
    reportDate,
    shiftType: 'Evening Report',
    stationNameSnapshot: ws.stationName,
    status: 'Draft',
    productPrices: priceMap,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pumps: pumpReadings,
    stocks: stockEntries,
    expenses: [],
    hubtel: {
      hubtelAccount: '',
      dashboardAmount: null,
      bankingWithHubtel: null,
    },
    totalSalesGhs: 0,
    totalExpensesGhs: 0,
    cashToBankOrTill: 0,
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
      // Ensure product prices and hubtel exist
      if (!parsed.productPrices) {
        parsed.productPrices = { PMS: 16.59, AGO: 18.39, KERO: 15.00 };
      }
      if (!parsed.hubtel) {
        parsed.hubtel = { hubtelAccount: '', dashboardAmount: null, bankingWithHubtel: null };
      }
      return parsed;
    } catch (e) {
      console.warn('Failed to parse report:', e);
    }
  }

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
  updateReportIndex(userId, updatedReport);

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

  const totalSalesLitres = report.pumps.reduce((sum, p) => sum + (p.litresSold || 0), 0);
  const totalSalesGhs = report.totalSalesGhs || 0;
  const totalExpenses = report.expenses.reduce((sum, e) => sum + (e.amountGhs || 0), 0);
  const cashToBank = report.cashToBankOrTill ?? (totalSalesGhs - totalExpenses);

  const entry: ReportIndexEntry = {
    id: report.id,
    date: report.reportDate,
    status: report.status,
    stationName: report.stationNameSnapshot,
    shiftType: report.shiftType,
    totalSalesLitres: Math.round(totalSalesLitres * 100) / 100,
    totalSalesGhs: Math.round(totalSalesGhs * 100) / 100,
    totalExpensesGhs: Math.round(totalExpenses * 100) / 100,
    cashToBankOrTill: Math.round(cashToBank * 100) / 100,
    updatedAt: report.updatedAt,
    sentAt: report.sentAt,
  };

  const existingIdx = index.findIndex((i) => i.date === report.reportDate);
  if (existingIdx >= 0) {
    index[existingIdx] = entry;
  } else {
    index.push(entry);
  }

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
// SEED INITIAL REALISTIC STATION DATA FOR OBORPAH ASESEWA
// ----------------------------------------------------------------------

export function seedDemoWorkspacesIfEmpty() {
  const seededKey = 'omc_seeded_v3_2_oborpah';
  if (localStorage.getItem(seededKey)) return;

  const manager = DEMO_USERS[0];
  const ws = getOrCreateWorkspace(manager.id);
  const products = getWorkspaceProducts(manager.id);

  // Initialize Kwame with Oborpah Asesewa station report for 2026-10-14
  const rep14 = createNewDailyReport(manager.id, '2026-10-14');
  rep14.shiftType = 'Evening Report';
  rep14.stationNameSnapshot = 'OBORPAH ASESEWA';

  // Seed sample readings matching the user's report format:
  // PMS: S1=25332.02, S2=40470.79, S3=61632.08, S4=58649.49, Litres Sold = 342.49, Sales = 5682, Stock = 12710
  // AGO: D1=232477.00, D2=427498.60, D3=165704.46, D4=202374.21, Litres Sold = 516.60, Sales = 9500, Stock = 18840
  // Analogue: S3: 483179, S4: 59439, D1: 232567, D2: 429292
  const pumpBaselines: Record<string, { open: number; close: number; analogue?: string }> = {
    S1: { open: 25210.02, close: 25332.02 },
    S2: { open: 40380.79, close: 40470.79 },
    S3: { open: 61570.08, close: 61632.08, analogue: '483179' },
    S4: { open: 58580.49, close: 58649.49, analogue: '59439' },
    D1: { open: 232350.00, close: 232477.00, analogue: '232567' },
    D2: { open: 427320.60, close: 427498.60, analogue: '429292' },
    D3: { open: 165580.46, close: 165704.46 },
    D4: { open: 202290.21, close: 202374.21 },
  };

  rep14.pumps = rep14.pumps.map((p) => {
    const base = pumpBaselines[p.pumpLabelSnapshot];
    if (base) {
      const diff = Math.round((base.close - base.open) * 100) / 100;
      const up = p.productCodeSnapshot === 'PMS' ? 16.59 : 18.39;
      return {
        ...p,
        openingMeter: base.open,
        closingMeter: base.close,
        litresSold: diff,
        unitPriceSnapshot: up,
        amountGhs: Math.round(diff * up * 100) / 100,
        analogueMeter: base.analogue || null,
        isConfirmed: true,
      };
    }
    return p;
  });

  rep14.stocks = rep14.stocks.map((s) => {
    if (s.productCodeSnapshot === 'PMS') {
      return {
        ...s,
        openingStock: 13090,
        receipts: 0,
        daySales: 342.49,
        theoreticalClosingStock: 12747.51,
        physicalClosingStock: 12710,
        variance: -37.51,
        unitPriceSnapshot: 16.59,
        productSalesGhs: 5682,
      };
    } else if (s.productCodeSnapshot === 'AGO') {
      return {
        ...s,
        openingStock: 19410,
        receipts: 0,
        daySales: 516.60,
        theoreticalClosingStock: 18893.40,
        physicalClosingStock: 18840,
        variance: -53.40,
        unitPriceSnapshot: 18.39,
        productSalesGhs: 9500,
      };
    }
    return s;
  });

  rep14.expenses = [];
  rep14.totalSalesGhs = 15182;
  rep14.totalExpensesGhs = 0;
  rep14.cashToBankOrTill = 15182;
  rep14.hubtel = {
    hubtelAccount: '',
    dashboardAmount: null,
    bankingWithHubtel: null,
  };

  saveDailyReport(manager.id, rep14);
  localStorage.setItem(seededKey, 'true');
}

async function syncReportToSupabase(report: DailyReport) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('reports').upsert(
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
  } catch (err) {
    console.warn('Supabase sync notice:', err);
  }
}
