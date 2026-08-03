import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const SESSION_STORAGE_KEY = 'aqua-track-google-session';

interface PendingTokenRequest {
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: number;
}

interface StoredSession {
  accessToken: string;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  readonly isSignedIn = signal(false);
  readonly accessToken = signal<string | null>(null);
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;
  private pendingRequest: PendingTokenRequest | null = null;
  private tokenExpiresAt = 0;
  private googleClientPromise: Promise<void> | null = null;
  private readonly storageKey = 'google-auth-token';
  private readonly expiryKey = 'google-auth-expiry';
  private refreshTimeoutId: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      void this.ensureGoogleClient()
        .then(() => {
          // load any stored session after the client is initialized
          this.loadSession();
        })
        .catch(() => {
          // ignore load failures here; login will surface errors
        });
      this.pollForGoogleClient();
    }
  }

  async login(): Promise<void> {
    await this.ensureGoogleClient();
    await this.requestToken('select_account');
  }

  async restoreSession(): Promise<void> {
    if (typeof window === 'undefined') return;

    await this.ensureGoogleClient();

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

  private ensureGoogleClient(): Promise<void> {
    if (this.tokenClient) {
      return Promise.resolve();
    }

    if (this.googleClientPromise) {
      return this.googleClientPromise;
    }

    this.googleClientPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google authentication is unavailable outside the browser'));
        return;
      }

      const googleAuth = (window as any).google?.accounts?.oauth2;
      if (googleAuth?.initTokenClient) {
        this.initClient();
        resolve();
        return;
      }

      const scriptId = 'google-gsi-script';
      const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
      const finish = (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      };

      const onLoaded = () => {
        const readyAuth = (window as any).google?.accounts?.oauth2;
        if (readyAuth?.initTokenClient) {
          this.initClient();
          finish();
          return;
        }
        finish(new Error('Google Identity Services loaded but the token client is not available.'));
      };

      if (existingScript) {
        if (existingScript.dataset['loaded'] === 'true') {
          onLoaded();
        } else {
          existingScript.addEventListener('load', () => {
            existingScript.dataset['loaded'] = 'true';
            onLoaded();
          }, { once: true });
          existingScript.addEventListener('error', () => {
            finish(new Error('Failed to load Google Identity Services. Check your network connection and browser settings.'));
          }, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.dataset['loaded'] = 'true';
        onLoaded();
      };
      script.onerror = () => {
        finish(new Error('Failed to load Google Identity Services. Check your network connection and browser settings.'));
      };
      document.head.appendChild(script);
    });

    return this.googleClientPromise;
  }

  private initClient(): void {
    if (this.tokenClient) return;

    if (typeof window === 'undefined') {
      return;
    }

    const googleAuth = (window as any).google?.accounts?.oauth2;
    if (!googleAuth?.initTokenClient) {
      throw new Error('Google Identity Services is not available.');
    }

    this.tokenClient = googleAuth.initTokenClient({
      client_id: environment.googleClientId,
      scope: SCOPES,
      callback: (response: google.accounts.oauth2.TokenResponse) => this.handleTokenResponse(response),
      error_callback: (error: google.accounts.oauth2.TokenClientError) => this.handleTokenError(error),
    });
  }

  private loadSession(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = this.readStoredSession();
    if (stored) {
      this.accessToken.set(stored.accessToken);
      this.tokenExpiresAt = stored.expiresAt;
      this.isSignedIn.set(true);
    }
  }

  private pollForGoogleClient(): void {
    void this.ensureGoogleClient();
  }

  private hasValidToken(): boolean {
    return !!this.accessToken() && Date.now() < this.tokenExpiresAt;
  }

  private requestToken(prompt: 'consent' | 'select_account'): Promise<void> {
    if (!this.tokenClient) {
      return Promise.reject(new Error('Google Identity client is unavailable'));
    }

    if (this.pendingRequest) {
      return Promise.reject(new Error('A Google sign-in request is already in progress'));
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
    this.scheduleRefresh();
    pending?.resolve();
  }

  private scheduleRefresh(): void {
    if (this.refreshTimeoutId) {
      window.clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }

    const msUntilExpiry = this.tokenExpiresAt - Date.now();
    // refresh one minute before expiry
    const refreshIn = Math.max(0, msUntilExpiry - 60 * 1000);
    if (refreshIn <= 0) {
      // token already near expiry — try a silent refresh immediately
      void this.silentRefresh();
      return;
    }

    this.refreshTimeoutId = window.setTimeout(() => {
      void this.silentRefresh();
    }, refreshIn);
  }

  private async silentRefresh(): Promise<void> {
    if (!this.tokenClient) {
      try {
        await this.waitForClient();
      } catch {
        this.clearSession();
        return;
      }
    }

    try {
      // Request a new token without prompting the user. The token client will
      // return without UI if a session is available.
      this.tokenClient?.requestAccessToken({});
    } catch (err) {
      // If silent refresh fails, clear stored session to ensure a consistent state.
      this.clearSession();
    }
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
    await this.ensureGoogleClient();
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
    // Use localStorage so the session survives page refreshes.
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private readStoredSession(): StoredSession | null {
    try {
      const value = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!value) {
        return null;
      }

      const session = JSON.parse(value) as Partial<StoredSession>;
      if (typeof session.accessToken !== 'string' || !session.accessToken || typeof session.expiresAt !== 'number' || Date.now() >= session.expiresAt) {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      return { accessToken: session.accessToken, expiresAt: session.expiresAt };
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.isSignedIn.set(false);
    this.tokenExpiresAt = 0;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }
}
