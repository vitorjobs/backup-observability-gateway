# Arquitetura

A arquitetura foi simplificada para evitar camadas desnecessarias.

```text
HTTP client
  -> Fastify route
    -> Controller especifico
      -> Service especifico do endpoint
        -> AuthService
        -> Axios Veeam ONE API
```

```text
Prometheus
  -> GET /metrics
    -> JobsExporter
      -> Services especificos de jobs
        -> AuthService
        -> Axios Veeam ONE API
    -> RepositoriesExporter
      -> Services especificos de repositories/SOBR
        -> AuthService
        -> Axios Veeam ONE API
```

## Dependencias

- Cada controller de jobs depende somente do seu service.
- `JobsExporter` depende da lista de services de jobs, nao de controllers.
- `RepositoriesExporter` depende dos services de repositories e scale-out repositories, nao de controllers.
- Cada service de jobs depende de `AxiosInstance` e `AuthService`, mantendo localmente sua paginacao, retry `401` e tratamento de erro.
- Cada service de repositórios depende de `AxiosInstance` e `AuthService`, repassa query strings para o Veeam ONE e mantém o payload REST original.
- `AuthService` depende de `AxiosInstance`.
- `Fastify` nao entra dentro dos services.
- `prom-client` fica isolado em `src/exporters/*.exporter.ts`.

## Services Por Endpoint

- `VmBackupJobsService` consulta `GET /api/v2.2/vbrJobs/vmBackupJobs`.
- `BackupCopyJobsService` consulta `GET /api/v2.2/vbrJobs/backupCopyJobs`.
- `BackupToTapeJobsService` consulta `GET /api/v2.2/vbrJobs/backupToTapeJobs`.
- `RepositoriesService` consulta `GET /api/v2.2/vbr/repositories`.
- `ScaleoutRepositoriesService` consulta `GET /api/v2.2/vbr/scaleoutRepositories`.

Cada service tem seu controller e sua rota HTTP. A rota agregada `/jobs` nao lista mais todos os jobs.

As rotas REST de repositórios funcionam como proxy tecnico limpo: nao renomeiam, nao resumem e nao reestruturam o payload oficial.

## Endpoints Veeam ONE consumidos

- `GET /api/v2.2/vbrJobs/vmBackupJobs`
- `GET /api/v2.2/vbrJobs/backupCopyJobs`
- `GET /api/v2.2/vbrJobs/backupToTapeJobs`
- `GET /api/v2.2/vbr/repositories`
- `GET /api/v2.2/vbr/scaleoutRepositories`

Os endpoints usam paginacao com `Offset` e `Limit`.

## Autenticacao

O `AuthService` chama `POST /api/token` com `grant_type=password` no primeiro acesso.

Depois disso:

- Mantem o `access_token` em memoria.
- Usa `refresh_token` quando o token expira.
- Evita logins concorrentes usando uma promessa em andamento.
- Invalida o token e tenta novamente quando o Veeam retorna `401`.
