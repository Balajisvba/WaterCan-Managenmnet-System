import { Injectable, computed, inject, signal } from '@angular/core';
import { Driver, DriverCashSettlement } from '../models/app.models';
import { generateSequentialId } from '../utils/sample-data';
import { asText, normalizeDriver, requireNonNegativeNumber, requireText } from '../utils/record-normalizers';
import { GoogleSheetService } from './google-sheet.service';
import { DeliveryService } from './delivery.service';
import { toLocalDateInputValue } from '../utils/date-utils';

@Injectable({ providedIn: 'root' })
export class DriverService {
  readonly drivers = signal<Driver[]>([]);
  readonly settlements = signal<DriverCashSettlement[]>([]);
  readonly driversWithCash = computed(() => {
    const cashByDriver = new Map<string, number>();
    for (const delivery of this.deliveryService.deliveries()) {
      if (delivery.status === 'Delivered' && delivery.paymentMode === 'Cash' && delivery.cashCollected && !delivery.cashSettled && delivery.driverId) {
        cashByDriver.set(delivery.driverId, (cashByDriver.get(delivery.driverId) || 0) + (Number(delivery.paidAmount) || 0));
      }
    }
    return this.drivers().map((driver) => ({ ...driver, cashCollected: cashByDriver.get(driver.id) || 0 }));
  });

  private readonly deliveryService = inject(DeliveryService);
  constructor(private readonly googleSheetService: GoogleSheetService) {}

  async load(): Promise<void> {
    try {
      const stored = await this.googleSheetService.read<Driver>('Drivers');
      this.drivers.set(stored.filter((driver) => asText(driver.id)).map(normalizeDriver));
    } catch {
      // Drivers is a new optional sheet; existing installations can continue
      // operating until the first driver is registered.
      this.drivers.set([]);
    }
    try {
      const settlements = await this.googleSheetService.read<DriverCashSettlement>('DriverCashSettlements');
      this.settlements.set(settlements.filter((settlement) => asText(settlement.id)));
    } catch {
      this.settlements.set([]);
    }
  }

  async add(driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'cashCollected'>): Promise<Driver> {
    const now = new Date().toISOString();
    const entity = this.toDriver({ ...driver, id: generateSequentialId('DR', this.drivers().map((item) => item.id)), createdAt: now, updatedAt: now });
    this.drivers.update((list) => [entity, ...list]);
    try { await this.googleSheetService.create<Driver>('Drivers', entity); } catch (error) { this.drivers.update((list) => list.filter((item) => item.id !== entity.id)); throw error; }
    return entity;
  }

  async update(driver: Driver): Promise<void> {
    const existing = this.drivers().find((item) => item.id === driver.id);
    if (!existing) throw new Error('Driver not found');
    const entity = this.toDriver({ ...existing, ...driver, createdAt: existing.createdAt, updatedAt: new Date().toISOString() });
    const previous = this.drivers(); this.drivers.update((list) => list.map((item) => item.id === entity.id ? entity : item));
    try { await this.googleSheetService.update<Driver>('Drivers', entity); } catch (error) { this.drivers.set(previous); throw error; }
  }

  async remove(id: string): Promise<void> {
    const previous = this.drivers(); this.drivers.update((list) => list.filter((item) => item.id !== id));
    try { await this.googleSheetService.delete('Drivers', id); } catch (error) { this.drivers.set(previous); throw error; }
  }

  async settleCash(driverId: string): Promise<void> {
    const cashDeliveries = this.deliveryService.deliveries().filter((delivery) =>
      delivery.status === 'Delivered' &&
      delivery.paymentMode === 'Cash' &&
      delivery.cashCollected &&
      !delivery.cashSettled &&
      delivery.driverId === driverId
    );
    const amount = cashDeliveries.reduce((sum, delivery) => sum + (Number(delivery.paidAmount) || 0), 0);

    for (const delivery of cashDeliveries) {
      await this.deliveryService.update({ ...delivery, cashSettled: true });
    }

    const driver = this.drivers().find((item) => item.id === driverId);
    if (!driver || amount <= 0) return;

    const settlement: DriverCashSettlement = {
      id: generateSequentialId('SET', this.settlements().map((item) => item.id)),
      driverId,
      driverName: driver.name,
      settlementDate: toLocalDateInputValue(new Date()),
      amount,
    };
    this.settlements.update((list) => [settlement, ...list]);
    try {
      await this.googleSheetService.create('DriverCashSettlements', settlement);
    } catch (error) {
      this.settlements.update((list) => list.filter((item) => item.id !== settlement.id));
      throw error;
    }
  }

  private toDriver(value: Partial<Driver>): Driver {
    const mobile = requireText(value.mobile, 'Mobile number');
    if (!/^\d{10}$/.test(mobile)) throw new Error('Mobile number must contain exactly 10 digits');
    return normalizeDriver({ ...value, id: requireText(value.id, 'Driver id'), name: requireText(value.name, 'Driver name'), age: requireNonNegativeNumber(value.age, 'Age', true), mobile, address: requireText(value.address, 'Address'), joiningDate: requireText(value.joiningDate, 'Joining date'), createdAt: value.createdAt, updatedAt: value.updatedAt });
  }
}
