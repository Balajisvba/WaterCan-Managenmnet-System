import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { BusinessStateService } from '../../../services/business-state.service';
import { Customer, Delivery } from '../../../models/app.models';

export interface MonthlyBillDialogData {
  customers: Customer[];
  selectedCustomerId?: string;
}

@Component({
  selector: 'app-monthly-bill-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDividerModule,
  ],
  template: `
    <div class="monthly-bill-container">
      <!-- Selector Header (Hidden when printing) -->
      <div class="bill-selector-bar no-print">
        <h3>Generate & Print Monthly Bill</h3>
        <div class="controls-row">
          <mat-form-field appearance="outline" class="select-field">
            <mat-label>Select Customer</mat-label>
            <mat-select [ngModel]="selectedCustomerId()" (ngModelChange)="selectedCustomerId.set($event)">
              @for (cust of data.customers; track cust.id) {
                <mat-option [value]="cust.id">
                  {{ cust.name }} ({{ cust.area || cust.mobile }})
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="date-field">
            <mat-label>Select Month</mat-label>
            <input matInput type="month" [ngModel]="selectedMonth()" (ngModelChange)="selectedMonth.set($event)" />
          </mat-form-field>

          <button mat-flat-button color="primary" class="print-action-button" [disabled]="!selectedCustomer()" (click)="printBill()">
            <mat-icon>print</mat-icon>
            Print Bill
          </button>
        </div>
      </div>

      <mat-divider class="no-print"></mat-divider>

      <!-- Printable Bill Content -->
      @if (selectedCustomer()) {
        <div class="printable-bill" id="printable-monthly-bill">
          <div class="bill-header">
            <div class="brand">
              <h2>Dhanam Agencies</h2>
              <p>Water Can Supply Management System</p>
              <p class="tagline">Monthly Water Can Statement & Tax Invoice</p>
            </div>
            <div class="bill-meta">
              <h3>MONTHLY STATEMENT</h3>
              <p><strong>Billing Month:</strong> {{ billingMonthFormatted() }}</p>
              <p><strong>Statement Date:</strong> {{ currentDate | date:'mediumDate' }}</p>
              <p><strong>Customer ID:</strong> {{ selectedCustomer()?.id }}</p>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Customer Info -->
          <div class="customer-info-section">
            <div class="info-box">
              <h4>Billed To:</h4>
              <p class="cust-name">{{ selectedCustomer()?.name }}</p>
              <p><strong>Mobile:</strong> {{ selectedCustomer()?.mobile }}</p>
              <p><strong>Area:</strong> {{ selectedCustomer()?.area }}</p>
              <p><strong>Address:</strong> {{ selectedCustomer()?.address }}</p>
            </div>
            <div class="info-box text-right">
              <h4>Security & Deposit Info:</h4>
              <p><strong>Security Deposit:</strong> ₹{{ selectedCustomer()?.depositAmount || 0 }}</p>
              <p><strong>Current Outstanding Cans:</strong> {{ selectedCustomer()?.outstandingCan || 0 }} Cans</p>
              <p><strong>Total Account Balance Due:</strong> <span class="highlight-balance">₹{{ selectedCustomer()?.pendingAmount || 0 }}</span></p>
            </div>
          </div>

          <!-- Itemized Deliveries Table -->
          <div class="table-section">
            <h4>Delivery Breakdown for {{ billingMonthFormatted() }}</h4>
            <table class="statement-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Delivery ID</th>
                  <th class="text-center">Filled Delivered</th>
                  <th class="text-center">Empty Returned</th>
                  <th class="text-right">Rate / Can</th>
                  <th class="text-right">Total Amount</th>
                  <th class="text-right">Paid Amount</th>
                  <th class="text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                @for (d of monthDeliveries(); track d.id) {
                  <tr>
                    <td>{{ d.deliveryDate | date:'shortDate' }}</td>
                    <td>{{ d.id }}</td>
                    <td class="text-center">{{ d.filledCans }}</td>
                    <td class="text-center">{{ d.emptyCans }}</td>
                    <td class="text-right">₹{{ d.ratePerCan }}</td>
                    <td class="text-right">₹{{ d.totalAmount }}</td>
                    <td class="text-right">₹{{ d.paidAmount }}</td>
                    <td class="text-right">₹{{ d.balance }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="empty-row">No delivery records found for this month.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Month Summary Box -->
          <div class="summary-container">
            <div class="can-metrics">
              <div class="can-chip">
                <span>Filled Delivered:</span> <strong>{{ monthSummary().totalFilled }} Cans</strong>
              </div>
              <div class="can-chip">
                <span>Empty Returned:</span> <strong>{{ monthSummary().totalEmpty }} Cans</strong>
              </div>
            </div>

            <div class="summary-box">
              <div class="sum-row">
                <span>Month Total Invoiced:</span>
                <strong>₹{{ monthSummary().totalInvoiced | number:'1.0-2' }}</strong>
              </div>
              <div class="sum-row">
                <span>Month Amount Paid:</span>
                <strong>₹{{ monthSummary().totalPaid | number:'1.0-2' }}</strong>
              </div>
              <div class="sum-row highlight">
                <span>Month Balance Due:</span>
                <strong>₹{{ monthSummary().monthBalanceDue | number:'1.0-2' }}</strong>
              </div>
              <mat-divider></mat-divider>
              <div class="sum-row grand-total">
                <span>Total Account Balance Payable:</span>
                <strong>₹{{ selectedCustomer()?.pendingAmount || 0 | number:'1.0-2' }}</strong>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="bill-footer">
            <p>Thank you for your business! Please settle your balance due at the earliest.</p>
            <p class="small">Dhanam Agencies — Computer Generated Invoice Statement</p>
          </div>
        </div>
      } @else {
        <div class="no-customer-selected">
          <mat-icon>person_search</mat-icon>
          <p>Please select a customer above to generate the monthly bill statement.</p>
        </div>
      }
    </div>

    <mat-dialog-actions align="end" class="no-print">
      <button mat-button (click)="dialogRef.close()">Close</button>
      @if (selectedCustomer()) {
        <button mat-flat-button color="primary" (click)="printBill()">
          <mat-icon>print</mat-icon> Print Monthly Bill
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .monthly-bill-container {
      padding: 20px;
      font-family: 'Inter', Roboto, sans-serif;
      max-width: 850px;
    }
    .bill-selector-bar {
      margin-bottom: 16px;
    }
    .bill-selector-bar h3 {
      margin: 0 0 12px;
      color: #1565c0;
      font-weight: 700;
    }
    .controls-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;
    }
    .select-field { flex: 2; min-width: 240px; }
    .date-field { flex: 1; min-width: 180px; }
    .print-action-button {
      min-height: 44px;
      align-self: flex-start;
    }

    .printable-bill {
      padding: 16px 0;
      color: #333;
      line-height: 1.45;
    }
    .bill-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      gap: 20px;
    }
    .brand h2 {
      margin: 0;
      color: #1e88e5;
      font-size: 1.8rem;
      font-weight: 800;
    }
    .brand p {
      margin: 2px 0;
      color: #666;
      font-size: 0.85rem;
    }
    .brand .tagline {
      font-weight: 600;
      color: #1565c0;
    }
    .bill-meta {
      text-align: right;
    }
    .bill-meta h3 {
      margin: 0 0 6px;
      color: #1565c0;
      letter-spacing: 1px;
    }
    .bill-meta p {
      margin: 2px 0;
      font-size: 0.88rem;
    }

    .customer-info-section {
      display: flex;
      justify-content: space-between;
      margin: 16px 0;
      gap: 24px;
      align-items: flex-start;
    }
    .info-box h4 {
      margin: 0 0 6px;
      color: #777;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
    }
    .cust-name {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0 0 6px;
      color: #111;
    }
    .info-box p {
      margin: 3px 0;
      font-size: 0.9rem;
    }
    .highlight-balance {
      color: #c62828;
      font-weight: 700;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    .table-section {
      margin: 20px 0;
    }
    .table-section h4 {
      margin: 0 0 8px;
      font-size: 0.95rem;
      color: #444;
    }
    .statement-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .statement-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      padding: 8px 10px;
      border-bottom: 2px solid #cbd5e1;
    }
    .statement-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .empty-row {
      text-align: center;
      padding: 24px !important;
      color: #888;
    }

    .summary-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 20px;
      gap: 20px;
      flex-wrap: wrap;
    }
    .can-metrics {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .can-chip {
      background: #e3f2fd;
      color: #0d47a1;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 0.88rem;
    }
    .summary-box {
      width: 320px;
      background: #fafafa;
      padding: 14px 18px;
      border-radius: 10px;
      border: 1px solid #e0e0e0;
      box-shadow: none;
    }
    .sum-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 0.9rem;
    }
    .sum-row.highlight {
      color: #d32f2f;
      font-weight: 600;
    }
    .sum-row.grand-total {
      font-size: 1.05rem;
      font-weight: 700;
      color: #1565c0;
      padding-top: 8px;
    }

    .bill-footer {
      text-align: left;
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px dashed #ccc;
      color: #666;
    }
    .bill-footer p { margin: 2px 0; font-size: 0.85rem; }
    .bill-footer .small { font-size: 0.75rem; color: #999; }

    .no-customer-selected {
      text-align: center;
      padding: 40px;
      color: #888;
    }
    .no-customer-selected mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }

    @media print {
      .no-print { display: none !important; }
      .monthly-bill-container { padding: 0; max-width: 100%; }
      .printable-bill { padding: 0; }
    }
  `],
})
export class MonthlyBillDialogComponent {
  readonly dialogRef = inject(MatDialogRef<MonthlyBillDialogComponent>);
  readonly data: MonthlyBillDialogData = inject(MAT_DIALOG_DATA);
  private readonly stateService = inject(BusinessStateService);

  readonly currentDate = new Date();
  readonly selectedCustomerId = signal<string>(this.data.selectedCustomerId || (this.data.customers[0]?.id || ''));

  readonly selectedMonth = signal<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  readonly selectedCustomer = computed<Customer | undefined>(() => {
    const id = this.selectedCustomerId();
    return this.stateService.customers().find((c) => c.id === id);
  });

  readonly monthDeliveries = computed<Delivery[]>(() => {
    const custId = this.selectedCustomerId();
    const monthStr = this.selectedMonth();
    if (!custId || !monthStr) return [];

    return this.stateService.deliveries().filter((d) => {
      return d.customerId === custId && d.deliveryDate && d.deliveryDate.startsWith(monthStr);
    });
  });

  readonly monthSummary = computed(() => {
    const deliveries = this.monthDeliveries();
    const totalFilled = deliveries.reduce((sum, d) => sum + (Number(d.filledCans) || 0), 0);
    const totalEmpty = deliveries.reduce((sum, d) => sum + (Number(d.emptyCans) || 0), 0);
    const totalInvoiced = deliveries.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
    const totalPaid = deliveries.reduce((sum, d) => sum + (Number(d.paidAmount) || 0), 0);
    const monthBalanceDue = deliveries.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);

    return {
      totalFilled,
      totalEmpty,
      totalInvoiced,
      totalPaid,
      monthBalanceDue,
    };
  });

  readonly billingMonthFormatted = computed(() => {
    const monthStr = this.selectedMonth();
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  printBill(): void {
    window.print();
  }
}
