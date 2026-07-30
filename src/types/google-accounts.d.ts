declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token?: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
        error?: string;
        error_description?: string;
      }

      interface TokenClientError {
        type: 'popup_failed_to_open' | 'popup_closed' | 'unknown';
        message?: string;
      }

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: TokenClientError) => void;
      }

      interface RequestAccessTokenOptions {
        prompt?: '' | 'none' | 'consent' | 'select_account';
        hint?: string;
        login_hint?: string;
        include_granted_scopes?: boolean;
      }

      interface TokenClient {
        requestAccessToken(options?: RequestAccessTokenOptions): void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
      function revoke(token: string, callback: () => void): void;
    }
  }
}
