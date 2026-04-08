import type { FastifyReply, FastifyRequest } from "fastify";

interface BackupCopyJobsListService {
  listJobs(): Promise<unknown>;
}

export class BackupCopyJobsController {
  constructor(private readonly service: BackupCopyJobsListService) {}

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send(await this.service.listJobs());
  }
}
