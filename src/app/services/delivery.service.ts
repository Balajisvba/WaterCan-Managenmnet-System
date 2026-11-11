import { Injectable, signal } from '@angular/core';
import { Delivery } from '../models/app.models';
import { generateSequentialId } from '../utils/sample-data';
import { asText, normalizeDelivery, requireNonNegativeNumber, requirePositiveNumber, requireText } from '../utils/record-normalizers';
import { GoogleSheetService } from './google-sheet.service';
import { InventoryService } from './inventory.service';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  readonly deliveries = signal<Delivery[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService, private readonly inventoryService: InventoryService) {}

  async load(): Promise<void> {
    const stored = await this.googleSheetService.read<Delivery>('Deliveries');
    this.deliveries.set(stored.filter((delivery) => asText(delivery.id)).map(normalizeDelivery));
  }

  async add(delivery: Omit<Delivery, 'id'>): Promise<Delivery> {
    const entity = this.toDelivery({
      ...delivery,
      id: generateSequentialId('D', this.deliveries().map((item) => item.id)),
    });
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
    const existing = this.deliveries().find((item) => item.id === entity.id);
    this.inventoryService.validateDeliveryChange(existing, entity);
    const previous = this.deliveries();
    this.deliveries.update((list) => list.map((item) => (item.id === entity.id ? entity : item)));

    try {
      await this.googleSheetService.update<Delivery>('Deliveries', entity);
      await this.inventoryService.recordDeliveryChange(existing, entity);
    } catch (error) {
      this.deliveries.set(previous);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = this.deliveries().find((item) => item.id === id);
    const cancelled = existing?.status === 'Delivered' ? { ...existing, status: 'Cancelled' as const } : undefined;
    if (existing && cancelled) {
      this.inventoryService.validateDeliveryChange(existing, cancelled);
      await this.inventoryService.recordDeliveryChange(existing, cancelled);
    }
    const previous = this.deliveries();
    this.deliveries.update((list) => list.filter((item) => item.id !== id));
    try {
      await this.googleSheetService.delete('Deliveries', id);
    } catch (error) {
      this.deliveries.set(previous);
      if (existing && cancelled) {
        await this.inventoryService.recordDeliveryChange(cancelled, existing).catch(() => undefined);
      }
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
    const status = value.status ?? 'Delivered';
    const filledCans = requirePositiveNumber(value.filledCans, 'Filled cans', true);
    const ratePerCan = status === 'Pending'
      ? requireNonNegativeNumber(value.ratePerCan ?? 0, 'Rate per can')
      : requirePositiveNumber(value.ratePerCan, 'Rate per can');
    const totalAmount = status === 'Delivered' ? filledCans * ratePerCan : 0;
    const paymentMode = value.paymentMode || 'Cash';
    const cashCollected = paymentMode === 'Cash' && value.cashCollected === true;
    const paidAmount = status === 'Delivered'
      ? paymentMode === 'GPay' || cashCollected ? totalAmount : 0
      : 0;
    if (status === 'Delivered' && paidAmount > totalAmount) {
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
      driverName: status === 'Delivered' ? requireText(value.driverName, 'Driver name') : (value.driverName || ''),
      deliveryDate: requireText(value.deliveryDate, 'Delivery date'),
      status,
      orderedCans: requirePositiveNumber(value.orderedCans ?? filledCans, 'Ordered cans', true),
      orderDate: value.orderDate || value.deliveryDate,
      driverId: value.driverId || '',
      paymentMode,
      cashCollected,
      cashSettled: value.cashSettled === true,
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
