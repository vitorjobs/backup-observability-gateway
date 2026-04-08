import type { FastifyInstance } from "fastify";
import type { AppDependencies } from "./app";

export function registerRouters(app: FastifyInstance, dependencies: AppDependencies): void {
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/jobs/vm-backup", dependencies.vmBackupJobsController.list.bind(dependencies.vmBackupJobsController));
  app.get("/jobs/backup-copy", dependencies.backupCopyJobsController.list.bind(dependencies.backupCopyJobsController));
  app.get("/jobs/backup-to-tape", dependencies.backupToTapeJobsController.list.bind(dependencies.backupToTapeJobsController));
  app.get("/api/veeam-one/repositories", dependencies.repositoriesController.list.bind(dependencies.repositoriesController));
  app.get(
    "/api/veeam-one/scaleout-repositories",
    dependencies.scaleoutRepositoriesController.list.bind(dependencies.scaleoutRepositoriesController)
  );

  app.get("/metrics", async (_request, reply) => {
    const metrics = [
      await dependencies.jobsExporter.collect(),
      await dependencies.repositoriesExporter.collect()
    ].join("\n");

    return reply
      .status(200)
      .header("Content-Type", dependencies.jobsExporter.contentType)
      .send(metrics);
  });
}
