import axios, { type AxiosInstance } from "axios";

interface AuthClient {
  getAccessToken(): Promise<string>;
  invalidate(token?: string): void;
}

type RawJob = Record<string, unknown>;

interface VeeamJobsResponse {
  items: RawJob[];
  totalCount?: number;
  [key: string]: unknown;
}

interface JobsServiceConfig {
  pageSize: number;
}

const VM_BACKUP_JOBS_ENDPOINT = {
  path: "/vbrJobs/vmBackupJobs",
  type: "vm_backup",
  uidKey: "vmBackupJobUid"
} as const;

export class VmBackupJobsService {
  readonly endpoint = VM_BACKUP_JOBS_ENDPOINT;

  constructor(
    private readonly http: AxiosInstance,
    private readonly auth: AuthClient,
    private readonly config: JobsServiceConfig
  ) {}

  async listJobs(): Promise<VeeamJobsResponse> {
    let firstPayload: VeeamJobsResponse | undefined;
    const items: RawJob[] = [];
    let offset = 0;

    while (true) {
      const payload = await this.getJobsPage(offset);
      firstPayload ??= payload;
      const pageItems = payload.items ?? [];

      items.push(...pageItems);

      if (pageItems.length < this.config.pageSize || (payload.totalCount !== undefined && items.length >= payload.totalCount)) {
        return {
          ...firstPayload,
          items
        };
      }

      offset += this.config.pageSize;
    }
  }

  private async getJobsPage(offset: number, retry = true): Promise<VeeamJobsResponse> {
    const accessToken = await this.auth.getAccessToken();

    try {
      const response = await this.http.get<VeeamJobsResponse>(this.endpoint.path, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          Offset: offset,
          Limit: this.config.pageSize
        }
      });

      return response.data;
    } catch (error) {
      if (retry && axios.isAxiosError(error) && error.response?.status === 401) {
        this.auth.invalidate(accessToken);
        return this.getJobsPage(offset, false);
      }

      throw new Error(`Falha ao consultar Veeam ONE ${this.endpoint.path}: ${describeAxiosError(error)}`, { cause: error });
    }
  }
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
