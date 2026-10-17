# OMC Manager Day Sales & Stock Reporting App

**Version 3.2 • Retail Service Station Edition • Onyxma Energy**  
Mobile-first multi-user web application built with React 19, TypeScript, Tailwind CSS, Supabase, and Vercel readiness.

---

## 🎯 Purpose & Core Principles

The OMC Manager Day Sales & Stock Reporting App provides a fast, reliable, phone-first workflow for retail fuel station managers across Ghana to:
- Welcome visitors with an executive **OMC Landing Page** highlighting operational benefits.
- Provide secure **Sign In & Registration** with a **"Stay logged in on this device"** preference for fast daily access.
- Record pump totalizer meter readings with in-app camera capture and editable unit prices.
- Photograph dipsticks with in-app **Dipping Camera** and reconcile physical tank dipping.
- Conduct **Fuel Discharge Reports** (Before & After discharge, stock underground, invoice volume, expected stock, opening/closing meters, and overage/shortage accounting).
- Manage **Price Change Reports** (cutover meter readings, litres sold at old price, and stock gain/loss revaluation in GHS).
- Itemize daily operational expenses and compute exact Cash in Till.
- Generate, verify, and broadcast standardized executive daily reports via WhatsApp or SMS in 1 tap.

### Core Product Principles
1. **Private-by-Default Workspaces**: Each manager has their own private station workspace with strictly isolated data.
2. **Authoritative Manager Readings**: OCR output is an unconfirmed suggestion; the station manager's confirmed value is authoritative.
3. **Flexible & Removable Pumps**: Station managers can add, reorder, edit, or remove nozzles directly from the report or Pump Setup.
4. **Editable Unit Prices & Real-Time Revenue**: Real-time sales per pump and product based on station unit prices (e.g., PMS @ ¢16.59, AGO @ ¢18.39).
5. **Dedicated Delivery & Price Shift Workflows**: Specialized Before/After discharge and price cutover tracking with exact executive WhatsApp format.
6. **In-App Camera at Pumps & Dipstick**: Direct MediaDevices live camera stream with viewfinder overlay, retake, pump association, and device-supported save to Gallery/Photos.

---

## 🏗 Technology Architecture

- **Frontend**: React 19 + TypeScript + Vite 8+
- **Styling**: Tailwind CSS v4 (Deep slate `#020617` palette with high-contrast amber `#f59e0b`, emerald `#10b981`, and cyan `#06b6d4` badges)
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security, Auth, and private Storage buckets)
- **Offline / Local Fallback**: Client-side scoped user storage engine (`omc_u_${userId}_...`) enabling instant multi-user isolation testing (e.g. Oborpah Asesewa vs Tema Highway)
- **Camera API**: `navigator.mediaDevices.getUserMedia` with rear-camera (`facingMode: environment`) viewfinder and device file picker fallback
- **Export & Sharing**: WhatsApp direct share URLs, native Web Share API, printable layout, and clipboard copy

---

## 🚀 Key Workflows

### 1. Landing Homepage & Authentication
- Explains how the platform eliminates manual math slips, accelerates evening closing under 3 minutes, and formats instant executive WhatsApp messages.
- Sign In & Station Registration with **"Stay logged in on this device"** checkbox.
- 1-Click quick demo access as Station Manager (Oborpah Asesewa) or Tema Station Manager.

### 2. Unified Report Types (Morning, Evening, Price Change & Discharge)
- **Report Type Selector**: Seamlessly switch between **Morning Report**, **Evening Report**, **Price Change Report**, and **Discharge Report** directly from the top status bar.
- **Price Change Report**: Formatted in the exact same standard executive layout as Morning & Evening reports—recording pump meters, litres sold, unit prices, tank dipping, variance, analogue readings, and cash account reconciliation—while clearly labeled as a Price Change Report for head office. In addition, an optional cutover revaluation calculator accounts for stock gains/losses in GHS.
- **Discharge Report**: Complete Before & After discharge reconciliation with Stock Underground, Invoice volume, Expected Stock, Closing Meters, and automatic Overage/Shortage calculations.
- **Daily Sales & Meter Readings**:
  - Dynamic pump cards (S1–S4 for PMS, D1–D4 for AGO, or custom configurations).
  - Removable pumps with instant confirmation (omitted or unoperated pumps are treated as idle without blocking report sending).
  - Editable unit prices (default: PMS @ ¢16.59, AGO @ ¢18.39).
  - Total sales per pump (L and GHS), total revenue per product, and live Cash in Till.
  - Mechanical / Analogue totalizer reading inputs (e.g. S3-483179, D1-232567).

### 3. Stock Dipping & Dipping Camera
- Camera capture directly at the tank dipstick with preview and save options.
- Physical dipping vs Theoretical Stock with instant color-coded variance.
- Total fuel revenue minus expenses = Cash in Till.
- Hubtel digital banking reconciliation.

### 5. Per-Manager Customizable Report Formats Studio
- **Customizable Layout for All Reports**: Each station manager can set their preferred structure, field labels, and layout for Morning, Evening, Price Change, and Fuel Discharge reports.
- **1-Click Presets**:
  - *Oborpah Asesewa Standard (Default)*: Authentic Ghanaian OMC layout formatted for instant executive WhatsApp delivery.
  - *Corporate OMC Ghana*: Title case station header, `GH¢` currency symbol, `Litres` unit, and formal audit note.
  - *Compact WhatsApp Summary*: Condensed single-line text for quick transmission.
  - *Detailed Full Station Audit*: Includes opening and closing meters, individual pump sales, tank dipping, itemized expenses, Hubtel balances, mechanical totalizers, and manager sign-off.
- **Granular Formatting Controls**:
  - Station name style (Uppercase vs Title Case), date formats (`DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, `D MMM YYYY`), currency (`¢`, `GH¢`, `GHS`), volume units (`L`, `Litres`).
  - Pump separator (`=`, `:`, ` - `), pump decimals (`.00` vs whole litres), individual pump sales toggle, opening meters toggle.
  - Cash account headers, custom Total Sales labels, expense presentation styles (itemized, total only, hidden), Hubtel block toggle, Analogue totalizer block toggle.
  - Custom header announcements and manager footer sign-off notes.
- **Responsive Mobile & PC Experience**:
  - **PC / Desktop**: Side-by-side two-column studio with live sticky executive message preview updating in real time as any setting or label changes.
  - **Mobile**: Touch-optimized segmented controls ($\ge 44\text{px}$ targets) for fluid toggling between Format Controls and Live Message Preview, plus a sticky mobile bottom action bar for 1-tap review and dispatch.

---

## 💻 Running Locally

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Run TypeScript and linter checks
npm run lint

# Build for production
npm run build
```

---

## 🔐 Supabase Row Level Security (RLS)

All database tables enforce RLS policies verifying `auth.uid() = owner_user_id`. The full schema is viewable inside the application under **Account Settings → SQL & RLS Schema** or in `src/services/supabaseSchema.sql`.
