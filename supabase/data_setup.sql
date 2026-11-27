-- Additive data storage setup for OMC Manager.
-- Run after src/services/supabaseSchema.sql. This script does not delete data.

alter table public.products
  add column if not exists unit_price numeric not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.pumps
  add column if not exists updated_at timestamptz not null default now();

alter table public.reports
  add column if not exists shift_type text not null default '',
  add column if not exists product_prices jsonb not null default '{}'::jsonb,
  add column if not exists hubtel_account text not null default '',
  add column if not exists hubtel_dashboard_amount numeric,
  add column if not exists hubtel_banking_with_hubtel numeric,
  add column if not exists total_sales_ghs numeric not null default 0,
  add column if not exists total_expenses_ghs numeric not null default 0,
  add column if not exists cash_to_bank_or_till numeric not null default 0,
  add column if not exists warnings jsonb not null default '[]'::jsonb;

alter table public.report_pump_readings
  add column if not exists unit_price_snapshot numeric,
  add column if not exists amount_ghs numeric,
  add column if not exists analogue_meter text,
  add column if not exists ocr_error text,
  add column if not exists ai_vision_reading numeric,
  add column if not exists ai_vision_confidence integer,
  add column if not exists ai_vision_clear boolean,
  add column if not exists ai_vision_meter_type text,
  add column if not exists ai_vision_raw_digits text,
  add column if not exists ai_vision_unclear_reason text,
  add column if not exists is_idle_or_optional boolean not null default false;

alter table public.report_stock_entries
  add column if not exists unit_price_snapshot numeric,
  add column if not exists product_sales_ghs numeric,
  add column if not exists photo_storage_path text;

create unique index if not exists products_workspace_code_uidx
  on public.products (workspace_id, code);

create table if not exists public.discharge_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  record_id text not null,
  report_date text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discharge_reports_workspace_record_uidx unique (workspace_id, record_id)
);

create index if not exists discharge_reports_workspace_date_idx
  on public.discharge_reports (workspace_id, report_date);

create table if not exists public.price_change_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  record_id text not null,
  report_date text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_change_reports_workspace_record_uidx unique (workspace_id, record_id)
);

create index if not exists price_change_reports_workspace_date_idx
  on public.price_change_reports (workspace_id, report_date);

create table if not exists public.report_format_settings (
  workspace_id uuid primary key references public.workspaces on delete cascade,
  settings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.discharge_reports enable row level security;
alter table public.price_change_reports enable row level security;
alter table public.report_format_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'discharge_reports'
      and policyname = 'Users manage discharge reports in own workspace'
  ) then
    create policy "Users manage discharge reports in own workspace"
      on public.discharge_reports for all
      using (exists (
        select 1 from public.workspaces w
        where w.id = discharge_reports.workspace_id and w.owner_user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.workspaces w
        where w.id = discharge_reports.workspace_id and w.owner_user_id = auth.uid()
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'price_change_reports'
      and policyname = 'Users manage price changes in own workspace'
  ) then
    create policy "Users manage price changes in own workspace"
      on public.price_change_reports for all
      using (exists (
        select 1 from public.workspaces w
        where w.id = price_change_reports.workspace_id and w.owner_user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.workspaces w
        where w.id = price_change_reports.workspace_id and w.owner_user_id = auth.uid()
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'report_format_settings'
      and policyname = 'Users manage format settings in own workspace'
  ) then
    create policy "Users manage format settings in own workspace"
      on public.report_format_settings for all
      using (exists (
        select 1 from public.workspaces w
        where w.id = report_format_settings.workspace_id and w.owner_user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.workspaces w
        where w.id = report_format_settings.workspace_id and w.owner_user_id = auth.uid()
      ));
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  target_table text;
  trigger_name text;
begin
  foreach target_table in array array[
    'workspaces',
    'products',
    'pumps',
    'reports',
    'discharge_reports',
    'price_change_reports',
    'report_format_settings'
  ] loop
    trigger_name := target_table || '_set_updated_at';
    if not exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = target_table
        and t.tgname = trigger_name and not t.tgisinternal
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        trigger_name,
        target_table
      );
    end if;
  end loop;
end;
$$;

create or replace function public.save_daily_report(p_report jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  report_uuid uuid;
  report_workspace_id uuid := (p_report ->> 'workspaceId')::uuid;
  report_day date := (p_report ->> 'reportDate')::date;
  pump_item jsonb;
  stock_item jsonb;
  expense_item jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.workspaces w
    where w.id = report_workspace_id and w.owner_user_id = auth.uid()
  ) then
    raise exception 'Workspace not found or access denied';
  end if;

  insert into public.reports (
    workspace_id,
    report_date,
    station_name_snapshot,
    status,
    notes,
    sent_at,
    sent_by,
    sent_via,
    shift_type,
    product_prices,
    hubtel_account,
    hubtel_dashboard_amount,
    hubtel_banking_with_hubtel,
    total_sales_ghs,
    total_expenses_ghs,
    cash_to_bank_or_till,
    warnings,
    updated_at
  )
  values (
    report_workspace_id,
    report_day,
    coalesce(p_report ->> 'stationNameSnapshot', ''),
    coalesce(p_report ->> 'status', 'Draft'),
    p_report ->> 'notes',
    nullif(p_report ->> 'sentAt', '')::timestamptz,
    p_report ->> 'sentBy',
    p_report ->> 'sentVia',
    coalesce(p_report ->> 'shiftType', ''),
    coalesce(p_report -> 'productPrices', '{}'::jsonb),
    coalesce(p_report #>> '{hubtel,hubtelAccount}', ''),
    nullif(p_report #>> '{hubtel,dashboardAmount}', '')::numeric,
    nullif(p_report #>> '{hubtel,bankingWithHubtel}', '')::numeric,
    coalesce(nullif(p_report ->> 'totalSalesGhs', '')::numeric, 0),
    coalesce(nullif(p_report ->> 'totalExpensesGhs', '')::numeric, 0),
    coalesce(nullif(p_report ->> 'cashToBankOrTill', '')::numeric, 0),
    coalesce(p_report -> 'warnings', '[]'::jsonb),
    now()
  )
  on conflict (workspace_id, report_date) do update set
    station_name_snapshot = excluded.station_name_snapshot,
    status = excluded.status,
    notes = excluded.notes,
    sent_at = excluded.sent_at,
    sent_by = excluded.sent_by,
    sent_via = excluded.sent_via,
    shift_type = excluded.shift_type,
    product_prices = excluded.product_prices,
    hubtel_account = excluded.hubtel_account,
    hubtel_dashboard_amount = excluded.hubtel_dashboard_amount,
    hubtel_banking_with_hubtel = excluded.hubtel_banking_with_hubtel,
    total_sales_ghs = excluded.total_sales_ghs,
    total_expenses_ghs = excluded.total_expenses_ghs,
    cash_to_bank_or_till = excluded.cash_to_bank_or_till,
    warnings = excluded.warnings,
    updated_at = now()
  returning id into report_uuid;

  delete from public.report_pump_readings where report_id = report_uuid;
  delete from public.report_stock_entries where report_id = report_uuid;
  delete from public.report_expenses where report_id = report_uuid;

  for pump_item in select value from jsonb_array_elements(coalesce(p_report -> 'pumps', '[]'::jsonb))
  loop
    insert into public.report_pump_readings (
      report_id, pump_id, pump_label_snapshot, product_code_snapshot,
      product_id_snapshot, opening_meter, closing_meter, litres_sold,
      unit_price_snapshot, amount_ghs, analogue_meter, candidate_ocr_reading,
      ocr_confidence, ocr_status, ocr_error, ai_vision_reading, ai_vision_confidence,
      ai_vision_clear, ai_vision_meter_type, ai_vision_raw_digits, ai_vision_unclear_reason,
      is_confirmed, is_rollover,
      rollover_capacity, photo_storage_path, notes, warning, is_idle_or_optional
    )
    values (
      report_uuid,
      nullif(pump_item ->> 'pumpId', '')::uuid,
      coalesce(pump_item ->> 'pumpLabelSnapshot', ''),
      coalesce(pump_item ->> 'productCodeSnapshot', ''),
      nullif(pump_item ->> 'productIdSnapshot', '')::uuid,
      nullif(pump_item ->> 'openingMeter', '')::numeric,
      nullif(pump_item ->> 'closingMeter', '')::numeric,
      nullif(pump_item ->> 'litresSold', '')::numeric,
      nullif(pump_item ->> 'unitPriceSnapshot', '')::numeric,
      nullif(pump_item ->> 'amountGhs', '')::numeric,
      pump_item ->> 'analogueMeter',
      nullif(pump_item ->> 'candidateOcrReading', '')::numeric,
      nullif(pump_item ->> 'ocrConfidence', '')::integer,
      coalesce(pump_item ->> 'ocrStatus', 'idle'),
      pump_item ->> 'ocrError',
      nullif(pump_item ->> 'aiVisionReading', '')::numeric,
      nullif(pump_item ->> 'aiVisionConfidence', '')::integer,
      nullif(pump_item ->> 'aiVisionClear', '')::boolean,
      pump_item ->> 'aiVisionMeterType',
      pump_item ->> 'aiVisionRawDigits',
      pump_item ->> 'aiVisionUnclearReason',
      coalesce((pump_item ->> 'isConfirmed')::boolean, false),
      coalesce((pump_item ->> 'isRollover')::boolean, false),
      coalesce(nullif(pump_item ->> 'rolloverCapacity', '')::numeric, 100000),
      pump_item ->> 'photoStoragePath',
      pump_item ->> 'notes',
      pump_item ->> 'warning',
      coalesce((pump_item ->> 'isIdleOrOptional')::boolean, false)
    );
  end loop;

  for stock_item in select value from jsonb_array_elements(coalesce(p_report -> 'stocks', '[]'::jsonb))
  loop
    insert into public.report_stock_entries (
      report_id, product_id, product_code_snapshot, product_name_snapshot,
      tank_label, opening_stock, receipts, day_sales, physical_closing_stock,
      theoretical_closing_stock, variance, dip_reading_mm, unit_price_snapshot,
      product_sales_ghs, photo_storage_path, warning
    )
    values (
      report_uuid,
      nullif(stock_item ->> 'productId', '')::uuid,
      coalesce(stock_item ->> 'productCodeSnapshot', ''),
      coalesce(stock_item ->> 'productNameSnapshot', ''),
      coalesce(stock_item ->> 'tankLabel', 'Tank 1'),
      nullif(stock_item ->> 'openingStock', '')::numeric,
      coalesce(nullif(stock_item ->> 'receipts', '')::numeric, 0),
      coalesce(nullif(stock_item ->> 'daySales', '')::numeric, 0),
      nullif(stock_item ->> 'physicalClosingStock', '')::numeric,
      nullif(stock_item ->> 'theoreticalClosingStock', '')::numeric,
      nullif(stock_item ->> 'variance', '')::numeric,
      nullif(stock_item ->> 'dipReadingMm', '')::numeric,
      nullif(stock_item ->> 'unitPriceSnapshot', '')::numeric,
      nullif(stock_item ->> 'productSalesGhs', '')::numeric,
      stock_item ->> 'photoStoragePath',
      stock_item ->> 'warning'
    );
  end loop;

  for expense_item in select value from jsonb_array_elements(coalesce(p_report -> 'expenses', '[]'::jsonb))
  loop
    insert into public.report_expenses (report_id, description, amount_ghs, category, note)
    values (
      report_uuid,
      coalesce(expense_item ->> 'description', ''),
      coalesce(nullif(expense_item ->> 'amountGhs', '')::numeric, 0),
      coalesce(expense_item ->> 'category', 'Other'),
      expense_item ->> 'note'
    );
  end loop;

  return report_uuid;
end;
$$;

revoke all on function public.save_daily_report(jsonb) from public;
grant execute on function public.save_daily_report(jsonb) to authenticated;
