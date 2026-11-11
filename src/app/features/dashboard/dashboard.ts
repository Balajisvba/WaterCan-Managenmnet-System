import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from '@angular/material/chips';
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
import { toDateKey, toLocalDateInputValue } from '../../utils/date-utils';
import { RoleService } from '../../services/role.service';
import { DriverService } from '../../services/driver.service';
import { InventoryService } from '../../services/inventory.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatChipsModule,
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
  readonly isDriver = inject(RoleService).isDriver;
  readonly driverSettlements = inject(DriverService).settlements;
  readonly totalDriverSettlements = computed(() => this.driverSettlements().reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
  private readonly inventoryService = inject(InventoryService);
  private readonly settingsService = inject(SettingsService);
  readonly availableStock = this.inventoryService.currentStock;
  readonly inventoryMonthStats = computed(() => {
    const prefix = toDateKey(new Date()).slice(0, 7);
    const rows = this.inventoryService.transactions().filter((item) => item.transactionDate.startsWith(prefix));
    return {
      received: rows.reduce((sum, item) => sum + item.stockIn, 0),
      delivered: rows.filter((item) => item.type === 'Delivery').reduce((sum, item) => sum + item.stockOut, 0),
      returned: rows.filter((item) => item.type === 'Delivery' || item.type === 'Return').reduce((sum, item) => sum + item.stockIn, 0),
    };
  });
  readonly inventoryLowStock = computed(() => this.availableStock() <= (this.settingsService.settings().lowStockThreshold ?? 15));

  readonly datePreset = signal<'all' | 'today' | 'custom'>('all');
  readonly selectedDate = signal<string>('');
  readonly pendingOrders = computed(() => this.stateService.deliveries().filter((delivery) => delivery.status === 'Pending'));

  readonly isFiltered = computed(() => {
    return this.datePreset() !== 'all' || !!this.selectedDate();
  });

  setPreset(preset: 'all' | 'today'): void {
    this.datePreset.set(preset);
    if (preset === 'all') {
      this.selectedDate.set('');
    } else if (preset === 'today') {
      const todayStr = toLocalDateInputValue(new Date());
      this.selectedDate.set(todayStr);
    }
  }

  onDateSelect(dateStr: string): void {
    if (!dateStr) {
      this.setPreset('all');
      return;
    }
    const todayStr = toLocalDateInputValue(new Date());
    if (dateStr === todayStr) {
      this.datePreset.set('today');
    } else {
      this.datePreset.set('custom');
    }
    this.selectedDate.set(dateStr);
  }

  clearDateFilter(): void {
    this.setPreset('all');
  }

  readonly summary = computed(() => {
    const rawSummary = this.stateService.dashboardSummary();
    const targetDate = this.selectedDate();

    if (!targetDate) {
      return {
        ...rawSummary,
        dateLabel: 'All Time Summary',
        revenueSubtitle: "Today's Total Deliveries Invoiced",
        deliveriesSubtitle: 'Completed Orders Today',
        expensesSubtitle: 'Daily Operational Cost',
        profitSubtitle: 'Net Margin Today',
        salesSubtitle: 'Current Month Total Sales',
        deliveriesTitle: 'Recent Deliveries',
      };
    }

    const deliveries = this.stateService.deliveries();
    const expenses = this.stateService.expenses();
    const missing = this.stateService.missingCans();
    const customers = this.stateService.customers();

    const filteredDeliveries = deliveries.filter(
      (d) => d.status === 'Delivered' && toDateKey(d.deliveryDate) === targetDate
    );
    const filteredExpenses = expenses.filter(
      (e) => toDateKey(e.date) === targetDate
    );
    const filteredMissing = missing.filter(
      (m) => toDateKey(m.createdAt) === targetDate
    );

    const todayRevenue = filteredDeliveries.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
    const todayDeliveries = filteredDeliveries.length;
    const todayExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const todayProfit = todayRevenue - todayExpenses;

    const outstandingCans = customers.reduce((sum, c) => sum + (Number(c.outstandingCan) || 0), 0);
    const missingCansCount = filteredMissing.reduce((sum, m) => sum + (Number(m.lostQuantity) || 0), 0);
    const activeCustomers = customers.filter((c) => c.status === 'Active').length;
    const monthlyRevenue = todayRevenue;

    const [year, month, day] = targetDate.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const recentDeliveries = [...filteredDeliveries].sort(
      (a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
    );

    return {
      todayRevenue,
      todayDeliveries,
      todayExpenses,
      todayProfit,
      outstandingCans,
      missingCans: missingCansCount,
      activeCustomers,
      monthlyRevenue,
      revenueTrend: rawSummary.revenueTrend,
      expenseTrend: rawSummary.expenseTrend,
      profitTrend: rawSummary.profitTrend,
      missingTrend: rawSummary.missingTrend,
      recentDeliveries,
      dateLabel: formattedDate,
      revenueSubtitle: `Revenue on ${formattedDate}`,
      deliveriesSubtitle: `Orders on ${formattedDate}`,
      expensesSubtitle: `Expenses on ${formattedDate}`,
      profitSubtitle: `Net Margin on ${formattedDate}`,
      salesSubtitle: `Sales on ${formattedDate}`,
      deliveriesTitle: `Deliveries on ${formattedDate}`,
    };
  });

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

  openNewDelivery(): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, {
      width: '600px',
      data: { customers: this.stateService.customers(), mode: 'order' },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.deliveryService.add(result);
          this.notification.success('Order added successfully');
        } catch {
          this.notification.error('Failed to record delivery');
        }
      }
    });
  }

  openPendingDelivery(order: Delivery): void {
    const dialogRef = this.dialog.open(DeliveryDialogComponent, {
      width: '600px',
      data: {
        delivery: order,
        customers: this.stateService.customers(),
        drivers: this.stateService.drivers().filter((driver) => driver.status === 'Active'),
        mode: 'delivery',
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) return;
      try {
        await this.deliveryService.update(result);
        this.notification.success('Delivery confirmed successfully');
      } catch {
        this.notification.error('Failed to confirm delivery');
      }
    });
  }

  openNewPayment(): void {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '550px',
      data: { customers: this.stateService.customers() },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.paymentService.add(result);
          this.notification.success('Payment recorded successfully');
        } catch {
          this.notification.error('Failed to record payment');
        }
      }
    });
  }

  openNewExpense(): void {
    const dialogRef = this.dialog.open(ExpenseDialogComponent, { width: '550px' });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.expenseService.add(result);
          this.notification.success('Expense recorded successfully');
        } catch {
          this.notification.error('Failed to record expense');
        }
      }
    });
  }

  openNewMissingCan(): void {
    const dialogRef = this.dialog.open(MissingCanDialogComponent, {
      width: '600px',
      data: { customers: this.stateService.customers() },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.missingCanService.add(result);
          this.notification.success('Missing can entry recorded');
        } catch {
          this.notification.error('Failed to record missing can');
        }
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
