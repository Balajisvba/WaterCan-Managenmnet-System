import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Customer, Payment } from '../../../models/app.models';
import { toLocalDateInputValue } from '../../../utils/date-utils';

export interface PaymentDialogData {
  payment?: Payment;
  customers: Customer[];
}

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.payment ? 'Edit Payment' : 'Record Customer Payment' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Customer</mat-label>
          <mat-select formControlName="customerId" (selectionChange)="onCustomerSelect($event.value)">
            @for (cust of data.customers; track cust.id) {
              <mat-option [value]="cust.id">
                {{ cust.name }} (Ledger: ₹{{ cust.depositAmount }})
              </mat-option>
            }
          </mat-select>
          @if (form.get('customerId')?.hasError('required')) {
            <mat-error>Customer selection is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Payment Amount (₹)</mat-label>
          <input matInput type="number" formControlName="amount" min="1" />
          @if (form.get('amount')?.hasError('required')) {
            <mat-error>Payment amount is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Payment Date</mat-label>
          <input matInput type="date" formControlName="paymentDate" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Payment Remarks</mat-label>
          <textarea matInput formControlName="remarks" rows="2" placeholder="e.g. Cash / UPI payment..."></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">Save Payment</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding-top: 8px;
    }
    .full-width {
      grid-column: span 2;
    }
  `],
})
export class PaymentDialogComponent {
  readonly dialogRef = inject(MatDialogRef<PaymentDialogComponent>);
  readonly data: PaymentDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    customerId: [this.data.payment?.customerId || '', Validators.required],
    customerName: [this.data.payment?.customerName || '', Validators.required],
    amount: [this.data.payment?.amount ?? 0, [Validators.required, Validators.min(1)]],
    paymentDate: [
      this.data.payment?.paymentDate
        ? this.data.payment.paymentDate.split('T')[0]
        : toLocalDateInputValue(new Date()),
      Validators.required,
    ],
    remarks: [this.data.payment?.remarks || ''],
  });

  onCustomerSelect(customerId: string): void {
    const cust = this.data.customers.find((c) => c.id === customerId);
    if (cust) {
      this.form.patchValue({ customerName: cust.name });
    }
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close({
        ...this.data.payment,
        ...this.form.value,
      });
    }
  }
}
