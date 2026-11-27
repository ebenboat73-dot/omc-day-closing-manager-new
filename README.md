# OMC Manager Day Sales & Stock Reporting App

**Version 3.1 • October 2026 • Onyxma Energy**  
Mobile-first multi-user web application built with React 19, TypeScript, Tailwind CSS, Supabase, and Vercel readiness.

---

## 🎯 Purpose & Core Principles

The OMC Manager Day Sales & Stock Reporting App provides a fast, reliable, phone-first workflow for fuel station managers to:
- Record pump totalizer meter readings with in-app camera capture.
- Verify readings with optional optical character recognition (OCR) suggestions while ensuring manager-confirmed figures are authoritative.
- Reconcile physical tank dipping against opening stock, deliveries, and day sales.
- Itemize daily operational expenses in GHS.
- Generate, verify, and broadcast standardized daily reports via WhatsApp, SMS, or Telegram.

### Core Product Principles (PRD v3.1)
1. **Private-by-Default Workspaces**: User A can access User A's workspace only; User B can access User B's workspace only. Workspaces, reports, settings, and photos are strictly isolated.
2. **Authoritative Manager Readings**: OCR output is an unconfirmed suggestion. The station manager's confirmed value is authoritative.
3. **Dynamic Pump & Product Setup**: Station managers can add nozzles, edit labels, reorder positions, and deactivate pumps without a code change.
4. **Historical Snapshot Preservation**: Each daily report preserves a freeze snapshot of the pump label and product configuration applicable on that date. Future pump renames or deactivations never rewrite history.
5. **No Blind Zeroes**: Missing readings remain explicitly incomplete (`null`), triggering clear warnings rather than silently defaulting to zero.
6. **In-App Camera & Photo Retention**: Direct MediaDevices live camera stream with viewfinder overlay, retake, pump association, and device-supported save to Gallery/Photos.

---

## 🏗 Technology Architecture

- **Frontend**: React 19 + TypeScript + Vite 6+
- **Styling**: Tailwind CSS v4 (Restrained, professional palette: deep navy `#0f172a`, amber accent, clean status indicators)
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security, Auth, and private Storage buckets)
- **Report Storage**: Workspaces, products, pumps, settings, and reports are stored in Supabase with RLS; failed report writes are kept in a device-local pending queue for retry.
- **OCR Engine**: Tesseract.js (client-side optical character recognition)
- **Camera API**: `navigator.mediaDevices.getUserMedia` with rear-camera (`facingMode: environment`) viewfinder and device file picker fallback
- **Export & Sharing**: Native Web Share API (`navigator.share`), WhatsApp/Telegram direct share URLs, printable layout, and clipboard copy

---

## 🚀 Key Features & Workflow

### 1. In-App Camera Capture & Gallery Save
- Tap the **Camera** icon on any pump card to launch the live viewfinder.
- High-contrast overlay guides alignment of meter digits.
- Snap photo, retake if blurry, or click **Save to Gallery** (invoking the native share sheet / download to save to device Photos).
- Automated OCR suggestions with confidence ratings and 1-click application.

### 2. Dynamic Pump Configuration
- Navigate to the **Pump Setup** tab.
- View configured nozzles grouped by fuel type (Default initial sequence: PMS1–4, AGO1–6, KERO1–2).
- Add new pumps (e.g., `AGO 7`), reorder nozzles up/down, and toggle active/deactivated.
- Deactivating preserves historical reports while removing the pump from new daily drafts.

### 3. Tank Stock & Dipping Reconciliation
- Formula:
  $$\text{Theoretical Closing Stock} = \text{Opening Stock} + \text{Receipts} - \text{Day Sales}$$
  $$\text{Variance} = \text{Physical Closing Stock} - \text{Theoretical Closing Stock}$$
- Immediate auto-recalculation upon input.
- Dipping stick height (mm) recording and high-variance alerts (> ±150L).

### 4. Operational Expenses
- Itemize station cash disbursements before shift close (Staff meals, ECG prepaid power recharge, generator fuel, maintenance, transport).
- Kept editable and totaled in GHS; never subtracted from fuel sales without separate netting.

### 5. Authentication & Supabase Setup
- Users create accounts with an email, password, full name, and station name. Email confirmation is required before sign-in.
- Sign-in uses Supabase Auth; password recovery links return to `/reset-password`.
- Supabase project settings are provided only at build time through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY` as a fallback). Do not use a service-role key in the frontend.
- Session persistence can be selected at sign-in: persistent browser storage or session-only storage.
- Apply `src/services/supabaseSchema.sql`, `supabase/auth_setup.sql`, and then `supabase/data_setup.sql` in the Supabase SQL Editor. The app does not run migrations against the database.
- Existing device-local data can be explicitly imported from Account Settings. The import leaves local records intact and skips daily-report dates already present in Supabase.
- Meter and tank photos are not uploaded or saved in report rows in this step; only their in-memory previews are retained until the page closes.

---

## 💻 Development & Deployment

```bash
# Install dependencies
npm install

# Start dev server on port 3000
npm run dev

# Run TypeScript checks
npm run lint

# Build for production
npm run build
```

---

## 🔐 Supabase Row Level Security (RLS)

Database tables enforce row-level policies based on `auth.uid()` through workspace ownership. This includes the existing tables in `src/services/supabaseSchema.sql` and the `discharge_reports`, `price_change_reports`, and `report_format_settings` tables created by `supabase/data_setup.sql`.

### Vercel environment

Set `VITE_SUPABASE_URL` and one public client key in the Vercel project before building:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
# Or use VITE_SUPABASE_ANON_KEY if the publishable key is not available
```

These are embedded by Vite at build time. If the URL or both public-key options are missing, the app displays an **App not configured** message rather than opening authentication or the dashboard. The frontend must never contain a Supabase service-role key.
