import { Injectable, signal } from '@angular/core';
import { Settings } from '../models/app.models';
import { GoogleSheetService } from './google-sheet.service';
import { buildSeedSettings } from '../utils/sample-data';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<Settings>(buildSeedSettings());

  constructor(private readonly googleSheetService: GoogleSheetService) {
    this.load();
  }

  async load(): Promise<void> {
    try {
      const stored = await this.googleSheetService.read<Settings>('Settings');
      if (stored.length > 0) {
        this.settings.set(stored[0]);
      } else {
        const initial = buildSeedSettings();
        await this.save(initial);
      }
    } catch {
      this.settings.set(buildSeedSettings());
    }
  }

  async save(settings: Settings): Promise<Settings> {
    const payload = { ...settings, id: settings.id || 'S-1' };

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
      this.settings.set(payload);
      return payload;
    }
  }
}
