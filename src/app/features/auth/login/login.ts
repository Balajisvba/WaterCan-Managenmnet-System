import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../../services/google-auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatCheckboxModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(GoogleAuthService);
  private readonly notifications = inject(NotificationService);

  readonly form: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    rememberMe: [true],
  });
  readonly loading = signal(false);

  async submit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.authService.login();
      this.notifications.success('Signed in with Google');
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.notifications.error('Google sign-in failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
