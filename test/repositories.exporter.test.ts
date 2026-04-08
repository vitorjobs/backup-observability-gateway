import { describe, expect, it } from "vitest";
import { RepositoriesExporter } from "../src/exporters/repositories.exporter";

describe("RepositoriesExporter", () => {
  it("gera metricas Prometheus de capacidade sem duplicar o registry global", async () => {
    const repositoriesService = {
      listAllRepositories: async () => [{
        name: "Repo Local",
        repositoryType: "WindowsLocal",
        backupServerId: 5,
        state: "Available",
        capacityBytes: 1000,
        usedBytes: 250,
        freeBytes: 750,
        restorePointsTotal: 10,
        backupsTotal: 3,
        vmsTotal: 5,
        daysLeftEstimate: 20
      }]
    };
    const scaleoutRepositoriesService = {
      listAllScaleoutRepositories: async () => [{
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
      }]
    };

    const firstExporter = new RepositoriesExporter(repositoriesService, scaleoutRepositoriesService);
    const secondExporter = new RepositoriesExporter(repositoriesService, scaleoutRepositoriesService);

    await expect(firstExporter.collect()).resolves.toContain("veeam_repository_capacity_bytes");
    await expect(firstExporter.collect()).resolves.toContain("veeam_repository_usage_ratio");
    await expect(secondExporter.collect()).resolves.toContain("veeam_sobr_capacity_bytes");
    await expect(secondExporter.collect()).resolves.toContain("veeam_sobr_extent_usage_ratio");
  });
});
