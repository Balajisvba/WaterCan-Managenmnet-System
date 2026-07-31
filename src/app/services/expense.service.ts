import { Injectable, signal } from '@angular/core';
import { Expense } from '../models/app.models';
import { generateId } from '../utils/sample-data';
import { asText, normalizeExpense, requirePositiveNumber, requireText } from '../utils/record-normalizers';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  readonly expenses = signal<Expense[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {}

  async load(): Promise<void> {
    const stored = await this.googleSheetService.read<Expense>('Expenses');
    this.expenses.set(stored.filter((expense) => asText(expense.id)).map(normalizeExpense));
  }

  async add(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const entity = this.toExpense({
      ...expense,
      id: generateId('E', this.expenses().map((item) => item.id)),
      createdAt: new Date().toISOString(),
    });
    this.expenses.update((list) => [entity, ...list]);

    try {
      await this.googleSheetService.create<Expense>('Expenses', entity);
    } catch (error) {
      this.expenses.update((list) => list.filter((item) => item.id !== entity.id));
      throw error;
    }

    return entity;
  }

  async update(expense: Expense): Promise<void> {
    const entity = this.toExpense(expense);
    const previous = this.expenses();
    this.expenses.update((list) => list.map((item) => (item.id === entity.id ? entity : item)));

    try {
      await this.googleSheetService.update<Expense>('Expenses', entity);
    } catch (error) {
      this.expenses.set(previous);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const previous = this.expenses();
    this.expenses.update((list) => list.filter((item) => item.id !== id));

    try {
      await this.googleSheetService.delete('Expenses', id);
    } catch (error) {
      this.expenses.set(previous);
      throw error;
    }
  }

  setAll(expenses: Expense[]): void {
    this.expenses.set(expenses.filter((expense) => asText(expense.id)).map(normalizeExpense));
  }

  async replaceAll(expenses: Expense[]): Promise<void> {
    const normalized = expenses.map((expense) => this.toExpense(expense));
    this.assertUniqueIds(normalized);
    await this.googleSheetService.replaceSheet('Expenses', normalized);
    this.expenses.set(normalized);
  }

  private toExpense(value: Partial<Expense>): Expense {
    return normalizeExpense({
      ...value,
      id: requireText(value.id, 'Expense id'),
      category: requireText(value.category, 'Expense category'),
      amount: requirePositiveNumber(value.amount, 'Expense amount'),
      date: requireText(value.date, 'Expense date'),
      createdAt: value.createdAt || new Date().toISOString(),
    });
  }

  private assertUniqueIds(expenses: Expense[]): void {
    const ids = new Set<string>();
    for (const expense of expenses) {
      if (ids.has(expense.id)) throw new Error(`Duplicate expense id: ${expense.id}`);
      ids.add(expense.id);
    }
  }
}
