import "dotenv/config";
import axios from "axios";
import https from "node:https";
import process from "node:process";
import { buildApp } from "./app";
import { JobsExporter } from "./exporters/jobs.exporter";
import { RepositoriesExporter } from "./exporters/repositories.exporter";
import { AuthService } from "./modules/auth/auth.service";
import { BackupCopyJobsController } from "./modules/jobs/backup-copy-jobs.controller";
import { BackupCopyJobsService } from "./modules/jobs/backup-copy-jobs.service";
import { BackupToTapeJobsController } from "./modules/jobs/backup-to-tape-jobs.controller";
import { BackupToTapeJobsService } from "./modules/jobs/backup-to-tape-jobs.service";
import { VmBackupJobsController } from "./modules/jobs/vm-backup-jobs.controller";
import { VmBackupJobsService } from "./modules/jobs/vm-backup-jobs.service";
import { RepositoriesController } from "./modules/repositories/repositories.controller";
import { RepositoriesService } from "./modules/repositories/repositories.service";
import { ScaleoutRepositoriesController } from "./modules/scaleout-repositories/scaleout-repositories.controller";
import { ScaleoutRepositoriesService } from "./modules/scaleout-repositories/scaleout-repositories.service";

interface RuntimeConfig {
  http: {
    host: string;
    port: number;
  };
  veeam: {
    baseUrl: string;
    username: string;
    password: string;
    apiVersion: string;
    tokenRenewSkewMs: number;
    requestTimeoutMs: number;
    tlsRejectUnauthorized: boolean;
    pageSize: number;
    continueOnEndpointError: boolean;
  };
}

async function bootstrap(): Promise<void> {
  const config = loadConfig();

  if (!config.veeam.tlsRejectUnauthorized) {
    console.warn(JSON.stringify({
      level: "warn",
      message: "Validacao TLS desabilitada para chamadas Veeam ONE. Use apenas em ambientes controlados."
    }));
  }

  const app = buildApp(createDependencies(config));

  await app.listen({
    host: config.http.host,
    port: config.http.port
  });

  console.info(JSON.stringify({
    level: "info",
    message: "Exporter Veeam ONE iniciado.",
    host: config.http.host,
    port: config.http.port
  }));
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Erro inesperado ao iniciar o exporter.";
  console.error(JSON.stringify({ level: "error", message }));
  process.exitCode = 1;
});

function createDependencies(config: RuntimeConfig) {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: config.veeam.tlsRejectUnauthorized
  });

  const authHttp = axios.create({
    baseURL: config.veeam.baseUrl,
    httpsAgent,
    timeout: config.veeam.requestTimeoutMs
  });

  const veeamHttp = axios.create({
    baseURL: `${config.veeam.baseUrl}/api/${config.veeam.apiVersion}`,
    httpsAgent,
    timeout: config.veeam.requestTimeoutMs
  });

  const authService = new AuthService({
    username: config.veeam.username,
    password: config.veeam.password,
    tokenRenewSkewMs: config.veeam.tokenRenewSkewMs
  }, authHttp);

  const jobsConfig = {
    pageSize: config.veeam.pageSize
  };
  const vmBackupJobsService = new VmBackupJobsService(veeamHttp, authService, jobsConfig);
  const backupCopyJobsService = new BackupCopyJobsService(veeamHttp, authService, jobsConfig);
  const backupToTapeJobsService = new BackupToTapeJobsService(veeamHttp, authService, jobsConfig);
  const repositoriesService = new RepositoriesService(veeamHttp, authService, jobsConfig);
  const scaleoutRepositoriesService = new ScaleoutRepositoriesService(veeamHttp, authService, jobsConfig);

  return {
    backupCopyJobsController: new BackupCopyJobsController(backupCopyJobsService),
    backupToTapeJobsController: new BackupToTapeJobsController(backupToTapeJobsService),
    jobsExporter: new JobsExporter([
      vmBackupJobsService,
      backupCopyJobsService,
      backupToTapeJobsService
    ], {
      continueOnEndpointError: config.veeam.continueOnEndpointError
    }),
    repositoriesController: new RepositoriesController(repositoriesService),
    repositoriesExporter: new RepositoriesExporter(repositoriesService, scaleoutRepositoriesService, {
      continueOnEndpointError: config.veeam.continueOnEndpointError
    }),
    scaleoutRepositoriesController: new ScaleoutRepositoriesController(scaleoutRepositoriesService),
    vmBackupJobsController: new VmBackupJobsController(vmBackupJobsService)
  };
}

function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    http: {
      host: env.APP_HOST ?? env.EXPORTER_HOST ?? "0.0.0.0",
      port: number(first(env, "APP_PORT", "PORT", "EXPORTER_PORT"), 9469)
    },
    veeam: {
      baseUrl: required(first(env, "VEEAM_BASE_URL", "VEEAM_ONE_BASE_URL"), "VEEAM_BASE_URL").replace(/\/+$/, ""),
      username: required(first(env, "VEEAM_USERNAME", "VEEAM_ONE_USERNAME"), "VEEAM_USERNAME"),
      password: required(first(env, "VEEAM_PASSWORD", "VEEAM_ONE_PASSWORD"), "VEEAM_PASSWORD"),
      apiVersion: first(env, "VEEAM_API_VERSION", "VEEAM_ONE_API_VERSION") ?? "v2.2",
      tokenRenewSkewMs: number(first(env, "VEEAM_TOKEN_RENEW_SKEW_SECONDS", "VEEAM_ONE_TOKEN_RENEW_SKEW_SECONDS"), 60) * 1000,
      requestTimeoutMs: number(first(env, "VEEAM_REQUEST_TIMEOUT_SECONDS", "VEEAM_ONE_REQUEST_TIMEOUT_SECONDS"), 30) * 1000,
      tlsRejectUnauthorized: bool(first(env, "VEEAM_TLS_REJECT_UNAUTHORIZED", "VEEAM_ONE_TLS_REJECT_UNAUTHORIZED"), true),
      pageSize: number(first(env, "VEEAM_PAGE_SIZE", "VEEAM_ONE_PAGE_SIZE"), 100),
      continueOnEndpointError: bool(first(env, "VEEAM_CONTINUE_ON_ENDPOINT_ERROR", "VEEAM_ONE_CONTINUE_ON_ENDPOINT_ERROR"), true)
    }
  };
}

function first(env: NodeJS.ProcessEnv, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (env[key]) {
      return env[key];
    }
  }

  return undefined;
}

function required(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${key}`);
  }

  return value;
}

function number(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Valor numerico invalido: ${value}`);
  }

  return parsed;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "y", "sim"].includes(value.toLowerCase());
}
