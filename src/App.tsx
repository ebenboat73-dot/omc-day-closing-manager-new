/**
 * OMC Manager Day Sales & Stock Reporting App
 * Version 3.2 • Oborpah Asesewa Station Edition
 * Mobile-first multi-user web app • React + TypeScript • Supabase & Vercel ready
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  getOrCreateWorkspace,
  getWorkspaceProducts,
  getWorkspacePumps,
  getReportByDate,
  saveDailyReport,
  deletePump,
  updateProductPrice,
  getDischargeReports,
  saveDischargeReport,
  deleteDischargeReport,
  getPriceChangeReports,
  savePriceChangeReport,
  deletePriceChangeReport,
  getReportFormatSettings,
  saveReportFormatSettings,
  resetReportFormatSettings,
  syncPendingReports,
} from './services/repository';
import { recalculateReport } from './utils/calculations';
import { ReportHeader } from './features/reports/ReportHeader';
import { useAuth } from './features/auth/AuthContext';
import { signOut } from './services/authService';
import type { AiVisionResult } from './services/aiVisionService';
import { OnboardingModal } from './features/auth/OnboardingModal';
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
  const { user: authenticatedUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authenticatedUser);
  const [workspace, setWorkspace] = useState<StationWorkspace | null>(null);
  const [products, setProducts] = useState<ConfiguredProduct[]>([]);
  const [pumps, setPumps] = useState<ConfiguredPump[]>([]);

  // Selected date for daily report (defaults to 2026-10-14)
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-14');

  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataErrorKind, setDataErrorKind] = useState<'load' | 'save' | 'configuration' | 'sync' | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline' | 'error'>('saved');
  const [pendingReportCount, setPendingReportCount] = useState(0);
  const skipNextReportSave = useRef(false);
  const reportSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const reportSaveRevision = useRef(0);
  const reportSaveTimer = useRef<number | null>(null);
  const dataLoadRevision = useRef(0);
  const dataOwnerUserId = useRef<string | null>(authenticatedUser?.id ?? null);

  // Discharge & Price Change reports
  const [dischargeReports, setDischargeReports] = useState<DischargeReport[]>([]);
  const [priceChangeReports, setPriceChangeReports] = useState<PriceChangeReport[]>([]);

  // Customizable report format settings per manager
  const [formatSettings, setFormatSettings] = useState<ReportFormatSettings>(DEFAULT_REPORT_FORMAT_SETTINGS);

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

  // Load the account workspace and active report from Supabase.
  const reloadWorkspaceAndData = useCallback(async () => {
    if (!authenticatedUser) {
      if (dataOwnerUserId.current !== null) {
        dataOwnerUserId.current = null;
        setCurrentUser(null);
        setWorkspace(null);
        setProducts([]);
        setPumps([]);
        setReport(null);
        setDischargeReports([]);
        setPriceChangeReports([]);
      }
      setIsLoadingData(false);
      return;
    }
    if (dataOwnerUserId.current !== authenticatedUser.id) {
      dataOwnerUserId.current = authenticatedUser.id;
      setCurrentUser(authenticatedUser);
      setWorkspace(null);
      setProducts([]);
      setPumps([]);
      setReport(null);
      setDischargeReports([]);
      setPriceChangeReports([]);
      setFormatSettings(DEFAULT_REPORT_FORMAT_SETTINGS);
      setPendingReportCount(0);
    }
    const revision = ++dataLoadRevision.current;
    setIsLoadingData(true);
    setDataError(null);
    setDataErrorKind(null);
    try {
      const ws = await getOrCreateWorkspace(authenticatedUser.id);
      const [prods, configuredPumps, loadedReport, dReports, pcReports, settings] = await Promise.all([
        getWorkspaceProducts(authenticatedUser.id),
        getWorkspacePumps(authenticatedUser.id),
        getReportByDate(authenticatedUser.id, selectedDate),
        getDischargeReports(authenticatedUser.id),
        getPriceChangeReports(authenticatedUser.id),
        getReportFormatSettings(authenticatedUser.id),
      ]);
      if (revision !== dataLoadRevision.current) return;
      setCurrentUser(authenticatedUser);
      setWorkspace(ws);
      setProducts(prods);
      setPumps(configuredPumps);
      skipNextReportSave.current = true;
      setReport(loadedReport);
      setDischargeReports(dReports);
      setPriceChangeReports(pcReports);
      setFormatSettings(settings);
      setSaveState(loadedReport.saveStatus === 'failed' ? 'offline' : 'saved');
    } catch (error) {
      if (revision === dataLoadRevision.current) {
        setDataError(error instanceof Error ? error.message : 'Could not load station data.');
        setDataErrorKind('load');
      }
    } finally {
      if (revision === dataLoadRevision.current) setIsLoadingData(false);
    }
  }, [selectedDate, authenticatedUser]);

  const reloadConfiguration = useCallback(async () => {
    if (!authenticatedUser) return;
    setDataError(null);
    setDataErrorKind(null);
    try {
      const ws = await getOrCreateWorkspace(authenticatedUser.id);
      const [prods, configuredPumps] = await Promise.all([
        getWorkspaceProducts(authenticatedUser.id),
        getWorkspacePumps(authenticatedUser.id),
      ]);
      setWorkspace(ws);
      setProducts(prods);
      setPumps(configuredPumps);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not load station settings.');
      setDataErrorKind('configuration');
    }
  }, [authenticatedUser]);

  useEffect(() => {
    void reloadWorkspaceAndData();
  }, [reloadWorkspaceAndData]);

  const saveReportSnapshot = useCallback((snapshot: DailyReport, revision: number) => {
    if (!authenticatedUser) return Promise.resolve();
    const operation = reportSaveQueue.current.then(async () => {
      try {
        const savedReport = await saveDailyReport(authenticatedUser.id, snapshot);
        if (revision === reportSaveRevision.current) {
          setSaveState(savedReport.saveStatus === 'failed' ? 'offline' : 'saved');
          if (dataErrorKind === 'save') {
            setDataError(null);
            setDataErrorKind(null);
          }
        }
      } catch (error) {
        if (revision === reportSaveRevision.current) {
          setSaveState('error');
          setDataError(error instanceof Error ? error.message : 'Could not save this report.');
          setDataErrorKind('save');
        }
        throw error;
      }
    });
    reportSaveQueue.current = operation.catch(() => undefined);
    return operation;
  }, [authenticatedUser, dataErrorKind]);

  useEffect(() => {
    if (!report || !authenticatedUser || report.reportDate !== selectedDate) return;
    if (skipNextReportSave.current) {
      skipNextReportSave.current = false;
      return;
    }
    const revision = ++reportSaveRevision.current;
    setSaveState('saving');
    reportSaveTimer.current = window.setTimeout(() => {
      void saveReportSnapshot(report, revision).catch(() => undefined);
    }, 650);
    return () => {
      if (reportSaveTimer.current !== null) window.clearTimeout(reportSaveTimer.current);
    };
  }, [report, selectedDate, authenticatedUser, saveReportSnapshot]);

  const retryReportSave = useCallback(async () => {
    if (!report || !authenticatedUser) return;
    if (reportSaveTimer.current !== null) window.clearTimeout(reportSaveTimer.current);
    const revision = ++reportSaveRevision.current;
    setSaveState('saving');
    setDataError(null);
    setDataErrorKind(null);
    try {
      await saveReportSnapshot(report, revision);
    } catch {
      return;
    }
  }, [report, authenticatedUser, saveReportSnapshot]);

  const handleDateChange = useCallback(async (newDate: string) => {
    if (report && authenticatedUser && report.reportDate === selectedDate) {
      if (reportSaveTimer.current !== null) window.clearTimeout(reportSaveTimer.current);
      const revision = ++reportSaveRevision.current;
      setSaveState('saving');
      try {
        await saveReportSnapshot(report, revision);
      } catch {
        return;
      }
    }
    setSelectedDate(newDate);
  }, [report, authenticatedUser, selectedDate, saveReportSnapshot]);

  useEffect(() => {
    if (!authenticatedUser) return;
    const updatePendingCount = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; pending: number }>).detail;
      if (detail?.userId === authenticatedUser.id) {
        setPendingReportCount(detail.pending);
        if (detail.pending > 0) setSaveState('offline');
      }
    };
    const retryPending = async () => {
      try {
        const result = await syncPendingReports(authenticatedUser.id);
        setPendingReportCount(result.pending);
        if (result.pending === 0) setSaveState('saved');
        else setSaveState('offline');
      } catch (error) {
        setDataError(error instanceof Error ? error.message : 'Could not sync pending reports.');
        setDataErrorKind('sync');
      }
    };
    window.addEventListener('online', retryPending);
    window.addEventListener('omc:pending-sync', updatePendingCount);
    void retryPending();
    return () => {
      window.removeEventListener('online', retryPending);
      window.removeEventListener('omc:pending-sync', updatePendingCount);
    };
  }, [authenticatedUser]);

  const retryDataError = useCallback(() => {
    if (dataErrorKind === 'load' || (report && report.reportDate !== selectedDate)) {
      void reloadWorkspaceAndData();
    } else if (dataErrorKind === 'configuration') {
      void reloadConfiguration();
    } else if (dataErrorKind === 'sync' && authenticatedUser) {
      void syncPendingReports(authenticatedUser.id).then((result) => {
        setPendingReportCount(result.pending);
        setSaveState(result.pending ? 'offline' : 'saved');
        setDataError(null);
        setDataErrorKind(null);
      }).catch((error: unknown) => {
        setDataError(error instanceof Error ? error.message : 'Could not sync pending reports.');
      });
    } else {
      void retryReportSave();
    }
  }, [dataErrorKind, report, selectedDate, reloadWorkspaceAndData, reloadConfiguration, authenticatedUser, retryReportSave]);

  const reloadWorkspaceDataSafely = useCallback(async () => {
    if (report && authenticatedUser && report.reportDate === selectedDate) {
      if (reportSaveTimer.current !== null) window.clearTimeout(reportSaveTimer.current);
      const revision = ++reportSaveRevision.current;
      setSaveState('saving');
      try {
        await saveReportSnapshot(report, revision);
      } catch {
        return;
      }
    }
    await reloadWorkspaceAndData();
  }, [report, authenticatedUser, selectedDate, saveReportSnapshot, reloadWorkspaceAndData]);

  // Show onboarding for first-time users (stored per browser)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      return localStorage.getItem('omc_seen_onboarding') !== '1';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    if (showOnboarding) {
      // mark seen after short delay to allow modal rendering decisions elsewhere
      try { localStorage.setItem('omc_seen_onboarding', '1'); } catch (e) {}
    }
  }, [showOnboarding]);
  // Auth handler: Sign out
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not sign out.');
      setDataErrorKind('configuration');
    }
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
      return recalculateReport(nextReport, products);
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
        return recalculateReport(nextReport, products);
      });

      // Also remove from workspace configuration so it doesn't reappear
      if (target.pumpId) {
        deletePump(currentUser.id, target.pumpId)
          .then(setPumps)
          .catch((error: unknown) => {
            setDataError(error instanceof Error ? error.message : 'Could not remove the pump.');
            setDataErrorKind('configuration');
          });
      }
    }
  };

  // Update product unit price
  const handleUpdateUnitPrice = (productCode: string, newPrice: number) => {
    if (!report || !currentUser) return;

    updateProductPrice(currentUser.id, productCode, newPrice)
      .then(setProducts)
      .catch((error: unknown) => {
        setDataError(error instanceof Error ? error.message : 'Could not save the product price.');
        setDataErrorKind('configuration');
      });

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
      return recalculateReport(nextReport, products);
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
      return recalculateReport(nextReport, products);
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
      return recalculateReport(nextReport, products);
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
      return recalculateReport(nextReport, products);
    });
  };

  // Accept photo captured via In-App Camera modal for pump meter
  const handleAcceptCameraPhoto = (
    photoDataUrl: string,
    candidateReading?: number | null,
    confidence?: number,
    metadata?: Partial<AiVisionResult>
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
  const handleUpdateStatus = (status: ReportStatus, sentVia?: DailyReport['sentVia']) => {
    if (!report) return;
    setReport((prev) => {
      if (!prev) return null;
      const updated: DailyReport = {
        ...prev,
        status,
        sentVia: sentVia || prev.sentVia,
        sentAt: status === 'Sent' ? new Date().toISOString() : prev.sentAt,
      };
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
  const handleSaveDischarge = async (dReport: DischargeReport) => {
    if (!currentUser) return;
    try {
      const saved = await saveDischargeReport(currentUser.id, dReport);
      setDischargeReports((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
      setDataError(null);
      setDataErrorKind(null);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not save the discharge report.');
      setDataErrorKind('configuration');
    }
  };

  const handleDeleteDischarge = async (reportId: string) => {
    if (!currentUser) return;
    try {
      await deleteDischargeReport(currentUser.id, reportId);
      setDischargeReports((previous) => previous.filter((item) => item.id !== reportId));
      setDataError(null);
      setDataErrorKind(null);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not delete the discharge report.');
      setDataErrorKind('configuration');
    }
  };

  // Price change reports handlers
  const handleSavePriceChange = async (pcReport: PriceChangeReport) => {
    if (!currentUser) return;
    try {
      const saved = await savePriceChangeReport(currentUser.id, pcReport);
      setPriceChangeReports((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
      setDataError(null);
      setDataErrorKind(null);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not save the price change report.');
      setDataErrorKind('configuration');
    }
  };

  const handleDeletePriceChange = async (reportId: string) => {
    if (!currentUser) return;
    try {
      await deletePriceChangeReport(currentUser.id, reportId);
      setPriceChangeReports((previous) => previous.filter((item) => item.id !== reportId));
      setDataError(null);
      setDataErrorKind(null);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not delete the price change report.');
      setDataErrorKind('configuration');
    }
  };

  // Format settings handlers
  const handleSaveFormatSettings = async (updated: ReportFormatSettings) => {
    if (!currentUser) throw new Error('Sign in before saving report format settings.');
    try {
      setFormatSettings(await saveReportFormatSettings(currentUser.id, updated));
      setDataError(null);
      setDataErrorKind(null);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not save report format settings.');
      setDataErrorKind('configuration');
      throw error;
    }
  };

  const handleResetFormatSettings = async () => {
    if (!currentUser) throw new Error('Sign in before resetting report format settings.');
    try {
      setFormatSettings(await resetReportFormatSettings(currentUser.id));
      setDataError(null);
      setDataErrorKind(null);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not reset report format settings.');
      setDataErrorKind('configuration');
      throw error;
    }
  };

  if (!currentUser || isLoadingData || ((!report || !workspace) && !dataError)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Opening station workspace...</p>
        </div>
      </div>
    );
  }

  if (!report || !workspace || report.reportDate !== selectedDate) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md space-y-4 text-center">
          <p role="alert" className="text-sm text-rose-300">{dataError || 'Could not load station data.'}</p>
          <button type="button" onClick={reloadWorkspaceAndData} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950">
            Retry
          </button>
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
        onDateChange={(newDate) => { void handleDateChange(newDate); }}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenPumpSetup={() => setActiveTab('setup')}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onOpenReview={() => setIsSendModalOpen(true)}
        saveState={saveState}
        pendingReportCount={pendingReportCount}
        onSignOut={handleSignOut}
        onOpenFormatSettings={() => setActiveTab('formats')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 pb-24 sm:pb-8">
        {dataError && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between">
            <span>{dataError}</span>
            <button type="button" onClick={retryDataError} className="shrink-0 rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs font-semibold hover:bg-rose-500/10">
              Retry {dataErrorKind || (report.reportDate !== selectedDate ? 'load' : 'save')}
            </button>
          </div>
        )}
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
            onConfigChanged={reloadWorkspaceDataSafely}
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
        onUserOrWorkspaceSwitched={reloadWorkspaceDataSafely}
      />

      {/* Onboarding modal shown to new users */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

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
        onSelectDate={(newDate) => { void handleDateChange(newDate); }}
        onNewReport={(newDate) => { void handleDateChange(newDate); }}
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
