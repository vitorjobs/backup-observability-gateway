import type { AxiosInstance } from "axios";

export interface AuthServiceConfig {
  username: string;
  password: string;
  tokenRenewSkewMs: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in: number;
}

interface CachedToken {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
}

export class AuthService {
  private token?: CachedToken;
  private inFlight?: Promise<string>;

  constructor(
    private readonly config: AuthServiceConfig,
    private readonly http: AxiosInstance,
    private readonly now = () => Date.now()
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.token && this.now() < this.token.expiresAtMs) {
      return this.token.accessToken;
    }

    if (!this.inFlight) {
      this.inFlight = this.renewToken().finally(() => {
        this.inFlight = undefined;
      });
    }

    return this.inFlight;
  }

  invalidate(token?: string): void {
    if (!token || token === this.token?.accessToken) {
      this.token = undefined;
    }
  }

  private async renewToken(): Promise<string> {
    if (this.token?.refreshToken) {
      try {
        return await this.requestToken(new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.token.refreshToken
        }));
      } catch {
        this.invalidate();
      }
    }

    return this.requestToken(new URLSearchParams({
      grant_type: "password",
      username: this.config.username,
      password: this.config.password
    }));
  }

  private async requestToken(body: URLSearchParams): Promise<string> {
    const response = await this.http.post<TokenResponse>("/api/token", body, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    const token = response.data;

    if (!token?.access_token || !token.refresh_token || !token.expires_in) {
      throw new Error("Autenticacao Veeam ONE retornou resposta sem access_token, refresh_token ou expires_in.");
    }

    this.token = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAtMs: this.now() + Math.max(1_000, token.expires_in * 1000 - this.config.tokenRenewSkewMs)
    };

    return this.token.accessToken;
  }
}
