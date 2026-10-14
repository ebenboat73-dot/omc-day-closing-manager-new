/**
 * OMC Manager Day Sales & Stock Reporting App
 * Version 3.1 • Onyxma Energy
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
} from './types/report';
import {
  getActiveUser,
  getOrCreateWorkspace,
  getWorkspaceProducts,
  getWorkspacePumps,
  getReportByDate,
  saveDailyReport,
  seedDemoWorkspacesIfEmpty,
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
import { Fuel, Layers, Receipt, Sliders, Send, Camera, ShieldCheck, ChevronRight } from 'lucide-react';

export default function App() {
  // Current user & isolated workspace state
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => getActiveUser());
  const [workspace, setWorkspace] = useState<StationWorkspace>(() => getOrCreateWorkspace(getActiveUser().id));
  const [products, setProducts] = useState<ConfiguredProduct[]>([]);
  const [pumps, setPumps] = useState<ConfiguredPump[]>([]);

  // Selected date (defaults to today's date in local time YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return '2026-10-12';
  });

  const [report, setReport] = useState<DailyReport | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'meters' | 'stock' | 'expenses' | 'setup'>('meters');

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  // In-app camera state for a specific pump reading
  const [activeCameraPump, setActiveCameraPump] = useState<ReportPumpReading | null>(null);

  // Photo preview modal state
  const [previewPhoto, setPreviewPhoto] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  });

  // Initialize and load report
  const reloadWorkspaceAndData = useCallback(() => {
    seedDemoWorkspacesIfEmpty();
    const user = getActiveUser();
    setCurrentUser(user);

    const ws = getOrCreateWorkspace(user.id);
    setWorkspace(ws);

    const prods = getWorkspaceProducts(user.id);
    setProducts(prods);

    const pms = getWorkspacePumps(user.id);
    setPumps(pms);

    const loadedReport = getReportByDate(user.id, selectedDate);
    setReport(loadedReport);
  }, [selectedDate]);

  useEffect(() => {
    reloadWorkspaceAndData();
  }, [reloadWorkspaceAndData]);

  // Persist report with debounced status indication
  const persistReport = useCallback(
    (updated: DailyReport) => {
      setIsAutoSaving(true);
      const saved = saveDailyReport(currentUser.id, updated);
      setTimeout(() => {
        setIsAutoSaving(false);
      }, 400);
      return saved;
    },
    [currentUser.id]
  );

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

  // Accept photo captured via In-App Camera modal
  const handleAcceptCameraPhoto = (
    photoDataUrl: string,
    candidateReading?: number | null,
    confidence?: number
  ) => {
    if (!activeCameraPump || !report) return;

    const pumpReadingId = activeCameraPump.id;
    const partial: Partial<ReportPumpReading> = {
      photoDataUrl,
      candidateOcrReading: candidateReading ?? activeCameraPump.candidateOcrReading,
      ocrConfidence: confidence ?? activeCameraPump.ocrConfidence,
      ocrStatus: candidateReading !== null && candidateReading !== undefined ? 'candidate' : 'idle',
    };

    handleUpdatePump(pumpReadingId, partial);
    setActiveCameraPump(null);
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

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Loading station workspace...</p>
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
        isAutoSaving={isAutoSaving}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 pb-24 sm:pb-8">
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
            <span>Meters & Sales</span>
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
            <span>Stock Dipping</span>
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
            <span>Expenses</span>
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
        </div>

        {/* Tab 1: Pump Meters & In-App Camera */}
        {activeTab === 'meters' && (
          <MeterSequenceGrid
            report={report}
            products={products}
            onUpdatePump={handleUpdatePump}
            onOpenCamera={(reading) => setActiveCameraPump(reading)}
            onOpenBulkUpload={() => setIsBulkModalOpen(true)}
            onPreviewPhoto={handlePreviewPhoto}
          />
        )}

        {/* Tab 2: Tank Stock & Dipping */}
        {activeTab === 'stock' && (
          <StockReconciliationSection
            report={report}
            products={products}
            onUpdateStock={handleUpdateStock}
          />
        )}

        {/* Tab 3: Daily Expenses */}
        {activeTab === 'expenses' && (
          <ExpensesSection
            expenses={report.expenses}
            onUpdateExpenses={handleUpdateExpenses}
          />
        )}

        {/* Tab 4: Dynamic Pump & Product Setup */}
        {activeTab === 'setup' && (
          <PumpConfigManager
            userId={currentUser.id}
            workspace={workspace}
            products={products}
            pumps={pumps}
            onConfigChanged={reloadWorkspaceAndData}
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

      {/* In-App Camera Capture Modal */}
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

      {/* Account, Workspace & Supabase Connection Modal */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        workspace={workspace}
        onUserOrWorkspaceSwitched={reloadWorkspaceAndData}
      />

      {/* Bulk Upload & Photo OCR Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        report={report}
        onApplyReadings={handleApplyBulkReadings}
        onPreviewPhoto={handlePreviewPhoto}
      />

      {/* Review & Share Modal */}
      <SendReportModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        report={report}
        onUpdateStatus={handleUpdateStatus}
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
