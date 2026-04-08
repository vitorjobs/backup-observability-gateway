import { Gauge, Registry } from "prom-client";

const JOB_LABELS = ["job_name", "job_type", "status"] as const;
const JOB_BASE_LABELS = ["job_name", "job_type"] as const;
const JOB_INFO_LABELS = ["job_name", "job_type", "platform"] as const;

type StatusBucket = "success" | "warning" | "failed" | "running" | "idle" | "unknown";

interface JobsExporterConfig {
  continueOnEndpointError: boolean;
}

interface CollectedJob {
  endpoint: JobEndpoint;
  item: RawJob;
}

interface JobEndpoint {
  path: string;
  type: string;
  uidKey: string;
}

interface JobsListService {
  readonly endpoint: JobEndpoint;
  listJobs(): Promise<VeeamJobsResponse>;
}

interface StatusCounters {
  total: number;
  failed: number;
  success: number;
  warning: number;
  running: number;
  idle: number;
  unknown: number;
}

type RawJob = Record<string, unknown>;

interface VeeamJobsResponse {
  items: RawJob[];
}

export class JobsExporter {
  private readonly registry = new Registry();
  private readonly totalJobs = new Gauge({
    name: "total_jobs",
    help: "Total de jobs coletados por tipo e status.",
    labelNames: ["job_type", "status"],
    registers: [this.registry]
  });
  private readonly activeJobs = new Gauge({
    name: "active_jobs",
    help: "Jobs em execucao no momento da coleta.",
    labelNames: JOB_LABELS,
    registers: [this.registry]
  });
  private readonly failedJobs = new Gauge({
    name: "failed_jobs",
    help: "Jobs com ultimo estado consolidado como falha.",
    labelNames: JOB_LABELS,
    registers: [this.registry]
  });
  private readonly successJobs = new Gauge({
    name: "success_jobs",
    help: "Jobs com ultimo estado consolidado como sucesso.",
    labelNames: JOB_LABELS,
    registers: [this.registry]
  });
  private readonly lastRunTimestamp = new Gauge({
    name: "job_last_run_timestamp_seconds",
    help: "Timestamp Unix da ultima execucao do job.",
    labelNames: JOB_LABELS,
    registers: [this.registry]
  });
  private readonly lastRunDuration = new Gauge({
    name: "job_last_run_duration_seconds",
    help: "Duracao da ultima execucao do job em segundos.",
    labelNames: JOB_LABELS,
    registers: [this.registry]
  });
  private readonly transferredData = new Gauge({
    name: "job_last_transferred_data_bytes",
    help: "Bytes transferidos na ultima execucao do job.",
    labelNames: JOB_LABELS,
    registers: [this.registry]
  });
  private readonly veeamJobInfo = new Gauge({
    name: "veeam_job_info",
    help: "Informacoes estaticas existentes no payload original do job Veeam ONE.",
    labelNames: JOB_INFO_LABELS,
    registers: [this.registry]
  });
  private readonly veeamJobStatus = new Gauge({
    name: "veeam_job_status",
    help: "Status do ultimo resultado do job Veeam ONE.",
    labelNames: JOB_LABELS,
    registers: [this.registry]
  });
  private readonly veeamJobLastRunTimestamp = new Gauge({
    name: "veeam_job_last_run_timestamp_seconds",
    help: "Timestamp Unix da ultima execucao do job Veeam ONE.",
    labelNames: JOB_BASE_LABELS,
    registers: [this.registry]
  });
  private readonly veeamJobDuration = new Gauge({
    name: "veeam_job_duration_seconds",
    help: "Duracao da ultima sessao do job Veeam ONE em segundos, lida de lastRunDurationSec.",
    labelNames: JOB_BASE_LABELS,
    registers: [this.registry]
  });
  private readonly veeamJobTransferredBytes = new Gauge({
    name: "veeam_job_transferred_bytes",
    help: "Bytes transferidos na ultima execucao do job Veeam ONE, lidos de lastTransferredDataBytes.",
    labelNames: JOB_BASE_LABELS,
    registers: [this.registry]
  });
  private readonly veeamJobAvgDuration = new Gauge({
    name: "veeam_job_avg_duration_seconds",
    help: "Duracao media reportada pelo Veeam ONE em segundos, lida de avgDurationSec.",
    labelNames: JOB_BASE_LABELS,
    registers: [this.registry]
  });
  private readonly veeamJobsTotal = new Gauge({
    name: "veeam_jobs_total",
    help: "Total de jobs Veeam ONE por tipo.",
    labelNames: ["job_type"],
    registers: [this.registry]
  });
  private readonly veeamJobsSuccessTotal = new Gauge({
    name: "veeam_jobs_success_total",
    help: "Total de jobs Veeam ONE com status Success por tipo.",
    labelNames: ["job_type"],
    registers: [this.registry]
  });
  private readonly veeamJobsWarningTotal = new Gauge({
    name: "veeam_jobs_warning_total",
    help: "Total de jobs Veeam ONE com status Warning por tipo.",
    labelNames: ["job_type"],
    registers: [this.registry]
  });
  private readonly veeamJobsFailedTotal = new Gauge({
    name: "veeam_jobs_failed_total",
    help: "Total de jobs Veeam ONE com status Failed/Error por tipo.",
    labelNames: ["job_type"],
    registers: [this.registry]
  });
  private readonly veeamJobsRunningTotal = new Gauge({
    name: "veeam_jobs_running_total",
    help: "Total de jobs Veeam ONE em execucao por tipo.",
    labelNames: ["job_type"],
    registers: [this.registry]
  });
  private readonly veeamJobsIdleTotal = new Gauge({
    name: "veeam_jobs_idle_total",
    help: "Total de jobs Veeam ONE sem execucao ativa por tipo, derivado do status original.",
    labelNames: ["job_type"],
    registers: [this.registry]
  });
  private readonly veeamJobsSuccessRatio = new Gauge({
    name: "veeam_jobs_success_ratio",
    help: "Razao de sucesso dos jobs Veeam ONE por tipo, de 0 a 1.",
    labelNames: ["job_type"],
    registers: [this.registry]
  });

  constructor(
    private readonly jobsServices: JobsListService[],
    private readonly config: JobsExporterConfig = { continueOnEndpointError: true }
  ) {}

  get contentType(): string {
    return this.registry.contentType;
  }

  async collect(): Promise<string> {
    this.update(await this.collectJobs());
    return this.registry.metrics();
  }

  private async collectJobs(): Promise<CollectedJob[]> {
    const snapshots = await Promise.all(this.jobsServices.map((service) => this.collectServiceJobs(service)));
    return snapshots.flat();
  }

  private async collectServiceJobs(service: JobsListService): Promise<CollectedJob[]> {
    try {
      const response = await service.listJobs();
      return response.items.map((item) => ({ endpoint: service.endpoint, item }));
    } catch (error) {
      if (!this.config.continueOnEndpointError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.warn(JSON.stringify({
        level: "warn",
        message: "Falha ao coletar jobs para metricas; seguindo com os demais services.",
        error: message
      }));

      return [];
    }
  }

  private update(jobs: CollectedJob[]): void {
    this.reset();

    for (const [key, value] of countByTypeAndStatus(jobs)) {
      const [jobType, status] = key.split("|");
      this.totalJobs.set({ job_type: jobType, status }, value);
    }

    for (const [jobType, summary] of summarizeByType(jobs)) {
      this.veeamJobsTotal.set({ job_type: jobType }, summary.total);
      this.veeamJobsSuccessTotal.set({ job_type: jobType }, summary.success);
      this.veeamJobsWarningTotal.set({ job_type: jobType }, summary.warning);
      this.veeamJobsFailedTotal.set({ job_type: jobType }, summary.failed);
      this.veeamJobsRunningTotal.set({ job_type: jobType }, summary.running);
      this.veeamJobsIdleTotal.set({ job_type: jobType }, summary.idle + summary.unknown);
      this.veeamJobsSuccessRatio.set({ job_type: jobType }, summary.total === 0 ? 0 : summary.success / summary.total);
    }

    for (const job of jobs) {
      const labels = labelsFor(job);
      const baseLabels = baseLabelsFor(job);
      const statusBucket = classifyStatus(statusFor(job), lastRunFor(job));

      if (statusBucket === "running") {
        this.activeJobs.set(labels, 1);
      }

      if (statusBucket === "failed") {
        this.failedJobs.set(labels, 1);
      }

      if (statusBucket === "success") {
        this.successJobs.set(labels, 1);
      }

      this.lastRunTimestamp.set(labels, toUnixSeconds(lastRunFor(job)));
      this.lastRunDuration.set(labels, readNumber(job.item, "lastRunDurationSec") ?? 0);
      this.transferredData.set(labels, readNumber(job.item, "lastTransferredDataBytes") ?? 0);

      this.veeamJobInfo.set(infoLabelsFor(job), 1);
      this.veeamJobStatus.set(labels, 1);
      this.veeamJobLastRunTimestamp.set(baseLabels, toUnixSeconds(lastRunFor(job)));
      this.veeamJobDuration.set(baseLabels, readNumber(job.item, "lastRunDurationSec") ?? 0);
      this.veeamJobTransferredBytes.set(baseLabels, readNumber(job.item, "lastTransferredDataBytes") ?? 0);
      this.veeamJobAvgDuration.set(baseLabels, readNumber(job.item, "avgDurationSec") ?? 0);
    }
  }

  private reset(): void {
    this.totalJobs.reset();
    this.activeJobs.reset();
    this.failedJobs.reset();
    this.successJobs.reset();
    this.lastRunTimestamp.reset();
    this.lastRunDuration.reset();
    this.transferredData.reset();
    this.veeamJobInfo.reset();
    this.veeamJobStatus.reset();
    this.veeamJobLastRunTimestamp.reset();
    this.veeamJobDuration.reset();
    this.veeamJobTransferredBytes.reset();
    this.veeamJobAvgDuration.reset();
    this.veeamJobsTotal.reset();
    this.veeamJobsSuccessTotal.reset();
    this.veeamJobsWarningTotal.reset();
    this.veeamJobsFailedTotal.reset();
    this.veeamJobsRunningTotal.reset();
    this.veeamJobsIdleTotal.reset();
    this.veeamJobsSuccessRatio.reset();
  }
}

function countByTypeAndStatus(jobs: CollectedJob[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const job of jobs) {
    const key = `${job.endpoint.type}|${statusFor(job).toLowerCase()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function summarizeByType(jobs: CollectedJob[]): Map<string, StatusCounters> {
  const summaries = new Map<string, StatusCounters>();

  for (const job of jobs) {
    const summary = summaries.get(job.endpoint.type) ?? emptySummary();
    summary.total += 1;

    switch (classifyStatus(statusFor(job), lastRunFor(job))) {
      case "running":
        summary.running += 1;
        break;
      case "failed":
        summary.failed += 1;
        break;
      case "success":
        summary.success += 1;
        break;
      case "warning":
        summary.warning += 1;
        break;
      case "idle":
        summary.idle += 1;
        break;
      case "unknown":
        summary.unknown += 1;
        break;
    }

    summaries.set(job.endpoint.type, summary);
  }

  return summaries;
}

function emptySummary(): StatusCounters {
  return {
    total: 0,
    failed: 0,
    success: 0,
    warning: 0,
    running: 0,
    idle: 0,
    unknown: 0
  };
}

function labelsFor(job: CollectedJob): Record<(typeof JOB_LABELS)[number], string> {
  return {
    job_name: nameFor(job),
    job_type: job.endpoint.type,
    status: statusFor(job).toLowerCase()
  };
}

function baseLabelsFor(job: CollectedJob): Record<(typeof JOB_BASE_LABELS)[number], string> {
  return {
    job_name: nameFor(job),
    job_type: job.endpoint.type
  };
}

function infoLabelsFor(job: CollectedJob): Record<(typeof JOB_INFO_LABELS)[number], string> {
  return {
    job_name: nameFor(job),
    job_type: job.endpoint.type,
    platform: readString(job.item, "platform") ?? "unknown"
  };
}

function nameFor(job: CollectedJob): string {
  return readString(job.item, "name") ?? "unknown";
}

function statusFor(job: CollectedJob): string {
  return readString(job.item, "status") ?? "unknown";
}

function lastRunFor(job: CollectedJob): string | null {
  return readString(job.item, "lastRun") ?? null;
}

function classifyStatus(status: string, lastRun: string | null): StatusBucket {
  switch (status.toLowerCase()) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "failed":
    case "error":
      return "failed";
    case "running":
    case "working":
    case "active":
      return "running";
    case "disabled":
    case "":
    case "none":
      return "idle";
    default:
      return lastRun ? "unknown" : "idle";
  }
}

function readString(raw: RawJob, key: string): string | undefined {
  const value = raw[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(raw: RawJob, key: string): number | undefined {
  const value = raw[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toUnixSeconds(value: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : Math.floor(timestamp / 1000);
}
