import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/modules/auth/auth.service";

function makeHttp(post: unknown): AxiosInstance {
  return { post } as AxiosInstance;
}

describe("AuthService", () => {
  it("reutiliza o access token enquanto ele esta valido", async () => {
    let now = 0;
    const post = vi.fn(async () => ({
      data: {
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_in: 900
      }
    }));
    const service = new AuthService({
      username: "user",
      password: "pass",
      tokenRenewSkewMs: 60_000
    }, makeHttp(post), () => now);

    await expect(service.getAccessToken()).resolves.toBe("access-1");
    now += 60_000;
    await expect(service.getAccessToken()).resolves.toBe("access-1");

    expect(post).toHaveBeenCalledTimes(1);
  });

  it("renova o token usando refresh_token quando o cache expira", async () => {
    let now = 0;
    const grants: string[] = [];
    const post = vi.fn(async (_url: string, body?: unknown) => {
      const params = body as URLSearchParams;
      grants.push(params.get("grant_type") ?? "");

      if (params.get("grant_type") === "refresh_token") {
        return {
          data: {
            access_token: "access-2",
            refresh_token: "refresh-2",
            expires_in: 900
          }
        };
      }

      return {
        data: {
          access_token: "access-1",
          refresh_token: "refresh-1",
          expires_in: 900
        }
      };
    });
    const service = new AuthService({
      username: "user",
      password: "pass",
      tokenRenewSkewMs: 60_000
    }, makeHttp(post), () => now);

    await expect(service.getAccessToken()).resolves.toBe("access-1");
    now += 840_001;
    await expect(service.getAccessToken()).resolves.toBe("access-2");

    expect(grants).toEqual(["password", "refresh_token"]);
  });
});
