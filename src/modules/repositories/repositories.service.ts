import axios, { type AxiosInstance } from "axios";

interface AuthClient {
  getAccessToken(): Promise<string>;
  invalidate(token?: string): void;
}

type RawRepository = Record<string, unknown>;
type QueryParams = Record<string, unknown>;

interface VeeamRepositoriesPage {
  items?: RawRepository[];
  totalCount?: number;
  [key: string]: unknown;
}

interface RepositoriesServiceConfig {
  pageSize: number;
}

const REPOSITORIES_ENDPOINT = {
  path: "/vbr/repositories",
  type: "repository"
} as const;

export class RepositoriesService {
  readonly endpoint = REPOSITORIES_ENDPOINT;

  constructor(
    private readonly http: AxiosInstance,
    private readonly auth: AuthClient,
    private readonly config: RepositoriesServiceConfig
  ) {}

  async listRepositories(params: QueryParams = {}): Promise<unknown> {
    return this.getRepositories(params);
  }

  async listAllRepositories(): Promise<RawRepository[]> {
    const items: RawRepository[] = [];
    let offset = 0;

    while (true) {
      const payload = await this.getRepositoriesPage(offset);
      const pageItems = itemsFrom(payload);
      items.push(...pageItems);

      if (pageItems.length < this.config.pageSize || (payload.totalCount !== undefined && items.length >= payload.totalCount)) {
        return items;
      }

      offset += this.config.pageSize;
    }
  }

  private async getRepositories(params: QueryParams, retry = true): Promise<unknown> {
    const accessToken = await this.auth.getAccessToken();

    try {
      const response = await this.http.get<unknown>(this.endpoint.path, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        params
      });

      return response.data;
    } catch (error) {
      if (retry && axios.isAxiosError(error) && error.response?.status === 401) {
        this.auth.invalidate(accessToken);
        return this.getRepositories(params, false);
      }

      throw new Error(`Falha ao consultar Veeam ONE ${this.endpoint.path}: ${describeAxiosError(error)}`, { cause: error });
    }
  }

  private async getRepositoriesPage(offset: number): Promise<VeeamRepositoriesPage> {
    const payload = await this.getRepositories({
      Offset: offset,
      Limit: this.config.pageSize
    });

    if (isRepositoriesPage(payload)) {
      return payload;
    }

    if (Array.isArray(payload)) {
      return {
        items: payload.filter(isRawRepository),
        totalCount: payload.length
      };
    }

    return {
      items: [],
      totalCount: 0
    };
  }
}

function itemsFrom(payload: VeeamRepositoriesPage): RawRepository[] {
  return Array.isArray(payload.items) ? payload.items : [];
}

function isRepositoriesPage(payload: unknown): payload is VeeamRepositoriesPage {
  return isRawRepository(payload);
}

function isRawRepository(payload: unknown): payload is RawRepository {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload);
}

function describeAxiosError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Erro desconhecido";
  }

  if (error.response) {
    return `HTTP ${error.response.status}`;
  }

  return error.message;
}
