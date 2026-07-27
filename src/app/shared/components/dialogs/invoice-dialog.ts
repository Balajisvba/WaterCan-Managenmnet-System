import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Delivery } from '../../../models/app.models';

@Component({
  selector: 'app-invoice-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule],
  template: `
    <div class="invoice-container" id="printable-invoice">
      <div class="invoice-header">
        <div class="company-brand">
          <h2>AquaTrack</h2>
          <p>Water Can Supply Management</p>
        </div>
        <div class="invoice-meta">
          <h3>INVOICE</h3>
          <p><strong>Invoice #:</strong> {{ data.id }}</p>
          <p><strong>Date:</strong> {{ data.deliveryDate | date:'mediumDate' }}</p>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="invoice-parties">
        <div class="party-info">
          <h4>Customer Details:</h4>
          <p class="name">{{ data.customerName }}</p>
          <p><strong>Customer ID:</strong> {{ data.customerId }}</p>
        </div>
        <div class="party-info text-right">
          <h4>Delivery Info:</h4>
          <p><strong>Driver:</strong> {{ data.driverName || 'N/A' }}</p>
          <p><strong>Remarks:</strong> {{ data.remarks || 'Standard Delivery' }}</p>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Item Description</th>
            <th class="text-center">Filled Delivered</th>
            <th class="text-center">Empty Returned</th>
            <th class="text-right">Rate / Can</th>
            <th class="text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>20L Water Can Supply</td>
            <td class="text-center">{{ data.filledCans }}</td>
            <td class="text-center">{{ data.emptyCans }}</td>
            <td class="text-right">₹{{ data.ratePerCan }}</td>
            <td class="text-right">₹{{ data.totalAmount }}</td>
          </tr>
        </tbody>
      </table>

      <div class="invoice-summary">
        <div class="summary-row">
          <span>Total Invoiced:</span>
          <strong>₹{{ data.totalAmount }}</strong>
        </div>
        <div class="summary-row">
          <span>Amount Paid:</span>
          <strong>₹{{ data.paidAmount }}</strong>
        </div>
        <mat-divider></mat-divider>
        <div class="summary-row total">
          <span>Balance Due:</span>
          <strong>₹{{ data.balance }}</strong>
        </div>
      </div>

      <div class="invoice-footer">
        <p>Thank you for choosing AquaTrack Water Supply!</p>
        <p class="small">System generated receipt - No signature required.</p>
      </div>
    </div>

    <mat-dialog-actions align="end" class="no-print">
      <button mat-button (click)="dialogRef.close()">Close</button>
      <button mat-flat-button color="primary" (click)="printInvoice()">
        <mat-icon>print</mat-icon> Print Invoice
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .invoice-container {
      padding: 24px;
      font-family: 'Inter', Roboto, sans-serif;
      color: #333;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .company-brand h2 {
      margin: 0;
      color: #1e88e5;
      font-size: 1.6rem;
      font-weight: 700;
    }
    .company-brand p {
      margin: 2px 0 0;
      color: #666;
      font-size: 0.85rem;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta h3 {
      margin: 0 0 6px;
      color: #1565c0;
      letter-spacing: 1px;
    }
    .invoice-meta p {
      margin: 2px 0;
      font-size: 0.85rem;
    }
    .invoice-parties {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
    }
    .party-info h4 {
      margin: 0 0 6px;
      color: #555;
      font-size: 0.85rem;
      text-transform: uppercase;
    }
    .party-info .name {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 4px;
    }
    .party-info p {
      margin: 2px 0;
      font-size: 0.9rem;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .invoice-table th, .invoice-table td {
      border-bottom: 1px solid #e0e0e0;
      padding: 10px 12px;
      font-size: 0.9rem;
    }
    .invoice-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #444;
    }

    .invoice-summary {
      width: 260px;
      margin-left: auto;
      margin-top: 20px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 0.9rem;
    }
    .summary-row.total {
      font-size: 1.1rem;
      color: #1565c0;
      padding-top: 10px;
    }

    .invoice-footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px dashed #ccc;
      color: #666;
    }
    .invoice-footer p {
      margin: 4px 0;
      font-size: 0.85rem;
    }
    .invoice-footer .small {
      font-size: 0.75rem;
      color: #999;
    }

    @media print {
      .no-print { display: none !important; }
      .invoice-container { padding: 0; }
    }
  `],
})
export class InvoiceDialogComponent {
  readonly dialogRef = inject(MatDialogRef<InvoiceDialogComponent>);
  readonly data: Delivery = inject(MAT_DIALOG_DATA);

  printInvoice(): void {
    window.print();
  }
}
