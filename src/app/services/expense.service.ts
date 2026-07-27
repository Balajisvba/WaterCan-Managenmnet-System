import { Injectable, signal } from '@angular/core';
import { Expense } from '../models/app.models';
import { buildSeedExpenses, generateId } from '../utils/sample-data';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  readonly expenses = signal<Expense[]>([]);

  constructor(private readonly storageService: StorageService) {
    this.load();
  }

  load(): void {
    const stored = this.storageService.getItem<Expense[]>('aqua-expenses');
    this.expenses.set(stored ?? buildSeedExpenses());
  }

  save(): void {
    this.storageService.setItem('aqua-expenses', this.expenses());
  }

  add(expense: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const entity: Expense = {
      ...expense,
      id: generateId('E'),
      createdAt: new Date().toISOString(),
    };
    this.expenses.update((items) => [entity, ...items]);
    this.save();
    return entity;
  }

  update(expense: Expense): void {
    this.expenses.update((items) => items.map((item) => (item.id === expense.id ? { ...item, ...expense } : item)));
    this.save();
  }

  remove(id: string): void {
    this.expenses.update((items) => items.filter((item) => item.id !== id));
    this.save();
  }

  setAll(expenses: Expense[]): void {
    this.expenses.set(expenses);
    this.save();
  }
}
