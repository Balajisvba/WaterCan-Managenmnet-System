import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>('light');

  constructor(private readonly storageService: StorageService) {
    const storedTheme = this.storageService.getItem<'light' | 'dark'>('aqua-theme');
    if (storedTheme) {
      this.theme.set(storedTheme);
    }
  }

  toggleTheme(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.theme.set(theme);
    this.storageService.setItem('aqua-theme', theme);
  }
}
