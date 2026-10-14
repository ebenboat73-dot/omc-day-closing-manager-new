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
- **Offline / Local Fallback**: Client-side scoped user storage engine (`omc_u_${userId}_...`) enabling instant multi-user isolation testing (e.g. Kwame Ansah vs Abena Boateng) even before entering Supabase credentials
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

### 5. Multi-User Workspace Testing & Supabase Setup
- Tap **Account** or the Manager Name in the header.
- Switch between demo managers (**Kwame Ansah** at Airport Bypass Station vs **Abena Boateng** at Tema Industrial Highway) to verify strict data isolation.
- Connect your Supabase project with Project URL and publishable Anon key.
- 1-click **Copy SQL Schema** with complete DDL, foreign keys, and Row Level Security (RLS) policies for Supabase SQL Editor.

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

All database tables (`profiles`, `workspaces`, `products`, `pumps`, `reports`, `report_pump_readings`, `report_stock_entries`, `report_expenses`, `audit_events`) enforce RLS policies verifying `auth.uid() = owner_user_id`. The full schema is viewable inside the application under **Account Settings → SQL & RLS Schema** or in `src/services/supabaseSchema.sql`.
