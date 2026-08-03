import { Injectable, signal } from '@angular/core';
import { Payment } from '../models/app.models';
import { generateId } from '../utils/sample-data';
import { asText, normalizePayment, requirePositiveNumber, requireText } from '../utils/record-normalizers';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  readonly payments = signal<Payment[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {}

  async load(): Promise<void> {
    const stored = await this.googleSheetService.read<Payment>('Payments');
    this.payments.set(stored.filter((payment) => asText(payment.id)).map(normalizePayment));
  }

  async add(payment: Omit<Payment, 'id'>): Promise<Payment> {
    const entity = this.toPayment({ ...payment, id: generateId('P') });
    this.payments.update((list) => [entity, ...list]);

    try {
      await this.googleSheetService.create<Payment>('Payments', entity);
    } catch (error) {
      this.payments.update((list) => list.filter((item) => item.id !== entity.id));
      throw error;
    }

    return entity;
  }

  async update(payment: Payment): Promise<void> {
    const entity = this.toPayment(payment);
    const previous = this.payments();
    this.payments.update((list) => list.map((item) => (item.id === entity.id ? entity : item)));

    try {
      await this.googleSheetService.update<Payment>('Payments', entity);
    } catch (error) {
      this.payments.set(previous);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const previous = this.payments();
    this.payments.update((list) => list.filter((item) => item.id !== id));

    try {
      await this.googleSheetService.delete('Payments', id);
    } catch (error) {
      this.payments.set(previous);
      throw error;
    }
  }

  setAll(payments: Payment[]): void {
    this.payments.set(payments.filter((payment) => asText(payment.id)).map(normalizePayment));
  }

  async replaceAll(payments: Payment[]): Promise<void> {
    const normalized = payments.map((payment) => this.toPayment(payment));
    this.assertUniqueIds(normalized);
    await this.googleSheetService.replaceSheet('Payments', normalized);
    this.payments.set(normalized);
  }

  private toPayment(value: Partial<Payment>): Payment {
    return normalizePayment({
      ...value,
      id: requireText(value.id, 'Payment id'),
      customerId: requireText(value.customerId, 'Customer'),
      customerName: requireText(value.customerName, 'Customer name'),
      amount: requirePositiveNumber(value.amount, 'Payment amount'),
      paymentDate: requireText(value.paymentDate, 'Payment date'),
    });
  }

  private assertUniqueIds(payments: Payment[]): void {
    const ids = new Set<string>();
    for (const payment of payments) {
      if (ids.has(payment.id)) throw new Error(`Duplicate payment id: ${payment.id}`);
      ids.add(payment.id);
    }
  }
}
