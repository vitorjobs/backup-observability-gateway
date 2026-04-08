import fastify from "fastify";
import type { JobsExporter } from "./exporters/jobs.exporter";
import type { RepositoriesExporter } from "./exporters/repositories.exporter";
import type { BackupCopyJobsController } from "./modules/jobs/backup-copy-jobs.controller";
import type { BackupToTapeJobsController } from "./modules/jobs/backup-to-tape-jobs.controller";
import type { VmBackupJobsController } from "./modules/jobs/vm-backup-jobs.controller";
import type { RepositoriesController } from "./modules/repositories/repositories.controller";
import type { ScaleoutRepositoriesController } from "./modules/scaleout-repositories/scaleout-repositories.controller";
import { registerRouters } from "./routers";

export interface AppDependencies {
  backupCopyJobsController: BackupCopyJobsController;
  backupToTapeJobsController: BackupToTapeJobsController;
  jobsExporter: JobsExporter;
  repositoriesController: RepositoriesController;
  repositoriesExporter: RepositoriesExporter;
  scaleoutRepositoriesController: ScaleoutRepositoriesController;
  vmBackupJobsController: VmBackupJobsController;
}

export function buildApp(dependencies: AppDependencies) {
  const app = fastify({
    logger: false
  });

  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : "Erro inesperado";

    console.error(JSON.stringify({ level: "error", message: "Falha ao processar requisicao HTTP.", error: message }));

    return reply.status(502).send({
      status: "error",
      message
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      status: "error",
      message: "Rota nao encontrada. Use /health, /jobs/vm-backup, /jobs/backup-copy, /jobs/backup-to-tape, /api/veeam-one/repositories, /api/veeam-one/scaleout-repositories ou /metrics."
    });
  });

  registerRouters(app, dependencies);

  return app;
}
