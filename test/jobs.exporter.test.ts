import { describe, expect, it } from "vitest";
import { JobsExporter } from "../src/exporters/jobs.exporter";

type RawJob = Record<string, unknown>;

interface VeeamJobsResponse {
  items: RawJob[];
}

interface JobEndpoint {
  path: string;
  type: string;
  uidKey: string;
}

const BACKUP_COPY_ENDPOINT: JobEndpoint = {
  path: "/vbrJobs/backupCopyJobs",
  type: "backup_copy",
  uidKey: "backupCopyJobUid"
};

describe("JobsExporter", () => {
  it("gera metricas Prometheus sem duplicar o registry global", async () => {
    const response: VeeamJobsResponse = {
      items: [{
        backupCopyJobUid: "copy-1",
        name: "Copy Daily",
        status: "Failed",
        details: [],
        backupServerId: 5,
        platform: null,
        description: null,
        lastRun: "2026-04-07T01:00:00.000Z",
        lastRunDurationSec: 120,
        avgDurationSec: null,
        lastTransferredDataBytes: 2048
      }]
    };
    const service = {
      endpoint: BACKUP_COPY_ENDPOINT,
      listJobs: async () => response
    };

    const firstExporter = new JobsExporter([service]);
    const secondExporter = new JobsExporter([service]);

    await expect(firstExporter.collect()).resolves.toContain("failed_jobs");
    await expect(secondExporter.collect()).resolves.toContain("job_last_transferred_data_bytes");
    await expect(firstExporter.collect()).resolves.toContain("veeam_jobs_failed_total");
    await expect(secondExporter.collect()).resolves.toContain("veeam_job_avg_duration_seconds");
  });
});
