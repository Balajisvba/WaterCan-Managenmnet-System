import { Injectable, signal } from '@angular/core';
import { Customer } from '../models/app.models';
import { generateId } from '../utils/sample-data';
import { asText, normalizeCustomer, requireNonNegativeNumber, requireText } from '../utils/record-normalizers';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  readonly customers = signal<Customer[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {}

  async load(): Promise<void> {
    const stored = await this.googleSheetService.read<Customer>('Customers');
    this.customers.set(stored.filter((customer) => asText(customer.id)).map(normalizeCustomer));
  }

  async add(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const now = new Date().toISOString();
    const entity = this.toCustomer({
      ...customer,
      id: generateId('C', this.customers().map((item) => item.id)),
      createdAt: now,
      updatedAt: now,
    });
    this.customers.update((list) => [entity, ...list]);

    try {
      await this.googleSheetService.create<Customer>('Customers', entity);
    } catch (error) {
      console.error('[CustomerService] Remote create failed:', error);
      this.customers.update((list) => list.filter((item) => item.id !== entity.id));
      throw error;
    }

    return entity;
  }

  async update(customer: Customer): Promise<void> {
    const existing = this.customers().find((item) => item.id === customer.id);
    if (!existing) {
      throw new Error('Customer not found');
    }

    const updated = this.toCustomer({
      ...existing,
      ...customer,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });
    const previous = this.customers();
    this.customers.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));

    try {
      await this.googleSheetService.update<Customer>('Customers', updated);
    } catch (error) {
      console.error('[CustomerService] Remote update failed:', error);
      this.customers.set(previous);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const previous = this.customers();
    this.customers.update((list) => list.filter((item) => item.id !== id));

    try {
      await this.googleSheetService.delete('Customers', id);
    } catch (error) {
      console.error('[CustomerService] Remote delete failed:', error);
      this.customers.set(previous);
      throw error;
    }
  }

  setAll(customers: Customer[]): void {
    this.customers.set(customers.filter((customer) => asText(customer.id)).map(normalizeCustomer));
  }

  async replaceAll(customers: Customer[]): Promise<void> {
    const normalized = customers.map((customer) => this.toCustomer(customer));
    this.assertUniqueIds(normalized);
    await this.googleSheetService.replaceSheet('Customers', normalized);
    this.customers.set(normalized);
  }

  private toCustomer(value: Partial<Customer>): Customer {
    const mobile = requireText(value.mobile, 'Mobile number');
    if (!/^\d{10}$/.test(mobile)) {
      throw new Error('Mobile number must contain exactly 10 digits');
    }

    const alternateMobile = asText(value.alternateMobile);
    if (alternateMobile && !/^\d{10}$/.test(alternateMobile)) {
      throw new Error('Alternate mobile number must contain exactly 10 digits');
    }

    return normalizeCustomer({
      ...value,
      id: requireText(value.id, 'Customer id'),
      name: requireText(value.name, 'Customer name'),
      mobile,
      alternateMobile,
      address: requireText(value.address, 'Address'),
      area: requireText(value.area, 'Area'),
      depositAmount: requireNonNegativeNumber(value.depositAmount, 'Deposit amount'),
      openingOutstandingCans: requireNonNegativeNumber(
        value.openingOutstandingCans ?? value.outstandingCan,
        'Initial outstanding cans',
        true
      ),
      createdAt: value.createdAt || new Date().toISOString(),
      updatedAt: value.updatedAt || new Date().toISOString(),
    });
  }

  private assertUniqueIds(customers: Customer[]): void {
    const ids = new Set<string>();
    for (const customer of customers) {
      if (ids.has(customer.id)) {
        throw new Error(`Duplicate customer id: ${customer.id}`);
      }
      ids.add(customer.id);
    }
  }
}
