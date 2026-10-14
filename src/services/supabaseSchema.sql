-- =====================================================================
-- OMC MANAGER DAY SALES & STOCK REPORTING APP - SUPABASE SQL SCHEMA
-- Version 3.1 • Row Level Security (RLS) & Multi-User Isolated Workspaces
-- =====================================================================

-- 1. PROFILES TABLE (Linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text default 'manager',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 2. WORKSPACES TABLE (Private Station Workspace)
create table if not exists public.workspaces (
  id uuid default gen_random_uuid() primary key,
  owner_user_id uuid references auth.users on delete cascade not null,
  station_name text not null,
  station_location text default '',
  omc_brand text default 'Onyxma Energy',
  manager_name text default '',
  currency_symbol text default 'GHS',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.workspaces enable row level security;

create policy "Users can view own workspaces"
  on public.workspaces for select
  using (auth.uid() = owner_user_id);

create policy "Users can insert own workspaces"
  on public.workspaces for insert
  with check (auth.uid() = owner_user_id);

create policy "Users can update own workspaces"
  on public.workspaces for update
  using (auth.uid() = owner_user_id);

create policy "Users can delete own workspaces"
  on public.workspaces for delete
  using (auth.uid() = owner_user_id);

-- 3. PRODUCTS TABLE (Configured Fuels)
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  code text not null,
  name text not null,
  full_name text not null,
  color text default '#10b981',
  badge_bg text default 'bg-emerald-500/15',
  badge_text text default 'text-emerald-400',
  border_col text default 'border-emerald-500/30',
  display_order integer default 1,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.products enable row level security;

create policy "Users can manage products in own workspace"
  on public.products for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = products.workspace_id and w.owner_user_id = auth.uid()
    )
  );

-- 4. PUMPS TABLE (Dynamic Pump Configuration)
create table if not exists public.pumps (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  product_id uuid references public.products on delete cascade not null,
  product_code text not null,
  label text not null,
  display_order integer default 1,
  is_active boolean default true,
  default_capacity numeric default 100000,
  created_at timestamptz default now()
);

alter table public.pumps enable row level security;

create policy "Users can manage pumps in own workspace"
  on public.pumps for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = pumps.workspace_id and w.owner_user_id = auth.uid()
    )
  );

-- 5. REPORTS TABLE (Daily Station Reports)
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  report_date date not null,
  station_name_snapshot text not null,
  status text not null default 'Draft', -- 'Draft', 'In Progress', 'Ready for Review', 'Ready to Send', 'Sent'
  notes text,
  sent_at timestamptz,
  sent_by text,
  sent_via text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (workspace_id, report_date)
);

alter table public.reports enable row level security;

create policy "Users can manage reports in own workspace"
  on public.reports for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = reports.workspace_id and w.owner_user_id = auth.uid()
    )
  );

-- 6. REPORT PUMP READINGS (Snapshot-safe meter readings)
create table if not exists public.report_pump_readings (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports on delete cascade not null,
  pump_id uuid references public.pumps on delete set null,
  pump_label_snapshot text not null,
  product_code_snapshot text not null,
  product_id_snapshot uuid,
  opening_meter numeric,
  closing_meter numeric,
  litres_sold numeric,
  candidate_ocr_reading numeric,
  ocr_confidence integer,
  ocr_status text default 'idle',
  is_confirmed boolean default false,
  is_rollover boolean default false,
  rollover_capacity numeric default 100000,
  photo_storage_path text,
  notes text,
  warning text,
  created_at timestamptz default now()
);

alter table public.report_pump_readings enable row level security;

create policy "Users can manage pump readings in own reports"
  on public.report_pump_readings for all
  using (
    exists (
      select 1 from public.reports r
      join public.workspaces w on w.id = r.workspace_id
      where r.id = report_pump_readings.report_id and w.owner_user_id = auth.uid()
    )
  );

-- 7. REPORT STOCK ENTRIES (Dipping, Receipts, Tank stock)
create table if not exists public.report_stock_entries (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports on delete cascade not null,
  product_id uuid,
  product_code_snapshot text not null,
  product_name_snapshot text not null,
  tank_label text not null default 'Tank 1',
  opening_stock numeric,
  receipts numeric default 0,
  day_sales numeric default 0,
  physical_closing_stock numeric,
  theoretical_closing_stock numeric,
  variance numeric,
  dip_reading_mm numeric,
  warning text,
  created_at timestamptz default now()
);

alter table public.report_stock_entries enable row level security;

create policy "Users can manage stock entries in own reports"
  on public.report_stock_entries for all
  using (
    exists (
      select 1 from public.reports r
      join public.workspaces w on w.id = r.workspace_id
      where r.id = report_stock_entries.report_id and w.owner_user_id = auth.uid()
    )
  );

-- 8. REPORT EXPENSES (Daily Station Expenses)
create table if not exists public.report_expenses (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports on delete cascade not null,
  description text not null,
  amount_ghs numeric not null default 0,
  category text not null default 'Other',
  note text,
  created_at timestamptz default now()
);

alter table public.report_expenses enable row level security;

create policy "Users can manage expenses in own reports"
  on public.report_expenses for all
  using (
    exists (
      select 1 from public.reports r
      join public.workspaces w on w.id = r.workspace_id
      where r.id = report_expenses.report_id and w.owner_user_id = auth.uid()
    )
  );

-- 9. AUDIT EVENTS (Audit log of report status changes)
create table if not exists public.audit_events (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  record_type text not null,
  record_id uuid,
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.audit_events enable row level security;

create policy "Users can view own audit events"
  on public.audit_events for select
  using (auth.uid() = user_id);

-- 10. PRIVATE SUPABASE STORAGE (Meter Photos Bucket)
-- In Supabase Storage UI, create a private bucket named 'meter-photos'
-- Then run this storage RLS policy:
-- create policy "Users can view own meter photos"
--   on storage.objects for select
--   using (bucket_id = 'meter-photos' and (storage.foldername(name))[1] = auth.uid()::text);
--
-- create policy "Users can upload own meter photos"
--   on storage.objects for insert
--   with check (bucket_id = 'meter-photos' and (storage.foldername(name))[1] = auth.uid()::text);
