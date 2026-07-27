import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BusinessStateService } from '../../services/business-state.service';
import { DeliveryService } from '../../services/delivery.service';
import { ExcelService } from '../../services/excel.service';
import { NotificationService } from '../../services/notification.service';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';
import { DeliveryDialogComponent } from '../../shared/components/dialogs/delivery-dialog';
import { InvoiceDialogComponent } from '../../shared/components/dialogs/invoice-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { Delivery } from '../../models/app.models';

@Component({
  selector: 'app-deliveries',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    SearchBoxComponent,
    DataTableComponent,
  ],
  templateUrl: './deliveries.html',
  styleUrl: './deliveries.css',
})
export class DeliveriesComponent {
  private readonly stateService = inject(BusinessStateService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly excelService = inject(ExcelService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly searchTerm = signal<string>('');
  readonly dateFilter = signal<string>('');
  readonly deliveries = this.deliveryService.deliveries;

  readonly filteredDeliveries = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const dateStr = this.dateFilter().trim();

    return this.deliveries().filter((d) => {
      const matchesSearch =
        !term ||
        d.customerName.toLowerCase().includes(term) ||
        d.driverName.toLowerCase().includes(term) ||
        d.id.toLowerCase().includes(term) ||
        (d.remarks && d.remarks.toLowerCase().includes(term));

      const matchesDate = !dateStr || (d.deliveryDate && d.deliveryDate.startsWith(dateStr));

      return matchesSearch && matchesDate;
    });
  });

  readonly columns: TableColumn[] = [
    { key: 'id', label: 'Delivery ID' },
    { key: 'customerName', label: 'Customer' },
    { key: 'filledCans', label: 'Filled Cans', type: 'number' },
    { key: 'emptyCans', label: 'Empty Cans', type: 'number' },
    { key: 'ratePerCan', label: 'Rate/Can', type: 'currency' },
    { key: 'totalAmount', label: 'Total Invoiced', type: 'currency' },
    { key: 'paidAmount', label: 'Paid Amount', type: 'currency' },
    { key: 'balance', label: 'Balance Due', type: 'currency' },
    { key: 'driverName', label: 'Driver' },
    { key: 'deliveryDate', label: 'Date', type: 'date' },
    { key: 'actions', label: 'Actions', type: 'actions' },
  ];

  openAddDialog(): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, {
      width: '600px',
      data: { customers: this.stateService.customers() },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deliveryService.add(result);
        this.notification.success('Delivery log recorded');
      }
    });
  }

  openEditDialog(delivery: Delivery): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, {
      width: '600px',
      data: {
        delivery,
        customers: this.stateService.customers(),
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deliveryService.update(result);
        this.notification.success('Delivery record updated');
      }
    });
  }

  openInvoice(delivery: Delivery): void {
    this.dialog.open(InvoiceDialogComponent, {
      width: '650px',
      data: delivery,
    });
  }

  confirmDelete(delivery: Delivery): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Delivery',
        message: `Are you sure you want to delete Delivery ${delivery.id} for ${delivery.customerName}?`,
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deliveryService.remove(delivery.id);
        this.notification.success('Delivery log removed');
      }
    });
  }

  exportExcel(): void {
    this.excelService.exportToCsv(this.deliveries(), 'aqua-deliveries');
    this.notification.success('Deliveries exported');
  }
}
