import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../../services/google-auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(GoogleAuthService);
  private readonly notifications = inject(NotificationService);

  readonly loading = signal(false);

  async submit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.authService.login();
      this.notifications.success('Signed in with Google');
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      console.error('Google sign-in failed:', error);
      this.notifications.error(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
