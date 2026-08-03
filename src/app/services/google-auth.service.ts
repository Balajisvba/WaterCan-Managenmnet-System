import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

interface PendingTokenRequest {
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: number;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  readonly isSignedIn = signal(false);
  readonly accessToken = signal<string | null>(null);
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;
  private pendingRequest: PendingTokenRequest | null = null;
  private tokenExpiresAt = 0;
  private readonly storageKey = 'google-auth-token';
  private readonly expiryKey = 'google-auth-expiry';

  constructor() {
    if (typeof window !== 'undefined') {
      this.pollForGoogleClient();
      this.loadSession();
    }
  }

  private pollForGoogleClient(): void {
    const interval = window.setInterval(() => {
      if ((window as any).google?.accounts?.oauth2) {
        window.clearInterval(interval);
        this.initClient();
      }
    }, 100);
  }

  private initClient(): void {
    if (this.tokenClient) return;

    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: environment.googleClientId,
      scope: SCOPES,
      callback: (response: google.accounts.oauth2.TokenResponse) => this.handleTokenResponse(response),
      error_callback: (error: google.accounts.oauth2.TokenClientError) => this.handleTokenError(error),
    });
  }

  async login(): Promise<void> {
    await this.waitForClient();
    await this.requestToken('select_account');
  }

  async restoreSession(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!this.hasValidToken()) {
      this.clearSession();
    }
  }

  logout(): void {
    const token = this.accessToken();
    this.clearSession();

    if (token && (window as any).google?.accounts?.oauth2) {
      (window as any).google.accounts.oauth2.revoke(token, () => undefined);
    }
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  private hasValidToken(): boolean {
    return !!this.accessToken() && Date.now() < this.tokenExpiresAt;
  }

  private requestToken(prompt: 'consent' | 'select_account'): Promise<void> {
    if (!this.tokenClient) {
      return Promise.reject(new Error('Google Identity client is unavailable'));
    }

    if (this.pendingRequest) {
      this.rejectPendingRequest(new Error('Previous request cancelled'));
    }

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingRequest = null;
        reject(new Error('Google sign-in timed out. Make sure pop-ups are allowed, then try again.'));
      }, 30000);

      this.pendingRequest = { resolve, reject, timeoutId };
      try {
        this.tokenClient?.requestAccessToken({ prompt });
      } catch (error) {
        this.rejectPendingRequest(this.toError(error, 'Unable to start Google sign-in'));
      }
    });
  }

  private handleTokenResponse(response: google.accounts.oauth2.TokenResponse): void {
    const pending = this.takePendingRequest();

    if (response.error || !response.access_token) {
      this.clearSession();
      pending?.reject(new Error(response.error_description || response.error || 'Google sign-in failed'));
      return;
    }

    this.accessToken.set(response.access_token);
    this.tokenExpiresAt = Date.now() + Math.max(0, (response.expires_in ?? 3600) - 60) * 1000;
    this.isSignedIn.set(true);
    this.persistSession();
    pending?.resolve();
  }

  private handleTokenError(error: google.accounts.oauth2.TokenClientError): void {
    const message = error.type === 'popup_closed'
      ? 'Google sign-in was cancelled.'
      : error.type === 'popup_failed_to_open'
        ? 'Google sign-in popup was blocked. Allow pop-ups for this site and try again.'
        : error.message || 'Google sign-in could not be started.';

    this.clearSession();
    this.rejectPendingRequest(new Error(message));
  }

  private takePendingRequest(): PendingTokenRequest | null {
    const pending = this.pendingRequest;
    this.pendingRequest = null;
    if (pending) {
      window.clearTimeout(pending.timeoutId);
    }
    return pending;
  }

  private rejectPendingRequest(error: Error): void {
    const pending = this.takePendingRequest();
    pending?.reject(error);
  }

  private toError(error: unknown, fallback: string): Error {
    return error instanceof Error ? error : new Error(fallback);
  }

  private async waitForClient(): Promise<void> {
    if (this.tokenClient) return;
    return new Promise((resolve, reject) => {
      let poller: number;
      const timeout = window.setTimeout(() => {
        window.clearInterval(poller);
        reject(new Error('Google Identity client failed to load'));
      }, 30000);
      poller = window.setInterval(() => {
        if ((window as any).google?.accounts?.oauth2) {
          window.clearInterval(poller);
          window.clearTimeout(timeout);
          this.initClient();
          resolve();
        }
      }, 100);
    });
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.isSignedIn.set(false);
    this.tokenExpiresAt = 0;
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.expiryKey);
  }

  private persistSession(): void {
    if (this.accessToken()) {
      localStorage.setItem(this.storageKey, this.accessToken() as string);
      localStorage.setItem(this.expiryKey, this.tokenExpiresAt.toString());
    }
  }

  private loadSession(): void {
    const token = localStorage.getItem(this.storageKey);
    const expiry = localStorage.getItem(this.expiryKey);
    if (token && expiry) {
      const expiresAt = Number(expiry);
      if (Date.now() < expiresAt) {
        this.accessToken.set(token);
        this.tokenExpiresAt = expiresAt;
        this.isSignedIn.set(true);
      } else {
        this.clearSession();
      }
    }
  }
}
