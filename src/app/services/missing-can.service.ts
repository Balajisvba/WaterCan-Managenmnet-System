import { Injectable, signal } from '@angular/core';
import { MissingCan } from '../models/app.models';
import { generateSequentialId } from '../utils/sample-data';
import { asText, normalizeMissingCan, requireNonNegativeNumber, requirePositiveNumber, requireText } from '../utils/record-normalizers';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class MissingCanService {
  readonly missingCans = signal<MissingCan[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {}

  async load(): Promise<void> {
    const stored = await this.googleSheetService.read<MissingCan>('MissingCans');
    this.missingCans.set(stored.filter((entry) => asText(entry.id)).map(normalizeMissingCan));
  }

  async add(entry: Omit<MissingCan, 'id'>): Promise<MissingCan> {
    const entity = this.toMissingCan({
      ...entry,
      id: generateSequentialId('M', this.missingCans().map((item) => item.id)),
      createdAt: entry.createdAt || new Date().toISOString(),
    });
    this.missingCans.update((list) => [entity, ...list]);

    try {
      await this.googleSheetService.create<MissingCan>('MissingCans', entity);
    } catch (error) {
      this.missingCans.update((list) => list.filter((item) => item.id !== entity.id));
      throw error;
    }

    return entity;
  }

  async update(entry: MissingCan): Promise<void> {
    const entity = this.toMissingCan(entry);

    const previous = this.missingCans();
    this.missingCans.update((list) => list.map((item) => (item.id === entity.id ? entity : item)));

    try {
      await this.googleSheetService.update<MissingCan>('MissingCans', entity);
    } catch (error) {
      this.missingCans.set(previous);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const previous = this.missingCans();
    this.missingCans.update((list) => list.filter((item) => item.id !== id));

    try {
      await this.googleSheetService.delete('MissingCans', id);
    } catch (error) {
      this.missingCans.set(previous);
      throw error;
    }
  }

  setAll(missingCans: MissingCan[]): void {
    this.missingCans.set(missingCans.filter((entry) => asText(entry.id)).map(normalizeMissingCan));
  }

  async replaceAll(missingCans: MissingCan[]): Promise<void> {
    const normalized = missingCans.map((entry) => this.toMissingCan(entry));
    this.assertUniqueIds(normalized);
    await this.googleSheetService.replaceSheet('MissingCans', normalized);
    this.missingCans.set(normalized);
  }

  private toMissingCan(value: Partial<MissingCan>): MissingCan {
    const missingQuantity = requirePositiveNumber(value.missingQuantity, 'Missing quantity', true);
    const recoveredQuantity = requireNonNegativeNumber(value.recoveredQuantity, 'Recovered quantity', true);
    if (recoveredQuantity > missingQuantity) {
      throw new Error('Recovered quantity cannot exceed missing quantity');
    }

    return normalizeMissingCan({
      ...value,
      id: requireText(value.id, 'Missing-can record id'),
      customerId: requireText(value.customerId, 'Customer'),
      customerName: requireText(value.customerName, 'Customer name'),
      missingQuantity,
      recoveredQuantity,
      costPerCan: requireNonNegativeNumber(value.costPerCan, 'Cost per can'),
      createdAt: value.createdAt || new Date().toISOString(),
    });
  }

  private assertUniqueIds(entries: MissingCan[]): void {
    const ids = new Set<string>();
    for (const entry of entries) {
      if (ids.has(entry.id)) throw new Error(`Duplicate missing-can record id: ${entry.id}`);
      ids.add(entry.id);
    }
  }
}
