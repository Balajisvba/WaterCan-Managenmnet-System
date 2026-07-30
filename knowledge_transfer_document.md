# AquaTrack - Knowledge Transfer (KT) Document & User Manual

Welcome to **AquaTrack**, an enterprise-grade, offline-first Water Can Supply Management System built with **Angular 20**, **Angular Signals**, **RxJS**, **Angular Material**, and **ExcelJS**.

This document serves as an end-to-end Knowledge Transfer (KT) guide for business owners, operators, and developers. It details system architecture, reactive data flow, feature modules, step-by-step onboarding, and daily operations.

---

## 1. System Overview & Architecture

AquaTrack replaces manual Excel spreadsheets with a modern, responsive Angular application while maintaining 100% compatibility with standard Excel workbooks (`.xlsx`).

```mermaid
flowchart TD
    User([Business Operator]) --> UI[Angular 20 Material UI]
    UI --> State[BusinessStateService Signals]
    State --> Services[Customer, Delivery, Expense, Payment, MissingCan Services]
    Services <--> LocalStorage[(LocalStorage Cache)]
    Services <--> ExcelEngine[ExcelJS Engine]
    ExcelEngine <--> Workbook[Multi-Sheet Excel Workbook .xlsx]
```

### Key Technical Characteristics
- **Offline-First & Serverless**: Operates without any backend server. All operational data persists in browser `LocalStorage` and exports directly to `.xlsx`.
- **Reactive State Management**: Built using **Angular Signals** (`computed()` signals). Adding a delivery, payment, expense, or missing can instantly updates customer balances, ledger stats, KPI cards, and trend charts without reloading.
- **ExcelJS Multi-Sheet Synchronization**: Reads and writes multi-sheet Excel workbooks (`Dashboard`, `Customers`, `Daily Deliveries`, `Expenses`, `Profit`, `Missing Cans`, `Payments`, `Settings`) without formatting corruption.

---

## 2. Application Modules & Features

AquaTrack includes 8 core operational modules:

| Module | Purpose | Key Metrics / Actions |
| :--- | :--- | :--- |
| **Login / Authentication** | Secure local operator session | Username: `admin` \| Password: `admin123` |
| **Operations Dashboard** | Real-time business overview | 8 KPI Cards, 4 Trend Charts (Revenue, Expense, Profit, Missing Cans), Recent Deliveries Table, Quick Actions |
| **Customer Directory** | Manage customer accounts & ledgers | Customer ID, Mobile, Area, Address, Security Deposit, Outstanding Cans, Financial Balance, Status |
| **Deliveries Module** | Record daily can supply & returns | Filled Cans Delivered, Empty Cans Returned, Rate/Can, Auto-Calculated Total & Balance, Driver Name, Invoice Printing |
| **Expenses Module** | Track business operating costs | Categories (Fuel, Salary, Maintenance, Electricity, Vehicle, Misc), Daily & Monthly Expense totals |
| **Payments Module** | Customer payments & ledger updates | Record Cash/UPI payments, update customer outstanding balances reactively |
| **Missing Cans Tracker** | Inventory loss & recovery tracking | Track missing vs recovered cans, auto-calculate unrecovered lost cans & replacement cost |
| **Reports Analytics** | Financial & inventory reports | Daily/Weekly/Monthly/Yearly revenue, Net profit margins, Tabbed ledgers, Excel/CSV Export, Print view |
| **Settings & Backup** | System configuration & data sync | Company profile, Can pricing defaults, Dark Mode toggle, Full Multi-Sheet Excel Backup & Restore |

---

## 3. Financial & Inventory Calculation Formulas

AquaTrack maintains deterministic business logic across all modules:

1. **Total Filled Cans Delivered**:
   $$\text{Total Delivered} = \sum \text{Delivery Filled Cans}$$

2. **Total Empty Cans Returned**:
   $$\text{Total Returned} = \sum \text{Delivery Empty Cans}$$

3. **Customer Outstanding Cans**:
   $$\text{Outstanding Cans} = \max(0, \text{Initial Outstanding} + \text{Total Delivered} - \text{Total Returned} - \text{Lost Cans})$$

4. **Delivery Total & Balance**:
   $$\text{Delivery Invoiced Amount} = \text{Filled Cans} \times \text{Rate Per Can}$$
   $$\text{Delivery Balance Due} = \max(0, \text{Delivery Invoiced Amount} - \text{Delivery Paid Amount})$$

5. **Customer Financial Balance (Ledger)**:
   $$\text{Customer Outstanding Balance} = \sum \text{Invoiced Deliveries} + \sum \text{Missing Can Losses} - \sum \text{Payments}$$

6. **Net Daily / Monthly Profit**:
   $$\text{Net Profit} = \text{Total Revenue} - \text{Total Operating Expenses}$$

---

## 4. Step-by-Step User Onboarding Guide

### Step 1: Logging In
1. Open the AquaTrack Web Application.
2. Enter the operator credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Click **Sign In to System** to access the Operations Center.

> [!TIP]
> Check the **Keep session active** box to remember your session on the local device.

---

### Step 2: System Configuration (First-Time Setup)
1. Navigate to **Settings** from the left sidebar.
2. Update **Company Name** (e.g., *AquaTrack Supply Co.*).
3. Set your **Standard Water Can Price** (default: `₹40`).
4. Set your **Standard Customer Security Deposit** (default: `₹500`).
5. Choose your UI preference: **Light Mode** or **Dark Mode**.
6. Click **Save Preferences**.

---

### Step 3: Registering Customers
1. Go to **Customers** module or click **Add Customer** from the Dashboard.
2. Click **Register Customer**.
3. Fill in details:
   - **Customer Name**: e.g., *Rahul Kumar*
   - **Mobile Number**: *9876543210*
   - **Area / Locality**: *Sector 15, Noida*
   - **Address**: Full delivery address
   - **Deposit Amount**: Security deposit paid (e.g., `₹500`)
   - **Initial Outstanding Cans**: Cans currently held by customer
4. Click **Save Customer**.

---

### Step 4: Recording Daily Deliveries & Printing Invoices
1. Go to **Deliveries** or click **Log Delivery** on the Dashboard.
2. Select the **Customer** from the dropdown.
3. Enter:
   - **Filled Cans Delivered**: e.g., `5`
   - **Empty Cans Returned**: e.g., `3`
   - **Rate Per Can**: (auto-populated, e.g., `₹40`)
   - **Paid Amount**: Amount paid on delivery (e.g., `₹100`)
   - **Driver Name**: e.g., *Aman*
   - **Delivery Date**: Select date
4. Notice **Total Amount** (`₹200`) and **Remaining Balance** (`₹100`) auto-calculate instantly.
5. Click **Save Delivery**.
6. To issue a receipt, click the **Print** icon on the delivery row to generate a printable invoice layout.

---

### Step 5: Recording Customer Payments
1. When a customer pays outstanding dues (via Cash/UPI), go to **Payments**.
2. Click **Record Payment**.
3. Select the customer name. The modal displays their current ledger deposit/balance.
4. Enter the **Payment Amount** and **Date**.
5. Click **Save Payment**. Customer ledger balances update reactively across all screens.

---

### Step 6: Recording Business Expenses
1. Go to **Expenses** module.
2. Click **Record Expense**.
3. Select category: **Fuel**, **Salary**, **Maintenance**, **Electricity**, **Vehicle**, or **Miscellaneous**.
4. Enter **Amount** (e.g., `₹1,200` for Fuel) and description.
5. Click **Save Expense**. Dashboard **Today's Expenses** and **Profit** cards update immediately.

---

### Step 7: Managing Missing / Unreturned Cans
1. If cans are misplaced or damaged by a customer, go to **Missing Cans**.
2. Click **Record Missing Can**.
3. Select the customer and enter **Missing Quantity** (e.g., `4`) and **Recovered Quantity** (e.g., `1`).
4. The system calculates **Lost Cans** (`3`) and **Loss Amount** (`₹120`).
5. Click **Save Record**. The loss is accounted in financial reports.

---

### Step 8: Generating Reports & Excel Workbooks
1. Go to **Reports** to view Daily, Weekly, Monthly, and Yearly revenue breakdowns.
2. Switch tabs to inspect:
   - **Customer Outstanding Ledger**
   - **Expenses Breakdown**
   - **Missing Can Losses**
3. Click **Export Excel Report** or **Export CSV** to download formatted spreadsheets.
4. Click **Print Report** for hardcopy audit records.

---

### Step 9: Offline Excel Backup & Restore
1. Go to **Settings** or click **Export Excel** on the top toolbar.
2. Click **Export Backup** to download `aquatrack-workbook.xlsx`.
3. To transfer data to another computer or restore from a saved workbook:
   - Click **Import Workbook**.
   - Select your `.xlsx` file. All 8 sheets synchronize instantly into LocalStorage and UI signals.

---

## 5. Troubleshooting & Best Practices

- **Browser Storage Clean-up**: Do not clear browser cache/cookies without first clicking **Export Excel** in Settings to back up your data.
- **Offline Functionality**: AquaTrack runs completely offline without internet connection once loaded in your browser.
- **Multi-Device Sync**: Use **Export Excel** on Device A and **Import Workbook** on Device B to transfer offline databases seamlessly.



Prompt to migration


# AquaTrack Storage Layer Migration Prompt (Excel → Shared Google Sheets)

Act as a Senior Angular 20 Architect and Migration Engineer.

I already have a fully completed Angular 20 application named **AquaTrack - Water Can Supply Management System**.

## IMPORTANT

This project is already fully developed.

**DO NOT:**

* Create a new Angular project.
* Change the project structure.
* Change the folder structure.
* Change any UI.
* Change any HTML.
* Change any SCSS.
* Change Angular Material components.
* Change Angular Signals.
* Change routing.
* Change business logic.
* Change calculations.
* Change reports.
* Change dashboard calculations.
* Change Excel Import.
* Change Excel Export.
* Rewrite existing modules.

The application is already working correctly.

The **ONLY objective** is to replace the current Excel/LocalStorage storage mechanism with a **shared Google Sheet** so that multiple users (drivers, office staff, admin) can work on the same live data.

---

# Current Architecture

Current Storage Flow

Component

↓

BusinessStateService

↓

LocalStorage

↓

ExcelJS

↓

Excel File

---

# New Required Architecture

Component

↓

BusinessStateService

↓

GoogleSheetService

↓

Google Apps Script Web API

↓

Shared Google Spreadsheet

The Google Spreadsheet becomes the **single source of truth**.

Excel is no longer the primary database.

Excel Import and Excel Export must continue working exactly as before.

---

# Migration Requirement

Do NOT modify any business logic.

Simply replace every LocalStorage/Excel read/write operation with HTTP requests to Google Apps Script.

Every existing component should continue to function without any UI changes.

The only modified layer should be the data source.

---

# Existing Modules (Do Not Modify)

* Login
* Dashboard
* Customers
* Deliveries
* Payments
* Expenses
* Missing Cans
* Reports
* Settings
* Excel Import
* Excel Export

These modules already work correctly.

Only update their storage implementation.

---

# Existing Business Logic (Must Remain Exactly the Same)

Do not modify any calculations.

Keep:

* Outstanding Can Calculation
* Revenue Calculation
* Expense Calculation
* Profit Calculation
* Customer Ledger
* Dashboard KPIs
* Missing Can Calculation
* Payment Calculation

No formula should change.

---

# Existing Signals

Angular Signals are already implemented.

Do not remove them.

Do not rewrite them.

Simply update the signal values after receiving data from Google Sheets.

---

# Replace Only These Operations

Replace

* LocalStorage.getItem()
* LocalStorage.setItem()
* LocalStorage.removeItem()

Replace ExcelJS CRUD operations used as the primary storage.

Instead use

Google Apps Script REST API

through

GoogleSheetService.

---

# Google Spreadsheet

Use one shared spreadsheet.

Spreadsheet Name

AquaTrack Database

The spreadsheet already contains the same sheets as the Excel workbook.

Sheets

* Customers
* Deliveries
* Payments
* Expenses
* MissingCans
* Settings
* Dashboard
* Reports

Do not modify sheet names.

Do not modify column names.

Do not modify column order.

The spreadsheet structure must remain identical to the current Excel workbook.

---

# Google Apps Script

Generate a complete Google Apps Script project.

The script must expose REST APIs.

Support

GET

POST

PUT

DELETE

Return JSON responses.

Enable CORS.

Deploy as Web App.

---

# Angular Changes

Create only one new service

GoogleSheetService

Responsibilities

* Read records
* Insert records
* Update records
* Delete records
* Search records
* Handle HTTP communication
* Retry failed requests
* Handle errors
* Cache data if needed

Do not modify component logic.

Update existing services to call GoogleSheetService.

---

# Services to Update

Only replace their storage implementation.

CustomerService

DeliveryService

ExpenseService

PaymentService

MissingCanService

DashboardService

BusinessStateService

Business logic must remain unchanged.

---

# Auto Refresh

Implement automatic synchronization.

Every 10 seconds

↓

Read latest data from Google Sheets

↓

Update Angular Signals

↓

Refresh Dashboard

↓

Refresh Tables

↓

Refresh Charts

No page reload.

---

# Conflict Handling

If multiple users update simultaneously

Always load the latest data from Google Sheets.

Prevent duplicate customer IDs.

Prevent duplicate delivery IDs.

Use UUIDs and timestamps.

---

# Excel

Keep existing functionality.

Excel Import

Excel Export

Backup

Restore

Do not remove any Excel features.

Excel is now only

* Import Tool
* Export Tool
* Backup Tool

Google Sheets becomes the live operational database.

---

# Error Handling

Handle

* Network failure
* Google Apps Script timeout
* Invalid response
* Missing sheet
* Missing columns
* Duplicate records

Display Angular Material Snackbars.

---

# Environment

Update only

environment.ts

environment.prod.ts

Store

* Google Apps Script URL
* Spreadsheet ID
* Auto Refresh Interval

---

# Deliverables

Generate only the migration code.

Do not generate a new project.

Do not recreate components.

Do not redesign the UI.

Generate

* Google Apps Script
* GoogleSheetService
* Updated existing services
* API integration
* Environment configuration
* Migration guide
* Google Sheet setup guide
* Apps Script deployment guide

The final application must look and behave exactly like the existing AquaTrack application.

The only difference should be that all CRUD operations use one shared Google Spreadsheet instead of LocalStorage/ExcelJS as the primary storage.






Technical Knowledge Transfer Summary
1. System Overview & Technical Stack
Framework: Angular 20 (Standalone Components, Signals Reactivity).
UI & Styling: Custom Vanilla CSS design system paired with Angular Material UI (MatTable, MatDialog, MatSort, MatPaginator, MatFormField).
State Management: Reactive state using Angular signal(), computed(), and effect().
Data & Backend Integration: Dual-mode persistence:
Remote: Google Sheets API v4 via Google OAuth 2.0 (GoogleSheetService, GoogleAuthService).
Local/Offline: Seed data fallbacks (
sample-data.ts
).
Exporting: Excel/CSV generation via exceljs (
excel.service.ts
).
2. Core Domain Models (
app.models.ts
)
Customer: Represents client accounts. Stores deposit amount, delivered/returned totals, outstanding cans, pending balance, and derived status (Active / Inactive / Pending).
Delivery: Daily transaction log (filled cans delivered, empty cans returned, rate/can, total invoiced, paid amount, balance due, driver, date).
Expense: Log of operational expenses (fuel, maintenance, salaries).
Payment: Direct payment collections credited to customer ledger balances.
MissingCan: Log of lost or unreturned cans, unrecovered count, cost per can, loss amount, and lifecycle status (Open / Recovered / Closed).
DashboardSummary & ReportSummary: Computed view models powering executive dashboards and financial reports.
3. Services Architecture (
src/app/services/
)
Service	Primary Responsibility & Core Methods
BusinessStateService	Central reactive state hub. Computes derived customer metrics, ledger balances, local date matching (YYYY-MM-DD), and dashboard/report summary signals.
CustomerService	Handles CRUD for customers (add, update, remove, load). Syncs with Google Sheets.
DeliveryService	Manages delivery records. Calculates invoice total and balance due on CRUD operations.
PaymentService	Manages direct payment collections.
ExpenseService	Manages operational expense records.
MissingCanService	Manages missing can inventory loss tracking and cost calculations.
GoogleSheetService	Encapsulates Google Sheets API v4 calls (GET, POST, PUT). Implements retry logic, offline status tracking (isOnline signal), and A1 column notation conversion.
GoogleAuthService	Manages OAuth 2.0 token acquisition and session lifecycle.
ExcelService	Handles CSV export functionality.
NotificationService	Displays Material SnackBar toast alerts (success, error).
ThemeService	Handles dynamic light/dark mode toggles on document root.
4. Feature Modules & Pages (
src/app/features/
)
DashboardComponent (
dashboard.ts
): Executive dashboard rendering 8 KPI cards, 4 trend charts, single-date calendar picker, and quick action dialog triggers.
DeliveriesComponent (
deliveries.ts
): Delivery log manager, date range presets (All Time, Today, This Week, This Month, Custom), single invoice printer, and monthly billing statement generator.
CustomersComponent (
customers.ts
): Customer directory, deposit tracking, status badges, and pending balance totals.
PaymentsComponent: Payment log history and collection entry.
ExpensesComponent: Categorized expense management.
MissingCansComponent: Missing can inventory recovery & loss tracking.
ReportsComponent: Financial summaries and annual revenue trends.
SettingsComponent: Application pricing, default rates, and company info configuration.
5. Shared Components & Dialogs (
src/app/shared/components/
)
DataTableComponent (
data-table.ts
): Generic MatTable wrapper with pagination, sorting, action buttons, and Angular effect() signal change detection.
Dialogs:
DeliveryDialogComponent: Calculates invoice totals and populates customer names automatically.
PaymentDialogComponent: Direct payment log form.
MissingCanDialogComponent: Auto-calculates unrecovered loss quantities and loss amounts.
CustomerDialogComponent: Customer profile form.
MonthlyBillDialogComponent: Itemized printable customer monthly statement.
InvoiceDialogComponent: Printable single delivery receipt.
ConfirmDialogComponent: Reusable confirmation modal.
6. Key Business Formulas
Outstanding Cans
=
Deposit Cans
+
Total Delivered
−
Total Returned
−
Lost Cans
Outstanding Cans=Deposit Cans+Total Delivered−Total Returned−Lost Cans
Invoice Total
=
Filled Cans
×
Rate Per Can
Invoice Total=Filled Cans×Rate Per Can
Balance Due
=
max
⁡
(
0
,
Invoice Total
−
Paid Amount
)
Balance Due=max(0,Invoice Total−Paid Amount)
Net Profit
=
Gross Revenue
−
Operational Expenses
Net Profit=Gross Revenue−Operational Expenses
For the full detailed document, please refer to 
technical_knowledge_transfer.md
.

Technical Knowledge Transfer
12:46 PM





Technical Knowledge Transfer (KT) Document
WaterCan Management System
1. Executive Summary & System Overview
The WaterCan Management System is a modern, responsive web application designed for managing daily water can distribution operations, customer ledgers, inventory tracking, operational expenses, payment collections, and financial analytics.

Key Architecture Highlights
Framework: Angular 20 with Standalone Components and Signals Reactivity.
UI & Styling: Custom Vanilla CSS Design System with Angular Material UI (Material Tables, Dialogs, Inputs, Icons).
State Management: Reactive State using Angular signal(), computed(), and effect().
Backend & Persistence: Google Sheets API v4 Integration via Google OAuth 2.0 with automatic seed-data fallbacks for standalone/offline capability.
Charts & Reports: Custom responsive trend chart visualization and Excel/CSV exporting (exceljs).
2. Core Domain Models (src/app/models/app.models.ts)
Model	Purpose	Key Attributes
Customer	Represents registered clients receiving water can deliveries.	id, name, mobile, alternateMobile, address, area, depositAmount, outstandingCan, totalDelivered, totalReturned, pendingAmount, status (Active / Inactive / Pending)
Delivery	Log of filled water cans delivered and empty cans returned per customer transaction.	id, customerId, customerName, filledCans, emptyCans, ratePerCan, totalAmount, paidAmount, balance, driverName, deliveryDate, remarks
Expense	Log of daily business operational expenses (fuel, maintenance, vehicle upkeep, salaries).	id, date, category, amount, remarks, createdAt
Payment	Record of direct financial payments made by customers against outstanding ledger balances.	id, customerId, customerName, amount, paymentDate, remarks
MissingCan	Inventory loss tracking when delivered cans are lost or unreturned.	id, customerId, customerName, missingQuantity, recoveredQuantity, lostQuantity, costPerCan, lossAmount, status (Open / Recovered / Closed)
Settings	Global application configuration.	id, companyName, companyLogo, canPrice, depositAmount, theme (light/dark), darkMode
DashboardSummary	Computed view model powering the executive operations center.	todayRevenue, todayDeliveries, todayExpenses, todayProfit, outstandingCans, missingCans, activeCustomers, monthlyRevenue, trend arrays (revenue, expense, profit, missing), recentDeliveries
ReportSummary	Computed financial metrics model for reporting modules.	dailyRevenue, weeklyRevenue, monthlyRevenue, yearlyRevenue, profit, expenses, customerOutstanding, missingCanLoss
3. Services Architecture (src/app/services/)
3.1 BusinessStateService
Role: Centralized reactive state store and business logic hub.
Signals:
rawCustomers, deliveries, payments, expenses, missingCans.
Computed Signals:
customers: Calculates per-customer metrics dynamically:
totalDelivered = sum of all filled cans delivered.
totalReturned = sum of all empty cans returned.
outstandingCan = (initialDeposit + totalDelivered - totalReturned - lostCans).
pendingAmount = total balance due across all customer deliveries.
status = derived via deriveCustomerStatus().
dashboardSummary: Computes date-filtered KPIs (Revenue, Deliveries, Expenses, Profit, Trends) using local date formatting (YYYY-MM-DD).
reportSummary: Calculates daily, weekly, monthly, and annual financial metrics.
3.2 Domain Data Services (customer.service.ts, delivery.service.ts, expense.service.ts, payment.service.ts, missing-can.service.ts)
Role: Execute CRUD operations against Google Sheets API and update reactive signals.
Key Methods:
load(): Asynchronously reads entity rows from Google Sheets API; falls back to seed data if remote sheet is empty or unavailable.
add(entity): Calculates invoice/balance totals, assigns unique ID, pushes row to Google Sheets via GoogleSheetService.create(), and calls load() to refresh signals.
update(entity): Asynchronously updates existing record in Google Sheets via GoogleSheetService.update().
remove(id): Deletes record by ID via GoogleSheetService.delete().
3.3 GoogleSheetService & GoogleAuthService
GoogleAuthService: Handles Google OAuth 2.0 authentication flow, token storage, and session lifecycle (getAccessToken(), logout()).
GoogleSheetService:
Encapsulates HTTP calls to https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}.
Implements retry logic (2 retries with 500ms delay) and error handling (401/403 triggers auto-logout).
Converts JavaScript arrays to A1 notation ranges (e.g. Deliveries!A2:K).
Signal isOnline: Tracks network connectivity and API availability.
3.4 Utility & System Services
ExcelService: Exports data tables to CSV format (exportToCsv()) and generates structured Excel workbooks.
NotificationService: Wraps Angular Material MatSnackBar for toast alerts (success(), error(), info()).
ThemeService: Manages light/dark theme toggles dynamically (data-theme="dark" attribute on document body).
SettingsService: Manages application default rates, business details, and company branding.
4. Features & Pages (src/app/features/)

src/app/features/
├── auth/           --> Google Sign-In & Auth guard
├── customers/      --> Customer management table & dialogs
├── dashboard/      --> Executive Operations Center (8 KPIs, 4 Charts, Date Filter)
├── deliveries/     --> Daily Delivery Logs, Monthly Bill generator, CSV export
├── expenses/       --> Operational expense tracking
├── missing-cans/   --> Unreturned / lost inventory can tracking
├── payments/       --> Customer direct payment recording
├── reports/        --> Financial summaries & trend reports
└── settings/       --> Pricing, company info & theme configuration
Key Component Workflows
1. DashboardComponent (features/dashboard/)
Displays 8 KPI Cards: Today's Revenue, Today's Deliveries, Today's Expenses, Today's Profit, Outstanding Cans, Missing Cans, Active Customers, Monthly Revenue.
Features 4 Interactive Trend Charts: Revenue, Expense, Profit, Missing Cans.
Single-Date Calendar Picker & Date Preset Toolbar (All Time, Today).
Action buttons directly trigger async dialogs for logging deliveries, adding customers, recording payments, adding expenses, or reporting missing cans.
2. DeliveriesComponent (features/deliveries/)
Manages daily log entries for filled water cans and empty returned cans.
Date Filtering Presets: All Time, Today, This Week, This Month, Custom Date Range.
Invoice Generation: Open single-delivery printable invoice (InvoiceDialogComponent).
Monthly Billing: Generates itemized monthly statements per customer (MonthlyBillDialogComponent).
3. CustomersComponent (features/customers/)
Displays customer directory with contact information, area, deposit amount, outstanding cans, and pending balance.
Dynamically updates customer status (Active, Inactive, Pending) based on transactions.
5. Shared Components & Dialogs (src/app/shared/components/)
5.1 Reusable UI Components
DataTableComponent: Reusable generic table wrapper around Angular Material Table (MatTableDataSource). Supports sorting (MatSort), pagination (MatPaginator), action buttons (View, Edit, Print, Delete), and signal reactivity via Angular effect().
CardComponent: Reusable KPI summary card widget with custom icons and color schemes.
ChartComponent: Visual bar chart container for trend analysis.
SearchBoxComponent: Real-time debounced text filter input.
5.2 Modal Dialogs (src/app/shared/components/dialogs/)
DeliveryDialogComponent: Reactive form for logging deliveries; automatically calculates totalAmount = filledCans * ratePerCan and balance = totalAmount - paidAmount. Populates customerName automatically upon customer selection.
PaymentDialogComponent: Form to log direct customer payment; updates customer name and date.
ExpenseDialogComponent: Form for recording operational expenses.
MissingCanDialogComponent: Form to log lost/damaged cans; automatically calculates lostQuantity = missingQuantity - recoveredQuantity and lossAmount = lostQuantity * costPerCan.
CustomerDialogComponent: Form to register/edit customer profiles.
MonthlyBillDialogComponent: Generates a printable monthly bill statement with transaction history and summary totals.
ConfirmDialogComponent: Reusable confirmation modal before performing delete actions.
6. Utilities (src/app/utils/)
6.1 date-utils.ts
toLocalDateInputValue(date): Formats Date objects or ISO strings into local date strings (YYYY-MM-DD) without UTC timezone shifting.
isDateInRange(value, start, end): Checks if a given date string falls within a specified [start, end] window.
6.2 sample-data.ts
Provides seed data generators (buildSeedCustomers(), buildSeedDeliveries(), buildSeedExpenses(), etc.) for offline fallback mode.
generateId(prefix): Utility to create structured unique identifiers (e.g. CUST-101, DEL-202).
7. Business Logic & Mathematical Formulas
Can Inventory Balance: 
Outstanding Cans
=
Deposit Cans
+
Total Delivered
−
Total Returned
−
Lost Cans
Outstanding Cans=Deposit Cans+Total Delivered−Total Returned−Lost Cans

Delivery Invoice Math: 
Total Invoiced
=
Filled Cans
×
Rate Per Can
Total Invoiced=Filled Cans×Rate Per Can 
Balance Due
=
max
⁡
(
0
,
Total Invoiced
−
Paid Amount
)
Balance Due=max(0,Total Invoiced−Paid Amount)

Missing Can Loss Math: 
Lost Quantity
=
max
⁡
(
0
,
Missing Quantity
−
Recovered Quantity
)
Lost Quantity=max(0,Missing Quantity−Recovered Quantity) 
Loss Amount
=
Lost Quantity
×
Cost Per Can
Loss Amount=Lost Quantity×Cost Per Can

Net Profit Math: 
Net Profit
=
Gross Revenue
−
Total Expenses
Net Profit=Gross Revenue−Total Expenses

Customer Status Rules:

Status is explicitly Inactive if set to Inactive.
Status is Active if balance due > 0 or outstanding cans > 0 or status set to Active.
Otherwise, status defaults to Pending.
8. Summary of Recent Architectural Enhancements
Async Reactivity: Dialog save callbacks in components now properly await service promises before showing notification snackbars and refreshing views.
Local Timezone Formatting: Replaced toISOString().split('T')[0] with local YYYY-MM-DD formatting to prevent date shifts across timezones (e.g. IST +05:30).
Data Table Signal Reactivity: Updated DataTableComponent to use Angular 20 effect() triggers for automatic change detection when signal inputs update.

