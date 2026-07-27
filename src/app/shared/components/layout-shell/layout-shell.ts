import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../../services/theme.service';
import { StorageService } from '../../../services/storage.service';
import { ExcelService } from '../../../services/excel.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  templateUrl: './layout-shell.html',
  styleUrl: './layout-shell.css',
})
export class LayoutShellComponent {
  private readonly themeService = inject(ThemeService);
  private readonly storageService = inject(StorageService);
  private readonly excelService = inject(ExcelService);
  private readonly notification = inject(NotificationService);

  readonly isDarkMode = computed(() => this.themeService.theme() === 'dark');
  readonly sidenavOpen = signal(true);
  readonly navigation = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Customers', icon: 'people', route: '/customers' },
    { label: 'Deliveries', icon: 'local_shipping', route: '/deliveries' },
    { label: 'Expenses', icon: 'receipt_long', route: '/expenses' },
    { label: 'Payments', icon: 'payments', route: '/payments' },
    { label: 'Missing Cans', icon: 'inventory_2', route: '/missing-cans' },
    { label: 'Reports', icon: 'analytics', route: '/reports' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
  ];

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  async quickBackupExcel(): Promise<void> {
    try {
      await this.excelService.exportWorkbook();
      this.notification.success('Excel workbook downloaded successfully');
    } catch (e) {
      this.notification.error('Failed to export Excel workbook');
    }
  }

  logout(): void {
    this.storageService.removeItem('aqua-login');
    window.location.reload();
  }
}
