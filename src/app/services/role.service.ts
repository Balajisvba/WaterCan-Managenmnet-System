import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { GoogleAuthService } from './google-auth.service';

export type AppRole = 'Admin' | 'Driver';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly authService = inject(GoogleAuthService);
  readonly role = signal<AppRole | null>(null);
  readonly isAdmin = computed(() => this.role() === 'Admin');
  readonly isDriver = computed(() => this.role() === 'Driver');

  async refresh(): Promise<void> {
    const email = this.authService.userEmail();
    const normalized = email?.toLowerCase();
    if (!normalized) { this.role.set(null); return; }
    if (environment.driverEmails.map((item) => item.toLowerCase()).includes(normalized)) {
      this.role.set('Driver');
    } else if (environment.adminEmails.map((item) => item.toLowerCase()).includes(normalized)) {
      this.role.set('Admin');
    } else {
      // Preserve access for existing authorized spreadsheet users until the
      // optional admin email list is customized for the deployment.
      this.role.set('Admin');
    }
  }

  canAccess(roles: AppRole[]): boolean { const current = this.role(); return !!current && roles.includes(current); }
}
