import type { FastifyReply, FastifyRequest } from "fastify";

interface RepositoriesListService {
  listRepositories(params?: Record<string, unknown>): Promise<unknown>;
}

export class RepositoriesController {
  constructor(private readonly service: RepositoriesListService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send(await this.service.listRepositories(request.query as Record<string, unknown>));
  }
}
