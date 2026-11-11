import { Injectable, inject } from '@angular/core';
import { Workbook, Worksheet } from 'exceljs';
import { saveAs } from 'file-saver-es';
import { Customer, Delivery, DriverCashSettlement, Expense, InventoryTransaction, MissingCan, Payment, ReportSummary, Settings } from '../models/app.models';
import { SettingsService } from './settings.service';
import { CustomerService } from './customer.service';
import { DeliveryService } from './delivery.service';
import { ExpenseService } from './expense.service';
import { PaymentService } from './payment.service';
import { MissingCanService } from './missing-can.service';
import { DriverService } from './driver.service';
import { InventoryService } from './inventory.service';

export interface ExcelWorkbookData {
  dashboard: unknown[];
  customers: Customer[];
  deliveries: Delivery[];
  expenses: Expense[];
  missing: MissingCan[];
  payments: Payment[];
  profit: unknown[];
  settings: Settings[];
  driverSettlements: DriverCashSettlement[];
  inventory: InventoryTransaction[];
}

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private readonly settingsService = inject(SettingsService);
  private readonly customerService = inject(CustomerService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly expenseService = inject(ExpenseService);
  private readonly paymentService = inject(PaymentService);
  private readonly missingCanService = inject(MissingCanService);
  private readonly driverService = inject(DriverService);
  private readonly inventoryService = inject(InventoryService);

  async importWorkbook(file: File): Promise<boolean> {
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('The workbook is larger than the 10 MB restore limit');
      }

      const workbook = new Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      const data = this.serializeWorkbook(workbook);

      await this.customerService.replaceAll(data.customers);
      await this.deliveryService.replaceAll(data.deliveries);
      await this.expenseService.replaceAll(data.expenses);
      await this.paymentService.replaceAll(data.payments);
      await this.missingCanService.replaceAll(data.missing);
      await this.settingsService.replaceAll(data.settings);
      if (data.inventory.length > 0) {
        await this.inventoryService.replaceAll(data.inventory);
      }
      return true;
    } catch (err) {
      console.error('Error importing workbook:', err);
      return false;
    }
  }

  async exportWorkbook(data?: ExcelWorkbookData): Promise<void> {
    const activeData: ExcelWorkbookData = data || {
      dashboard: [],
      customers: this.customerService.customers(),
      deliveries: this.deliveryService.deliveries(),
      expenses: this.expenseService.expenses(),
      missing: this.missingCanService.missingCans(),
      payments: this.paymentService.payments(),
      profit: [],
      settings: [this.settingsService.settings()],
      driverSettlements: this.driverService.settlements(),
      inventory: this.inventoryService.transactions(),
    };

    const workbook = new Workbook();
    workbook.creator = 'Dhanam Agencies';
    workbook.created = new Date();

    this.createSheet(workbook, 'Dashboard', activeData.dashboard.length ? activeData.dashboard : [{ Metrics: 'Dhanam Agencies Management System Backup' }]);
    this.createSheet(workbook, 'Customers', activeData.customers);
    this.createSheet(workbook, 'Daily Deliveries', activeData.deliveries);
    this.createSheet(workbook, 'Expenses', activeData.expenses);
    this.createSheet(workbook, 'Profit', activeData.profit.length ? activeData.profit : [{ Note: 'Computed Profit Ledger' }]);
    this.createSheet(workbook, 'Missing Cans', activeData.missing);
    this.createSheet(workbook, 'Payments', activeData.payments);
    this.createSheet(workbook, 'Settings', activeData.settings);
    this.createSheet(workbook, 'Driver Cash Settlements', activeData.driverSettlements);
    this.createSheet(workbook, 'Inventory', activeData.inventory);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `dhanam-agencies-workbook-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  async exportReportSummary(report: ReportSummary): Promise<void> {
    const workbook = new Workbook();
    workbook.creator = 'Dhanam Agencies';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Report Summary');
    sheet.addRow(['Metric', 'Value']);
    sheet.addRow(['Daily Revenue', report.dailyRevenue]);
    sheet.addRow(['Weekly Revenue', report.weeklyRevenue]);
    sheet.addRow(['Monthly Revenue', report.monthlyRevenue]);
    sheet.addRow(['Yearly Revenue', report.yearlyRevenue]);
    sheet.addRow(['Total Expenses', report.expenses]);
    sheet.addRow(['Net Profit', report.profit]);
    sheet.addRow(['Customer Outstanding Balance', report.customerOutstanding]);
    sheet.addRow(['Missing Can Loss Amount', report.missingCanLoss]);

    sheet.columns.forEach((column) => {
      column.width = 30;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `dhanam-agencies-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportToCsv<T>(data: T[], filename: string): void {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const val = (row as Record<string, unknown>)[header];
        const text = String(val ?? '');
        const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
        const escaped = safeText.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  }

  private createSheet<T>(workbook: Workbook, name: string, rows: T[]): void {
    const sheet = workbook.addWorksheet(name);
    if (!rows || rows.length === 0) {
      return;
    }
    const headers = Object.keys(rows[0] as Record<string, unknown>);
    sheet.addRow(headers);

    // Apply header style
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E88E5' },
    };

    rows.forEach((row) => sheet.addRow(headers.map((header) => this.safeWorkbookValue((row as Record<string, unknown>)[header]))));

    sheet.columns.forEach((col) => {
      col.width = 20;
    });
  }

  private serializeWorkbook(workbook: Workbook): ExcelWorkbookData {
    const dashboardSheet = workbook.getWorksheet('Dashboard');
    const customersSheet = workbook.getWorksheet('Customers');
    const deliverySheet = workbook.getWorksheet('Daily Deliveries') || workbook.getWorksheet('Deliveries');
    const expensesSheet = workbook.getWorksheet('Expenses');
    const profitSheet = workbook.getWorksheet('Profit');
    const missingSheet = workbook.getWorksheet('Missing Cans') || workbook.getWorksheet('MissingCans');
    const paymentsSheet = workbook.getWorksheet('Payments');
    const settingsSheet = workbook.getWorksheet('Settings');
    const driverSettlementsSheet = workbook.getWorksheet('Driver Cash Settlements');
    const inventorySheet = workbook.getWorksheet('Inventory');

    return {
      dashboard: dashboardSheet ? this.rowsToObjects(dashboardSheet) : [],
      customers: customersSheet ? this.rowsToObjects<Customer>(customersSheet) : [],
      deliveries: deliverySheet ? this.rowsToObjects<Delivery>(deliverySheet) : [],
      expenses: expensesSheet ? this.rowsToObjects<Expense>(expensesSheet) : [],
      profit: profitSheet ? this.rowsToObjects(profitSheet) : [],
      missing: missingSheet ? this.rowsToObjects<MissingCan>(missingSheet) : [],
      payments: paymentsSheet ? this.rowsToObjects<Payment>(paymentsSheet) : [],
      settings: settingsSheet ? this.rowsToObjects<Settings>(settingsSheet) : [],
      driverSettlements: driverSettlementsSheet ? this.rowsToObjects<DriverCashSettlement>(driverSettlementsSheet) : [],
      inventory: inventorySheet ? this.rowsToObjects<InventoryTransaction>(inventorySheet) : [],
    };
  }

  private rowsToObjects<T>(sheet: Worksheet): T[] {
    const rows = sheet.getSheetValues();
    if (!rows || rows.length < 2) {
      return [];
    }

    let headerRowIndex = 1;
    while (headerRowIndex < rows.length && !Array.isArray(rows[headerRowIndex])) {
      headerRowIndex++;
    }

    const headerRow = rows[headerRowIndex];
    if (!Array.isArray(headerRow)) {
      return [];
    }

    const headers = headerRow.slice(1).map((val) => String(val ?? '').trim());

    return rows
      .slice(headerRowIndex + 1)
      .map((row) => {
        if (!Array.isArray(row)) return null;
        const values = row.slice(1);
        const obj: Record<string, unknown> = {};
        let hasValue = false;

        headers.forEach((header, idx) => {
          if (header) {
            const rawVal = values[idx] ?? '';
            obj[header] = typeof rawVal === 'object' && rawVal !== null && 'result' in rawVal ? (rawVal as { result: unknown }).result : rawVal;
            if (rawVal !== '') hasValue = true;
          }
        });

        return hasValue ? (obj as T) : null;
      })
      .filter((item): item is T => item !== null);
  }

  private safeWorkbookValue(value: unknown): unknown {
    if (typeof value === 'string' && /^[=+\-@]/.test(value)) {
      return `'${value}`;
    }
    return value;
  }
}
