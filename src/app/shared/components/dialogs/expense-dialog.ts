import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Expense } from '../../../models/app.models';
import { toLocalDateInputValue } from '../../../utils/date-utils';

@Component({
  selector: 'app-expense-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Expense' : 'Record New Expense' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            @for (cat of categories; track cat) {
              <mat-option [value]="cat">{{ cat }}</mat-option>
            }
          </mat-select>
          @if (form.get('category')?.hasError('required')) {
            <mat-error>Category is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Amount (₹)</mat-label>
          <input matInput type="number" formControlName="amount" min="1" />
          @if (form.get('amount')?.hasError('required')) {
            <mat-error>Amount is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput type="date" formControlName="date" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Remarks / Description</mat-label>
          <textarea matInput formControlName="remarks" rows="2" placeholder="Describe the expense..."></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">Save Expense</button>
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
export class ExpenseDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ExpenseDialogComponent>);
  readonly data: Expense | null = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly categories = ['Fuel', 'Salary', 'Maintenance', 'Electricity', 'Vehicle', 'Miscellaneous'];

  readonly form: FormGroup = this.fb.group({
    category: [this.data?.category || 'Fuel', Validators.required],
    amount: [this.data?.amount ?? 0, [Validators.required, Validators.min(1)]],
    date: [this.data?.date ? this.data.date.split('T')[0] : toLocalDateInputValue(new Date()), Validators.required],
    remarks: [this.data?.remarks || ''],
  });

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close({
        ...this.data,
        ...this.form.value,
      });
    }
  }
}
