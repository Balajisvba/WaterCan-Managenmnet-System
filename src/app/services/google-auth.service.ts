import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  readonly isSignedIn = signal(false);
  readonly accessToken = signal<string | null>(null);
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;
  private pendingRequest: PendingTokenRequest | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.pollForGoogleClient();
    }
  }

  async login(): Promise<void> {
    await this.waitForClient();
    await this.requestToken('select_account');
  }

  async restoreSession(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (this.hasValidToken()) {
      return;
    }

    const storedSession = this.readStoredSession();
    if (storedSession) {
      this.accessToken.set(storedSession.accessToken);
      this.tokenExpiresAt = storedSession.expiresAt;
      this.isSignedIn.set(true);
      return;
    }

    this.clearSession();
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
    if (!this.hasValidToken() || typeof window === 'undefined') {
      return;
    }

    const session: StoredSession = {
      accessToken: this.accessToken()!,
      expiresAt: this.tokenExpiresAt,
    };
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private readStoredSession(): StoredSession | null {
    try {
      const value = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!value) {
        return null;
      }

      const session = JSON.parse(value) as Partial<StoredSession>;
      if (typeof session.accessToken !== 'string' || !session.accessToken || typeof session.expiresAt !== 'number' || Date.now() >= session.expiresAt) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      return { accessToken: session.accessToken, expiresAt: session.expiresAt };
    } catch {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.isSignedIn.set(false);
    this.tokenExpiresAt = 0;
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }
}
