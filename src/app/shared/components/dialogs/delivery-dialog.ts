import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Customer, Delivery } from '../../../models/app.models';

export interface DeliveryDialogData {
  delivery?: Delivery;
  customers: Customer[];
  defaultCanPrice?: number;
}

@Component({
  selector: 'app-delivery-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.delivery ? 'Edit Delivery Record' : 'Create New Delivery' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Customer</mat-label>
          <mat-select formControlName="customerId" (selectionChange)="onCustomerSelect($event.value)">
            @for (cust of data.customers; track cust.id) {
              <mat-option [value]="cust.id">{{ cust.name }} ({{ cust.area }})</mat-option>
            }
          </mat-select>
          @if (form.get('customerId')?.hasError('required')) {
            <mat-error>Customer selection is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Filled Cans Delivered</mat-label>
          <input matInput type="number" formControlName="filledCans" min="1" (input)="recalculate()" />
          @if (form.get('filledCans')?.hasError('required')) {
            <mat-error>Filled cans count is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Empty Cans Returned</mat-label>
          <input matInput type="number" formControlName="emptyCans" min="0" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Rate Per Can (₹)</mat-label>
          <input matInput type="number" formControlName="ratePerCan" min="0" (input)="recalculate()" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Total Amount (₹)</mat-label>
          <input matInput type="number" formControlName="totalAmount" readonly />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Paid Amount (₹)</mat-label>
          <input matInput type="number" formControlName="paidAmount" min="0" (input)="recalculate()" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Remaining Balance (₹)</mat-label>
          <input matInput type="number" formControlName="balance" readonly />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Driver Name</mat-label>
          <input matInput formControlName="driverName" placeholder="e.g. Aman" />
          @if (form.get('driverName')?.hasError('required')) {
            <mat-error>Driver name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Delivery Date</mat-label>
          <input matInput type="date" formControlName="deliveryDate" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Remarks</mat-label>
          <textarea matInput formControlName="remarks" rows="2" placeholder="Optional notes..."></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">
        Save Delivery
      </button>
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
export class DeliveryDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<DeliveryDialogComponent>);
  readonly data: DeliveryDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    customerId: [this.data.delivery?.customerId || '', Validators.required],
    customerName: [this.data.delivery?.customerName || '', Validators.required],
    filledCans: [this.data.delivery?.filledCans ?? 1, [Validators.required, Validators.min(1)]],
    emptyCans: [this.data.delivery?.emptyCans ?? 0, [Validators.required, Validators.min(0)]],
    ratePerCan: [this.data.delivery?.ratePerCan ?? (this.data.defaultCanPrice || 40), [Validators.required, Validators.min(0)]],
    totalAmount: [this.data.delivery?.totalAmount ?? 40, Validators.required],
    paidAmount: [this.data.delivery?.paidAmount ?? 0, [Validators.required, Validators.min(0)]],
    balance: [this.data.delivery?.balance ?? 40, Validators.required],
    driverName: [this.data.delivery?.driverName || '', Validators.required],
    remarks: [this.data.delivery?.remarks || ''],
    deliveryDate: [
      this.data.delivery?.deliveryDate
        ? this.data.delivery.deliveryDate.split('T')[0]
        : new Date().toISOString().split('T')[0],
      Validators.required,
    ],
  });

  ngOnInit(): void {
    this.recalculate();
  }

  onCustomerSelect(customerId: string): void {
    const cust = this.data.customers.find((c) => c.id === customerId);
    if (cust) {
      this.form.patchValue({ customerName: cust.name });
    }
  }

  recalculate(): void {
    const filled = Number(this.form.get('filledCans')?.value) || 0;
    const rate = Number(this.form.get('ratePerCan')?.value) || 0;
    const paid = Number(this.form.get('paidAmount')?.value) || 0;

    const total = filled * rate;
    const balance = Math.max(0, total - paid);

    this.form.patchValue(
      {
        totalAmount: total,
        balance: balance,
      },
      { emitEvent: false }
    );
  }

  onSave(): void {
    if (this.form.valid) {
      this.recalculate();
      this.dialogRef.close({
        ...this.data.delivery,
        ...this.form.value,
      });
    }
  }
}
