import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  readonly isSignedIn = signal(false);
  readonly accessToken = signal<string | null>(null);
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;
  private readonly storageKey = 'water-can-google-auth';

  constructor() {
    if (typeof window !== 'undefined') {
      this.restoreSession();
      this.pollForGoogleClient();
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
      callback: (response: google.accounts.oauth2.TokenResponse) => {
        if (response.error) {
          console.error('Google auth error:', response);
          this.isSignedIn.set(false);
          this.accessToken.set(null);
          this.clearStoredSession();
          return;
        }
        this.accessToken.set(response.access_token ?? null);
        this.isSignedIn.set(!!response.access_token);
        this.persistSession();
      },
    });
  }

  async login(): Promise<void> {
    if (!this.tokenClient) {
      await this.waitForClient();
    }
    return new Promise((resolve, reject) => {
      this.tokenClient?.requestAccessToken({ prompt: 'consent' });
      const timeout = window.setTimeout(() => {
        reject(new Error('Google login timed out'));
      }, 30000);
      const watcher = window.setInterval(() => {
        if (this.accessToken()) {
          window.clearTimeout(timeout);
          window.clearInterval(watcher);
          resolve();
        }
      }, 100);
    });
  }

  async restoreSession(): Promise<void> {
    if (typeof window === 'undefined') return;

    const storedToken = this.getStoredToken();
    if (storedToken) {
      this.accessToken.set(storedToken);
      this.isSignedIn.set(true);
      return;
    }

    if (!this.tokenClient) {
      await this.waitForClient();
    }

    const existingToken = this.accessToken();
    if (existingToken) {
      this.isSignedIn.set(true);
      this.persistSession();
      return;
    }

    try {
      this.tokenClient?.requestAccessToken({ prompt: 'none' });
    } catch {
      this.clearStoredSession();
    }
  }

  logout(): void {
    const token = this.accessToken();
    if (token) {
      (window as any).google.accounts.oauth2.revoke(token, () => {
        this.accessToken.set(null);
        this.isSignedIn.set(false);
        this.clearStoredSession();
      });
      return;
    }

    this.accessToken.set(null);
    this.isSignedIn.set(false);
    this.clearStoredSession();
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  private async waitForClient(): Promise<void> {
    if (this.tokenClient) return;
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        window.clearInterval(poller);
        reject(new Error('Google Identity client failed to load'));
      }, 30000);
      const poller = window.setInterval(() => {
        if ((window as any).google?.accounts?.oauth2) {
          window.clearInterval(poller);
          window.clearTimeout(timeout);
          this.initClient();
          resolve();
        }
      }, 100);
    });
  }

  private persistSession(): void {
    if (typeof window === 'undefined') return;
    const session = {
      accessToken: this.accessToken(),
      isSignedIn: this.isSignedIn(),
    };
    window.localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private clearStoredSession(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(this.storageKey);
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(this.storageKey);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as { accessToken?: string | null; isSignedIn?: boolean };
      return parsed.isSignedIn && parsed.accessToken ? parsed.accessToken : null;
    } catch {
      return null;
    }
  }
}
