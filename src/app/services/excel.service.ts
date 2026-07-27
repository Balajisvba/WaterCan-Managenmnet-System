import { Injectable, inject } from '@angular/core';
import { Workbook, Worksheet } from 'exceljs';
import { saveAs } from 'file-saver-es';
import { Customer, Delivery, Expense, MissingCan, Payment, ReportSummary, Settings } from '../models/app.models';
import { StorageService } from './storage.service';
import { CustomerService } from './customer.service';
import { DeliveryService } from './delivery.service';
import { ExpenseService } from './expense.service';
import { PaymentService } from './payment.service';
import { MissingCanService } from './missing-can.service';

export interface ExcelWorkbookData {
  dashboard: unknown[];
  customers: Customer[];
  deliveries: Delivery[];
  expenses: Expense[];
  missing: MissingCan[];
  payments: Payment[];
  profit: unknown[];
  settings: Settings[];
}

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private readonly storageService = inject(StorageService);
  private readonly customerService = inject(CustomerService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly expenseService = inject(ExpenseService);
  private readonly paymentService = inject(PaymentService);
  private readonly missingCanService = inject(MissingCanService);

  private readonly workbookKey = 'aqua-workbook';

  async importWorkbook(file: File): Promise<boolean> {
    try {
      const workbook = new Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      const data = this.serializeWorkbook(workbook);
      this.storageService.setItem(this.workbookKey, data);

      if (data.customers && data.customers.length > 0) {
        this.customerService.setAll(data.customers);
      }
      if (data.deliveries && data.deliveries.length > 0) {
        this.deliveryService.setAll(data.deliveries);
      }
      if (data.expenses && data.expenses.length > 0) {
        this.expenseService.setAll(data.expenses);
      }
      if (data.payments && data.payments.length > 0) {
        this.paymentService.setAll(data.payments);
      }
      if (data.missing && data.missing.length > 0) {
        this.missingCanService.setAll(data.missing);
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
      settings: [
        this.storageService.getItem<Settings>('aqua-settings') || {
          companyName: 'AquaTrack Supply Co.',
          companyLogo: '',
          canPrice: 40,
          depositAmount: 500,
          theme: 'light',
          darkMode: false,
          backupDate: new Date().toISOString(),
        },
      ],
    };

    const workbook = new Workbook();
    workbook.creator = 'AquaTrack';
    workbook.created = new Date();

    this.createSheet(workbook, 'Dashboard', activeData.dashboard.length ? activeData.dashboard : [{ Metrics: 'AquaTrack Management System Backup' }]);
    this.createSheet(workbook, 'Customers', activeData.customers);
    this.createSheet(workbook, 'Daily Deliveries', activeData.deliveries);
    this.createSheet(workbook, 'Expenses', activeData.expenses);
    this.createSheet(workbook, 'Profit', activeData.profit.length ? activeData.profit : [{ Note: 'Computed Profit Ledger' }]);
    this.createSheet(workbook, 'Missing Cans', activeData.missing);
    this.createSheet(workbook, 'Payments', activeData.payments);
    this.createSheet(workbook, 'Settings', activeData.settings);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `aquatrack-workbook-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  async exportReportSummary(report: ReportSummary): Promise<void> {
    const workbook = new Workbook();
    workbook.creator = 'AquaTrack';
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
    saveAs(blob, `aquatrack-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportToCsv<T>(data: T[], filename: string): void {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const val = (row as Record<string, unknown>)[header];
        const escaped = ('' + (val ?? '')).replace(/"/g, '\\"');
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

    rows.forEach((row) => sheet.addRow(headers.map((header) => (row as Record<string, unknown>)[header])));

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

    return {
      dashboard: dashboardSheet ? this.rowsToObjects(dashboardSheet) : [],
      customers: customersSheet ? this.rowsToObjects<Customer>(customersSheet) : [],
      deliveries: deliverySheet ? this.rowsToObjects<Delivery>(deliverySheet) : [],
      expenses: expensesSheet ? this.rowsToObjects<Expense>(expensesSheet) : [],
      profit: profitSheet ? this.rowsToObjects(profitSheet) : [],
      missing: missingSheet ? this.rowsToObjects<MissingCan>(missingSheet) : [],
      payments: paymentsSheet ? this.rowsToObjects<Payment>(paymentsSheet) : [],
      settings: settingsSheet ? this.rowsToObjects<Settings>(settingsSheet) : [],
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
}
