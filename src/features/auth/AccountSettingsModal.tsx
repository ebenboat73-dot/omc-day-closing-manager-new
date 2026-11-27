import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, StationWorkspace } from '../../types/report';
import { updateWorkspace, getLegacyDataSources, importExistingLocalData } from '../../services/repository';
import type { ImportSummary, LegacyDataSource } from '../../services/repository';
import { getFriendlyAuthError, signOut, updatePassword } from '../../services/authService';
import { Building, Check, Copy, Cpu, Database, KeyRound, LogOut, RefreshCw, X } from 'lucide-react';
import { AuthMessage } from './AuthPageLayout';
import { PasswordField } from './PasswordField';
import schemaSql from '../../services/supabaseSchema.sql?raw';
import authSetupSql from '../../../supabase/auth_setup.sql?raw';
import dataSetupSql from '../../../supabase/data_setup.sql?raw';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  workspace: StationWorkspace;
  onUserOrWorkspaceSwitched: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  workspace,
  onUserOrWorkspaceSwitched,
}) => {
  const [activeTab, setActiveTab] = useState<'station' | 'security' | 'ai' | 'sql'>('station');
  const [stationName, setStationName] = useState(workspace.stationName);
  const [stationLocation, setStationLocation] = useState(workspace.stationLocation);
  const [omcBrand, setOmcBrand] = useState(workspace.omcBrand);
  const [stationSaveNotice, setStationSaveNotice] = useState(false);
  const [stationError, setStationError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [aiEndpoint, setAiEndpoint] = useState(() => {
    try {
      return localStorage.getItem('omc_ai_inference_url') || '';
    } catch {
      return '';
    }
  });
  const [aiTestStatus, setAiTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [legacySources, setLegacySources] = useState<LegacyDataSource[]>([]);
  const [selectedLegacyUserId, setSelectedLegacyUserId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const sources = getLegacyDataSources();
    setLegacySources(sources);
    setSelectedLegacyUserId((current) => current && sources.some((source) => source.userId === current)
      ? current
      : sources[0]?.userId || '');
    setImportSummary(null);
    setImportError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveStation = async (event: React.FormEvent) => {
    event.preventDefault();
    setStationError('');
    try {
      await updateWorkspace(currentUser.id, {
        stationName: stationName.trim(),
        stationLocation: stationLocation.trim(),
        omcBrand: omcBrand.trim(),
        managerName: currentUser.fullName,
      });
      setStationSaveNotice(true);
      window.setTimeout(() => setStationSaveNotice(false), 2500);
      onUserOrWorkspaceSwitched();
    } catch (error) {
      setStationError(error instanceof Error ? error.message : 'Could not save station settings.');
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordUpdated(false);
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setPasswordError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('The passwords do not match.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updatePassword(password);
      setPassword('');
      setConfirmPassword('');
      setPasswordUpdated(true);
    } catch (error) {
      setPasswordError(getFriendlyAuthError(error));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError('');
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      setSignOutError(getFriendlyAuthError(error));
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleTestAndSaveAi = async () => {
    if (!aiEndpoint.trim()) {
      setAiTestStatus({ success: false, message: 'Please provide an AI endpoint URL first.' });
      return;
    }
    setIsTestingAi(true);
    setAiTestStatus(null);
    try {
      const response = await fetch(aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      if (!response.ok) {
        setAiTestStatus({ success: false, message: `Endpoint responded: ${response.status}` });
        return;
      }
      localStorage.setItem('omc_ai_inference_url', aiEndpoint.trim());
      setAiTestStatus({ success: true, message: 'AI endpoint reachable. Saved locally.' });
    } catch (error) {
      setAiTestStatus({ success: false, message: getFriendlyAuthError(error) });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleClearAi = () => {
    localStorage.removeItem('omc_ai_inference_url');
    setAiEndpoint('');
    setAiTestStatus(null);
  };

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(`${schemaSql}\n\n${authSetupSql}\n\n${dataSetupSql}`);
    setSqlCopied(true);
    window.setTimeout(() => setSqlCopied(false), 3000);
  };

  const handleImportLocalData = async () => {
    if (!selectedLegacyUserId) return;
    setIsImporting(true);
    setImportError('');
    setImportSummary(null);
    try {
      const summary = await importExistingLocalData(currentUser.id, selectedLegacyUserId);
      localStorage.setItem(`omc_local_import_${currentUser.id}_${selectedLegacyUserId}`, '1');
      setImportSummary(summary);
      onUserOrWorkspaceSwitched();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not import local data. Your local records were not deleted.');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedSource = legacySources.find((source) => source.userId === selectedLegacyUserId);
  let importAlreadyCompleted = false;
  try {
    importAlreadyCompleted = Boolean(selectedLegacyUserId) &&
      localStorage.getItem(`omc_local_import_${currentUser.id}_${selectedLegacyUserId}`) === '1';
  } catch {
    importAlreadyCompleted = false;
  }

  const tabs = [
    { id: 'station', label: 'Station', icon: Building },
    { id: 'security', label: 'Security', icon: KeyRound },
    { id: 'ai', label: 'AI Reader', icon: Cpu },
    { id: 'sql', label: 'SQL & RLS', icon: Database },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/90 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-amber-500/15 p-1.5 text-amber-400"><Building className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-bold text-white">Account & Station</h2>
              <p className="text-xs text-slate-400">{currentUser.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close account settings" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Account settings" className="flex overflow-x-auto border-b border-slate-800 px-2 pt-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold ${activeTab === id ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </nav>

        <div className="space-y-5 overflow-y-auto p-5">
          {activeTab === 'station' && (
            <form onSubmit={handleSaveStation} className="space-y-4">
              <div>
                <label htmlFor="account-station-name" className="mb-1.5 block text-xs font-semibold text-slate-300">Station name</label>
                <input id="account-station-name" value={stationName} onChange={(event) => setStationName(event.target.value)} required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="account-brand" className="mb-1.5 block text-xs font-semibold text-slate-300">OMC brand</label>
                  <input id="account-brand" value={omcBrand} onChange={(event) => setOmcBrand(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label htmlFor="account-location" className="mb-1.5 block text-xs font-semibold text-slate-300">Location</label>
                  <input id="account-location" value={stationLocation} onChange={(event) => setStationLocation(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                Station workspace ID: <span className="break-all font-mono text-slate-200">{workspace.id}</span>
              </div>
              <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Import existing data from this device</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Choose the old station profile to import. Local data is kept on this device.</p>
                </div>
                {legacySources.length ? (
                  <>
                    <label htmlFor="legacy-data-source" className="sr-only">Legacy station profile</label>
                    <select id="legacy-data-source" value={selectedLegacyUserId} onChange={(event) => {
                      setSelectedLegacyUserId(event.target.value);
                      setImportSummary(null);
                    }} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                      {legacySources.map((source) => (
                        <option key={source.userId} value={source.userId}>
                          {source.stationName}{source.managerName ? ` — ${source.managerName}` : ''}
                        </option>
                      ))}
                    </select>
                    {importError && <AuthMessage>{importError}</AuthMessage>}
                    {importSummary && <AuthMessage kind="success">
                      Imported {importSummary.workspacesImported} workspace, {importSummary.productsImported} products, {importSummary.pumpsImported} pumps, {importSummary.dailyReportsImported} daily reports, {importSummary.dischargeReportsImported} discharge reports, {importSummary.priceChangeReportsImported} price-change reports, and {importSummary.formatSettingsImported} format settings. Skipped {importSummary.dailyReportsSkipped} daily-report dates already in the cloud. Local copies were kept.
                    </AuthMessage>}
                    <button type="button" onClick={handleImportLocalData} disabled={isImporting || importAlreadyCompleted} className="min-h-11 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-200 disabled:opacity-50">
                      {isImporting ? 'Importing…' : importAlreadyCompleted ? 'Import already completed' : 'Import selected station data'}
                    </button>
                    {selectedSource && <p className="text-[11px] text-slate-500">The import uses only “{selectedSource.stationName}” data. It does not delete local records.</p>}
                  </>
                ) : (
                  <p className="text-xs text-slate-400">No legacy station data was found in this browser.</p>
                )}
              </section>
              <div className="flex items-center justify-between gap-3">
                {stationError && <AuthMessage>{stationError}</AuthMessage>}
                {stationSaveNotice && <span role="status" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400"><Check className="h-4 w-4" /> Saved</span>}
                <button type="submit" className="ml-auto rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-amber-400">Save changes</button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white">Change password</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">Choose at least 8 characters with a letter and a number.</p>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {passwordError && <AuthMessage>{passwordError}</AuthMessage>}
                {passwordUpdated && <AuthMessage kind="success">Your password has been updated.</AuthMessage>}
                <PasswordField id="account-new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
                <PasswordField id="account-confirm-password" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                <button type="submit" disabled={isUpdatingPassword} className="min-h-11 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60">
                  {isUpdatingPassword ? 'Updating…' : 'Change password'}
                </button>
              </form>
              <div className="border-t border-slate-800 pt-5">
                {signOutError && <div className="mb-3"><AuthMessage>{signOutError}</AuthMessage></div>}
                <button type="button" onClick={handleSignOut} disabled={isSigningOut} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-60">
                  {isSigningOut ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {isSigningOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <p className="text-xs leading-5 text-slate-300">Optional AI Meter Reader service endpoint.</p>
              <label htmlFor="ai-endpoint" className="sr-only">AI Meter Reader endpoint URL</label>
              <input id="ai-endpoint" type="url" value={aiEndpoint} onChange={(event) => setAiEndpoint(event.target.value)} placeholder="https://your-ai-endpoint.example/predict" className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 font-mono text-xs text-white outline-none focus:border-amber-500" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={handleTestAndSaveAi} disabled={isTestingAi || !aiEndpoint.trim()} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">
                  {isTestingAi && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}Save AI endpoint
                </button>
                <button type="button" onClick={handleClearAi} className="min-h-11 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300">Clear</button>
              </div>
              {aiTestStatus && <AuthMessage kind={aiTestStatus.success ? 'success' : 'error'}>{aiTestStatus.message}</AuthMessage>}
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs leading-5 text-slate-400">Copy all setup scripts. Run the existing schema first, then auth and data setup.</p>
                <button type="button" onClick={handleCopySql} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                  {sqlCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{sqlCopied ? 'Copied' : 'Copy SQL Setup'}
                </button>
              </div>
              <p className="text-xs leading-5 text-slate-500">The scripts add the auth profile trigger and data tables; they do not connect to the database from this app.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
