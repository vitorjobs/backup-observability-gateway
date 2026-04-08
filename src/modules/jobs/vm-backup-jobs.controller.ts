import type { FastifyReply, FastifyRequest } from "fastify";

interface VmBackupJobsListService {
  listJobs(): Promise<unknown>;
}

export class VmBackupJobsController {
  constructor(private readonly service: VmBackupJobsListService) {}

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send(await this.service.listJobs());
  }
}
