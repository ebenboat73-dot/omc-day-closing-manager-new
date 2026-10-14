/**
 * OMC Manager Day Sales & Stock Reporting App
 * Domain Models & Types • Version 3.1
 * Mobile-first multi-user web app • React + TypeScript • Supabase & Vercel ready
 */

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  createdAt?: string;
}

export interface StationWorkspace {
  id: string;
  ownerUserId: string;
  stationName: string;
  stationLocation: string;
  omcBrand: string;
  managerName: string;
  currencySymbol: string; // e.g. 'GHS'
  createdAt: string;
  updatedAt: string;
}

export interface ConfiguredProduct {
  id: string;
  workspaceId: string;
  code: string; // 'PMS', 'AGO', 'KERO' or custom
  name: string; // 'PMS (Super)'
  fullName: string; // 'Premium Motor Spirit'
  color: string;
  badgeBg: string;
  badgeText: string;
  borderCol: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ConfiguredPump {
  id: string;
  workspaceId: string;
  productId: string;
  productCode: string;
  label: string; // 'PMS 1', 'AGO 3', etc.
  displayOrder: number;
  isActive: boolean;
  defaultCapacity?: number; // e.g. 100000
}

export type OcrStatus = 'idle' | 'processing' | 'candidate' | 'confirmed' | 'failed';

export interface ReportPumpReading {
  id: string;
  pumpId: string;
  // Snapshot fields preserve historical accuracy even if pump is renamed/deactivated later
  pumpLabelSnapshot: string;
  productCodeSnapshot: string;
  productIdSnapshot: string;
  openingMeter: number | null; // null if missing historical record
  closingMeter: number | null;
  litresSold: number | null;
  candidateOcrReading: number | null;
  ocrConfidence?: number;
  ocrStatus: OcrStatus;
  ocrError?: string;
  isConfirmed: boolean;
  isRollover: boolean;
  rolloverCapacity: number; // default 100000
  photoDataUrl?: string;
  photoStoragePath?: string;
  notes?: string;
  warning?: string | null;
}

export interface ReportStockEntry {
  id: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  tankLabel: string; // supports multiple tanks e.g. 'Tank 1'
  openingStock: number | null;
  receipts: number;
  daySales: number; // auto-computed from pump sales for this product
  physicalClosingStock: number | null;
  theoreticalClosingStock: number | null;
  variance: number | null;
  dipReadingMm?: number;
  photoDataUrl?: string;
  warning?: string | null;
}

export interface ReportExpense {
  id: string;
  description: string;
  amountGhs: number;
  category: 'Transport' | 'Maintenance' | 'Staff/Meals' | 'Utilities' | 'Security' | 'Fuel/Gen' | 'Other';
  note?: string;
}

export type ReportStatus = 'Draft' | 'In Progress' | 'Ready for Review' | 'Ready to Send' | 'Sent';

export interface DailyReport {
  id: string; // unique report ID (UUID or date-based)
  workspaceId: string;
  reportDate: string; // YYYY-MM-DD
  stationNameSnapshot: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  sentBy?: string;
  sentVia?: 'WhatsApp' | 'SMS' | 'Telegram' | 'Clipboard' | 'WebShare' | 'Printed';
  pumps: ReportPumpReading[];
  stocks: ReportStockEntry[];
  expenses: ReportExpense[];
  warnings: string[];
  notes?: string;
  saveStatus: 'saved' | 'saving' | 'failed';
  lastSavedAt?: string;
}

export interface ReportIndexEntry {
  id: string;
  date: string;
  status: ReportStatus;
  stationName: string;
  totalSalesLitres: number;
  totalExpensesGhs: number;
  updatedAt: string;
  sentAt?: string;
}

// Default standard seed products
export const DEFAULT_INITIAL_PRODUCTS: Omit<ConfiguredProduct, 'id' | 'workspaceId'>[] = [
  {
    code: 'PMS',
    name: 'PMS',
    fullName: 'Premium Motor Spirit (Super)',
    color: '#10b981', // Emerald
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    borderCol: 'border-emerald-500/30',
    displayOrder: 1,
    isActive: true,
  },
  {
    code: 'AGO',
    name: 'AGO',
    fullName: 'Automotive Gas Oil (Diesel)',
    color: '#f59e0b', // Amber
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    borderCol: 'border-amber-500/30',
    displayOrder: 2,
    isActive: true,
  },
  {
    code: 'KERO',
    name: 'KERO',
    fullName: 'Kerosene',
    color: '#06b6d4', // Cyan
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-400',
    borderCol: 'border-cyan-500/30',
    displayOrder: 3,
    isActive: true,
  },
];

// Default initial pump sequence per Appendix A of PRD v3.1
export const DEFAULT_INITIAL_PUMPS_TEMPLATE = [
  { productCode: 'PMS', label: 'PMS1', displayOrder: 1 },
  { productCode: 'PMS', label: 'PMS2', displayOrder: 2 },
  { productCode: 'PMS', label: 'PMS3', displayOrder: 3 },
  { productCode: 'PMS', label: 'PMS4', displayOrder: 4 },
  { productCode: 'AGO', label: 'AGO1', displayOrder: 5 },
  { productCode: 'AGO', label: 'AGO2', displayOrder: 6 },
  { productCode: 'AGO', label: 'AGO3', displayOrder: 7 },
  { productCode: 'AGO', label: 'AGO4', displayOrder: 8 },
  { productCode: 'AGO', label: 'AGO5', displayOrder: 9 },
  { productCode: 'AGO', label: 'AGO6', displayOrder: 10 },
  { productCode: 'KERO', label: 'KERO1', displayOrder: 11 },
  { productCode: 'KERO', label: 'KERO2', displayOrder: 12 },
];

// Backwards-compatibility helpers for sample generation
export type ProductType = 'PMS' | 'AGO' | 'KERO' | string;
export type PumpId = 'PMS1' | 'PMS2' | 'PMS3' | 'PMS4' | 'AGO1' | 'AGO2' | 'AGO3' | 'AGO4' | 'AGO5' | 'AGO6' | 'KERO1' | 'KERO2' | string;

export const PUMP_SEQUENCE: { id: PumpId; product: ProductType; name: string; position: number }[] = [
  { id: 'PMS1', product: 'PMS', name: 'PMS 1 (Super)', position: 1 },
  { id: 'PMS2', product: 'PMS', name: 'PMS 2 (Super)', position: 2 },
  { id: 'PMS3', product: 'PMS', name: 'PMS 3 (Super)', position: 3 },
  { id: 'PMS4', product: 'PMS', name: 'PMS 4 (Super)', position: 4 },
  { id: 'AGO1', product: 'AGO', name: 'AGO 1 (Diesel)', position: 5 },
  { id: 'AGO2', product: 'AGO', name: 'AGO 2 (Diesel)', position: 6 },
  { id: 'AGO3', product: 'AGO', name: 'AGO 3 (Diesel)', position: 7 },
  { id: 'AGO4', product: 'AGO', name: 'AGO 4 (Diesel)', position: 8 },
  { id: 'AGO5', product: 'AGO', name: 'AGO 5 (Diesel)', position: 9 },
  { id: 'AGO6', product: 'AGO', name: 'AGO 6 (Diesel)', position: 10 },
  { id: 'KERO1', product: 'KERO', name: 'KERO 1 (Kerosene)', position: 11 },
  { id: 'KERO2', product: 'KERO', name: 'KERO 2 (Kerosene)', position: 12 },
];
