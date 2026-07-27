import { Injectable, signal } from '@angular/core';
import { Delivery } from '../models/app.models';
import { buildSeedDeliveries, generateId } from '../utils/sample-data';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  readonly deliveries = signal<Delivery[]>([]);

  constructor(private readonly storageService: StorageService) {
    this.load();
  }

  load(): void {
    const stored = this.storageService.getItem<Delivery[]>('aqua-deliveries');
    this.deliveries.set(stored ?? buildSeedDeliveries());
  }

  save(): void {
    this.storageService.setItem('aqua-deliveries', this.deliveries());
  }

  add(delivery: Omit<Delivery, 'id'>): Delivery {
    const totalAmount = delivery.filledCans * delivery.ratePerCan;
    const balance = Math.max(0, totalAmount - delivery.paidAmount);
    const entity: Delivery = {
      ...delivery,
      id: generateId('D'),
      totalAmount,
      balance,
    };
    this.deliveries.update((items) => [entity, ...items]);
    this.save();
    return entity;
  }

  update(delivery: Delivery): void {
    const totalAmount = delivery.filledCans * delivery.ratePerCan;
    const balance = Math.max(0, totalAmount - delivery.paidAmount);
    const entity = { ...delivery, totalAmount, balance };
    this.deliveries.update((items) => items.map((item) => (item.id === delivery.id ? entity : item)));
    this.save();
  }

  remove(id: string): void {
    this.deliveries.update((items) => items.filter((item) => item.id !== id));
    this.save();
  }

  setAll(deliveries: Delivery[]): void {
    this.deliveries.set(deliveries);
    this.save();
  }
}
