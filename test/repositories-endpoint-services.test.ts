import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { RepositoriesService } from "../src/modules/repositories/repositories.service";
import { ScaleoutRepositoriesService } from "../src/modules/scaleout-repositories/scaleout-repositories.service";

function makeAuth() {
  return {
    getAccessToken: vi.fn(async () => "access-1"),
    invalidate: vi.fn()
  };
}

function makeHttp(get: unknown): AxiosInstance {
  return { get } as AxiosInstance;
}

describe("Repository endpoint services", () => {
  it("RepositoriesService consulta o endpoint de repositories e preserva o payload original", async () => {
    const auth = makeAuth();
    const payload = {
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
    const get = vi.fn(async (_url: string, _config?: unknown) => ({ data: payload }));
    const service = new RepositoriesService(makeHttp(get), auth, { pageSize: 100 });

    const result = await service.listRepositories({ NameFilter: "Repo" });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]?.[0]).toBe("/vbr/repositories");
    expect(get.mock.calls[0]?.[1]).toMatchObject({
      params: {
        NameFilter: "Repo"
      }
    });
    expect(result).toEqual(payload);
    expect(result).not.toHaveProperty("data");
    expect(result).not.toHaveProperty("summary");
  });

  it("RepositoriesService lista todas as paginas para uso interno do exporter", async () => {
    const auth = makeAuth();
    const get = vi.fn(async (_url: string, config?: { params?: Record<string, unknown> }) => {
      if (config?.params?.Offset === 0) {
        return {
          data: {
            items: [{ name: "Repo 1" }],
            totalCount: 2
          }
        };
      }

      return {
        data: {
          items: [{ name: "Repo 2" }],
          totalCount: 2
        }
      };
    });
    const service = new RepositoriesService(makeHttp(get), auth, { pageSize: 1 });

    await expect(service.listAllRepositories()).resolves.toEqual([{ name: "Repo 1" }, { name: "Repo 2" }]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("ScaleoutRepositoriesService consulta o endpoint de scale-out repositories e preserva o payload original", async () => {
    const auth = makeAuth();
    const payload = {
      items: [{
        scaleoutRepositoryUid: "sobr-1",
        name: "SOBR Principal",
        backupServerId: 5,
        capacityBytes: 2000,
        usedBytes: 1000,
        freeBytes: 1000
      }],
      totalCount: 1
    };
    const get = vi.fn(async (_url: string, _config?: unknown) => ({ data: payload }));
    const service = new ScaleoutRepositoriesService(makeHttp(get), auth, { pageSize: 100 });

    const result = await service.listScaleoutRepositories({ Limit: 50 });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]?.[0]).toBe("/vbr/scaleoutRepositories");
    expect(get.mock.calls[0]?.[1]).toMatchObject({
      params: {
        Limit: 50
      }
    });
    expect(result).toEqual(payload);
    expect(result).not.toHaveProperty("repositories");
    expect(result).not.toHaveProperty("summary");
  });
});
