/**
 * OMC Manager Day Sales & Stock Reporting App
 * Version 3.2 • Oborpah Asesewa Station Edition
 * Mobile-first multi-user web app • React + TypeScript • Supabase & Vercel ready
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DailyReport,
  ReportPumpReading,
  ReportStockEntry,
  ReportExpense,
  ReportStatus,
  UserProfile,
  StationWorkspace,
  ConfiguredProduct,
  ConfiguredPump,
  HubtelDetails,
  DischargeReport,
  PriceChangeReport,
  ReportFormatSettings,
  DEFAULT_REPORT_FORMAT_SETTINGS,
} from './types/report';
import {
  getCurrentSessionUser,
  getActiveUser,
  getOrCreateWorkspace,
  getWorkspaceProducts,
  getWorkspacePumps,
  getReportByDate,
  saveDailyReport,
  seedDemoWorkspacesIfEmpty,
  deletePump,
  updateProductPrice,
  getDischargeReports,
  saveDischargeReport,
  deleteDischargeReport,
  getPriceChangeReports,
  savePriceChangeReport,
  deletePriceChangeReport,
  logoutUser,
  getReportFormatSettings,
  saveReportFormatSettings,
  resetReportFormatSettings,
} from './services/dataService';
import { recalculateReport } from './utils/calculations';
import { ReportHeader } from './features/reports/ReportHeader';
import { MeterSequenceGrid } from './features/meters/MeterSequenceGrid';
import { StockReconciliationSection } from './features/stock/StockReconciliationSection';
import { ExpensesSection } from './features/expenses/ExpensesSection';
import { PumpConfigManager } from './features/setup/PumpConfigManager';
import { InAppCameraModal } from './features/camera/InAppCameraModal';
import { AccountSettingsModal } from './features/auth/AccountSettingsModal';
import { BulkUploadModal } from './features/meters/BulkUploadModal';
import { SendReportModal } from './features/sharing/SendReportModal';
import { ReportHistoryModal } from './features/reports/ReportHistoryModal';
import { PhotoPreviewModal } from './features/meters/PhotoPreviewModal';
import { LandingHomePage } from './features/auth/LandingHomePage';
import { DischargeReportSection } from './features/discharge/DischargeReportSection';
import { PriceChangeSection } from './features/pricechange/PriceChangeSection';
import { ReportFormatManager } from './features/formats/ReportFormatManager';
import {
  Fuel,
  Layers,
  Receipt,
  Sliders,
  Send,
  Truck,
  DollarSign,
  Camera,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // Current authenticated user session (null when visiting landing homepage)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentSessionUser());
  const [workspace, setWorkspace] = useState<StationWorkspace | null>(null);
  const [products, setProducts] = useState<ConfiguredProduct[]>([]);
  const [pumps, setPumps] = useState<ConfiguredPump[]>([]);

  // Selected date for daily report (defaults to 2026-10-14)
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-14');

  const [report, setReport] = useState<DailyReport | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Discharge & Price Change reports
  const [dischargeReports, setDischargeReports] = useState<DischargeReport[]>([]);
  const [priceChangeReports, setPriceChangeReports] = useState<PriceChangeReport[]>([]);

  // Customizable report format settings per manager
  const [formatSettings, setFormatSettings] = useState<ReportFormatSettings>(() =>
    currentUser ? getReportFormatSettings(currentUser.id) : DEFAULT_REPORT_FORMAT_SETTINGS
  );

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    'meters' | 'stock' | 'discharge' | 'pricechange' | 'expenses' | 'setup' | 'formats'
  >('meters');

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  // In-app camera state for pump meter
  const [activeCameraPump, setActiveCameraPump] = useState<ReportPumpReading | null>(null);

  // In-app camera state for dipstick / tank dipping
  const [activeCameraDippingStock, setActiveCameraDippingStock] = useState<ReportStockEntry | null>(null);

  // Photo preview modal state
  const [previewPhoto, setPreviewPhoto] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  });

  // Reload current workspace and data
  const reloadWorkspaceAndData = useCallback((userParam?: UserProfile | null) => {
    seedDemoWorkspacesIfEmpty();
    const user = userParam || currentUser || getCurrentSessionUser();
    if (!user) {
      setCurrentUser(null);
      return;
    }

    setCurrentUser(user);

    const ws = getOrCreateWorkspace(user.id);
    setWorkspace(ws);

    const prods = getWorkspaceProducts(user.id);
    setProducts(prods);

    const pms = getWorkspacePumps(user.id);
    setPumps(pms);

    const loadedReport = getReportByDate(user.id, selectedDate);
    setReport(loadedReport);

    const dReports = getDischargeReports(user.id);
    setDischargeReports(dReports);

    const pcReports = getPriceChangeReports(user.id);
    setPriceChangeReports(pcReports);

    const fSettings = getReportFormatSettings(user.id);
    setFormatSettings(fSettings);
  }, [currentUser, selectedDate]);

  useEffect(() => {
    if (currentUser) {
      reloadWorkspaceAndData(currentUser);
    }
  }, [currentUser, reloadWorkspaceAndData]);

  // Persist report with debounced status indication
  const persistReport = useCallback(
    (updated: DailyReport) => {
      if (!currentUser) return updated;
      setIsAutoSaving(true);
      const saved = saveDailyReport(currentUser.id, updated);
      setTimeout(() => {
        setIsAutoSaving(false);
      }, 400);
      return saved;
    },
    [currentUser]
  );

  // Auth handler: Successful Login from Landing Page
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    reloadWorkspaceAndData(user);
  };

  // Auth handler: Sign out
  const handleSignOut = () => {
    logoutUser();
    setCurrentUser(null);
    setReport(null);
  };

  // Update a single pump reading
  const handleUpdatePump = (readingId: string, updated: Partial<ReportPumpReading>) => {
    if (!report) return;

    setReport((prev) => {
      if (!prev) return null;
      const updatedPumps = prev.pumps.map((p) => (p.id === readingId ? { ...p, ...updated } : p));
      const nextReport: DailyReport = {
        ...prev,
        pumps: updatedPumps,
      };
      const recalculated = recalculateReport(nextReport, products);
      persistReport(recalculated);
      return recalculated;
    });
  };

  // Remove / Delete a pump (User requirement: "available default pumps, some should be removable")
  const handleRemovePump = (readingId: string) => {
    if (!report || !currentUser) return;
    const target = report.pumps.find((p) => p.id === readingId);
    if (!target) return;

    if (window.confirm(`Are you sure you want to remove pump "${target.pumpLabelSnapshot}" from this report?`)) {
      setReport((prev) => {
        if (!prev) return null;
        const filteredPumps = prev.pumps.filter((p) => p.id !== readingId);
        const nextReport: DailyReport = {
          ...prev,
          pumps: filteredPumps,
        };
        const recalculated = recalculateReport(nextReport, products);
        persistReport(recalculated);
        return recalculated;
      });

      // Also remove from workspace configuration so it doesn't reappear
      if (target.pumpId) {
        deletePump(currentUser.id, target.pumpId);
        setPumps(getWorkspacePumps(currentUser.id));
      }
    }
  };

  // Update product unit price
  const handleUpdateUnitPrice = (productCode: string, newPrice: number) => {
    if (!report || !currentUser) return;

    updateProductPrice(currentUser.id, productCode, newPrice);
    setProducts(getWorkspaceProducts(currentUser.id));

    setReport((prev) => {
      if (!prev) return null;
      const newPrices = {
        ...(prev.productPrices || {}),
        [productCode]: newPrice,
      };
      const nextReport: DailyReport = {
        ...prev,
        productPrices: newPrices,
      };
      const recalculated = recalculateReport(nextReport, products);
      persistReport(recalculated);
      return recalculated;
    });
  };

  // Update shift type
  const handleUpdateShiftType = (shiftType: string) => {
    if (!report) return;
    setReport((prev) => {
      if (!prev) return null;
      const nextReport: DailyReport = {
        ...prev,
        shiftType,
      };
      persistReport(nextReport);
      return nextReport;
    });
  };

  // Update a stock entry
  const handleUpdateStock = (stockId: string, updated: Partial<ReportStockEntry>) => {
    if (!report) return;

    setReport((prev) => {
      if (!prev) return null;
      const updatedStocks = prev.stocks.map((s) => (s.id === stockId ? { ...s, ...updated } : s));
      const nextReport: DailyReport = {
        ...prev,
        stocks: updatedStocks,
      };
      const recalculated = recalculateReport(nextReport, products);
      persistReport(recalculated);
      return recalculated;
    });
  };

  // Update Hubtel details
  const handleUpdateHubtel = (updated: Partial<HubtelDetails>) => {
    if (!report) return;

    setReport((prev) => {
      if (!prev) return null;
      const nextHubtel = {
        ...(prev.hubtel || { hubtelAccount: '', dashboardAmount: null, bankingWithHubtel: null }),
        ...updated,
      };
      const nextReport: DailyReport = {
        ...prev,
        hubtel: nextHubtel,
      };
      persistReport(nextReport);
      return nextReport;
    });
  };

  // Update expenses
  const handleUpdateExpenses = (expenses: ReportExpense[]) => {
    if (!report) return;

    setReport((prev) => {
      if (!prev) return null;
      const nextReport: DailyReport = {
        ...prev,
        expenses,
      };
      const recalculated = recalculateReport(nextReport, products);
      persistReport(recalculated);
      return recalculated;
    });
  };

  // Apply batch readings from Bulk Upload modal
  const handleApplyBulkReadings = (readings: Record<string, Partial<ReportPumpReading>>) => {
    if (!report) return;

    setReport((prev) => {
      if (!prev) return null;
      const updatedPumps = prev.pumps.map((p) => {
        if (readings[p.id]) {
          return { ...p, ...readings[p.id] };
        }
        return p;
      });
      const nextReport: DailyReport = {
        ...prev,
        pumps: updatedPumps,
        status: 'Ready for Review',
      };
      const recalculated = recalculateReport(nextReport, products);
      persistReport(recalculated);
      return recalculated;
    });
  };

  // Accept photo captured via In-App Camera modal for pump meter
  const handleAcceptCameraPhoto = (
    photoDataUrl: string,
    candidateReading?: number | null,
    confidence?: number,
    metadata?: any
  ) => {
    if (!activeCameraPump || !report) return;

    const pumpReadingId = activeCameraPump.id;
    const partial: Partial<ReportPumpReading> = {
      photoDataUrl,
      candidateOcrReading: candidateReading ?? activeCameraPump.candidateOcrReading,
      ocrConfidence: confidence ?? activeCameraPump.ocrConfidence,
      ocrStatus: candidateReading !== null && candidateReading !== undefined ? 'candidate' : 'idle',
      aiVisionReading: candidateReading ?? activeCameraPump.aiVisionReading,
      aiVisionConfidence: confidence ?? activeCameraPump.aiVisionConfidence,
      aiVisionClear: metadata?.isClear ?? (candidateReading !== null && candidateReading !== undefined),
      aiVisionMeterType: metadata?.meterType,
      aiVisionRawDigits: metadata?.rawDigitsDetected,
      aiVisionUnclearReason: metadata?.unclearReason,
    };

    handleUpdatePump(pumpReadingId, partial);
    setActiveCameraPump(null);
  };

  // Accept photo captured via Dipping Camera modal
  const handleAcceptDippingPhoto = (
    photoDataUrl: string,
    candidateReading?: number | null
  ) => {
    if (!activeCameraDippingStock || !report) return;

    const stockId = activeCameraDippingStock.id;
    const partial: Partial<ReportStockEntry> = {
      photoDataUrl,
    };

    if (candidateReading !== null && candidateReading !== undefined && candidateReading > 0) {
      partial.physicalClosingStock = candidateReading;
    }

    handleUpdateStock(stockId, partial);
    setActiveCameraDippingStock(null);
  };

  // Update report status (e.g. sent via WhatsApp)
  const handleUpdateStatus = (status: ReportStatus, sentVia?: any) => {
    if (!report) return;
    setReport((prev) => {
      if (!prev) return null;
      const updated: DailyReport = {
        ...prev,
        status,
        sentVia: sentVia || prev.sentVia,
        sentAt: status === 'Sent' ? new Date().toISOString() : prev.sentAt,
      };
      persistReport(updated);
      return updated;
    });
  };

  // Open photo in full preview
  const handlePreviewPhoto = (url: string, title: string) => {
    setPreviewPhoto({
      isOpen: true,
      url,
      title,
    });
  };

  // Discharge reports handlers
  const handleSaveDischarge = (dReport: DischargeReport) => {
    if (!currentUser) return;
    saveDischargeReport(currentUser.id, dReport);
    setDischargeReports(getDischargeReports(currentUser.id));
  };

  const handleDeleteDischarge = (reportId: string) => {
    if (!currentUser) return;
    deleteDischargeReport(currentUser.id, reportId);
    setDischargeReports(getDischargeReports(currentUser.id));
  };

  // Price change reports handlers
  const handleSavePriceChange = (pcReport: PriceChangeReport) => {
    if (!currentUser) return;
    savePriceChangeReport(currentUser.id, pcReport);
    setPriceChangeReports(getPriceChangeReports(currentUser.id));
  };

  const handleDeletePriceChange = (reportId: string) => {
    if (!currentUser) return;
    deletePriceChangeReport(currentUser.id, reportId);
    setPriceChangeReports(getPriceChangeReports(currentUser.id));
  };

  // Format settings handlers
  const handleSaveFormatSettings = (updated: ReportFormatSettings) => {
    if (!currentUser) return;
    saveReportFormatSettings(currentUser.id, updated);
    setFormatSettings(updated);
  };

  const handleResetFormatSettings = () => {
    if (!currentUser) return;
    const reset = resetReportFormatSettings(currentUser.id);
    setFormatSettings(reset);
  };

  // If user is not authenticated, render the high-impact OMC Homepage & Auth Form
  if (!currentUser) {
    return <LandingHomePage onLoginSuccess={handleLoginSuccess} />;
  }

  // If loading report or workspace
  if (!report || !workspace) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Opening station workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation & Live Header */}
      <ReportHeader
        report={report}
        currentUser={currentUser}
        workspace={workspace}
        onDateChange={(newDate) => setSelectedDate(newDate)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenPumpSetup={() => setActiveTab('setup')}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onOpenReview={() => setIsSendModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenFormatSettings={() => setActiveTab('formats')}
        isAutoSaving={isAutoSaving}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 pb-24 sm:pb-8">
        {/* Report Type & Live Price Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-2xl border border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <span>Report Type:</span>
            </span>
            <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
              {[
                { id: 'Morning Report', label: 'Morning' },
                { id: 'Evening Report', label: 'Evening' },
                { id: 'Price Change Report', label: 'Price Change' },
                { id: 'Discharge Report', label: 'Discharge' },
              ].map(({ id, label }) => {
                const isSelected =
                  report.shiftType === id ||
                  (id === 'Discharge Report' && activeTab === 'discharge') ||
                  (id === 'Price Change Report' && (report.shiftType === 'Price Change Report' || activeTab === 'pricechange'));
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      handleUpdateShiftType(id);
                      if (id === 'Discharge Report') {
                        setActiveTab('discharge');
                      } else if (id === 'Price Change Report') {
                        // User can prepare the price change daily report or view revaluation
                        if (activeTab === 'discharge') {
                          setActiveTab('meters');
                        }
                      } else {
                        if (activeTab === 'discharge' || activeTab === 'pricechange') {
                          setActiveTab('meters');
                        }
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? id === 'Discharge Report'
                          ? 'bg-purple-500 text-white shadow-sm'
                          : id === 'Price Change Report'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-400">
              PMS UP: <strong className="text-amber-400">¢{report.productPrices?.PMS?.toFixed(2) || '16.59'}</strong>
            </span>
            <span className="text-slate-400">
              AGO UP: <strong className="text-amber-400">¢{report.productPrices?.AGO?.toFixed(2) || '18.39'}</strong>
            </span>
            <span className="text-slate-400">
              Cash in Till: <strong className="text-emerald-400">¢{Math.round(report.cashToBankOrTill || 0).toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Mobile-first stacked & pill style) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
          <button
            type="button"
            id="tab-meters"
            onClick={() => setActiveTab('meters')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'meters'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Fuel className="w-4 h-4" />
            <span>Pumps & Meter Readings</span>
          </button>

          <button
            type="button"
            id="tab-stock"
            onClick={() => setActiveTab('stock')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Stock Dipping & Cash Account</span>
          </button>

          <button
            type="button"
            id="tab-discharge"
            onClick={() => setActiveTab('discharge')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'discharge'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Discharge Reports</span>
          </button>

          <button
            type="button"
            id="tab-pricechange"
            onClick={() => setActiveTab('pricechange')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'pricechange'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Price Change</span>
          </button>

          <button
            type="button"
            id="tab-expenses"
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Station Expenses</span>
          </button>

          <button
            type="button"
            id="tab-setup"
            onClick={() => setActiveTab('setup')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'setup'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Pump Setup</span>
          </button>

          <button
            type="button"
            id="tab-formats"
            onClick={() => setActiveTab('formats')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'formats'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Report Formats</span>
          </button>
        </div>

        {/* Tab 1: Pump Meters & In-App Camera */}
        {activeTab === 'meters' && (
          <MeterSequenceGrid
            report={report}
            products={products}
            onUpdatePump={handleUpdatePump}
            onRemovePump={handleRemovePump}
            onUpdateUnitPrice={handleUpdateUnitPrice}
            onOpenCamera={(reading) => setActiveCameraPump(reading)}
            onOpenPumpSetup={() => setActiveTab('setup')}
            onOpenBulkUpload={() => setIsBulkModalOpen(true)}
            onPreviewPhoto={handlePreviewPhoto}
          />
        )}

        {/* Tab 2: Tank Stock Dipping, Dipping Camera & Cash Account */}
        {activeTab === 'stock' && (
          <StockReconciliationSection
            report={report}
            products={products}
            onUpdateStock={handleUpdateStock}
            onUpdateUnitPrice={handleUpdateUnitPrice}
            onUpdateHubtel={handleUpdateHubtel}
            onOpenCameraForDipping={(stock) => setActiveCameraDippingStock(stock)}
            onPreviewPhoto={handlePreviewPhoto}
          />
        )}

        {/* Tab 3: Dedicated Fuel Discharge Reports */}
        {activeTab === 'discharge' && (
          <DischargeReportSection
            userId={currentUser.id}
            workspace={workspace}
            products={products}
            pumps={pumps}
            dischargeReports={dischargeReports}
            onSaveReport={handleSaveDischarge}
            onDeleteReport={handleDeleteDischarge}
            formatSettings={formatSettings}
          />
        )}

        {/* Tab 4: Price Change Reports & Stock Revaluation */}
        {activeTab === 'pricechange' && (
          <PriceChangeSection
            userId={currentUser.id}
            workspace={workspace}
            products={products}
            pumps={pumps}
            priceChangeReports={priceChangeReports}
            onSaveReport={handleSavePriceChange}
            onDeleteReport={handleDeletePriceChange}
            formatSettings={formatSettings}
          />
        )}

        {/* Tab 5: Daily Expenses */}
        {activeTab === 'expenses' && (
          <ExpensesSection
            expenses={report.expenses}
            onUpdateExpenses={handleUpdateExpenses}
          />
        )}

        {/* Tab 6: Dynamic Pump & Product Setup */}
        {activeTab === 'setup' && (
          <PumpConfigManager
            userId={currentUser.id}
            workspace={workspace}
            products={products}
            pumps={pumps}
            onConfigChanged={() => reloadWorkspaceAndData()}
          />
        )}

        {/* Tab 7: Customizable Station Report Formats Studio */}
        {activeTab === 'formats' && (
          <ReportFormatManager
            currentSettings={formatSettings}
            onSaveSettings={handleSaveFormatSettings}
            onResetSettings={handleResetFormatSettings}
            sampleReport={report}
            sampleDischargeReport={dischargeReports[0]}
            samplePriceChangeReport={priceChangeReports[0]}
          />
        )}
      </main>

      {/* Floating Bottom Action Bar for Mobile Phones */}
      <aside aria-label="Mobile actions" className="sm:hidden fixed bottom-0 inset-x-0 bg-slate-900/95 border-t border-slate-800 p-3 z-20 backdrop-blur-md flex items-center justify-between gap-3 shadow-2xl">
        <button
          type="button"
          onClick={() => setIsHistoryModalOpen(true)}
          className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
        >
          <span>History</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSendModalOpen(true)}
          className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98]"
        >
          <Send className="w-4 h-4" />
          <span>Review & Send Report</span>
        </button>
      </aside>

      {/* In-App Camera Modal for Pump Meters */}
      {activeCameraPump && (
        <InAppCameraModal
          isOpen={Boolean(activeCameraPump)}
          onClose={() => setActiveCameraPump(null)}
          pumpLabel={activeCameraPump.pumpLabelSnapshot}
          productCode={activeCameraPump.productCodeSnapshot}
          expectedOpeningValue={activeCameraPump.openingMeter}
          onAcceptPhoto={handleAcceptCameraPhoto}
        />
      )}

      {/* In-App Camera Modal for Tank Dipping */}
      {activeCameraDippingStock && (
        <InAppCameraModal
          isOpen={Boolean(activeCameraDippingStock)}
          onClose={() => setActiveCameraDippingStock(null)}
          pumpLabel={`${activeCameraDippingStock.productCodeSnapshot} Tank Dipstick`}
          productCode={activeCameraDippingStock.productCodeSnapshot}
          expectedOpeningValue={activeCameraDippingStock.openingStock}
          onAcceptPhoto={(photoUrl, candidateReading) =>
            handleAcceptDippingPhoto(photoUrl, candidateReading)
          }
        />
      )}

      {/* Account, Workspace & Supabase Connection Modal */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        workspace={workspace}
        onUserOrWorkspaceSwitched={() => reloadWorkspaceAndData()}
      />

      {/* Bulk Upload & Photo OCR Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        report={report}
        onApplyReadings={handleApplyBulkReadings}
        onPreviewPhoto={handlePreviewPhoto}
      />

      {/* Review & Share Modal with Customizable Station Format */}
      <SendReportModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        report={report}
        onUpdateStatus={handleUpdateStatus}
        formatSettings={formatSettings}
        onOpenFormatSettings={() => setActiveTab('formats')}
      />

      {/* History Modal */}
      <ReportHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        userId={currentUser.id}
        currentDate={selectedDate}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        onNewReport={(newDate) => setSelectedDate(newDate)}
      />

      {/* Full Photo Preview Modal */}
      <PhotoPreviewModal
        isOpen={previewPhoto.isOpen}
        onClose={() => setPreviewPhoto((p) => ({ ...p, isOpen: false }))}
        imageUrl={previewPhoto.url}
        title={previewPhoto.title}
      />
    </div>
  );
}
