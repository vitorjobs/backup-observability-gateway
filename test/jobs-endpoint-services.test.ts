import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { BackupCopyJobsService } from "../src/modules/jobs/backup-copy-jobs.service";
import { BackupToTapeJobsService } from "../src/modules/jobs/backup-to-tape-jobs.service";
import { VmBackupJobsService } from "../src/modules/jobs/vm-backup-jobs.service";

function makeAuth() {
  return {
    getAccessToken: vi.fn(async () => "access-1"),
    invalidate: vi.fn()
  };
}

function makeHttp(get: unknown): AxiosInstance {
  return { get } as AxiosInstance;
}

describe("Jobs endpoint services", () => {
  it("VmBackupJobsService consulta somente o endpoint de VM backup e preserva o payload original", async () => {
    const auth = makeAuth();
    const payload = {
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
    const get = vi.fn(async (_url: string) => ({
      data: payload
    }));
    const service = new VmBackupJobsService(makeHttp(get), auth, { pageSize: 100 });

    const result = await service.listJobs();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]?.[0]).toBe("/vbrJobs/vmBackupJobs");
    expect(result).toEqual(payload);
    expect(result.items[0]).toHaveProperty("vmBackupJobUid", "vm-1");
    expect(result.items[0]).toHaveProperty("lastRunDurationSec", 120);
    expect(result.items[0]).toHaveProperty("avgDurationSec", 100);
    expect(result).not.toHaveProperty("jobs");
    expect(result).not.toHaveProperty("summary");
  });

  it("BackupCopyJobsService consulta somente o endpoint de backup copy", async () => {
    const auth = makeAuth();
    const get = vi.fn(async (_url: string) => ({ data: { items: [], totalCount: 0 } }));
    const service = new BackupCopyJobsService(makeHttp(get), auth, { pageSize: 100 });

    await service.listJobs();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]?.[0]).toBe("/vbrJobs/backupCopyJobs");
  });

  it("BackupToTapeJobsService consulta somente o endpoint de backup to tape", async () => {
    const auth = makeAuth();
    const get = vi.fn(async (_url: string) => ({ data: { items: [], totalCount: 0 } }));
    const service = new BackupToTapeJobsService(makeHttp(get), auth, { pageSize: 100 });

    await service.listJobs();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]?.[0]).toBe("/vbrJobs/backupToTapeJobs");
  });
});
