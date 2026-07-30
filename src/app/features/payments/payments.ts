import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BusinessStateService } from '../../services/business-state.service';
import { PaymentService } from '../../services/payment.service';
import { ExcelService } from '../../services/excel.service';
import { NotificationService } from '../../services/notification.service';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';
import { PaymentDialogComponent } from '../../shared/components/dialogs/payment-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { CardComponent } from '../../shared/components/card/card';
import { Payment } from '../../models/app.models';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    SearchBoxComponent,
    DataTableComponent,
    CardComponent,
  ],
  templateUrl: './payments.html',
  styleUrl: './payments.css',
})
export class PaymentsComponent {
  private readonly stateService = inject(BusinessStateService);
  private readonly paymentService = inject(PaymentService);
  private readonly excelService = inject(ExcelService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly searchTerm = signal<string>('');
  readonly payments = this.paymentService.payments;

  readonly filteredPayments = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.payments();
    return this.payments().filter(
      (p) =>
        p.customerName.toLowerCase().includes(term) ||
        (p.remarks && p.remarks.toLowerCase().includes(term)) ||
        p.id.toLowerCase().includes(term)
    );
  });

  readonly totalPaymentsCollected = computed(() =>
    this.payments().reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );

  readonly columns: TableColumn[] = [
    { key: 'id', label: 'Payment ID' },
    { key: 'customerName', label: 'Customer' },
    { key: 'amount', label: 'Paid Amount', type: 'currency' },
    { key: 'paymentDate', label: 'Payment Date', type: 'date' },
    { key: 'remarks', label: 'Remarks / Mode' },
    { key: 'actions', label: 'Actions', type: 'actions' },
  ];

  openAddDialog(): void {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '550px',
      data: { customers: this.stateService.customers() },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.paymentService.add(result);
          this.notification.success('Customer payment recorded');
        } catch {
          this.notification.error('Failed to record payment');
        }
      }
    });
  }

  openEditDialog(payment: Payment): void {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '550px',
      data: {
        payment,
        customers: this.stateService.customers(),
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.paymentService.update(result);
          this.notification.success('Payment record updated');
        } catch {
          this.notification.error('Failed to update payment');
        }
      }
    });
  }

  confirmDelete(payment: Payment): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Payment',
        message: `Are you sure you want to delete Payment ${payment.id} (₹${payment.amount} from ${payment.customerName})?`,
      },
    });
    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        try {
          await this.paymentService.remove(payment.id);
          this.notification.success('Payment record deleted');
        } catch {
          this.notification.error('Failed to delete payment');
        }
      }
    });
  }

  exportExcel(): void {
    this.excelService.exportToCsv(this.payments(), 'aqua-payments');
    this.notification.success('Payment history exported');
  }
}
