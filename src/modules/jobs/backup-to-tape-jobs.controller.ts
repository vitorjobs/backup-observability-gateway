import type { FastifyReply, FastifyRequest } from "fastify";

interface BackupToTapeJobsListService {
  listJobs(): Promise<unknown>;
}

export class BackupToTapeJobsController {
  constructor(private readonly service: BackupToTapeJobsListService) {}

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send(await this.service.listJobs());
  }
}
