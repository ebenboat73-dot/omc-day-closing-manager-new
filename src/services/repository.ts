import type { SupabaseClient, User } from '@supabase/supabase-js';
import type {
  ConfiguredProduct,
  ConfiguredPump,
  DailyReport,
  DischargeReport,
  HubtelDetails,
  PriceChangeReport,
  ReportExpense,
  ReportFormatSettings,
  ReportIndexEntry,
  ReportPumpReading,
  ReportStockEntry,
  StationWorkspace,
} from '../types/report';
import {
  DEFAULT_INITIAL_PRODUCTS,
  DEFAULT_INITIAL_PUMPS_TEMPLATE,
  DEFAULT_REPORT_FORMAT_SETTINGS,
} from '../types/report';
import { recalculateReport } from '../utils/calculations';
import { getSupabaseClient } from './supabaseClient';

type Row = Record<string, unknown>;

interface PendingReport {
  date: string;
  report: DailyReport;
}

export interface PendingSyncResult {
  synced: number;
  pending: number;
}

export interface ImportSummary {
  workspacesImported: number;
  productsImported: number;
  pumpsImported: number;
  dailyReportsImported: number;
  dailyReportsSkipped: number;
  dischargeReportsImported: number;
  priceChangeReportsImported: number;
  formatSettingsImported: number;
}

export interface LegacyDataSource {
  userId: string;
  stationName: string;
  managerName: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PENDING_QUEUE_PREFIX = 'omc_pending_reports_';

function requireClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('App not configured. Set the Supabase environment variables and redeploy.');
  }
  return client;
}

function throwDatabaseError(error: { message: string; code?: string } | null): void {
  if (!error) return;
  if (
    error.code === 'PGRST301' ||
    /failed to fetch|network|fetch error|timeout|load failed/i.test(error.message)
  ) {
    throw new TypeError('Network unavailable. Your changes will be queued for sync.');
  }
  throw new Error(error.message || 'The data service could not complete the request.');
}

async function getAuthenticatedUser(userId: string): Promise<{ client: SupabaseClient; user: User }> {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  throwDatabaseError(error);
  if (!data.user || data.user.id !== userId) {
    throw new Error('Your session has changed. Sign in again before accessing station data.');
  }
  return { client, user: data.user };
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function uuidOrNull(value: string | null | undefined): string | null {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError ||
    (error instanceof Error && /network|fetch|timeout|offline/i.test(error.message));
}

function pendingQueueKey(userId: string): string {
  return `${PENDING_QUEUE_PREFIX}${userId}`;
}

function readPendingQueue(userId: string): PendingReport[] {
  const raw = localStorage.getItem(pendingQueueKey(userId));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('The pending report queue is invalid. Contact support before clearing browser data.');
  }
  return parsed as PendingReport[];
}

function writePendingQueue(userId: string, queue: PendingReport[]): void {
  const key = pendingQueueKey(userId);
  if (queue.length) localStorage.setItem(key, JSON.stringify(queue));
  else localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent('omc:pending-sync', {
    detail: { userId, pending: queue.length },
  }));
}

function withoutBase64Photos(report: DailyReport): DailyReport {
  return {
    ...report,
    pumps: report.pumps.map(({ photoDataUrl: _photoDataUrl, ...pump }) => pump),
    stocks: report.stocks.map(({ photoDataUrl: _photoDataUrl, ...stock }) => stock),
  };
}

function mapWorkspace(row: Row): StationWorkspace {
  return {
    id: textValue(row.id),
    ownerUserId: textValue(row.owner_user_id),
    stationName: textValue(row.station_name),
    stationLocation: textValue(row.station_location),
    omcBrand: textValue(row.omc_brand, 'Onyxma Energy'),
    managerName: textValue(row.manager_name),
    currencySymbol: textValue(row.currency_symbol, '¢'),
    createdAt: textValue(row.created_at),
    updatedAt: textValue(row.updated_at),
  };
}

function mapProduct(row: Row): ConfiguredProduct {
  return {
    id: textValue(row.id),
    workspaceId: textValue(row.workspace_id),
    code: textValue(row.code),
    name: textValue(row.name),
    fullName: textValue(row.full_name),
    color: textValue(row.color, '#10b981'),
    badgeBg: textValue(row.badge_bg),
    badgeText: textValue(row.badge_text),
    borderCol: textValue(row.border_col),
    displayOrder: numberValue(row.display_order, 1),
    isActive: row.is_active !== false,
    unitPrice: numberValue(row.unit_price),
  };
}

function mapPump(row: Row): ConfiguredPump {
  return {
    id: textValue(row.id),
    workspaceId: textValue(row.workspace_id),
    productId: textValue(row.product_id),
    productCode: textValue(row.product_code),
    label: textValue(row.label),
    displayOrder: numberValue(row.display_order, 1),
    isActive: row.is_active !== false,
    defaultCapacity: numberValue(row.default_capacity, 100000),
  };
}

function mapPumpReading(row: Row): ReportPumpReading {
  return {
    id: textValue(row.id),
    pumpId: textValue(row.pump_id),
    pumpLabelSnapshot: textValue(row.pump_label_snapshot),
    productCodeSnapshot: textValue(row.product_code_snapshot),
    productIdSnapshot: textValue(row.product_id_snapshot),
    openingMeter: nullableNumber(row.opening_meter),
    closingMeter: nullableNumber(row.closing_meter),
    litresSold: nullableNumber(row.litres_sold),
    unitPriceSnapshot: nullableNumber(row.unit_price_snapshot) ?? undefined,
    amountGhs: nullableNumber(row.amount_ghs),
    analogueMeter: textValue(row.analogue_meter) || null,
    candidateOcrReading: nullableNumber(row.candidate_ocr_reading),
    ocrConfidence: nullableNumber(row.ocr_confidence) ?? undefined,
    ocrStatus: textValue(row.ocr_status, 'idle') as ReportPumpReading['ocrStatus'],
    ocrError: textValue(row.ocr_error) || undefined,
    isConfirmed: row.is_confirmed === true,
    isRollover: row.is_rollover === true,
    rolloverCapacity: numberValue(row.rollover_capacity, 100000),
    photoStoragePath: textValue(row.photo_storage_path) || undefined,
    notes: textValue(row.notes) || undefined,
    warning: textValue(row.warning) || null,
    isIdleOrOptional: row.is_idle_or_optional === true,
  };
}

function mapStockEntry(row: Row): ReportStockEntry {
  return {
    id: textValue(row.id),
    productId: textValue(row.product_id),
    productCodeSnapshot: textValue(row.product_code_snapshot),
    productNameSnapshot: textValue(row.product_name_snapshot),
    tankLabel: textValue(row.tank_label, 'Tank 1'),
    openingStock: nullableNumber(row.opening_stock),
    receipts: numberValue(row.receipts),
    daySales: numberValue(row.day_sales),
    physicalClosingStock: nullableNumber(row.physical_closing_stock),
    theoreticalClosingStock: nullableNumber(row.theoretical_closing_stock),
    variance: nullableNumber(row.variance),
    dipReadingMm: nullableNumber(row.dip_reading_mm) ?? undefined,
    unitPriceSnapshot: nullableNumber(row.unit_price_snapshot) ?? undefined,
    productSalesGhs: nullableNumber(row.product_sales_ghs) ?? undefined,
    warning: textValue(row.warning) || null,
  };
}

function mapExpense(row: Row): ReportExpense {
  return {
    id: textValue(row.id),
    description: textValue(row.description),
    amountGhs: numberValue(row.amount_ghs),
    category: textValue(row.category, 'Other') as ReportExpense['category'],
    note: textValue(row.note) || undefined,
  };
}

function mapReportRow(row: Row, pumps: Row[], stocks: Row[], expenses: Row[]): DailyReport {
  const hubtel: HubtelDetails = {
    hubtelAccount: textValue(row.hubtel_account),
    dashboardAmount: nullableNumber(row.hubtel_dashboard_amount),
    bankingWithHubtel: nullableNumber(row.hubtel_banking_with_hubtel),
  };
  return {
    id: textValue(row.id),
    workspaceId: textValue(row.workspace_id),
    reportDate: textValue(row.report_date),
    shiftType: textValue(row.shift_type, 'Evening Report'),
    stationNameSnapshot: textValue(row.station_name_snapshot),
    status: textValue(row.status, 'Draft') as DailyReport['status'],
    productPrices: (row.product_prices && typeof row.product_prices === 'object'
      ? row.product_prices
      : {}) as Record<string, number>,
    pumps: pumps.map(mapPumpReading),
    stocks: stocks.map(mapStockEntry),
    expenses: expenses.map(mapExpense),
    hubtel,
    totalSalesGhs: numberValue(row.total_sales_ghs),
    totalExpensesGhs: numberValue(row.total_expenses_ghs),
    cashToBankOrTill: numberValue(row.cash_to_bank_or_till),
    warnings: Array.isArray(row.warnings) ? row.warnings as string[] : [],
    notes: textValue(row.notes) || undefined,
    createdAt: textValue(row.created_at),
    updatedAt: textValue(row.updated_at),
    sentAt: textValue(row.sent_at) || undefined,
    sentBy: textValue(row.sent_by) || undefined,
    sentVia: textValue(row.sent_via) as DailyReport['sentVia'],
    saveStatus: 'saved',
    lastSavedAt: textValue(row.updated_at) ? new Date(textValue(row.updated_at)).toLocaleTimeString() : undefined,
  };
}

function mapIndexEntry(row: Row, totalSalesLitres: number): ReportIndexEntry {
  return {
    id: textValue(row.id),
    date: textValue(row.report_date),
    status: textValue(row.status, 'Draft') as ReportIndexEntry['status'],
    stationName: textValue(row.station_name_snapshot),
    shiftType: textValue(row.shift_type) || undefined,
    totalSalesLitres: Math.round(totalSalesLitres * 100) / 100,
    totalSalesGhs: numberValue(row.total_sales_ghs),
    totalExpensesGhs: numberValue(row.total_expenses_ghs),
    cashToBankOrTill: numberValue(row.cash_to_bank_or_till),
    updatedAt: textValue(row.updated_at),
    sentAt: textValue(row.sent_at) || undefined,
  };
}

async function getWorkspaceRow(userId: string, createIfMissing = true): Promise<{ client: SupabaseClient; user: User; row: Row }> {
  const { client, user } = await getAuthenticatedUser(userId);
  const { data, error } = await client
    .from('workspaces')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  throwDatabaseError(error);

  let row = data as Row | null;
  if (!row && createIfMissing) {
    const metadata = user.user_metadata ?? {};
    const { data: created, error: insertError } = await client
      .from('workspaces')
      .insert({
        owner_user_id: user.id,
        station_name: textValue(metadata.station_name, 'My Station') || 'My Station',
        manager_name: textValue(metadata.full_name),
        omc_brand: 'Onyxma Energy',
        currency_symbol: '¢',
      })
      .select('*')
      .single();
    throwDatabaseError(insertError);
    row = created as Row;
  }

  if (!row) throw new Error('No station workspace is available for this account.');
  if (createIfMissing) await ensureWorkspaceDefaults(client, row);
  return { client, user, row };
}

async function ensureWorkspaceDefaults(client: SupabaseClient, workspace: Row): Promise<void> {
  const workspaceId = textValue(workspace.id);
  const { data: existingProducts, error: productError } = await client
    .from('products')
    .select('id, code')
    .eq('workspace_id', workspaceId);
  throwDatabaseError(productError);

  if (!existingProducts?.length) {
    const defaults = DEFAULT_INITIAL_PRODUCTS.map((product) => ({
      workspace_id: workspaceId,
      code: product.code,
      name: product.name,
      full_name: product.fullName,
      color: product.color,
      badge_bg: product.badgeBg,
      badge_text: product.badgeText,
      border_col: product.borderCol,
      display_order: product.displayOrder,
      is_active: product.isActive,
      unit_price: product.unitPrice,
    }));
    const { error } = await client.from('products').insert(defaults);
    throwDatabaseError(error);
  }

  const { data: existingPumps, error: pumpError } = await client
    .from('pumps')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1);
  throwDatabaseError(pumpError);
  if (existingPumps?.length) return;

  const { data: productRows, error: productRowsError } = await client
    .from('products')
    .select('id, code')
    .eq('workspace_id', workspaceId);
  throwDatabaseError(productRowsError);
  const productIds = new Map<string, string>(
    (productRows ?? []).map((product: Row) => [textValue(product.code), textValue(product.id)])
  );
  const pumps = DEFAULT_INITIAL_PUMPS_TEMPLATE.map((pump) => ({
    workspace_id: workspaceId,
    product_id: productIds.get(pump.productCode),
    product_code: pump.productCode,
    label: pump.label,
    display_order: pump.displayOrder,
    is_active: true,
    default_capacity: 100000,
  }));
  if (pumps.some((pump) => !pump.product_id)) {
    throw new Error('Default products could not be initialized for this workspace.');
  }
  const { error } = await client.from('pumps').insert(pumps);
  throwDatabaseError(error);
}

async function loadReportRows(client: SupabaseClient, rows: Row[]): Promise<DailyReport[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => textValue(row.id));
  const [pumpResult, stockResult, expenseResult] = await Promise.all([
    client.from('report_pump_readings').select('*').in('report_id', ids),
    client.from('report_stock_entries').select('*').in('report_id', ids),
    client.from('report_expenses').select('*').in('report_id', ids),
  ]);
  throwDatabaseError(pumpResult.error);
  throwDatabaseError(stockResult.error);
  throwDatabaseError(expenseResult.error);
  return rows.map((row) => {
    const reportId = textValue(row.id);
    return mapReportRow(
      row,
      (pumpResult.data ?? []).filter((item: Row) => textValue(item.report_id) === reportId),
      (stockResult.data ?? []).filter((item: Row) => textValue(item.report_id) === reportId),
      (expenseResult.data ?? []).filter((item: Row) => textValue(item.report_id) === reportId)
    );
  });
}

async function saveReportToCloud(client: SupabaseClient, report: DailyReport): Promise<string> {
  const { data, error } = await client.rpc('save_daily_report', {
    p_report: withoutBase64Photos(report),
  });
  throwDatabaseError(error);
  if (typeof data !== 'string') {
    throw new Error('The report was saved but the server did not return its identifier.');
  }
  return data;
}

function enqueueReport(userId: string, report: DailyReport): void {
  const queue = readPendingQueue(userId);
  const sanitized = withoutBase64Photos(report);
  const existingIndex = queue.findIndex((entry) => entry.date === sanitized.reportDate);
  const entry: PendingReport = { date: sanitized.reportDate, report: sanitized };
  if (existingIndex >= 0) queue[existingIndex] = entry;
  else queue.push(entry);
  writePendingQueue(userId, queue);
}

async function requireWorkspace(userId: string): Promise<{ client: SupabaseClient; workspace: StationWorkspace; row: Row }> {
  const { client, row } = await getWorkspaceRow(userId);
  return { client, workspace: mapWorkspace(row), row };
}

export async function getOrCreateWorkspace(userId: string): Promise<StationWorkspace> {
  const { workspace } = await requireWorkspace(userId);
  return workspace;
}

export async function updateWorkspace(
  userId: string,
  updates: Partial<StationWorkspace>
): Promise<StationWorkspace> {
  const { client, workspace } = await requireWorkspace(userId);
  const patch: Row = {};
  if (updates.stationName !== undefined) patch.station_name = updates.stationName;
  if (updates.stationLocation !== undefined) patch.station_location = updates.stationLocation;
  if (updates.omcBrand !== undefined) patch.omc_brand = updates.omcBrand;
  if (updates.managerName !== undefined) patch.manager_name = updates.managerName;
  if (updates.currencySymbol !== undefined) patch.currency_symbol = updates.currencySymbol;
  if (!Object.keys(patch).length) return workspace;

  const { data, error } = await client
    .from('workspaces')
    .update(patch)
    .eq('id', workspace.id)
    .eq('owner_user_id', userId)
    .select('*')
    .single();
  throwDatabaseError(error);
  return mapWorkspace(data as Row);
}

export async function initializeWorkspaceProductsAndPumps(workspaceId: string, userId: string): Promise<void> {
  const { client, row } = await getWorkspaceRow(userId);
  if (textValue(row.id) !== workspaceId) throw new Error('Workspace does not belong to this account.');
  await ensureWorkspaceDefaults(client, row);
}

export async function getWorkspaceProducts(userId: string): Promise<ConfiguredProduct[]> {
  const { client, workspace } = await requireWorkspace(userId);
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('display_order', { ascending: true });
  throwDatabaseError(error);
  return (data ?? []).map((row: Row) => mapProduct(row));
}

export async function saveWorkspaceProducts(
  userId: string,
  products: ConfiguredProduct[]
): Promise<ConfiguredProduct[]> {
  const { client, workspace } = await requireWorkspace(userId);
  const rows = products.map((product) => ({
    ...(uuidOrNull(product.id) ? { id: product.id } : {}),
    workspace_id: workspace.id,
    code: product.code,
    name: product.name,
    full_name: product.fullName,
    color: product.color,
    badge_bg: product.badgeBg,
    badge_text: product.badgeText,
    border_col: product.borderCol,
    display_order: product.displayOrder,
    is_active: product.isActive,
    unit_price: product.unitPrice,
  }));
  if (!rows.length) return [];
  const { data, error } = await client
    .from('products')
    .upsert(rows, { onConflict: 'workspace_id,code' })
    .select('*');
  throwDatabaseError(error);
  return (data ?? []).map((row: Row) => mapProduct(row));
}

export async function updateProductPrice(
  userId: string,
  productCode: string,
  unitPrice: number
): Promise<ConfiguredProduct[]> {
  const products = await getWorkspaceProducts(userId);
  const updated = products.map((product) => product.code === productCode ? { ...product, unitPrice } : product);
  return saveWorkspaceProducts(userId, updated);
}

export async function getWorkspacePumps(userId: string): Promise<ConfiguredPump[]> {
  const { client, workspace } = await requireWorkspace(userId);
  const { data, error } = await client
    .from('pumps')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('display_order', { ascending: true });
  throwDatabaseError(error);
  return (data ?? []).map((row: Row) => mapPump(row));
}

export async function saveWorkspacePumps(
  userId: string,
  pumps: ConfiguredPump[]
): Promise<ConfiguredPump[]> {
  const { client, workspace } = await requireWorkspace(userId);
  const products = await getWorkspaceProducts(userId);
  const productIds = new Map(products.map((product) => [product.code, product.id]));
  const rows = pumps.map((pump) => ({
    ...(uuidOrNull(pump.id) ? { id: pump.id } : {}),
    workspace_id: workspace.id,
    product_id: productIds.get(pump.productCode) ?? uuidOrNull(pump.productId),
    product_code: pump.productCode,
    label: pump.label,
    display_order: pump.displayOrder,
    is_active: pump.isActive,
    default_capacity: pump.defaultCapacity ?? 100000,
  }));
  if (rows.some((pump) => !pump.product_id)) {
    throw new Error('A pump refers to a product that is not configured in this workspace.');
  }
  if (!rows.length) return [];
  const { data, error } = await client.from('pumps').upsert(rows).select('*');
  throwDatabaseError(error);
  return (data ?? []).map((row: Row) => mapPump(row));
}

export async function addPump(
  userId: string,
  productCode: string,
  label: string,
  displayOrder?: number
): Promise<ConfiguredPump> {
  const products = await getWorkspaceProducts(userId);
  const product = products.find((item) => item.code === productCode) ?? products[0];
  if (!product) throw new Error('Add a product before configuring a pump.');
  const workspace = await getOrCreateWorkspace(userId);
  const pump: ConfiguredPump = {
    id: crypto.randomUUID(),
    workspaceId: workspace.id,
    productId: product.id,
    productCode: product.code,
    label: label.trim(),
    displayOrder: displayOrder ?? (await getWorkspacePumps(userId)).length + 1,
    isActive: true,
    defaultCapacity: 100000,
  };
  const saved = await saveWorkspacePumps(userId, [...await getWorkspacePumps(userId), pump]);
  return saved.find((item) => item.id === pump.id) ?? pump;
}

export async function updatePump(
  userId: string,
  pumpId: string,
  updates: Partial<ConfiguredPump>
): Promise<ConfiguredPump[]> {
  const pumps = await getWorkspacePumps(userId);
  return saveWorkspacePumps(userId, pumps.map((pump) => pump.id === pumpId ? { ...pump, ...updates } : pump));
}

export async function deletePump(userId: string, pumpId: string): Promise<ConfiguredPump[]> {
  const { client, workspace } = await requireWorkspace(userId);
  const { error } = await client.from('pumps').delete().eq('workspace_id', workspace.id).eq('id', pumpId);
  throwDatabaseError(error);
  return getWorkspacePumps(userId);
}

export async function togglePumpActive(userId: string, pumpId: string, isActive: boolean): Promise<ConfiguredPump[]> {
  return updatePump(userId, pumpId, { isActive });
}

export async function findMostRecentClosingReading(
  userId: string,
  pumpId: string,
  beforeDate: string
): Promise<number | null> {
  const reports = await listAllUserReports(userId);
  const pastReports = reports.filter((report) => report.reportDate < beforeDate)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  for (const report of pastReports) {
    const reading = report.pumps.find((pump) => pump.pumpId === pumpId);
    if (reading?.closingMeter !== null && reading?.closingMeter !== undefined && !Number.isNaN(reading.closingMeter)) {
      return reading.closingMeter;
    }
  }
  return null;
}

export async function createNewDailyReport(userId: string, reportDate: string): Promise<DailyReport> {
  const workspace = await getOrCreateWorkspace(userId);
  const products = (await getWorkspaceProducts(userId)).filter((product) => product.isActive);
  const activePumps = (await getWorkspacePumps(userId)).filter((pump) => pump.isActive);
  const sortedPumps = [...activePumps].sort((a, b) => {
    const productA = products.find((product) => product.code === a.productCode)?.displayOrder || 99;
    const productB = products.find((product) => product.code === b.productCode)?.displayOrder || 99;
    return productA !== productB ? productA - productB : a.displayOrder - b.displayOrder;
  });
  const priceMap: Record<string, number> = {};
  products.forEach((product) => {
    priceMap[product.code] = product.unitPrice || (product.code === 'PMS' ? 16.59 : product.code === 'AGO' ? 18.39 : 15);
  });
  const pastReports = (await listAllUserReports(userId))
    .filter((report) => report.reportDate < reportDate)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));

  const pumpReadings: ReportPumpReading[] = await Promise.all(sortedPumps.map(async (pump) => ({
    id: crypto.randomUUID(),
    pumpId: pump.id,
    pumpLabelSnapshot: pump.label,
    productCodeSnapshot: pump.productCode,
    productIdSnapshot: pump.productId,
    openingMeter: await findMostRecentClosingReading(userId, pump.id, reportDate),
    closingMeter: null,
    litresSold: null,
    unitPriceSnapshot: priceMap[pump.productCode] || 16.59,
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
  })));

  const stockEntries: ReportStockEntry[] = products.map((product) => {
    const previousEntry = pastReports[0]?.stocks.find((stock) => stock.productCodeSnapshot === product.code);
    const openingStock = previousEntry?.physicalClosingStock ?? (
      product.code === 'PMS' ? 12710 : product.code === 'AGO' ? 18840 : 5000
    );
    return {
      id: crypto.randomUUID(),
      productId: product.id,
      productCodeSnapshot: product.code,
      productNameSnapshot: product.fullName,
      tankLabel: 'Main Tank',
      openingStock,
      receipts: 0,
      daySales: 0,
      physicalClosingStock: null,
      theoreticalClosingStock: null,
      variance: null,
      unitPriceSnapshot: priceMap[product.code] || 16.59,
      productSalesGhs: 0,
      warning: null,
    };
  });

  const now = new Date().toISOString();
  const report: DailyReport = {
    id: crypto.randomUUID(),
    workspaceId: workspace.id,
    reportDate,
    shiftType: 'Evening Report',
    stationNameSnapshot: workspace.stationName,
    status: 'Draft',
    productPrices: priceMap,
    pumps: pumpReadings,
    stocks: stockEntries,
    expenses: [],
    hubtel: { hubtelAccount: '', dashboardAmount: null, bankingWithHubtel: null },
    totalSalesGhs: 0,
    totalExpensesGhs: 0,
    cashToBankOrTill: 0,
    warnings: [],
    createdAt: now,
    updatedAt: now,
    saveStatus: 'saved',
    lastSavedAt: new Date().toLocaleTimeString(),
  };
  return recalculateReport(report, products);
}

export async function getReportByDate(userId: string, reportDate: string): Promise<DailyReport> {
  const { client, workspace } = await requireWorkspace(userId);
  const { data, error } = await client
    .from('reports')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('report_date', reportDate)
    .maybeSingle();
  throwDatabaseError(error);
  if (data) {
    const reports = await loadReportRows(client, [data as Row]);
    return reports[0];
  }
  return saveDailyReport(userId, await createNewDailyReport(userId, reportDate));
}

export async function saveDailyReport(userId: string, report: DailyReport): Promise<DailyReport> {
  const { client, workspace } = await requireWorkspace(userId);
  if (report.workspaceId !== workspace.id) {
    throw new Error('This report belongs to a different workspace.');
  }
  const timestamp = new Date().toISOString();
  const sanitized = withoutBase64Photos({
    ...report,
    pumps: report.pumps.map((pump) => ({
      ...pump,
      pumpId: uuidOrNull(pump.pumpId) ?? '',
      productIdSnapshot: uuidOrNull(pump.productIdSnapshot) ?? '',
    })),
    stocks: report.stocks.map((stock) => ({
      ...stock,
      productId: uuidOrNull(stock.productId) ?? '',
    })),
    updatedAt: timestamp,
    saveStatus: 'saving',
  });

  try {
    const id = await saveReportToCloud(client, sanitized);
    const queue = readPendingQueue(userId).filter((entry) => entry.date !== report.reportDate);
    writePendingQueue(userId, queue);
    return { ...report, id, updatedAt: timestamp, saveStatus: 'saved', lastSavedAt: new Date().toLocaleTimeString() };
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    enqueueReport(userId, sanitized);
    return { ...report, updatedAt: timestamp, saveStatus: 'failed' };
  }
}

export async function listUserReportIndex(userId: string): Promise<ReportIndexEntry[]> {
  const { client, workspace } = await requireWorkspace(userId);
  const { data, error } = await client.from('reports').select('*')
    .eq('workspace_id', workspace.id).order('report_date', { ascending: false });
  throwDatabaseError(error);
  const rows = (data ?? []) as Row[];
  if (!rows.length) return [];
  const ids = rows.map((row) => textValue(row.id));
  const { data: readings, error: readingsError } = await client
    .from('report_pump_readings')
    .select('report_id, litres_sold')
    .in('report_id', ids);
  throwDatabaseError(readingsError);
  const totals = new Map<string, number>();
  (readings ?? []).forEach((reading: Row) => {
    const id = textValue(reading.report_id);
    totals.set(id, (totals.get(id) ?? 0) + numberValue(reading.litres_sold));
  });
  return rows.map((row) => mapIndexEntry(row, totals.get(textValue(row.id)) ?? 0));
}

export async function listAllUserReports(userId: string): Promise<DailyReport[]> {
  const { client, workspace } = await requireWorkspace(userId);
  const { data, error } = await client.from('reports').select('*')
    .eq('workspace_id', workspace.id).order('report_date', { ascending: false });
  throwDatabaseError(error);
  return loadReportRows(client, (data ?? []) as Row[]);
}

export async function getDischargeReports(userId: string): Promise<DischargeReport[]> {
  const { client, workspace } = await requireWorkspace(userId);
  const { data, error } = await client.from('discharge_reports').select('data')
    .eq('workspace_id', workspace.id).order('created_at', { ascending: false });
  throwDatabaseError(error);
  return (data ?? []).map((row: Row) => row.data as DischargeReport);
}

export async function saveDischargeReport(userId: string, report: DischargeReport): Promise<DischargeReport> {
  const { client, workspace } = await requireWorkspace(userId);
  const saved = { ...report, workspaceId: workspace.id, updatedAt: new Date().toISOString() };
  const { error } = await client.from('discharge_reports').upsert({
    workspace_id: workspace.id,
    record_id: saved.id,
    report_date: saved.date,
    data: saved,
  }, { onConflict: 'workspace_id,record_id' });
  throwDatabaseError(error);
  return saved;
}

export async function deleteDischargeReport(userId: string, reportId: string): Promise<void> {
  const { client, workspace } = await requireWorkspace(userId);
  const { error } = await client.from('discharge_reports').delete()
    .eq('workspace_id', workspace.id).eq('record_id', reportId);
  throwDatabaseError(error);
}

export async function getPriceChangeReports(userId: string): Promise<PriceChangeReport[]> {
  const { client, workspace } = await requireWorkspace(userId);
  const { data, error } = await client.from('price_change_reports').select('data')
    .eq('workspace_id', workspace.id).order('created_at', { ascending: false });
  throwDatabaseError(error);
  return (data ?? []).map((row: Row) => row.data as PriceChangeReport);
}

export async function savePriceChangeReport(userId: string, report: PriceChangeReport): Promise<PriceChangeReport> {
  const { client, workspace } = await requireWorkspace(userId);
  const saved = { ...report, workspaceId: workspace.id, updatedAt: new Date().toISOString() };
  const { error } = await client.from('price_change_reports').upsert({
    workspace_id: workspace.id,
    record_id: saved.id,
    report_date: saved.date,
    data: saved,
  }, { onConflict: 'workspace_id,record_id' });
  throwDatabaseError(error);
  return saved;
}

export async function deletePriceChangeReport(userId: string, reportId: string): Promise<void> {
  const { client, workspace } = await requireWorkspace(userId);
  const { error } = await client.from('price_change_reports').delete()
    .eq('workspace_id', workspace.id).eq('record_id', reportId);
  throwDatabaseError(error);
}

export async function getReportFormatSettings(userId: string): Promise<ReportFormatSettings> {
  const { client, workspace } = await requireWorkspace(userId);
  const { data, error } = await client.from('report_format_settings').select('settings')
    .eq('workspace_id', workspace.id).maybeSingle();
  throwDatabaseError(error);
  return { ...DEFAULT_REPORT_FORMAT_SETTINGS, ...((data?.settings ?? {}) as Partial<ReportFormatSettings>) };
}

export async function saveReportFormatSettings(
  userId: string,
  settings: ReportFormatSettings
): Promise<ReportFormatSettings> {
  const { client, workspace } = await requireWorkspace(userId);
  const { error } = await client.from('report_format_settings').upsert({
    workspace_id: workspace.id,
    settings,
  }, { onConflict: 'workspace_id' });
  throwDatabaseError(error);
  return settings;
}

export async function resetReportFormatSettings(userId: string): Promise<ReportFormatSettings> {
  return saveReportFormatSettings(userId, { ...DEFAULT_REPORT_FORMAT_SETTINGS });
}

export async function syncPendingReports(userId: string): Promise<PendingSyncResult> {
  const queue = readPendingQueue(userId);
  if (!queue.length || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { synced: 0, pending: queue.length };
  }
  const { client, workspace } = await requireWorkspace(userId);
  let synced = 0;
  const remaining = [...queue];
  while (remaining.length) {
    const item = remaining[0];
    if (item.report.workspaceId !== workspace.id) {
      throw new Error('A pending report belongs to another workspace and cannot be synced.');
    }
    try {
      await saveReportToCloud(client, withoutBase64Photos(item.report));
      remaining.shift();
      synced += 1;
      writePendingQueue(userId, remaining);
    } catch (error) {
      if (isNetworkError(error)) break;
      throw error;
    }
  }
  writePendingQueue(userId, remaining);
  return { synced, pending: remaining.length };
}

function scopedKeys(userId: string, suffix: string): string[] {
  const ending = `_${suffix}`;
  const prefix = 'omc_u_';
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix) || !key.endsWith(ending)) continue;
    const legacyUserId = key.slice(prefix.length, -ending.length);
    if (legacyUserId === userId) keys.push(key);
  }
  return keys;
}

export function getLegacyDataSources(): LegacyDataSource[] {
  const userIds = new Set<string>();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    const match = key?.match(/^omc_u_(.+)_(?:workspace|products|pumps|report_index|discharge_reports|price_change_reports|report_format_settings|report_\d{4}-\d{2}-\d{2})$/);
    if (match) userIds.add(match[1]);
  }
  return Array.from(userIds).map((userId) => {
    const rawWorkspace = localStorage.getItem(`omc_u_${userId}_workspace`);
    let workspace: Partial<StationWorkspace> = {};
    if (rawWorkspace) {
      try {
        workspace = JSON.parse(rawWorkspace) as Partial<StationWorkspace>;
      } catch {
        // The import flow reports malformed payloads without changing local data.
      }
    }
    return {
      userId,
      stationName: workspace.stationName || 'Station name unavailable',
      managerName: workspace.managerName || '',
    };
  });
}

function scopedKeyUserId(key: string, suffix: string): string {
  return key.slice('omc_u_'.length, -(suffix.length + 1));
}

function readLegacyJson<T>(key: string): T {
  const raw = localStorage.getItem(key);
  if (raw === null) throw new Error(`Local import data disappeared while reading ${key}.`);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('Some existing local data is unreadable. No local data was changed.');
  }
}

function normalizeImportedReport(
  report: DailyReport,
  workspace: StationWorkspace,
  products: ConfiguredProduct[],
  pumps: ConfiguredPump[]
): DailyReport {
  const productByCode = new Map(products.map((product) => [product.code, product]));
  const pumpByCodeAndLabel = new Map(pumps.map((pump) => [`${pump.productCode}:${pump.label}`, pump]));
  return {
    ...report,
    id: crypto.randomUUID(),
    workspaceId: workspace.id,
    pumps: report.pumps.map((reading) => {
      const pump = pumpByCodeAndLabel.get(`${reading.productCodeSnapshot}:${reading.pumpLabelSnapshot}`);
      const product = productByCode.get(reading.productCodeSnapshot);
      return {
        ...reading,
        id: crypto.randomUUID(),
        pumpId: pump?.id ?? '',
        productIdSnapshot: product?.id ?? '',
        photoDataUrl: undefined,
      };
    }),
    stocks: report.stocks.map((stock) => ({
      ...stock,
      id: crypto.randomUUID(),
      productId: productByCode.get(stock.productCodeSnapshot)?.id ?? '',
      photoDataUrl: undefined,
    })),
    expenses: report.expenses.map((expense) => ({ ...expense, id: crypto.randomUUID() })),
    hubtel: report.hubtel ?? { hubtelAccount: '', dashboardAmount: null, bankingWithHubtel: null },
  };
}

export async function importExistingLocalData(userId: string, legacyUserId: string): Promise<ImportSummary> {
  const workspace = await getOrCreateWorkspace(userId);
  const summary: ImportSummary = {
    workspacesImported: 0,
    productsImported: 0,
    pumpsImported: 0,
    dailyReportsImported: 0,
    dailyReportsSkipped: 0,
    dischargeReportsImported: 0,
    priceChangeReportsImported: 0,
    formatSettingsImported: 0,
  };

  const workspaceKeys = scopedKeys(legacyUserId, 'workspace');
  if (workspaceKeys.length) {
    const localWorkspace = readLegacyJson<Partial<StationWorkspace>>(workspaceKeys[0]);
    await updateWorkspace(userId, {
      stationName: localWorkspace.stationName || workspace.stationName,
      stationLocation: localWorkspace.stationLocation || workspace.stationLocation,
      omcBrand: localWorkspace.omcBrand || workspace.omcBrand,
      managerName: localWorkspace.managerName || workspace.managerName,
      currencySymbol: localWorkspace.currencySymbol || workspace.currencySymbol,
    });
    summary.workspacesImported = 1;
  }

  const localProducts = scopedKeys(legacyUserId, 'products')
    .flatMap((key) => readLegacyJson<ConfiguredProduct[]>(key));
  let products = await getWorkspaceProducts(userId);
  if (localProducts.length) {
    const byCode = new Map(products.map((product) => [product.code, product]));
    localProducts.forEach((product) => byCode.set(product.code, { ...product, workspaceId: workspace.id }));
    products = await saveWorkspaceProducts(userId, [...byCode.values()]);
    summary.productsImported = localProducts.length;
  }

  const localPumps = scopedKeys(legacyUserId, 'pumps')
    .flatMap((key) => readLegacyJson<ConfiguredPump[]>(key));
  let pumps = await getWorkspacePumps(userId);
  if (localPumps.length) {
    const byIdentity = new Map(pumps.map((pump) => [`${pump.productCode}:${pump.label}`, pump]));
    localPumps.forEach((pump) => {
      const key = `${pump.productCode}:${pump.label}`;
      const existing = byIdentity.get(key);
      byIdentity.set(key, {
        ...existing,
        ...pump,
        id: existing?.id ?? crypto.randomUUID(),
        workspaceId: workspace.id,
        productId: products.find((product) => product.code === pump.productCode)?.id ?? '',
      });
    });
    pumps = await saveWorkspacePumps(userId, [...byIdentity.values()]);
    summary.pumpsImported = localPumps.length;
  }

  const reportsByDate = new Map<string, DailyReport>();
  for (const key of scopedKeys(legacyUserId, 'report_index')) {
    const sourceUserId = scopedKeyUserId(key, 'report_index');
    const index = readLegacyJson<ReportIndexEntry[]>(key);
    for (const entry of index) {
      const reportKey = `omc_u_${sourceUserId}_report_${entry.date}`;
      if (localStorage.getItem(reportKey)) {
        reportsByDate.set(entry.date, readLegacyJson<DailyReport>(reportKey));
      }
    }
  }
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    const match = key?.match(/^omc_u_(.+)_report_(\d{4}-\d{2}-\d{2})$/);
    if (key && match && match[1] === legacyUserId) reportsByDate.set(match[2], readLegacyJson<DailyReport>(key));
  }

  const existingDates = new Set((await listUserReportIndex(userId)).map((entry) => entry.date));
  for (const [date, localReport] of reportsByDate) {
    if (existingDates.has(date)) {
      summary.dailyReportsSkipped += 1;
      continue;
    }
    const normalized = normalizeImportedReport(localReport, workspace, products, pumps);
    await saveDailyReport(userId, normalized);
    summary.dailyReportsImported += 1;
    existingDates.add(date);
  }

  const discharge = scopedKeys(legacyUserId, 'discharge_reports')
    .flatMap((key) => readLegacyJson<DischargeReport[]>(key));
  for (const report of discharge) {
    await saveDischargeReport(userId, { ...report, id: report.id || crypto.randomUUID() });
    summary.dischargeReportsImported += 1;
  }

  const priceChanges = scopedKeys(legacyUserId, 'price_change_reports')
    .flatMap((key) => readLegacyJson<PriceChangeReport[]>(key));
  for (const report of priceChanges) {
    await savePriceChangeReport(userId, { ...report, id: report.id || crypto.randomUUID() });
    summary.priceChangeReportsImported += 1;
  }

  const formatKey = scopedKeys(legacyUserId, 'report_format_settings')[0];
  if (formatKey) {
    await saveReportFormatSettings(userId, {
      ...DEFAULT_REPORT_FORMAT_SETTINGS,
      ...readLegacyJson<Partial<ReportFormatSettings>>(formatKey),
    });
    summary.formatSettingsImported = 1;
  }
  return summary;
}
