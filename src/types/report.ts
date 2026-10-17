/**
 * OMC Manager Day Sales & Stock Reporting App
 * Domain Models & Types • Version 3.2
 * Mobile-first multi-user web app • React + TypeScript • Supabase & Vercel ready
 */

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  stationName?: string;
  role?: string;
  rememberMe?: boolean;
  createdAt?: string;
}

export interface StationWorkspace {
  id: string;
  ownerUserId: string;
  stationName: string;
  stationLocation: string;
  omcBrand: string;
  managerName: string;
  currencySymbol: string; // e.g. '¢' or 'GHS'
  createdAt: string;
  updatedAt: string;
}

export interface ConfiguredProduct {
  id: string;
  workspaceId: string;
  code: string; // 'PMS', 'AGO', 'KERO' or custom
  name: string; // 'PMS'
  fullName: string; // 'Premium Motor Spirit (Super)'
  color: string;
  badgeBg: string;
  badgeText: string;
  borderCol: string;
  displayOrder: number;
  isActive: boolean;
  unitPrice: number; // Editable price per litre (e.g. 16.59 for PMS, 18.39 for AGO)
}

export interface ConfiguredPump {
  id: string;
  workspaceId: string;
  productId: string;
  productCode: string;
  label: string; // 'S1', 'S2', 'D1', 'D2', etc.
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
  unitPriceSnapshot?: number; // e.g. 16.59
  amountGhs?: number | null; // litresSold * unitPrice
  analogueMeter?: string | null; // Physical mechanical / analogue totalizer reading (e.g. S3-483179)
  candidateOcrReading: number | null;
  ocrConfidence?: number;
  ocrStatus: OcrStatus;
  ocrError?: string;
  aiVisionReading?: number | null;
  aiVisionConfidence?: number;
  aiVisionClear?: boolean;
  aiVisionMeterType?: string;
  aiVisionRawDigits?: string;
  aiVisionUnclearReason?: string | null;
  isConfirmed: boolean;
  isRollover: boolean;
  rolloverCapacity: number; // default 100000
  photoDataUrl?: string;
  photoStoragePath?: string;
  notes?: string;
  warning?: string | null;
  isIdleOrOptional?: boolean; // If not in use, does not block report
}

export interface ReportStockEntry {
  id: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  tankLabel: string; // e.g. 'Tank 1'
  openingStock: number | null;
  receipts: number;
  daySales: number; // auto-computed from pump sales for this product
  physicalClosingStock: number | null;
  theoreticalClosingStock: number | null;
  variance: number | null;
  dipReadingMm?: number;
  photoDataUrl?: string; // Camera photo of dipstick / gauge
  unitPriceSnapshot?: number; // e.g. 16.59
  productSalesGhs?: number; // daySales * unitPrice
  warning?: string | null;
}

export interface ReportExpense {
  id: string;
  description: string;
  amountGhs: number;
  category: 'Transport' | 'Maintenance' | 'Staff/Meals' | 'Utilities' | 'Security' | 'Fuel/Gen' | 'Other';
  note?: string;
}

export interface HubtelDetails {
  hubtelAccount: string;
  dashboardAmount: number | null;
  bankingWithHubtel: number | null;
}

export interface DischargePumpMeter {
  pumpLabel: string;
  meter: number;
}

export interface DischargeReport {
  id: string;
  workspaceId: string;
  stationName: string;
  productCode: string; // 'AGO', 'PMS', etc.
  date: string; // e.g. '10/10/2026'
  truckNumber?: string;
  driverName?: string;
  waybillNumber?: string;
  
  // Before discharge
  beforeTime: string; // e.g. '2:30PM'
  stockUndergroundBefore: number; // e.g. 3820
  invoiceQuantity: number; // e.g. 18000
  expectedStock: number; // 3820 + 18000 = 21820
  openingMeters: DischargePumpMeter[];
  totalOpeningMeters: number;

  // After discharge
  afterTime?: string; // e.g. '3:33 PM'
  stockAfterDischarge?: number | null; // e.g. 21880
  litresSoldDuringDischarge: number; // e.g. 0
  theoreticalStock?: number | null; // expectedStock - litresSoldDuringDischarge = 21820
  overageOrShortage?: number | null; // stockAfterDischarge - theoreticalStock = +60
  closingMeters: DischargePumpMeter[];
  totalClosingMeters: number;
  notes?: string;
  status: 'Before Discharge' | 'Completed';
  createdAt: string;
  updatedAt: string;
}

export interface PriceChangePumpReading {
  pumpLabel: string;
  closingMeter: number;
  litresSold: number;
}

export interface PriceChangeReport {
  id: string;
  workspaceId: string;
  stationName: string;
  productCode: string;
  date: string; // e.g. '14/10/2026'
  effectiveTime: string; // e.g. '11:59PM'
  oldPrice: number; // e.g. 16.59
  newPrice: number; // e.g. 17.20
  priceDifference: number; // newPrice - oldPrice
  meterReadingsAtChange: PriceChangePumpReading[];
  totalLitresSoldAtOldPrice: number;
  physicalStockAtChange: number;
  stockGainOrLossValueGhs: number; // physicalStockAtChange * priceDifference
  status: 'Draft' | 'Sent';
  createdAt: string;
  updatedAt: string;
}

export type ReportStatus = 'Draft' | 'In Progress' | 'Ready for Review' | 'Ready to Send' | 'Sent';

export interface DailyReport {
  id: string; // unique report ID
  workspaceId: string;
  reportDate: string; // YYYY-MM-DD
  shiftType: string; // e.g. 'Evening Report' | 'Morning Report' | 'Full Day'
  stationNameSnapshot: string;
  status: ReportStatus;
  productPrices: Record<string, number>; // Current unit price per product { PMS: 16.59, AGO: 18.39 }
  pumps: ReportPumpReading[];
  stocks: ReportStockEntry[];
  expenses: ReportExpense[];
  hubtel: HubtelDetails;
  totalSalesGhs: number;
  totalExpensesGhs: number;
  cashToBankOrTill: number;
  warnings: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  sentBy?: string;
  sentVia?: 'WhatsApp' | 'SMS' | 'Telegram' | 'Clipboard' | 'WebShare' | 'Printed';
  saveStatus: 'saved' | 'saving' | 'failed';
  lastSavedAt?: string;
}

export interface ReportIndexEntry {
  id: string;
  date: string;
  status: ReportStatus;
  stationName: string;
  shiftType?: string;
  totalSalesLitres: number;
  totalSalesGhs: number;
  totalExpensesGhs: number;
  cashToBankOrTill: number;
  updatedAt: string;
  sentAt?: string;
}

// Default standard seed products with Station Manager's exact default prices
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
    unitPrice: 16.59, // User specified: UP PMS is 16.59
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
    unitPrice: 18.39, // User specified: UP AGO is 18.39
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
    isActive: false, // Made inactive by default as station uses S1-S4 and D1-D4
    unitPrice: 15.00,
  },
];

// User station pump sequence: S1-S4 (PMS) and D1-D4 (AGO)
export const DEFAULT_INITIAL_PUMPS_TEMPLATE = [
  { productCode: 'PMS', label: 'S1', displayOrder: 1 },
  { productCode: 'PMS', label: 'S2', displayOrder: 2 },
  { productCode: 'PMS', label: 'S3', displayOrder: 3 },
  { productCode: 'PMS', label: 'S4', displayOrder: 4 },
  { productCode: 'AGO', label: 'D1', displayOrder: 5 },
  { productCode: 'AGO', label: 'D2', displayOrder: 6 },
  { productCode: 'AGO', label: 'D3', displayOrder: 7 },
  { productCode: 'AGO', label: 'D4', displayOrder: 8 },
];

// Backwards-compatibility helpers for sample generation
export type ProductType = 'PMS' | 'AGO' | 'KERO' | string;
export type PumpId = string;

export const PUMP_SEQUENCE: { id: PumpId; product: ProductType; name: string; position: number }[] = [
  { id: 'S1', product: 'PMS', name: 'S1 (Super)', position: 1 },
  { id: 'S2', product: 'PMS', name: 'S2 (Super)', position: 2 },
  { id: 'S3', product: 'PMS', name: 'S3 (Super)', position: 3 },
  { id: 'S4', product: 'PMS', name: 'S4 (Super)', position: 4 },
  { id: 'D1', product: 'AGO', name: 'D1 (Diesel)', position: 5 },
  { id: 'D2', product: 'AGO', name: 'D2 (Diesel)', position: 6 },
  { id: 'D3', product: 'AGO', name: 'D3 (Diesel)', position: 7 },
  { id: 'D4', product: 'AGO', name: 'D4 (Diesel)', position: 8 },
];

/**
 * Report Format Configuration for Station Managers
 * Allows each manager to define custom structures, labels, and formatting rules
 * for Morning, Evening, Price Change, and Discharge reports.
 */
export interface ReportFormatSettings {
  // Preset identifier
  presetId: 'oborpah_default' | 'omc_standard' | 'compact' | 'detailed_audit' | 'custom';

  // Station Header & Meta
  stationHeaderCase: 'uppercase' | 'titlecase';
  dateFormat: 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'D MMM YYYY';
  includeLocation: boolean;
  includeTimestamp: boolean;
  headerCustomNote: string;
  footerCustomNote: string;
  currencySymbol: string; // e.g. '¢' | 'GH¢' | 'GHS'
  volumeUnit: string; // e.g. 'L' | 'Litres' | ''

  // Product Section Formatting
  pumpSeparator: string; // '=' | ':' | ' = ' | ' - ' | ' : '
  pumpDecimals: number; // 2 or 0
  showOpeningMetersInDaily: boolean;
  showIndividualPumpSold: boolean;
  showTotalLitresSoldLine: boolean;
  showProductSalesGhs: boolean;
  showPhysicalStock: boolean;
  showUnitPrice: boolean;
  showVariance: boolean;
  varianceLabel: string; // 'Variance' | 'Stock Variance' | 'Diff'

  // Cash Account Section
  cashAccountTitle: string; // 'CASH ACCOUNT' | 'FINANCIAL SUMMARY'
  totalSalesLabel: string; // 'TOTAL- SALES' | 'TOTAL SALES:'
  expensesStyle: 'itemized' | 'total_only' | 'hidden';
  cashToBankLabel: string; // 'CASH TO BANK(or IN TILL)' | 'CASH IN TILL'
  showHubtelSection: boolean;
  showAnalogueSection: boolean;

  // Discharge Report Formatting
  dischargeIncludeTruckDriver: boolean;
  dischargeBeforeTitle: string; // 'BEFORE DISCHARGE'
  dischargeAfterTitle: string; // 'AFTER DISCHARGE'
  dischargeOverageLabel: string; // 'OVERAGE'
  dischargeShortageLabel: string; // 'SHORTAGE'

  // Price Change Report Formatting
  priceChangeTitle: string; // 'PRICE CHANGE REPORT'
  showStockRevaluationGhs: boolean;
}

export const DEFAULT_REPORT_FORMAT_SETTINGS: ReportFormatSettings = {
  presetId: 'oborpah_default',
  stationHeaderCase: 'uppercase',
  dateFormat: 'DD/MM/YYYY',
  includeLocation: false,
  includeTimestamp: false,
  headerCustomNote: '',
  footerCustomNote: '',
  currencySymbol: '¢',
  volumeUnit: '',

  pumpSeparator: '=',
  pumpDecimals: 2,
  showOpeningMetersInDaily: false,
  showIndividualPumpSold: false,
  showTotalLitresSoldLine: true,
  showProductSalesGhs: true,
  showPhysicalStock: true,
  showUnitPrice: true,
  showVariance: true,
  varianceLabel: 'Variance',

  cashAccountTitle: 'CASH ACCOUNT',
  totalSalesLabel: 'TOTAL- SALES',
  expensesStyle: 'itemized',
  cashToBankLabel: 'CASH TO BANK(or IN TILL)',
  showHubtelSection: true,
  showAnalogueSection: true,

  dischargeIncludeTruckDriver: true,
  dischargeBeforeTitle: 'BEFORE DISCHARGE',
  dischargeAfterTitle: 'AFTER DISCHARGE',
  dischargeOverageLabel: 'OVERAGE',
  dischargeShortageLabel: 'SHORTAGE',

  priceChangeTitle: 'PRICE CHANGE REPORT',
  showStockRevaluationGhs: true,
};
