# Fluxos

## Inicializacao

1. `server.ts` carrega o `.env`.
2. `server.ts` cria dois clientes Axios: um para login e outro para `/api/{versao}`.
3. `server.ts` instancia `AuthService`, os services/controllers especificos de jobs, repositories, scale-out repositories e seus exporters.
4. `app.ts` cria o Fastify.
5. `routers.ts` registra as rotas.

## GET /jobs/vm-backup

1. A rota chama `VmBackupJobsController.list`.
2. O controller chama `VmBackupJobsService.listJobs`.
3. O service pede token ao `AuthService`.
4. O service consulta `GET /vbrJobs/vmBackupJobs`.
5. O service preserva as chaves originais do payload Veeam ONE, como `items`, `vmBackupJobUid`, `lastRunDurationSec` e `avgDurationSec`.
6. O controller retorna esse JSON bruto para a rota REST.

## GET /jobs/backup-copy

1. A rota chama `BackupCopyJobsController.list`.
2. O controller chama `BackupCopyJobsService.listJobs`.
3. O service consulta `GET /vbrJobs/backupCopyJobs`.
4. O controller retorna o JSON no contrato original desse endpoint.

## GET /jobs/backup-to-tape

1. A rota chama `BackupToTapeJobsController.list`.
2. O controller chama `BackupToTapeJobsService.listJobs`.
3. O service consulta `GET /vbrJobs/backupToTapeJobs`.
4. O controller retorna o JSON no contrato original desse endpoint.

## GET /api/veeam-one/repositories

1. A rota chama `RepositoriesController.list`.
2. O controller chama `RepositoriesService.listRepositories`.
3. O service pede token ao `AuthService`.
4. O service consulta `GET /vbr/repositories` repassando a query string recebida.
5. O controller retorna exatamente o payload recebido do Veeam ONE.

## GET /api/veeam-one/scaleout-repositories

1. A rota chama `ScaleoutRepositoriesController.list`.
2. O controller chama `ScaleoutRepositoriesService.listScaleoutRepositories`.
3. O service pede token ao `AuthService`.
4. O service consulta `GET /vbr/scaleoutRepositories` repassando a query string recebida.
5. O controller retorna exatamente o payload recebido do Veeam ONE.

## GET /metrics

1. Prometheus chama `/metrics`.
2. `JobsExporter.collect` chama os services especificos de jobs.
3. `RepositoriesExporter.collect` chama os services de repositórios e SOBR.
4. Os exporters normalizam internamente os payloads brutos somente para calcular metricas.
5. Os exporters atualizam gauges do `prom-client`.
6. A rota retorna texto no formato Prometheus.

## Renovacao De Token

1. `AuthService.getAccessToken` retorna o token cacheado enquanto estiver valido.
2. Quando expira, tenta `grant_type=refresh_token`.
3. Se refresh falhar, limpa o cache e faz login com usuario e senha.
