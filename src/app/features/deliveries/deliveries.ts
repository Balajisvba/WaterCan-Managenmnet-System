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
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';
import { DeliveryDialogComponent } from '../../shared/components/dialogs/delivery-dialog';
import { InvoiceDialogComponent } from '../../shared/components/dialogs/invoice-dialog';
import { MonthlyBillDialogComponent } from '../../shared/components/dialogs/monthly-bill-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { Delivery } from '../../models/app.models';
import { isDateInRange, toLocalDateInputValue } from '../../utils/date-utils';
import { RoleService } from '../../services/role.service';

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
  readonly isAdmin = inject(RoleService).isAdmin;

  readonly searchTerm = signal<string>('');
  readonly datePreset = signal<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');

  readonly isFiltered = computed(() => {
    return !!(this.startDate() || this.endDate() || this.searchTerm());
  });

  readonly deliveries = this.deliveryService.deliveries;
  readonly pendingOrders = computed(() => this.deliveries().filter((delivery) => delivery.status === 'Pending'));
  readonly completedDeliveries = computed(() => this.deliveries().filter((delivery) => delivery.status === 'Delivered'));

  setPreset(preset: 'all' | 'today' | 'week' | 'month'): void {
    this.datePreset.set(preset);
    const now = new Date();
    const todayStr = toLocalDateInputValue(now);

    if (preset === 'all') {
      this.startDate.set('');
      this.endDate.set('');
    } else if (preset === 'today') {
      this.startDate.set(todayStr);
      this.endDate.set(todayStr);
    } else if (preset === 'week') {
      const pastWeek = new Date(now);
      pastWeek.setDate(now.getDate() - 6);
      this.startDate.set(toLocalDateInputValue(pastWeek));
      this.endDate.set(todayStr);
    } else if (preset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      this.startDate.set(toLocalDateInputValue(monthStart));
      this.endDate.set(todayStr);
    }
  }

  onCustomDateChange(start: string, end: string): void {
    this.datePreset.set('custom');
    this.startDate.set(start || '');
    this.endDate.set(end || '');
  }

  clearDateFilter(): void {
    this.setPreset('all');
    this.searchTerm.set('');
  }

  readonly filteredDeliveries = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const start = this.startDate();
    const end = this.endDate();

    return this.deliveries().filter((d) => {
      const matchesSearch =
        !term ||
        d.customerName.toLowerCase().includes(term) ||
        d.driverName.toLowerCase().includes(term) ||
        d.id.toLowerCase().includes(term) ||
        (d.remarks && d.remarks.toLowerCase().includes(term));

      const matchesDate = (!start && !end) || isDateInRange(d.deliveryDate, start, end);

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
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'driverName', label: 'Driver' },
    { key: 'deliveryDate', label: 'Date', type: 'date' },
    { key: 'actions', label: 'Actions', type: 'actions' },
  ];

  openAddDialog(): void {
    this.openAddOrderDialog();
  }

  openAddOrderDialog(): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, {
      width: '600px',
      data: { customers: this.stateService.customers(), mode: 'order' },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.deliveryService.add(result);
          this.notification.success('Order added');
        } catch (err) {
          this.notification.error('Failed to log delivery');
        }
      }
    });
  }

  openDeliveryDialog(order: Delivery): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, { width: '600px', data: { delivery: order, customers: this.stateService.customers(), drivers: this.stateService.drivers().filter((driver) => driver.status === 'Active'), mode: 'delivery' } });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try { await this.deliveryService.update(result); this.notification.success('Delivery confirmed'); }
      catch { this.notification.error('Failed to confirm delivery'); }
    });
  }

  cancelOrder(order: Delivery): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { width: '400px', data: { title: 'Cancel Order', message: `Cancel order ${order.id} for ${order.customerName}?` } });
    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      try { await this.deliveryService.update({ ...order, status: 'Cancelled' }); this.notification.success('Order cancelled'); }
      catch { this.notification.error('Failed to cancel order'); }
    });
  }

  openEditDialog(delivery: Delivery): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, {
      width: '600px',
      data: {
        delivery,
        customers: this.stateService.customers(),
        drivers: this.stateService.drivers().filter((driver) => driver.status === 'Active'),
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.deliveryService.update({ ...result, status: result.status || delivery.status });
          this.notification.success('Delivery record updated');
        } catch (err) {
          this.notification.error('Failed to update delivery');
        }
      }
    });
  }

  openInvoice(delivery: Delivery): void {
    this.dialog.open(InvoiceDialogComponent, {
      width: '650px',
      data: delivery,
    });
  }

  openMonthlyBillDialog(customerId?: string): void {
    this.dialog.open(MonthlyBillDialogComponent, {
      width: '800px',
      data: {
        customers: this.stateService.customers(),
        selectedCustomerId: customerId,
      },
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
    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        try {
          await this.deliveryService.remove(delivery.id);
          this.notification.success('Delivery log removed');
        } catch (err) {
          this.notification.error('Failed to remove delivery');
        }
      }
    });
  }

  async markDelivered(delivery: Delivery): Promise<void> {
    try {
      await this.deliveryService.update({ ...delivery, status: 'Delivered' });
      this.notification.success(`Delivery ${delivery.id} marked as Delivered`);
    } catch (err) {
      this.notification.error('Failed to update delivery status');
    }
  }

  exportExcel(): void {
    this.excelService.exportToCsv(this.completedDeliveries(), 'aqua-deliveries');
    this.notification.success('Deliveries exported');
  }
}
