import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Driver } from '../../../models/app.models';
import { toDatePickerValue, toLocalDateInputValue } from '../../../utils/date-utils';

@Component({ selector: 'app-driver-dialog', standalone: true, imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule], template: `
  <h2 mat-dialog-title>{{ data ? 'Edit Driver' : 'Register Driver' }}</h2>
  <mat-dialog-content><form [formGroup]="form" class="form-grid">
    <mat-form-field appearance="outline"><mat-label>Driver Name</mat-label><input matInput formControlName="name" /><mat-error>Name is required</mat-error></mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Age</mat-label><input matInput type="number" formControlName="age" min="18" /><mat-error>Enter a valid age</mat-error></mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Mobile Number</mat-label><input matInput formControlName="mobile" /><mat-error>Enter a valid 10-digit number</mat-error></mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Joining Date</mat-label><input matInput [matDatepicker]="joiningPicker" formControlName="joiningDate" /><mat-datepicker-toggle matIconSuffix [for]="joiningPicker"></mat-datepicker-toggle><mat-datepicker #joiningPicker></mat-datepicker></mat-form-field>
    <mat-form-field appearance="outline" class="full-width"><mat-label>Address</mat-label><textarea matInput formControlName="address" rows="2"></textarea><mat-error>Address is required</mat-error></mat-form-field>
    <mat-form-field appearance="outline"><mat-label>Status</mat-label><mat-select formControlName="status"><mat-option value="Active">Active</mat-option><mat-option value="Inactive">Inactive</mat-option></mat-select></mat-form-field>
  </form></mat-dialog-content>
  <mat-dialog-actions align="end"><button mat-button (click)="dialogRef.close()">Cancel</button><button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save Driver</button></mat-dialog-actions>
`, styles: [`.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:8px}.full-width{grid-column:span 2}`] })
export class DriverDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DriverDialogComponent>); readonly data: Driver | null = inject(MAT_DIALOG_DATA); private readonly fb = inject(FormBuilder);
  readonly form: FormGroup = this.fb.group({ name: [this.data?.name || '', Validators.required], age: [this.data?.age || 18, [Validators.required, Validators.min(18), Validators.max(75)]], mobile: [this.data?.mobile || '', [Validators.required, Validators.pattern('^[0-9]{10}$')]], address: [this.data?.address || '', Validators.required], joiningDate: [toDatePickerValue(this.data?.joiningDate) || new Date(), Validators.required], status: [this.data?.status || 'Active', Validators.required] });
  save(): void { if (this.form.valid) this.dialogRef.close({ ...this.data, ...this.form.value, joiningDate: toLocalDateInputValue(this.form.value.joiningDate) }); }
}
