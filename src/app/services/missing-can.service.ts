import { Injectable, signal } from '@angular/core';
import { MissingCan } from '../models/app.models';
import { buildSeedMissingCans, generateId } from '../utils/sample-data';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class MissingCanService {
  readonly missingCans = signal<MissingCan[]>([]);

  constructor(private readonly storageService: StorageService) {
    this.load();
  }

  load(): void {
    const stored = this.storageService.getItem<MissingCan[]>('aqua-missing-cans');
    this.missingCans.set(stored ?? buildSeedMissingCans());
  }

  save(): void {
    this.storageService.setItem('aqua-missing-cans', this.missingCans());
  }

  add(entry: Omit<MissingCan, 'id'>): MissingCan {
    const lostQuantity = Math.max(0, entry.missingQuantity - entry.recoveredQuantity);
    const lossAmount = lostQuantity * entry.costPerCan;
    const entity: MissingCan = {
      ...entry,
      id: generateId('M'),
      lostQuantity,
      lossAmount,
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    this.missingCans.update((items) => [entity, ...items]);
    this.save();
    return entity;
  }

  update(entry: MissingCan): void {
    const lostQuantity = Math.max(0, entry.missingQuantity - entry.recoveredQuantity);
    const lossAmount = lostQuantity * entry.costPerCan;
    const entity = { ...entry, lostQuantity, lossAmount };
    this.missingCans.update((items) => items.map((item) => (item.id === entry.id ? entity : item)));
    this.save();
  }

  remove(id: string): void {
    this.missingCans.update((items) => items.filter((item) => item.id !== id));
    this.save();
  }

  setAll(missingCans: MissingCan[]): void {
    this.missingCans.set(missingCans);
    this.save();
  }
}
