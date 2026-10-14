/**
 * Account, Private Workspace & Supabase Setup Modal
 * PRD v3.1 Section 4, 16 & 17
 */

import React, { useState } from 'react';
import {
  UserProfile,
  StationWorkspace,
} from '../../types/report';
import {
  getActiveUser,
  setActiveUser,
  listAvailableDemoUsers,
  registerNewUser,
  updateWorkspace,
} from '../../services/dataService';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  clearStoredSupabaseConfig,
} from '../../services/supabaseClient';
import {
  User,
  Building,
  Database,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  LogOut,
  X,
  Code,
  Key,
  Layers,
  ArrowRight,
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'station' | 'users' | 'supabase' | 'sql'>('station');

  // Station settings state
  const [stationName, setStationName] = useState(workspace.stationName);
  const [stationLocation, setStationLocation] = useState(workspace.stationLocation);
  const [omcBrand, setOmcBrand] = useState(workspace.omcBrand);
  const [stationSaveNotice, setStationSaveNotice] = useState(false);

  // New user registration state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  // Supabase config state
  const storedConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(storedConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(storedConfig.anonKey);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

  // SQL Copy state
  const [sqlCopied, setSqlCopied] = useState(false);

  if (!isOpen) return null;

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspace(currentUser.id, {
      stationName: stationName.trim(),
      stationLocation: stationLocation.trim(),
      omcBrand: omcBrand.trim(),
    });
    setStationSaveNotice(true);
    setTimeout(() => setStationSaveNotice(false), 2500);
    onUserOrWorkspaceSwitched();
  };

  const handleSwitchUser = (user: UserProfile) => {
    setActiveUser(user);
    onUserOrWorkspaceSwitched();
  };

  const handleRegisterUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    const created = registerNewUser(newEmail, newName);
    setNewEmail('');
    setNewName('');
    onUserOrWorkspaceSwitched();
  };

  const handleTestAndSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingConnection(true);
    setConnectionStatus(null);

    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setIsTestingConnection(false);
    setConnectionStatus(res);

    if (res.success) {
      saveStoredSupabaseConfig(supabaseUrl, supabaseAnonKey);
    }
  };

  const handleDisconnectSupabase = () => {
    clearStoredSupabaseConfig();
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setConnectionStatus(null);
  };

  const handleCopySql = () => {
    const sqlText = `-- OMC Manager Day Sales & Stock Reporting App • Supabase Schema (PRD v3.1)
-- 1. Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text default 'manager',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);

-- 2. Workspaces
create table if not exists public.workspaces (
  id uuid default gen_random_uuid() primary key,
  owner_user_id uuid references auth.users on delete cascade not null,
  station_name text not null,
  station_location text default '',
  omc_brand text default 'Onyxma Energy',
  currency_symbol text default 'GHS',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.workspaces enable row level security;
create policy "Users manage own workspaces" on public.workspaces for all using (auth.uid() = owner_user_id);

-- 3. Reports & Pump Readings
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  report_date date not null,
  station_name_snapshot text not null,
  status text not null default 'Draft',
  notes text,
  sent_at timestamptz,
  sent_by text,
  sent_via text,
  created_at timestamptz default now(),
  unique (workspace_id, report_date)
);
alter table public.reports enable row level security;
create policy "Users manage own reports" on public.reports for all using (
  exists (select 1 from public.workspaces w where w.id = reports.workspace_id and w.owner_user_id = auth.uid())
);`;

    navigator.clipboard.writeText(sqlText);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const demoUsers = listAvailableDemoUsers();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <Building className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-white text-base">Account & Station Workspace</h3>
              <p className="text-xs text-slate-400">Manage station profile, user isolation, and Supabase database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 text-xs font-semibold px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('station')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'station'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Station Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Users & Isolation Test
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'supabase'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Supabase Cloud
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'sql'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            SQL & RLS Schema
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: STATION PROFILE */}
          {activeTab === 'station' && (
            <form onSubmit={handleSaveStation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Station Name
                </label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    OMC Brand
                  </label>
                  <input
                    type="text"
                    value={omcBrand}
                    onChange={(e) => setOmcBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Location / Highway
                  </label>
                  <input
                    type="text"
                    value={stationLocation}
                    onChange={(e) => setStationLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400">
                  Workspace Owner ID: <span className="font-mono text-slate-200">{workspace.ownerUserId}</span>
                </div>
                <div className="text-slate-400">
                  Station Workspace ID: <span className="font-mono text-slate-200">{workspace.id}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {stationSaveNotice && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Station settings saved!
                  </span>
                )}
                <div className="ml-auto">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: MULTI-USER ISOLATION TEST */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed">
                <strong>PRD Rule 4 (Strict Private Workspaces):</strong> User A accesses User A's workspace only;
                User B accesses User B's workspace only. Switch between Kwame and Abena below to verify that their pumps,
                station names, and reports are completely isolated with zero data bleed.
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Switch Active Account
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {demoUsers.map((u) => {
                    const isCurrent = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSwitchUser(u)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isCurrent
                            ? 'bg-amber-500/15 border-amber-400/80 text-white shadow-sm'
                            : 'bg-slate-800/50 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{u.fullName}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate mt-0.5">{u.email}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Register New Workspace */}
              <form onSubmit={handleRegisterUser} className="border-t border-slate-800 pt-4 space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Register New Station Manager
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="manager@station.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Full Name (e.g. Kofi Mensah)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-semibold"
                >
                  Create Separate Private Workspace
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: SUPABASE CLOUD CONNECTION */}
          {activeTab === 'supabase' && (
            <form onSubmit={handleTestAndSaveSupabase} className="space-y-4">
              <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 leading-relaxed">
                Connect your real <strong>Supabase project</strong> (PostgreSQL + RLS Auth + Storage). When connected,
                all daily reports and meter readings sync to your cloud PostgreSQL database.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supabase Publishable / Anon Key
                </label>
                <input
                  type="text"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Security: Only provide your public Anon key. Never expose your secret service-role key.
                </span>
              </div>

              {connectionStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    connectionStatus.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {connectionStatus.message}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                {supabaseUrl && (
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Disconnect
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isTestingConnection || !supabaseUrl || !supabaseAnonKey}
                  className="ml-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs uppercase tracking-wider shadow flex items-center gap-2"
                >
                  {isTestingConnection && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isTestingConnection ? 'Testing...' : 'Test & Connect'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: SQL & RLS SCHEMA */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Run this SQL in your Supabase SQL Editor to provision tables and RLS policies.
                </span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  {sqlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{sqlCopied ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                </button>
              </div>

              <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-[11px] overflow-x-auto max-h-[300px]">
                {`-- Profiles table
create table public.profiles (
  id uuid references auth.users primary key,
  email text not null,
  full_name text not null default ''
);
alter table public.profiles enable row level security;
create policy "Users own profiles" on public.profiles for all using (auth.uid() = id);

-- Workspaces table
create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  owner_user_id uuid references auth.users not null,
  station_name text not null
);
alter table public.workspaces enable row level security;
create policy "Users own workspace" on public.workspaces for all using (auth.uid() = owner_user_id);

-- Reports & Pump readings (with historical snapshot preservation)
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces not null,
  report_date date not null,
  station_name_snapshot text not null,
  status text not null default 'Draft'
);
alter table public.reports enable row level security;
create policy "Users own reports" on public.reports for all using (
  exists (select 1 from public.workspaces w where w.id = reports.workspace_id and w.owner_user_id = auth.uid())
);`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
