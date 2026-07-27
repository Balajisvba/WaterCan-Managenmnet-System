import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { BusinessStateService } from '../../services/business-state.service';
import { CustomerService } from '../../services/customer.service';
import { DeliveryService } from '../../services/delivery.service';
import { ExpenseService } from '../../services/expense.service';
import { PaymentService } from '../../services/payment.service';
import { MissingCanService } from '../../services/missing-can.service';
import { NotificationService } from '../../services/notification.service';
import { ExcelService } from '../../services/excel.service';
import { CardComponent } from '../../shared/components/card/card';
import { ChartComponent } from '../../shared/components/chart/chart';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';
import { CustomerDialogComponent } from '../../shared/components/dialogs/customer-dialog';
import { DeliveryDialogComponent } from '../../shared/components/dialogs/delivery-dialog';
import { ExpenseDialogComponent } from '../../shared/components/dialogs/expense-dialog';
import { PaymentDialogComponent } from '../../shared/components/dialogs/payment-dialog';
import { MissingCanDialogComponent } from '../../shared/components/dialogs/missing-can-dialog';
import { InvoiceDialogComponent } from '../../shared/components/dialogs/invoice-dialog';
import { Delivery } from '../../models/app.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    RouterLink,
    CardComponent,
    ChartComponent,
    DataTableComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  private readonly stateService = inject(BusinessStateService);
  private readonly customerService = inject(CustomerService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly expenseService = inject(ExpenseService);
  private readonly paymentService = inject(PaymentService);
  private readonly missingCanService = inject(MissingCanService);
  private readonly excelService = inject(ExcelService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly summary = this.stateService.dashboardSummary;

  readonly recentColumns: TableColumn[] = [
    { key: 'id', label: 'Delivery ID' },
    { key: 'customerName', label: 'Customer' },
    { key: 'filledCans', label: 'Filled Cans', type: 'number' },
    { key: 'emptyCans', label: 'Empty Cans', type: 'number' },
    { key: 'totalAmount', label: 'Total Amount', type: 'currency' },
    { key: 'paidAmount', label: 'Paid Amount', type: 'currency' },
    { key: 'balance', label: 'Balance', type: 'currency' },
    { key: 'deliveryDate', label: 'Date', type: 'date' },
    { key: 'actions', label: 'Actions', type: 'actions' },
  ];

  openNewCustomer(): void {
    const dialogRef = this.dialog.open(CustomerDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.customerService.add(result);
        this.notification.success('Customer registered successfully');
      }
    });
  }

  openNewDelivery(): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, {
      width: '600px',
      data: { customers: this.stateService.customers() },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deliveryService.add(result);
        this.notification.success('Delivery recorded successfully');
      }
    });
  }

  openNewPayment(): void {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '550px',
      data: { customers: this.stateService.customers() },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.paymentService.add(result);
        this.notification.success('Payment recorded successfully');
      }
    });
  }

  openNewExpense(): void {
    const dialogRef = this.dialog.open(ExpenseDialogComponent, { width: '550px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.expenseService.add(result);
        this.notification.success('Expense recorded successfully');
      }
    });
  }

  openNewMissingCan(): void {
    const dialogRef = this.dialog.open(MissingCanDialogComponent, {
      width: '600px',
      data: { customers: this.stateService.customers() },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.missingCanService.add(result);
        this.notification.success('Missing can entry recorded');
      }
    });
  }

  async exportExcel(): Promise<void> {
    await this.excelService.exportWorkbook();
    this.notification.success('Excel workbook exported');
  }

  printInvoice(delivery: Delivery): void {
    this.dialog.open(InvoiceDialogComponent, {
      width: '650px',
      data: delivery,
    });
  }
}
