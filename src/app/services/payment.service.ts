import { Injectable, signal } from '@angular/core';
import { Payment } from '../models/app.models';
import { buildSeedPayments, generateId } from '../utils/sample-data';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  readonly payments = signal<Payment[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {
    this.load();
  }

  async load(): Promise<void> {
    try {
      const stored = await this.googleSheetService.read<Payment>('Payments');
      this.payments.set(stored.length ? stored : buildSeedPayments());
    } catch {
      this.payments.set(buildSeedPayments());
    }
  }

  async add(payment: Omit<Payment, 'id'>): Promise<Payment> {
    const entity: Payment = { ...payment, id: generateId('P') };
    await this.googleSheetService.create<Payment>('Payments', entity);
    await this.load();
    return entity;
  }

  async update(payment: Payment): Promise<void> {
    await this.googleSheetService.update<Payment>('Payments', payment);
    await this.load();
  }

  async remove(id: string): Promise<void> {
    await this.googleSheetService.delete('Payments', id);
    await this.load();
  }

  setAll(payments: Payment[]): void {
    this.payments.set(payments);
  }
}
