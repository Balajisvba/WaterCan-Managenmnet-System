import { Injectable, signal } from '@angular/core';
import { Settings } from '../models/app.models';
import { GoogleSheetService } from './google-sheet.service';
import { buildSeedSettings } from '../utils/sample-data';
import { normalizeSettings } from '../utils/record-normalizers';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<Settings>(buildSeedSettings());

  constructor(private readonly googleSheetService: GoogleSheetService) {}

  async load(): Promise<void> {
    const stored = await this.googleSheetService.read<Settings>('Settings');
    this.settings.set(stored.length > 0 ? normalizeSettings(stored[0]) : buildSeedSettings());
  }

  async save(settings: Settings): Promise<Settings> {
    const payload = normalizeSettings({ ...settings, id: settings.id || 'S-1' });

    try {
      const existing = await this.googleSheetService.read<Settings>('Settings');
      if (existing.length > 0) {
        await this.googleSheetService.update<Settings>('Settings', payload);
      } else {
        await this.googleSheetService.create<Settings>('Settings', payload);
      }
      this.settings.set(payload);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  async replaceAll(settings: Settings[]): Promise<void> {
    const normalized = settings.map(normalizeSettings);
    if (normalized.length > 1) {
      throw new Error('Settings restore must contain at most one record');
    }
    const next = normalized[0] ?? buildSeedSettings();
    await this.googleSheetService.replaceSheet('Settings', [next]);
    this.settings.set(next);
  }
}
