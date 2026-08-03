import { Injectable, signal } from '@angular/core';
import { Delivery } from '../models/app.models';
import { generateId } from '../utils/sample-data';
import { asText, normalizeDelivery, requireNonNegativeNumber, requirePositiveNumber, requireText } from '../utils/record-normalizers';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  readonly deliveries = signal<Delivery[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {}

  async load(): Promise<void> {
    const stored = await this.googleSheetService.read<Delivery>('Deliveries');
    this.deliveries.set(stored.filter((delivery) => asText(delivery.id)).map(normalizeDelivery));
  }

  async add(delivery: Omit<Delivery, 'id'>): Promise<Delivery> {
    const entity = this.toDelivery({ ...delivery, id: generateId('D') });
    this.deliveries.update((list) => [entity, ...list]);

    try {
      await this.googleSheetService.create<Delivery>('Deliveries', entity);
    } catch (error) {
      this.deliveries.update((list) => list.filter((item) => item.id !== entity.id));
      throw error;
    }

    return entity;
  }

  async update(delivery: Delivery): Promise<void> {
    const entity = this.toDelivery(delivery);
    const previous = this.deliveries();
    this.deliveries.update((list) => list.map((item) => (item.id === entity.id ? entity : item)));

    try {
      await this.googleSheetService.update<Delivery>('Deliveries', entity);
    } catch (error) {
      this.deliveries.set(previous);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const previous = this.deliveries();
    this.deliveries.update((list) => list.filter((item) => item.id !== id));
    try {
      await this.googleSheetService.delete('Deliveries', id);
    } catch (error) {
      this.deliveries.set(previous);
      throw error;
    }
  }

  setAll(deliveries: Delivery[]): void {
    this.deliveries.set(deliveries.filter((delivery) => asText(delivery.id)).map(normalizeDelivery));
  }

  async replaceAll(deliveries: Delivery[]): Promise<void> {
    const normalized = deliveries.map((delivery) => this.toDelivery(delivery));
    this.assertUniqueIds(normalized);
    await this.googleSheetService.replaceSheet('Deliveries', normalized);
    this.deliveries.set(normalized);
  }

  private toDelivery(value: Partial<Delivery>): Delivery {
    const filledCans = requirePositiveNumber(value.filledCans, 'Filled cans', true);
    const ratePerCan = requirePositiveNumber(value.ratePerCan, 'Rate per can');
    const paidAmount = requireNonNegativeNumber(value.paidAmount, 'Paid amount');
    const totalAmount = filledCans * ratePerCan;
    if (paidAmount > totalAmount) {
      throw new Error('Paid amount cannot exceed the delivery invoice total');
    }

    return normalizeDelivery({
      ...value,
      id: requireText(value.id, 'Delivery id'),
      customerId: requireText(value.customerId, 'Customer'),
      customerName: requireText(value.customerName, 'Customer name'),
      filledCans,
      emptyCans: requireNonNegativeNumber(value.emptyCans, 'Empty cans', true),
      ratePerCan,
      paidAmount,
      driverName: requireText(value.driverName, 'Driver name'),
      deliveryDate: requireText(value.deliveryDate, 'Delivery date'),
    });
  }

  private assertUniqueIds(deliveries: Delivery[]): void {
    const ids = new Set<string>();
    for (const delivery of deliveries) {
      if (ids.has(delivery.id)) throw new Error(`Duplicate delivery id: ${delivery.id}`);
      ids.add(delivery.id);
    }
  }
}
