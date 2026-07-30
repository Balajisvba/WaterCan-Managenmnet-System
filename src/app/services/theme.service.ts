import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<'light' | 'dark'>('light');

  constructor(private readonly storageService: StorageService) {
    const storedTheme = this.storageService.getItem<'light' | 'dark'>('aqua-theme');
    if (storedTheme) {
      this.theme.set(storedTheme);
    }
    this.applyTheme(this.theme());
  }

  toggleTheme(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.theme.set(theme);
    this.storageService.setItem('aqua-theme', theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    this.document.documentElement.dataset['theme'] = theme;
  }
}
