import type { FastifyReply, FastifyRequest } from "fastify";

interface ScaleoutRepositoriesListService {
  listScaleoutRepositories(params?: Record<string, unknown>): Promise<unknown>;
}

export class ScaleoutRepositoriesController {
  constructor(private readonly service: ScaleoutRepositoriesListService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send(await this.service.listScaleoutRepositories(request.query as Record<string, unknown>));
  }
}
