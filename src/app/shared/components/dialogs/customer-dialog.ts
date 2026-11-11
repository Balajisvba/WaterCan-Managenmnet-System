import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Customer } from '../../../models/app.models';

@Component({
  selector: 'app-customer-dialog', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Customer' : 'Register New Customer' }}</h2>
    <mat-dialog-content><form [formGroup]="form" class="form-grid">
      <mat-form-field appearance="outline"><mat-label>Customer Name</mat-label><input matInput formControlName="name" /><mat-error>Name is required</mat-error></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Mobile Number</mat-label><input matInput formControlName="mobile" /><mat-error>Enter a valid 10-digit number</mat-error></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Alternate Mobile</mat-label><input matInput formControlName="alternateMobile" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Area / Locality</mat-label><input matInput formControlName="area" /><mat-error>Area is required</mat-error></mat-form-field>
      <mat-form-field appearance="outline" class="full-width"><mat-label>Address</mat-label><textarea matInput formControlName="address" rows="2"></textarea><mat-error>Address is required</mat-error></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Initial Outstanding Cans</mat-label><input matInput type="number" formControlName="openingOutstandingCans" min="0" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Status</mat-label><mat-select formControlName="status"><mat-option value="Active">Active</mat-option><mat-option value="Pending">Pending</mat-option><mat-option value="Inactive">Inactive</mat-option></mat-select></mat-form-field>
    </form></mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button (click)="dialogRef.close()">Cancel</button><button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">Save Customer</button></mat-dialog-actions>
  `,
  styles: [`.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:8px}.full-width{grid-column:span 2}`],
})
export class CustomerDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CustomerDialogComponent>); readonly data: Customer | null = inject(MAT_DIALOG_DATA); private readonly fb = inject(FormBuilder);
  readonly form: FormGroup = this.fb.group({
    name: [this.data?.name || '', Validators.required], mobile: [this.data?.mobile || '', [Validators.required, Validators.pattern('^[0-9]{10}$')]], alternateMobile: [this.data?.alternateMobile || ''],
    address: [this.data?.address || '', Validators.required], area: [this.data?.area || '', Validators.required],
    depositAmount: [this.data?.depositAmount ?? 0, [Validators.required, Validators.min(0)]],
    openingOutstandingCans: [this.data?.openingOutstandingCans ?? this.data?.outstandingCan ?? 0, [Validators.required, Validators.min(0)]], status: [this.data?.status || 'Active', Validators.required],
  });
  onSave(): void { if (this.form.valid) this.dialogRef.close({ ...this.data, ...this.form.value, depositAmount: this.data?.depositAmount ?? 0 }); }
}
