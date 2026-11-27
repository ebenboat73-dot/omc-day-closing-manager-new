# OMC Manager Day Sales & Stock Reporting App

Mobile-first station operations and reporting application built with React, TypeScript, Vite, and Supabase.

## Features

- Secure Supabase sign-up, sign-in, email confirmation, and password recovery.
- Private station workspaces with configurable products, pumps, prices, and historical report snapshots.
- Daily meter readings, tank stock reconciliation, expenses, and Hubtel reconciliation.
- AI Vision assisted meter reading and camera capture for pump meters and tank dipping.
- Before/after fuel discharge reports with stock, invoice, pump-meter, and variance calculations.
- Price change reports with cutover readings and stock revaluation.
- Custom report-format settings and presets for standard, corporate, compact, and detailed audit layouts.
- Report history and sharing through WhatsApp, SMS, native Web Share, printing, and clipboard.
- Failed daily report writes are kept in a device-local pending queue and retried when connectivity returns. This queue is a sync aid; Supabase remains the persistent data store.
- Existing legacy device data can be explicitly imported from Account Settings. Importing does not remove local data.

## Architecture

- `src/features/auth/AuthContext.tsx` observes the active Supabase session.
- `src/services/authService.ts` implements Supabase authentication operations.
- `src/services/repository.ts` is the application data access layer. Workspaces, products, pumps, daily reports, discharge reports, price-change reports, and report-format settings use Supabase.
- `src/services/supabaseClient.ts` configures the Supabase client.
- `src/types/report.ts` defines the application and database-facing report models, default settings, and format presets.
- Supabase row-level security scopes persistent records to the authenticated workspace owner.

The application does not use simulated authentication or localStorage as its primary database. The local pending-report queue is used only to preserve unsynchronized daily-report changes.

## Supabase setup

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) in the deployment environment. Never expose a service-role key in the frontend.

AI Vision meter analysis also requires `GEMINI_API_KEY` in the server environment. Without it, image analysis reports that the service is unavailable and leaves manual entry available; it does not invent a reading.

Apply the SQL setup scripts in this order in the Supabase SQL Editor:

1. `src/services/supabaseSchema.sql`
2. `supabase/auth_setup.sql`
3. `supabase/data_setup.sql`

`data_setup.sql` creates the discharge, price-change, and report-format tables, adds report fields used by the app, and installs the daily report save function. The app does not run database migrations automatically.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```
