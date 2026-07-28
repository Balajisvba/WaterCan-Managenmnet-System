import { Injectable, signal } from '@angular/core';
import { Delivery } from '../models/app.models';
import { buildSeedDeliveries, generateId } from '../utils/sample-data';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  readonly deliveries = signal<Delivery[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {
    this.load();
  }

  async load(): Promise<void> {
    try {
      const stored = await this.googleSheetService.read<Delivery>('Deliveries');
      this.deliveries.set(stored.length ? stored : buildSeedDeliveries());
    } catch {
      this.deliveries.set(buildSeedDeliveries());
    }
  }

  async add(delivery: Omit<Delivery, 'id'>): Promise<Delivery> {
    const totalAmount = delivery.filledCans * delivery.ratePerCan;
    const balance = Math.max(0, totalAmount - delivery.paidAmount);
    const entity: Delivery = {
      ...delivery,
      id: generateId('D'),
      totalAmount,
      balance,
    };
    await this.googleSheetService.create<Delivery>('Deliveries', entity);
    await this.load();
    return entity;
  }

  async update(delivery: Delivery): Promise<void> {
    const totalAmount = delivery.filledCans * delivery.ratePerCan;
    const balance = Math.max(0, totalAmount - delivery.paidAmount);
    const entity = { ...delivery, totalAmount, balance };
    await this.googleSheetService.update<Delivery>('Deliveries', entity);
    await this.load();
  }

  async remove(id: string): Promise<void> {
    await this.googleSheetService.delete('Deliveries', id);
    await this.load();
  }

  setAll(deliveries: Delivery[]): void {
    this.deliveries.set(deliveries);
  }
}
