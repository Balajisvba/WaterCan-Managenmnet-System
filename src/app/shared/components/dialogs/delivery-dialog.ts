import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Customer, Delivery, Driver } from '../../../models/app.models';
import { SettingsService } from '../../../services/settings.service';
import { toDateKey, toDatePickerValue, toLocalDateInputValue } from '../../../utils/date-utils';

export interface DeliveryDialogData { delivery?: Delivery; customers: Customer[]; drivers?: Driver[]; mode?: 'order' | 'delivery'; defaultCanPrice?: number; }

@Component({
  selector: 'app-delivery-dialog', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>{{ isOrder ? (data.delivery ? 'Edit Order' : 'Order Cans') : 'Confirm Delivery' }}</h2>
    <mat-dialog-content><form [formGroup]="form" class="form-grid">
      <mat-form-field appearance="outline" class="full-width"><mat-label>Customer</mat-label><mat-select formControlName="customerId" [disabled]="!isOrder" (selectionChange)="onCustomerSelect($event.value)">@for (cust of data.customers; track cust.id) {<mat-option [value]="cust.id">{{ cust.name }} ({{ cust.area }})</mat-option>}</mat-select><mat-hint>{{ isOrder ? 'Select the customer for this order' : 'Customer is locked after the order is added' }}</mat-hint><mat-error>Customer selection is required</mat-error></mat-form-field>
      @if (!isOrder) { <mat-form-field appearance="outline"><mat-label>Ordered Cans</mat-label><input matInput type="number" formControlName="orderedCans" readonly /><mat-hint>Locked after order creation</mat-hint></mat-form-field> }
      <mat-form-field appearance="outline"><mat-label>{{ isOrder ? 'Cans Ordered' : 'Actual Cans Delivered' }}</mat-label><input matInput type="number" formControlName="filledCans" min="1" /><mat-error>Enter at least one can</mat-error></mat-form-field>
      @if (!isOrder) {
        <mat-form-field appearance="outline"><mat-label>Empty Cans Returned</mat-label><input matInput type="number" formControlName="emptyCans" min="0" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Rate Per Can</mat-label><input matInput type="number" formControlName="ratePerCan" min="0.01" (input)="recalculate()" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Total Amount</mat-label><input matInput type="number" formControlName="totalAmount" readonly /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Paid Amount</mat-label><input matInput type="number" formControlName="paidAmount" readonly /><mat-error>Payment cannot exceed total</mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Balance</mat-label><input matInput type="number" formControlName="balance" readonly /></mat-form-field>
        @if (data.drivers?.length) { <mat-form-field appearance="outline"><mat-label>Driver</mat-label><mat-select formControlName="driverId" (selectionChange)="onDriverSelect($event.value)">@for (driver of data.drivers; track driver.id) {<mat-option [value]="driver.id">{{ driver.name }} ({{ driver.mobile }})</mat-option>}</mat-select><mat-error>Driver selection is required</mat-error></mat-form-field> } @else { <mat-form-field appearance="outline"><mat-label>Driver Name</mat-label><input matInput formControlName="driverName" /></mat-form-field> }
        <mat-form-field appearance="outline"><mat-label>Payment Mode</mat-label><mat-select formControlName="paymentMode" (selectionChange)="onPaymentModeChange($event.value)"><mat-option value="Cash">Cash</mat-option><mat-option value="GPay">GPay (Paid)</mat-option><mat-option value="Account">Account (Due)</mat-option></mat-select></mat-form-field>
        @if (form.get('paymentMode')?.value === 'Cash') { <mat-checkbox formControlName="cashCollected" (change)="recalculate()">Cash collected from customer</mat-checkbox> }
      }
      <mat-form-field appearance="outline"><mat-label>{{ isOrder ? 'Order Date' : 'Delivery Date' }}</mat-label><input matInput [matDatepicker]="deliveryPicker" formControlName="deliveryDate" /><mat-datepicker-toggle matIconSuffix [for]="deliveryPicker"></mat-datepicker-toggle><mat-datepicker #deliveryPicker></mat-datepicker></mat-form-field>
      <mat-form-field appearance="outline" class="full-width"><mat-label>Remarks</mat-label><textarea matInput formControlName="remarks" rows="2"></textarea></mat-form-field>
    </form></mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button (click)="dialogRef.close()">Cancel</button><button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">{{ isOrder ? 'Add Order' : 'Confirm Delivery' }}</button></mat-dialog-actions>
  `,
  styles: [`.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:8px}.full-width{grid-column:span 2}`],
})
export class DeliveryDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<DeliveryDialogComponent>); readonly data: DeliveryDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder); private readonly settingsService = inject(SettingsService);
  readonly isOrder = (this.data.mode ?? (this.data.delivery?.status === 'Pending' ? 'order' : 'delivery')) === 'order';
  readonly form: FormGroup = this.fb.group({
    customerId: [{ value: this.data.delivery?.customerId || '', disabled: !this.isOrder }, Validators.required], customerName: [{ value: this.data.delivery?.customerName || '', disabled: !this.isOrder }, Validators.required],
    orderedCans: [{ value: this.data.delivery?.orderedCans ?? this.data.delivery?.filledCans ?? 0, disabled: this.isOrder }, [Validators.required, Validators.min(1)]],
    filledCans: [this.data.delivery?.status === 'Pending' ? this.data.delivery.orderedCans : (this.data.delivery?.filledCans ?? 1), [Validators.required, Validators.min(1)]],
    emptyCans: [this.data.delivery?.emptyCans ?? 0, [Validators.required, Validators.min(0)]],
    ratePerCan: [this.data.delivery?.ratePerCan || (this.data.defaultCanPrice || this.settingsService.settings().canPrice), [Validators.required, Validators.min(0.01)]],
    totalAmount: [this.data.delivery?.totalAmount ?? 0, Validators.required], paidAmount: [this.data.delivery?.paidAmount ?? 0, [Validators.required, Validators.min(0)]], balance: [this.data.delivery?.balance ?? 0, Validators.required],
    driverId: [this.data.delivery?.driverId || '', this.isOrder ? [] : Validators.required], driverName: [this.data.delivery?.driverName || '', this.isOrder ? [] : Validators.required], paymentMode: [this.data.delivery?.paymentMode || 'Cash', Validators.required], cashCollected: [this.data.delivery?.cashCollected ?? false], remarks: [this.data.delivery?.remarks || ''],
    deliveryDate: [toDatePickerValue(this.data.delivery?.status === 'Pending' ? this.data.delivery.orderDate : this.data.delivery?.deliveryDate) || new Date(), Validators.required],
  });
  ngOnInit(): void { this.recalculate(); }
  onCustomerSelect(id: string): void {
    const customer = this.data.customers.find((item) => item.id === id);
    if (customer) {
      this.form.patchValue({ customerId: customer.id, customerName: customer.name });
    }
  }
  onDriverSelect(id: string): void { const driver = this.data.drivers?.find((item) => item.id === id); if (driver) this.form.patchValue({ driverName: driver.name }); }
  onPaymentModeChange(mode: 'Cash' | 'GPay' | 'Account'): void {
    if (mode !== 'Cash') this.form.patchValue({ cashCollected: false }, { emitEvent: false });
    this.recalculate();
  }
  recalculate(): void {
    const total = (Number(this.form.get('filledCans')?.value) || 0) * (Number(this.form.get('ratePerCan')?.value) || 0);
    const mode = this.form.get('paymentMode')?.value;
    const paid = mode === 'GPay' || (mode === 'Cash' && this.form.get('cashCollected')?.value === true) ? total : 0;
    this.form.patchValue({ totalAmount: this.isOrder ? 0 : total, paidAmount: this.isOrder ? 0 : paid, balance: this.isOrder ? 0 : Math.max(0, total - paid) }, { emitEvent: false });
    const control = this.form.get('paidAmount'); const errors = { ...(control?.errors ?? {}) }; if (!this.isOrder && paid > total) errors['overpaid'] = true; else delete errors['overpaid']; control?.setErrors(Object.keys(errors).length ? errors : null);
  }
  onSave(): void {
    if (!this.form.valid) return; this.recalculate(); const value = this.form.getRawValue();
    const selectedCustomer = this.data.customers.find((customer) => customer.id === value.customerId);
    if (!selectedCustomer) {
      this.form.get('customerId')?.setErrors({ required: true });
      return;
    }

    const selectedDate = toLocalDateInputValue(value.deliveryDate);
    this.dialogRef.close({ ...this.data.delivery, ...value, customerId: selectedCustomer.id, customerName: selectedCustomer.name, deliveryDate: selectedDate, status: this.isOrder ? 'Pending' : 'Delivered', orderedCans: this.isOrder ? Number(value.filledCans) : (this.data.delivery?.orderedCans ?? Number(value.filledCans)), orderDate: this.isOrder ? selectedDate : (this.data.delivery?.orderDate ?? selectedDate) });
  }
}
