import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../../services/theme.service';
import { GoogleAuthService } from '../../../services/google-auth.service';
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
export class LayoutShellComponent implements OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(GoogleAuthService);
  private readonly router = inject(Router);
  private readonly excelService = inject(ExcelService);
  private readonly notification = inject(NotificationService);

  readonly isDarkMode = computed(() => this.themeService.theme() === 'dark');
  readonly sidenavOpen = signal(true);
  readonly isMobile = signal(false);
  readonly sidenavMode = computed(() => (this.isMobile() ? 'over' : 'side'));
  readonly showBackdrop = computed(() => this.isMobile());
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

  constructor() {
    if (typeof window !== 'undefined') {
      this.updateViewport();
      window.addEventListener('resize', this.handleResize);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  private readonly handleResize = () => {
    this.updateViewport();
  };

  private updateViewport(): void {
    this.isMobile.set(window.innerWidth <= 768);
    this.sidenavOpen.set(!this.isMobile());
  }

  toggleSidenav(): void {
    this.sidenavOpen.set(!this.sidenavOpen());
  }

  onNavItemClick(): void {
    if (this.isMobile()) {
      this.sidenavOpen.set(false);
    }
  }

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
    this.authService.logout();
    this.notification.success('Signed out successfully');
    this.router.navigate(['/login']);
  }
}
