import { Component, inject, OnInit } from '@angular/core';
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
import { StorageService } from '../../services/storage.service';
import { ExcelService } from '../../services/excel.service';
import { NotificationService } from '../../services/notification.service';
import { Settings } from '../../models/app.models';
import { buildSeedSettings } from '../../utils/sample-data';

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
export class SettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  private readonly storageService = inject(StorageService);
  private readonly excelService = inject(ExcelService);
  private readonly notification = inject(NotificationService);

  readonly form: FormGroup = this.fb.group({
    companyName: ['Dhanam Agencies', Validators.required],
    canPrice: [40, [Validators.required, Validators.min(1)]],
    depositAmount: [500, [Validators.required, Validators.min(0)]],
    darkMode: [this.themeService.theme() === 'dark'],
  });

  ngOnInit(): void {
    const saved = this.storageService.getItem<Settings>('aqua-settings');
    if (saved) {
      this.form.patchValue({
        companyName: saved.companyName || 'Dhanam Agencies',
        canPrice: saved.canPrice ?? 40,
        depositAmount: saved.depositAmount ?? 500,
        darkMode: saved.darkMode ?? (this.themeService.theme() === 'dark'),
      });
    }
  }

  saveSettings(): void {
    if (this.form.invalid) return;

    const value = this.form.value;
    const settingsEntity: Settings = {
      companyName: value.companyName,
      companyLogo: '',
      canPrice: Number(value.canPrice),
      depositAmount: Number(value.depositAmount),
      theme: value.darkMode ? 'dark' : 'light',
      darkMode: !!value.darkMode,
      backupDate: new Date().toISOString(),
    };

    this.storageService.setItem('aqua-settings', settingsEntity);
    this.themeService.setTheme(value.darkMode ? 'dark' : 'light');
    this.notification.success('System settings saved successfully');
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
    const success = await this.excelService.importWorkbook(file);
    if (success) {
      this.notification.success('Excel workbook imported successfully! All records synchronized.');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      this.notification.error('Failed to parse uploaded Excel workbook');
    }
  }
}
