import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { ThemeService } from '../../services/theme.service';
import { SettingsService } from '../../services/settings.service';
import { ExcelService } from '../../services/excel.service';
import { NotificationService } from '../../services/notification.service';
import { Settings } from '../../models/app.models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  private readonly settingsService = inject(SettingsService);
  private readonly excelService = inject(ExcelService);
  private readonly notification = inject(NotificationService);

  readonly form: FormGroup = this.fb.group({
    companyName: ['Dhanam Agencies', Validators.required],
    canPrice: [40, [Validators.required, Validators.min(1)]],
    depositAmount: [500, [Validators.required, Validators.min(0)]],
    darkMode: [this.themeService.theme() === 'dark'],
  });

  constructor() {
    effect(() => {
      const updated = this.settingsService.settings();
      this.form.patchValue({
        companyName: updated.companyName || 'Dhanam Agencies',
        canPrice: updated.canPrice ?? 40,
        depositAmount: updated.depositAmount ?? 500,
        darkMode: updated.darkMode ?? (this.themeService.theme() === 'dark'),
      });
    });
  }

  async saveSettings(): Promise<void> {
    if (this.form.invalid) return;

    const value = this.form.value;
    const existing = this.settingsService.settings();
    const settingsEntity: Settings = {
      id: existing.id ?? 'S-1',
      companyName: value.companyName,
      companyLogo: '',
      canPrice: Number(value.canPrice),
      depositAmount: Number(value.depositAmount),
      theme: value.darkMode ? 'dark' : 'light',
      darkMode: !!value.darkMode,
      backupDate: new Date().toISOString(),
    };

    try {
      await this.settingsService.save(settingsEntity);
      this.themeService.setTheme(value.darkMode ? 'dark' : 'light');
      this.notification.success('System settings saved successfully');
    } catch {
      this.notification.error('Unable to save settings to the shared spreadsheet');
    }
  }

  async downloadExcelBackup(): Promise<void> {
    try {
      await this.excelService.exportWorkbook();
      this.notification.success('Full Excel workbook backup downloaded');
    } catch (e) {
      this.notification.error('Failed to export Excel backup');
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.notification.error('Select a valid .xlsx backup file');
      input.value = '';
      return;
    }
    if (!window.confirm('Restoring a backup replaces every shared customer, delivery, payment, expense, missing-can, and settings record. Continue?')) {
      input.value = '';
      return;
    }

    const success = await this.excelService.importWorkbook(file);
    if (success) {
      this.notification.success('Excel workbook restored to the shared spreadsheet');
    } else {
      this.notification.error('Restore failed. No success message was shown; check the workbook and shared-sheet access.');
    }
    input.value = '';
  }
}
