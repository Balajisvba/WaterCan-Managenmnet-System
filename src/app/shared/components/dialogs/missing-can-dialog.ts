import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Customer, MissingCan } from '../../../models/app.models';

export interface MissingCanDialogData {
  entry?: MissingCan;
  customers: Customer[];
  defaultCostPerCan?: number;
}

@Component({
  selector: 'app-missing-can-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.entry ? 'Edit Missing Can Record' : 'Record Missing Cans' }}</h2>
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
          <mat-label>Missing Quantity</mat-label>
          <input matInput type="number" formControlName="missingQuantity" min="1" (input)="recalculate()" />
          @if (form.get('missingQuantity')?.hasError('required')) {
            <mat-error>Missing quantity is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Recovered Quantity</mat-label>
          <input matInput type="number" formControlName="recoveredQuantity" min="0" (input)="recalculate()" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Unrecovered / Lost Cans</mat-label>
          <input matInput type="number" formControlName="lostQuantity" readonly />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cost Per Can (₹)</mat-label>
          <input matInput type="number" formControlName="costPerCan" min="0" (input)="recalculate()" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Total Loss Amount (₹)</mat-label>
          <input matInput type="number" formControlName="lossAmount" readonly />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="Open">Open</mat-option>
            <mat-option value="Recovered">Recovered</mat-option>
            <mat-option value="Closed">Closed</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">Save Record</button>
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
export class MissingCanDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<MissingCanDialogComponent>);
  readonly data: MissingCanDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    customerId: [this.data.entry?.customerId || '', Validators.required],
    customerName: [this.data.entry?.customerName || '', Validators.required],
    missingQuantity: [this.data.entry?.missingQuantity ?? 1, [Validators.required, Validators.min(1)]],
    recoveredQuantity: [this.data.entry?.recoveredQuantity ?? 0, [Validators.required, Validators.min(0)]],
    lostQuantity: [this.data.entry?.lostQuantity ?? 1, Validators.required],
    costPerCan: [this.data.entry?.costPerCan ?? (this.data.defaultCostPerCan || 40), [Validators.required, Validators.min(0)]],
    lossAmount: [this.data.entry?.lossAmount ?? 40, Validators.required],
    status: [this.data.entry?.status || 'Open', Validators.required],
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
    const missing = Number(this.form.get('missingQuantity')?.value) || 0;
    const recovered = Number(this.form.get('recoveredQuantity')?.value) || 0;
    const cost = Number(this.form.get('costPerCan')?.value) || 0;

    const lost = Math.max(0, missing - recovered);
    const loss = lost * cost;

    this.form.patchValue(
      {
        lostQuantity: lost,
        lossAmount: loss,
        status: lost === 0 ? 'Recovered' : this.form.get('status')?.value || 'Open',
      },
      { emitEvent: false }
    );
  }

  onSave(): void {
    if (this.form.valid) {
      this.recalculate();
      this.dialogRef.close({
        ...this.data.entry,
        ...this.form.value,
      });
    }
  }
}
