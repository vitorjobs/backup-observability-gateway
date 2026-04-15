import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { JobsExporter } from "../src/exporters/jobs.exporter";
import { RepositoriesExporter } from "../src/exporters/repositories.exporter";
import { BackupCopyJobsController } from "../src/modules/jobs/backup-copy-jobs.controller";
import { BackupToTapeJobsController } from "../src/modules/jobs/backup-to-tape-jobs.controller";
import { VmBackupJobsController } from "../src/modules/jobs/vm-backup-jobs.controller";
import { RepositoriesController } from "../src/modules/repositories/repositories.controller";
import { ScaleoutRepositoriesController } from "../src/modules/scaleout-repositories/scaleout-repositories.controller";

type RawJob = Record<string, unknown>;

interface VeeamJobsResponse {
  items: RawJob[];
  totalCount?: number;
}

interface JobEndpoint {
  path: string;
  type: string;
  uidKey: string;
}

const VM_BACKUP_ENDPOINT: JobEndpoint = {
  path: "/vbrJobs/vmBackupJobs",
  type: "vm_backup",
  uidKey: "vmBackupJobUid"
};

const BACKUP_COPY_ENDPOINT: JobEndpoint = {
  path: "/vbrJobs/backupCopyJobs",
  type: "backup_copy",
  uidKey: "backupCopyJobUid"
};

const BACKUP_TO_TAPE_ENDPOINT: JobEndpoint = {
  path: "/vbrJobs/backupToTapeJobs",
  type: "backup_to_tape",
  uidKey: "backupToTapeJobUid"
};

const veeamResponse: VeeamJobsResponse = {
  items: [{
    vmBackupJobUid: "vm-1",
    backupServerId: 5,
    status: "Success",
    details: [],
    name: "VM Daily",
    description: "Created by VEEAMBKPSERVER\\otoniel at 07/02/2024 15:05.",
    platform: "VSphere",
    lastRun: "2026-04-07T01:00:00.000Z",
    lastRunDurationSec: 120,
    avgDurationSec: 100,
    lastTransferredDataBytes: 2048
  }],
  totalCount: 1
};
const repositoriesResponse = {
  items: [{
    repositoryUid: "repo-1",
    name: "Repo Local",
    repositoryType: "WindowsLocal",
    backupServerId: 5,
    state: "Available",
    capacityBytes: 1000,
    usedBytes: 250,
    freeBytes: 750
  }],
  totalCount: 1
};
const scaleoutRepositoriesResponse = {
  items: [{
    scaleoutRepositoryUid: "sobr-1",
    name: "SOBR Principal",
    backupServerId: 5,
    capacityBytes: 2000,
    usedBytes: 1000,
    freeBytes: 1000,
    extents: [{
      name: "Extent 1",
      repositoryType: "WindowsLocal",
      capacityBytes: 2000,
      usedBytes: 1000,
      freeBytes: 1000
    }]
  }],
  totalCount: 1
};

function buildTestApp() {
  const vmBackupJobsService = {
    endpoint: VM_BACKUP_ENDPOINT,
    listJobs: async () => veeamResponse
  };
  const backupCopyJobsService = {
    endpoint: BACKUP_COPY_ENDPOINT,
    listJobs: async (): Promise<VeeamJobsResponse> => ({ items: [], totalCount: 0 })
  };
  const backupToTapeJobsService = {
    endpoint: BACKUP_TO_TAPE_ENDPOINT,
    listJobs: async (): Promise<VeeamJobsResponse> => ({ items: [], totalCount: 0 })
  };
  const repositoriesService = {
    listAllRepositories: async () => repositoriesResponse.items,
    listRepositories: async () => repositoriesResponse
  };
  const scaleoutRepositoriesService = {
    listAllScaleoutRepositories: async () => scaleoutRepositoriesResponse.items,
    listScaleoutRepositories: async () => scaleoutRepositoriesResponse
  };

  return buildApp({
    backupCopyJobsController: new BackupCopyJobsController(backupCopyJobsService),
    backupToTapeJobsController: new BackupToTapeJobsController(backupToTapeJobsService),
    jobsExporter: new JobsExporter([vmBackupJobsService, backupCopyJobsService, backupToTapeJobsService]),
    repositoriesController: new RepositoriesController(repositoriesService),
    repositoriesExporter: new RepositoriesExporter(repositoriesService, scaleoutRepositoriesService),
    scaleoutRepositoriesController: new ScaleoutRepositoriesController(scaleoutRepositoriesService),
    vmBackupJobsController: new VmBackupJobsController(vmBackupJobsService)
  });
}

describe("Fastify HTTP routes", () => {
  it("expoe /health em JSON", async () => {
    const app = buildTestApp();

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("expoe /jobs/vm-backup em JSON", async () => {
    const app = buildTestApp();

    const response = await app.inject({ method: "GET", url: "/jobs/vm-backup" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(veeamResponse);
  });

  it("expoe rotas de jobs separadas", async () => {
    const app = buildTestApp();

    const backupCopy = await app.inject({ method: "GET", url: "/jobs/backup-copy" });
    const backupToTape = await app.inject({ method: "GET", url: "/jobs/backup-to-tape" });
    const aggregateRoute = await app.inject({ method: "GET", url: "/jobs" });

    expect(backupCopy.statusCode).toBe(200);
    expect(backupToTape.statusCode).toBe(200);
    expect(aggregateRoute.statusCode).toBe(404);
  });

  it("expoe rotas de repositorios no contrato original do Veeam ONE", async () => {
    const app = buildTestApp();

    const repositories = await app.inject({ method: "GET", url: "/api/veeam-one/repositories" });
    const scaleoutRepositories = await app.inject({ method: "GET", url: "/api/veeam-one/scaleout-repositories" });

    expect(repositories.statusCode).toBe(200);
    expect(repositories.json()).toEqual(repositoriesResponse);
    expect(scaleoutRepositories.statusCode).toBe(200);
    expect(scaleoutRepositories.json()).toEqual(scaleoutRepositoriesResponse);
  });

  it("expoe /metrics no formato Prometheus", async () => {
    const app = buildTestApp();

    const response = await app.inject({ method: "GET", url: "/metrics" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toContain("total_jobs");
    expect(response.body).toContain("success_jobs");
    expect(response.body).toContain("veeam_jobs_success_ratio");
    expect(response.body).toContain("veeam_repository_capacity_bytes");
    expect(response.body).toContain("veeam_sobr_usage_ratio");
  });

  it("coleta os exporters de /metrics em paralelo", async () => {
    const events: string[] = [];
    let resolveJobs: (() => void) | undefined;
    let resolveRepositories: (() => void) | undefined;

    const app = buildApp({
      backupCopyJobsController: new BackupCopyJobsController({
        listJobs: async (): Promise<VeeamJobsResponse> => ({ items: [], totalCount: 0 })
      }),
      backupToTapeJobsController: new BackupToTapeJobsController({
        listJobs: async (): Promise<VeeamJobsResponse> => ({ items: [], totalCount: 0 })
      }),
      jobsExporter: {
        contentType: "text/plain; version=0.0.4",
        collect: async () => {
          events.push("jobs:start");
          await new Promise<void>((resolve) => {
            resolveJobs = () => {
              events.push("jobs:end");
              resolve();
            };
          });

          return "jobs_metric 1";
        }
      } as unknown as JobsExporter,
      repositoriesController: new RepositoriesController({
        listRepositories: async () => repositoriesResponse
      }),
      repositoriesExporter: {
        contentType: "text/plain; version=0.0.4",
        collect: async () => {
          events.push("repositories:start");
          await new Promise<void>((resolve) => {
            resolveRepositories = () => {
              events.push("repositories:end");
              resolve();
            };
          });

          return "repositories_metric 1";
        }
      } as unknown as RepositoriesExporter,
      scaleoutRepositoriesController: new ScaleoutRepositoriesController({
        listScaleoutRepositories: async () => scaleoutRepositoriesResponse
      }),
      vmBackupJobsController: new VmBackupJobsController({
        listJobs: async () => veeamResponse
      })
    });

    const responsePromise = app.inject({ method: "GET", url: "/metrics" });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toEqual(["jobs:start", "repositories:start"]);

    resolveJobs?.();
    resolveRepositories?.();

    const response = await responsePromise;

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("jobs_metric 1");
    expect(response.body).toContain("repositories_metric 1");
  });
});
