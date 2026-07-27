import { Injectable, signal } from '@angular/core';
import { Payment } from '../models/app.models';
import { buildSeedPayments, generateId } from '../utils/sample-data';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  readonly payments = signal<Payment[]>([]);

  constructor(private readonly storageService: StorageService) {
    this.load();
  }

  load(): void {
    const stored = this.storageService.getItem<Payment[]>('aqua-payments');
    this.payments.set(stored ?? buildSeedPayments());
  }

  save(): void {
    this.storageService.setItem('aqua-payments', this.payments());
  }

  add(payment: Omit<Payment, 'id'>): Payment {
    const entity: Payment = { ...payment, id: generateId('P') };
    this.payments.update((items) => [entity, ...items]);
    this.save();
    return entity;
  }

  update(payment: Payment): void {
    this.payments.update((items) => items.map((item) => (item.id === payment.id ? { ...item, ...payment } : item)));
    this.save();
  }

  remove(id: string): void {
    this.payments.update((items) => items.filter((item) => item.id !== id));
    this.save();
  }

  setAll(payments: Payment[]): void {
    this.payments.set(payments);
    this.save();
  }
}
