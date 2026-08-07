import { Injectable } from '@angular/core';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver-es';
import { Customer, Delivery } from '../models/app.models';
import { formatMonthLabel, summarizeDeliveries } from '../utils/monthly-delivery-utils';
import { toDateKey } from '../utils/date-utils';

export interface MonthlyDeliveryExcelInput {
  companyName: string;
  monthKey: string;
  deliveries: Delivery[];
  customers: Customer[];
}

@Injectable({ providedIn: 'root' })
export class MonthlyDeliveryExcelService {
  async export(input: MonthlyDeliveryExcelInput): Promise<void> {
    const workbook = new Workbook();
    workbook.creator = input.companyName;
    workbook.created = new Date();

    const customerNames = new Map(input.customers.map((customer) => [customer.id, customer.name]));
    this.createSummarySheet(workbook, input, customerNames);
    this.createDeliverySheet(workbook, input, customerNames);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `monthly-delivery-report-${input.monthKey}.xlsx`);
  }

  private createSummarySheet(
    workbook: Workbook,
    input: MonthlyDeliveryExcelInput,
    customerNames: Map<string, string>,
  ): void {
    const sheet = workbook.addWorksheet('Monthly Summary');
    const summary = summarizeDeliveries(input.deliveries);

    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = input.companyName;
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1565C0' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:G2');
    sheet.getCell('A2').value = `Monthly Delivery Report - ${formatMonthLabel(input.monthKey)}`;
    sheet.getCell('A2').font = { bold: true, size: 12, color: { argb: '1E3A5F' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    sheet.addRow(['Metric', 'Value']);
    sheet.addRow(['Number of deliveries', summary.deliveryCount]);
    sheet.addRow(['Filled cans delivered', summary.filledCans]);
    sheet.addRow(['Empty cans returned', summary.emptyCans]);
    sheet.addRow(['Total invoiced', summary.totalInvoiced]);
    sheet.addRow(['Total paid', summary.totalPaid]);
    sheet.addRow(['Balance due', summary.totalBalance]);
    this.styleHeader(sheet.getRow(4));
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 18;
    [8, 9, 10].forEach((rowNumber) => {
      sheet.getCell(rowNumber, 2).numFmt = '₹#,##0.00';
    });

    sheet.addRow([]);
    const customerHeader = sheet.addRow([
      'Customer ID',
      'Customer Name',
      'Deliveries',
      'Filled Cans',
      'Empty Cans',
      'Invoiced',
      'Balance Due',
    ]);
    this.styleHeader(customerHeader);

    const customerRows = this.customerSummaryRows(input.deliveries, customerNames);
    if (customerRows.length === 0) {
      sheet.addRow(['No deliveries recorded for this month']);
    } else {
      customerRows.forEach((row) => sheet.addRow(row));
      const firstDataRow = customerHeader.number + 1;
      const lastDataRow = firstDataRow + customerRows.length - 1;
      for (let row = firstDataRow; row <= lastDataRow; row++) {
        sheet.getCell(row, 6).numFmt = '₹#,##0.00';
        sheet.getCell(row, 7).numFmt = '₹#,##0.00';
      }
    }

    [15, 25, 13, 15, 15, 16, 16].forEach((width, index) => {
      sheet.getColumn(index + 1).width = Math.max(sheet.getColumn(index + 1).width || 0, width);
    });
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
  }

  private createDeliverySheet(
    workbook: Workbook,
    input: MonthlyDeliveryExcelInput,
    customerNames: Map<string, string>,
  ): void {
    const sheet = workbook.addWorksheet('Delivery Details');
    const header = sheet.addRow([
      'Delivery Date',
      'Delivery ID',
      'Customer ID',
      'Customer Name',
      'Filled Cans',
      'Empty Cans',
      'Rate per Can',
      'Total Invoiced',
      'Paid Amount',
      'Balance Due',
      'Driver',
      'Remarks',
    ]);
    this.styleHeader(header);

    input.deliveries.forEach((delivery) => {
      const row = sheet.addRow([
        toDateKey(delivery.deliveryDate),
        this.safeExcelValue(delivery.id),
        this.safeExcelValue(delivery.customerId),
        this.safeExcelValue(customerNames.get(delivery.customerId) || delivery.customerName),
        delivery.filledCans,
        delivery.emptyCans,
        delivery.ratePerCan,
        delivery.totalAmount,
        delivery.paidAmount,
        delivery.balance,
        this.safeExcelValue(delivery.driverName),
        this.safeExcelValue(delivery.remarks),
      ]);
      [7, 8, 9, 10].forEach((columnNumber) => {
        row.getCell(columnNumber).numFmt = '₹#,##0.00';
      });
    });

    [15, 16, 15, 25, 14, 14, 15, 17, 15, 15, 18, 30].forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private customerSummaryRows(
    deliveries: Delivery[],
    customerNames: Map<string, string>,
  ): Array<unknown[]> {
    const byCustomer = new Map<string, Delivery[]>();
    deliveries.forEach((delivery) => {
      const entries = byCustomer.get(delivery.customerId) || [];
      entries.push(delivery);
      byCustomer.set(delivery.customerId, entries);
    });

    return Array.from(byCustomer.entries())
      .sort(([, first], [, second]) => first[0].customerName.localeCompare(second[0].customerName))
      .map(([customerId, entries]) => {
        const summary = summarizeDeliveries(entries);
        return [
          this.safeExcelValue(customerId),
          this.safeExcelValue(customerNames.get(customerId) || entries[0].customerName),
          summary.deliveryCount,
          summary.filledCans,
          summary.emptyCans,
          summary.totalInvoiced,
          summary.totalBalance,
        ];
      });
  }

  private styleHeader(row: import('exceljs').Row): void {
    row.font = { bold: true, color: { argb: 'FFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E88E5' } };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  private safeExcelValue(value: unknown): unknown {
    return typeof value === 'string' && /^[=+\-@]/.test(value) ? `'${value}` : value;
  }
}
