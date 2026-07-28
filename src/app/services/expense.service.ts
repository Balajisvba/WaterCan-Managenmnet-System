import { Injectable, signal } from '@angular/core';
import { Expense } from '../models/app.models';
import { buildSeedExpenses, generateId } from '../utils/sample-data';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  readonly expenses = signal<Expense[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {
    this.load();
  }

  async load(): Promise<void> {
    try {
      const stored = await this.googleSheetService.read<Expense>('Expenses');
      this.expenses.set(stored.length ? stored : buildSeedExpenses());
    } catch {
      this.expenses.set(buildSeedExpenses());
    }
  }

  async add(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const entity: Expense = {
      ...expense,
      id: generateId('E'),
      createdAt: new Date().toISOString(),
    };
    await this.googleSheetService.create<Expense>('Expenses', entity);
    await this.load();
    return entity;
  }

  async update(expense: Expense): Promise<void> {
    await this.googleSheetService.update<Expense>('Expenses', expense);
    await this.load();
  }

  async remove(id: string): Promise<void> {
    await this.googleSheetService.delete('Expenses', id);
    await this.load();
  }

  setAll(expenses: Expense[]): void {
    this.expenses.set(expenses);
  }
}
