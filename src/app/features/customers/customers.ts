import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BusinessStateService } from '../../services/business-state.service';
import { CustomerService } from '../../services/customer.service';
import { ExcelService } from '../../services/excel.service';
import { NotificationService } from '../../services/notification.service';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table';
import { CustomerDialogComponent } from '../../shared/components/dialogs/customer-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { Customer } from '../../models/app.models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    SearchBoxComponent,
    DataTableComponent,
  ],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
})
export class CustomersComponent {
  private readonly stateService = inject(BusinessStateService);
  private readonly customerService = inject(CustomerService);
  private readonly excelService = inject(ExcelService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly searchTerm = signal<string>('');
  readonly customers = this.stateService.customers;

  readonly filteredCustomers = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.customers();
    return this.customers().filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.mobile.includes(term) ||
        c.area.toLowerCase().includes(term) ||
        c.address.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term)
    );
  });

  readonly totalPendingAmount = computed(() => {
    return this.filteredCustomers().reduce((sum, c) => sum + ((c.balanceDue ?? c.pendingAmount) || 0), 0);
  });

  readonly columns: TableColumn[] = [
    { key: 'id', label: 'Customer ID' },
    { key: 'name', label: 'Customer Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'area', label: 'Area' },
    { key: 'depositAmount', label: 'Deposit Amount', type: 'currency' },
    { key: 'outstandingCan', label: 'Outstanding Cans', type: 'number' },
    { key: 'totalDelivered', label: 'Total Delivered', type: 'number' },
    { key: 'totalReturned', label: 'Total Returned', type: 'number' },
    { key: 'balanceDue', label: 'Balance Due', type: 'currency' },
    { key: 'pendingAmount', label: 'Pending Amount', type: 'currency' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'actions', label: 'Actions', type: 'actions' },
  ];

  openAddDialog(): void {
    const dialogRef = this.dialog.open(CustomerDialogComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.customerService.add(result);
          this.notification.success('Customer registered successfully');
        } catch {
          this.notification.error('Failed to register customer');
        }
      }
    });
  }

  openEditDialog(customer: Customer): void {
    const dialogRef = this.dialog.open(CustomerDialogComponent, {
      width: '600px',
      data: customer,
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.customerService.update(result);
          this.notification.success('Customer updated successfully');
        } catch {
          this.notification.error('Failed to update customer');
        }
      }
    });
  }

  confirmDelete(customer: Customer): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Customer',
        message: `Are you sure you want to delete ${customer.name}? All transaction logs will remain saved.`,
      },
    });
    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        try {
          await this.customerService.remove(customer.id);
          this.notification.success('Customer deleted successfully');
        } catch {
          this.notification.error('Failed to delete customer');
        }
      }
    });
  }

  exportExcel(): void {
    this.excelService.exportToCsv(this.customers(), 'aqua-customers');
    this.notification.success('Customer list exported');
  }
}
