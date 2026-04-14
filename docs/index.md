# Backup Observability Gateway

Gateway Node.js + TypeScript para centralizar integracoes de observabilidade em plataformas de backup. Atualmente expõe chamadas REST e metricas Prometheus para Veeam ONE, com estrutura preparada para crescer para outras APIs da Veeam e ExaGrid.

## Stack

- Node.js + TypeScript
- Fastify
- Axios
- prom-client
- Vitest
- Docker + Docker Compose
- VitePress

## Estrutura

```text
src/
  app.ts
  server.ts
  routers.ts
  modules/
    auth/
      auth.service.ts
    jobs/
      backup-copy-jobs.controller.ts
      backup-copy-jobs.service.ts
      backup-to-tape-jobs.controller.ts
      backup-to-tape-jobs.service.ts
      vm-backup-jobs.controller.ts
      vm-backup-jobs.service.ts
    repositories/
      repositories.controller.ts
      repositories.service.ts
    scaleout-repositories/
      scaleout-repositories.controller.ts
      scaleout-repositories.service.ts
  exporters/
    jobs.exporter.ts
    repositories.exporter.ts
docker/
  Dockerfile
  docker-compose.yml
  .env.example
  prometheus/
    prometheus.yml
  grafana/
    provisioning/
    dashboards/
deploy/
  deploy_docker.sh
  destroy_docker.sh
docs/
  index.md
  docker.md
  running.md
  routes.md
```

## Responsabilidades

- `server.ts`: le `.env`, cria Axios, autenticacao, service, controller e exporter.
- `app.ts`: cria a instancia Fastify e registra tratamento de erro.
- `routers.ts`: registra `/health`, rotas separadas de jobs, rotas de repositórios e `/metrics`.
- `auth.service.ts`: faz login, cacheia token em memoria e renova quando expira.
- `*-jobs.service.ts`: cada arquivo consulta um endpoint especifico do Veeam ONE e contem sua propria paginacao/retry.
- `*-jobs.controller.ts`: cada arquivo entrega uma rota HTTP especifica.
- `repositories.service.ts`: repassa chamadas REST para `GET /vbr/repositories` e preserva o payload original.
- `scaleout-repositories.service.ts`: repassa chamadas REST para `GET /vbr/scaleoutRepositories` e preserva o payload original.
- `jobs.exporter.ts`: atualiza e renderiza metricas Prometheus com `prom-client`.
- `repositories.exporter.ts`: cria metricas de capacidade e uso a partir dos payloads brutos de repositórios e SOBR.

## Guias Operacionais

- [Docker](/docker)
- [Dashboard Panorama Geral dos Jobs de Backup - Ajustes 01](/dashboard-panorama-jobs-ajustes-01)
