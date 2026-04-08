import axios, { type AxiosInstance } from "axios";

interface AuthClient {
  getAccessToken(): Promise<string>;
  invalidate(token?: string): void;
}

type RawScaleoutRepository = Record<string, unknown>;
type QueryParams = Record<string, unknown>;

interface VeeamScaleoutRepositoriesPage {
  items?: RawScaleoutRepository[];
  totalCount?: number;
  [key: string]: unknown;
}

interface ScaleoutRepositoriesServiceConfig {
  pageSize: number;
}

const SCALEOUT_REPOSITORIES_ENDPOINT = {
  path: "/vbr/scaleoutRepositories",
  type: "scaleout_repository"
} as const;

export class ScaleoutRepositoriesService {
  readonly endpoint = SCALEOUT_REPOSITORIES_ENDPOINT;

  constructor(
    private readonly http: AxiosInstance,
    private readonly auth: AuthClient,
    private readonly config: ScaleoutRepositoriesServiceConfig
  ) {}

  async listScaleoutRepositories(params: QueryParams = {}): Promise<unknown> {
    return this.getScaleoutRepositories(params);
  }

  async listAllScaleoutRepositories(): Promise<RawScaleoutRepository[]> {
    const items: RawScaleoutRepository[] = [];
    let offset = 0;

    while (true) {
      const payload = await this.getScaleoutRepositoriesPage(offset);
      const pageItems = itemsFrom(payload);
      items.push(...pageItems);

      if (pageItems.length < this.config.pageSize || (payload.totalCount !== undefined && items.length >= payload.totalCount)) {
        return items;
      }

      offset += this.config.pageSize;
    }
  }

  private async getScaleoutRepositories(params: QueryParams, retry = true): Promise<unknown> {
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
        return this.getScaleoutRepositories(params, false);
      }

      throw new Error(`Falha ao consultar Veeam ONE ${this.endpoint.path}: ${describeAxiosError(error)}`, { cause: error });
    }
  }

  private async getScaleoutRepositoriesPage(offset: number): Promise<VeeamScaleoutRepositoriesPage> {
    const payload = await this.getScaleoutRepositories({
      Offset: offset,
      Limit: this.config.pageSize
    });

    if (isScaleoutRepositoriesPage(payload)) {
      return payload;
    }

    if (Array.isArray(payload)) {
      return {
        items: payload.filter(isRawScaleoutRepository),
        totalCount: payload.length
      };
    }

    return {
      items: [],
      totalCount: 0
    };
  }
}

function itemsFrom(payload: VeeamScaleoutRepositoriesPage): RawScaleoutRepository[] {
  return Array.isArray(payload.items) ? payload.items : [];
}

function isScaleoutRepositoriesPage(payload: unknown): payload is VeeamScaleoutRepositoriesPage {
  return isRawScaleoutRepository(payload);
}

function isRawScaleoutRepository(payload: unknown): payload is RawScaleoutRepository {
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
