import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { toDatePickerValue, toLocalDateInputValue } from '../../../utils/date-utils';

@Component({
  selector: 'app-stock-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>New Load Arrival</h2>
    <mat-dialog-content><form [formGroup]="form" class="form-grid">
      <mat-form-field appearance="outline"><mat-label>Received Cans</mat-label><input matInput type="number" formControlName="quantity" min="1" step="1" /><mat-error>Enter a positive whole number</mat-error></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Arrival Date</mat-label><input matInput [matDatepicker]="arrivalPicker" formControlName="date" /><mat-datepicker-toggle matIconSuffix [for]="arrivalPicker"></mat-datepicker-toggle><mat-datepicker #arrivalPicker></mat-datepicker></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Supplier / Load Reference</mat-label><input matInput formControlName="referenceId" /></mat-form-field>
      <mat-form-field appearance="outline" class="full-width"><mat-label>Note</mat-label><textarea matInput formControlName="description" rows="2"></textarea></mat-form-field>
    </form></mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button (click)="dialogRef.close()">Cancel</button><button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save Stock</button></mat-dialog-actions>
  `,
  styles: [`.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:8px}.full-width{grid-column:span 2}`],
})
export class StockDialogComponent {
  readonly dialogRef = inject(MatDialogRef<StockDialogComponent>);
  readonly data: { defaultDate?: string } = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.group({
    quantity: [0, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]],
    date: [toDatePickerValue(this.data.defaultDate) || new Date(), Validators.required],
    referenceId: [''],
    description: [''],
  });

  save(): void {
    if (this.form.invalid) return;
    this.dialogRef.close({ ...this.form.getRawValue(), date: toLocalDateInputValue(this.form.value.date) });
  }
}
