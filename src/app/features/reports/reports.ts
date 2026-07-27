import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { BusinessStateService } from '../../services/business-state.service';
import { ReportService } from '../../services/report.service';
import { ExcelService } from '../../services/excel.service';
import { NotificationService } from '../../services/notification.service';
import { CardComponent } from '../../shared/components/card/card';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    CardComponent,
    DataTableComponent,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class ReportsComponent {
  private readonly stateService = inject(BusinessStateService);
  private readonly reportService = inject(ReportService);
  private readonly excelService = inject(ExcelService);
  private readonly notification = inject(NotificationService);

  readonly summary = this.stateService.reportSummary;

  readonly customers = this.stateService.customers;
  readonly deliveries = this.stateService.deliveries;
  readonly expenses = this.stateService.expenses;
  readonly missingCans = this.stateService.missingCans;

  readonly customerColumns: TableColumn[] = [
    { key: 'id', label: 'Customer ID' },
    { key: 'name', label: 'Customer Name' },
    { key: 'area', label: 'Area' },
    { key: 'totalDelivered', label: 'Delivered Cans', type: 'number' },
    { key: 'outstandingCan', label: 'Outstanding Cans', type: 'number' },
    { key: 'depositAmount', label: 'Deposit', type: 'currency' },
    { key: 'status', label: 'Status', type: 'status' },
  ];

  readonly expenseColumns: TableColumn[] = [
    { key: 'id', label: 'Expense ID' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', type: 'currency' },
    { key: 'remarks', label: 'Remarks' },
  ];

  readonly missingColumns: TableColumn[] = [
    { key: 'id', label: 'Record ID' },
    { key: 'customerName', label: 'Customer' },
    { key: 'lostQuantity', label: 'Lost Cans', type: 'number' },
    { key: 'lossAmount', label: 'Loss Cost', type: 'currency' },
    { key: 'status', label: 'Status', type: 'status' },
  ];

  async exportExcelReport(): Promise<void> {
    await this.reportService.exportReportSummary(this.summary());
    this.notification.success('Excel report summary exported');
  }

  exportCustomersCsv(): void {
    this.excelService.exportToCsv(this.customers(), 'aqua-customer-report');
    this.notification.success('Customer report exported');
  }

  printReport(): void {
    window.print();
  }
}
