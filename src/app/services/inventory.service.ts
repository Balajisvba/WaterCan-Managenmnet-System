import { Injectable, computed, signal } from '@angular/core';
import { InventoryTransaction, InventoryTransactionType, Delivery } from '../models/app.models';
import { GoogleSheetService } from './google-sheet.service';
import { generateSequentialId } from '../utils/sample-data';
import { asNonNegativeNumber, asText } from '../utils/record-normalizers';
import { toDateKey, toLocalDateInputValue } from '../utils/date-utils';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  readonly transactions = signal<InventoryTransaction[]>([]);
  readonly currentStock = computed(() => this.transactions()[this.transactions().length - 1]?.balance ?? 0);

  constructor(private readonly googleSheetService: GoogleSheetService) {}

  async load(): Promise<void> {
    try {
      const rows = await this.googleSheetService.read<InventoryTransaction>('Inventory');
      this.transactions.set(rows.filter((row) => asText(row.id)).map((row) => this.normalize(row)));
    } catch {
      this.transactions.set([]);
    }
  }

  async addStock(quantity: number, date: string, description: string, referenceId?: string): Promise<void> {
    const amount = this.requireWholePositive(quantity, 'Received cans');
    await this.appendTransaction('New Load', description || 'New load arrival', amount, 0, referenceId, date);
  }

  validateDeliveryChange(previous: Delivery | undefined, next: Delivery): void {
    const delta = this.stockDelta(previous, next);
    if (this.currentStock() + delta < 0) {
      throw new Error(`Insufficient stock. Available cans: ${this.currentStock()}`);
    }
  }

  async recordDeliveryChange(previous: Delivery | undefined, next: Delivery): Promise<void> {
    const oldDelivered = previous?.status === 'Delivered';
    const newDelivered = next.status === 'Delivered';
    const oldFilled = oldDelivered ? previous?.filledCans ?? 0 : 0;
    const oldReturned = oldDelivered ? previous?.emptyCans ?? 0 : 0;
    const newFilled = newDelivered ? next.filledCans : 0;
    const newReturned = newDelivered ? next.emptyCans : 0;
    const stockIn = Math.max(0, newReturned - oldReturned) + Math.max(0, oldFilled - newFilled);
    const stockOut = Math.max(0, newFilled - oldFilled) + Math.max(0, oldReturned - newReturned);

    if (stockIn === 0 && stockOut === 0) return;

    const type: InventoryTransactionType = !oldDelivered && newDelivered ? 'Delivery' : 'Adjustment';
    await this.appendTransaction(
      type,
      `${type === 'Delivery' ? 'Delivery' : 'Delivery adjustment'} - ${next.customerName} (${newFilled || oldFilled} cans)`,
      stockIn,
      stockOut,
      next.id,
      next.deliveryDate,
    );
  }

  async replaceAll(transactions: InventoryTransaction[]): Promise<void> {
    const normalized = transactions.map((item) => this.normalize(item));
    await this.googleSheetService.replaceSheet('Inventory', normalized);
    this.transactions.set(normalized);
  }

  private async appendTransaction(
    type: InventoryTransactionType,
    description: string,
    stockIn: number,
    stockOut: number,
    referenceId?: string,
    date?: string,
  ): Promise<void> {
    const previousStock = this.currentStock();
    const balance = previousStock + stockIn - stockOut;
    if (balance < 0) throw new Error(`Insufficient stock. Available cans: ${previousStock}`);

    const transaction: InventoryTransaction = {
      id: generateSequentialId('INV', this.transactions().map((item) => item.id)),
      transactionDate: toDateKey(date) || toLocalDateInputValue(new Date()),
      type,
      description,
      stockIn,
      stockOut,
      previousStock,
      balance,
      referenceId: referenceId || '',
    };
    await this.googleSheetService.create('Inventory', transaction);
    this.transactions.update((list) => [...list, transaction]);
  }

  private stockDelta(previous: Delivery | undefined, next: Delivery): number {
    const oldValue = previous?.status === 'Delivered' ? (previous.emptyCans || 0) - (previous.filledCans || 0) : 0;
    const newValue = next.status === 'Delivered' ? (next.emptyCans || 0) - (next.filledCans || 0) : 0;
    return newValue - oldValue;
  }

  private normalize(value: InventoryTransaction): InventoryTransaction {
    return {
      id: asText(value.id),
      transactionDate: toDateKey(value.transactionDate),
      type: (asText(value.type) as InventoryTransactionType) || 'Adjustment',
      description: asText(value.description),
      stockIn: asNonNegativeNumber(value.stockIn),
      stockOut: asNonNegativeNumber(value.stockOut),
      previousStock: asNonNegativeNumber(value.previousStock),
      balance: asNonNegativeNumber(value.balance),
      referenceId: asText(value.referenceId),
    };
  }

  private requireWholePositive(value: number, field: string): number {
    const amount = Number(value);
    if (!Number.isInteger(amount) || amount <= 0) throw new Error(`${field} must be a positive whole number`);
    return amount;
  }
}
