# Backup Observability Gateway

Gateway Node.js + TypeScript para centralizar integracoes de observabilidade em plataformas de backup. Atualmente expõe chamadas REST e metricas Prometheus para Veeam ONE, com estrutura preparada para crescer para outras APIs da Veeam e ExaGrid.

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
```

## Endpoints Veeam ONE Consumidos

- `GET /api/v2.2/vbrJobs/vmBackupJobs`
- `GET /api/v2.2/vbrJobs/backupCopyJobs`
- `GET /api/v2.2/vbrJobs/backupToTapeJobs`
- `GET /api/v2.2/vbr/repositories`
- `GET /api/v2.2/vbr/scaleoutRepositories`

## Rotas Da API

- `GET /health`
- `GET /jobs/vm-backup`
- `GET /jobs/backup-copy`
- `GET /jobs/backup-to-tape`
- `GET /api/veeam-one/repositories`
- `GET /api/veeam-one/scaleout-repositories`
- `GET /metrics`

`GET /jobs` nao lista mais jobs agregados; cada chamada do Veeam ONE tem service, controller e rota propria.

As rotas de repositórios funcionam como proxy fiel do Veeam ONE: query strings recebidas sao repassadas e o payload volta sem renomear, resumir ou reestruturar campos.

## Variaveis

```ini
VEEAM_BASE_URL=https://<ip-ou-dns-do-veeam-one>:1239
VEEAM_USERNAME=domain\\user
VEEAM_PASSWORD=change-me
VEEAM_API_VERSION=v2.2
VEEAM_TOKEN_RENEW_SKEW_SECONDS=60
VEEAM_REQUEST_TIMEOUT_SECONDS=30
VEEAM_TLS_REJECT_UNAUTHORIZED=false
VEEAM_PAGE_SIZE=100
VEEAM_CONTINUE_ON_ENDPOINT_ERROR=true
APP_HOST=0.0.0.0
APP_PORT=9469
```

Os nomes antigos `VEEAM_ONE_*` tambem sao aceitos para facilitar migracao.

## Como Executar Local

```bash
npm install
cp .env.example .env
# Ajuste VEEAM_BASE_URL ou VEEAM_ONE_BASE_URL para o IP/DNS real do Veeam ONE.
npm run check
npm test
npm run build
npm start
```

## Docker

```bash
cp .env.example .env
# Ajuste VEEAM_BASE_URL ou VEEAM_ONE_BASE_URL para o IP/DNS real do Veeam ONE.
cp docker/.env.example docker/.env
docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build
```

Acessos locais:

- API: `http://localhost:9469`
- Prometheus: `http://localhost:19090`
- Grafana: `http://localhost:13000`

A stack Docker fica isolada em `docker/`. A API escuta na porta interna fixa `9469` e publicada no host pela porta `API_HOST_PORT` definida em `docker/.env` (`9469` nesta branch). O Prometheus raspa a API pela rede interna do Compose em `api:9469`, o Grafana consulta o Prometheus em `http://prometheus:9090`, e a API sai do container para o Veeam ONE usando `VEEAM_BASE_URL` ou `VEEAM_ONE_BASE_URL` definidos no `.env` raiz.

Containers ativos na stack:

- `veeam-one-api`
- `veeam-one-prometheus`
- `veeam-one-grafana`

## Deploy Remoto

```bash
bash deploy/deploy_docker.sh
```

Variaveis principais do deploy remoto:

- `REMOTE_USER` com default `suporte`
- `REMOTE_HOST` com default `10.166.64.12`
- `REMOTE_DIR` com default `/var/www/appv2`
- `SSH_KEY` com default `$HOME/.ssh/id_rsa`

Acessos remotos padrao do script:

- API: `http://10.166.64.12:9469`
- Prometheus: `http://10.166.64.12:19090`
- Grafana: `http://10.166.64.12:13000`

Para destruir a stack remota:

```bash
bash deploy/destroy_docker.sh
```

As configuracoes do Prometheus e do Grafana ficam em arquivos versionaveis:

- `docker/prometheus/prometheus.yml`
- `docker/grafana/provisioning/datasources/prometheus.yml`
- `docker/grafana/provisioning/dashboards/dashboards.yml`
- `docker/grafana/dashboards/veeam-one-jobs-sre.json`
- `docker/grafana/dashboards/veeam-one-jobs-detail.json`
- `docker/grafana/dashboards/veeam-one-repositories-capacity.json`

## Metricas

- `total_jobs`
- `active_jobs`
- `failed_jobs`
- `success_jobs`
- `job_last_run_timestamp_seconds`
- `job_last_run_duration_seconds`
- `job_last_transferred_data_bytes`
- `veeam_job_info`
- `veeam_job_status`
- `veeam_job_duration_seconds`
- `veeam_job_transferred_bytes`
- `veeam_job_avg_duration_seconds`
- `veeam_jobs_total`
- `veeam_jobs_success_ratio`
- `veeam_repository_capacity_bytes`
- `veeam_repository_used_bytes`
- `veeam_repository_free_bytes`
- `veeam_repository_usage_ratio`
- `veeam_repository_restore_points_total`
- `veeam_repository_backups_total`
- `veeam_repository_vms_total`
- `veeam_repository_days_left_estimate`
- `veeam_sobr_capacity_bytes`
- `veeam_sobr_used_bytes`
- `veeam_sobr_free_bytes`
- `veeam_sobr_usage_ratio`
- `veeam_sobr_extents_total`
- `veeam_sobr_extent_capacity_bytes`
- `veeam_sobr_extent_used_bytes`
- `veeam_sobr_extent_free_bytes`
- `veeam_sobr_extent_usage_ratio`

Labels principais:

- `job_name`
- `job_type`
- `status`
- `platform`
- `repository_name`
- `repository_type`
- `backup_server`
- `state`
- `sobr_name`
- `performance_tier`
- `capacity_tier`
- `archive_tier`
- `extent_name`
- `extent_type`

## Testes

```bash
npm test
```

Os testes cobrem autenticacao, cache/renovacao de token, consumo da API, proxy fiel dos payloads REST, exporters Prometheus e rotas Fastify.

## Documentacao

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

A documentacao estilo Postman fica em `docs/postman.md`. A collection importavel fica em `docs/public/backup-observability-gateway.postman_collection.json`.

## CI/CD da Documentacao

O VitePress em `docs/` usa um fluxo `main -> feature/* -> main`.

- novas branches devem nascer de `main`
- toda nova feature deve seguir o ciclo `main -> feature/* -> main`
- qualquer branch de trabalho deve abrir Pull Request para `main`
- o CI da documentacao roda no PR para `main`
- depois do merge para `main`, a maquina local deve voltar para `main` e sincronizar com o remoto
- o GitHub Pages publica automaticamente no merge para `main`

O fluxo completo, com comandos de `branch`, `add`, `commit`, `push`, Pull Request, merge e sincronizacao final da `main`, fica documentado em `docs/cicd.md`.

## Referencias

- Get All VM Backup Jobs: https://helpcenter.veeam.com/archive/one/120/rest/reference/one-rest-v22.html#tag/Veeam-Backup-and-Replication-Jobs/operation/VbrJobs_GetVmBackupJobs
- Get All Backup Copy Jobs: https://helpcenter.veeam.com/archive/one/120/rest/reference/one-rest-v22.html#tag/Veeam-Backup-and-Replication-Jobs/operation/VbrJobs_GetBackupCopyJobs
- Get All Backup to Tape Jobs: https://helpcenter.veeam.com/archive/one/120/rest/reference/one-rest-v22.html#tag/Veeam-Backup-and-Replication-Jobs/operation/VbrJobs_GetBackupToTapeJobs
