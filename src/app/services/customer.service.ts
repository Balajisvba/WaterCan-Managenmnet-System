import { Injectable, signal } from '@angular/core';
import { Customer } from '../models/app.models';
import { buildSeedCustomers, generateId } from '../utils/sample-data';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  readonly customers = signal<Customer[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {
    this.load();
  }

  async load(): Promise<void> {
    try {
      const stored = await this.googleSheetService.read<Customer>('Customers');
      this.customers.set(stored.length ? stored : buildSeedCustomers());
    } catch {
      this.customers.set(buildSeedCustomers());
    }
  }

  async add(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const entity: Customer = {
      ...customer,
      id: generateId('C'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.googleSheetService.create<Customer>('Customers', entity);
    await this.load();
    return entity;
  }

  async update(customer: Customer): Promise<void> {
    const updated = { ...customer, updatedAt: new Date().toISOString() };
    await this.googleSheetService.update<Customer>('Customers', updated);
    await this.load();
  }

  async remove(id: string): Promise<void> {
    await this.googleSheetService.delete('Customers', id);
    await this.load();
  }

  setAll(customers: Customer[]): void {
    this.customers.set(customers);
  }
}
