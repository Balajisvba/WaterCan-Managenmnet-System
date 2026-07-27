import { Injectable, signal } from '@angular/core';
import { Customer } from '../models/app.models';
import { buildSeedCustomers, generateId } from '../utils/sample-data';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  readonly customers = signal<Customer[]>([]);

  constructor(private readonly storageService: StorageService) {
    this.load();
  }

  load(): void {
    const stored = this.storageService.getItem<Customer[]>('aqua-customers');
    this.customers.set(stored ?? buildSeedCustomers());
  }

  save(): void {
    this.storageService.setItem('aqua-customers', this.customers());
  }

  add(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer {
    const entity: Customer = {
      ...customer,
      id: generateId('C'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.customers.update((items) => [entity, ...items]);
    this.save();
    return entity;
  }

  update(customer: Customer): void {
    const updated = { ...customer, updatedAt: new Date().toISOString() };
    this.customers.update((items) => items.map((item) => (item.id === customer.id ? updated : item)));
    this.save();
  }

  remove(id: string): void {
    this.customers.update((items) => items.filter((item) => item.id !== id));
    this.save();
  }

  setAll(customers: Customer[]): void {
    this.customers.set(customers);
    this.save();
  }
}
