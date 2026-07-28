import { Injectable, signal } from '@angular/core';
import { MissingCan } from '../models/app.models';
import { buildSeedMissingCans, generateId } from '../utils/sample-data';
import { GoogleSheetService } from './google-sheet.service';

@Injectable({ providedIn: 'root' })
export class MissingCanService {
  readonly missingCans = signal<MissingCan[]>([]);

  constructor(private readonly googleSheetService: GoogleSheetService) {
    this.load();
  }

  async load(): Promise<void> {
    try {
      const stored = await this.googleSheetService.read<MissingCan>('MissingCans');
      this.missingCans.set(stored.length ? stored : buildSeedMissingCans());
    } catch {
      this.missingCans.set(buildSeedMissingCans());
    }
  }

  async add(entry: Omit<MissingCan, 'id'>): Promise<MissingCan> {
    const lostQuantity = Math.max(0, entry.missingQuantity - entry.recoveredQuantity);
    const lossAmount = lostQuantity * entry.costPerCan;
    const entity: MissingCan = {
      ...entry,
      id: generateId('M'),
      lostQuantity,
      lossAmount,
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    await this.googleSheetService.create<MissingCan>('MissingCans', entity);
    await this.load();
    return entity;
  }

  async update(entry: MissingCan): Promise<void> {
    const lostQuantity = Math.max(0, entry.missingQuantity - entry.recoveredQuantity);
    const lossAmount = lostQuantity * entry.costPerCan;
    const entity = { ...entry, lostQuantity, lossAmount };
    await this.googleSheetService.update<MissingCan>('MissingCans', entity);
    await this.load();
  }

  async remove(id: string): Promise<void> {
    await this.googleSheetService.delete('MissingCans', id);
    await this.load();
  }

  setAll(missingCans: MissingCan[]): void {
    this.missingCans.set(missingCans);
  }
}
