# Documentacao Postman

Esta pagina descreve as chamadas HTTP disponiveis no gateway em um formato parecido com o Postman.

## Environment

Crie um environment no Postman com:

| Variavel | Valor local |
| --- | --- |
| `baseUrl` | `http://localhost:9470` |

As rotas abaixo nao exigem autenticacao no gateway. A autenticacao com o Veeam ONE acontece internamente no backend usando as variaveis do `.env`.

## Collection

Se quiser importar no Postman:

```text
docs/public/backup-observability-gateway.postman_collection.json
```

Quando servido pelo VitePress, o arquivo tambem fica disponivel em:

```text
/backup-observability-gateway.postman_collection.json
```

## GET Health

**Method:** `GET`

**URL:**

```text
{{baseUrl}}/health
```

**Headers:**

| Key | Value |
| --- | --- |
| `Accept` | `application/json` |

**Body:** nenhum

**Response 200:**

```json
{
  "status": "ok"
}
```

**Quando usar:** verificar se a API Fastify esta online.

## GET VM Backup Jobs

**Method:** `GET`

**URL:**

```text
{{baseUrl}}/jobs/vm-backup
```

**Headers:**

| Key | Value |
| --- | --- |
| `Accept` | `application/json` |

**Body:** nenhum

**Chamada interna ao Veeam ONE:**

```text
GET /api/{VEEAM_API_VERSION}/vbrJobs/vmBackupJobs
```

**Response 200:**

```json
{
  "items": [
    {
      "vmBackupJobUid": "c52f528c-0899-4a52-ba06-03963f272742",
      "backupServerId": 5,
      "status": "Success",
      "details": [],
      "name": "7CTA-SISTEMAS-08-EXAGRID",
      "description": "Created by VEEAMBKPSERVER\\otoniel at 07/02/2024 15:05.",
      "platform": "VSphere",
      "lastRun": "2026-04-07T04:02:40.757Z",
      "lastRunDurationSec": 267,
      "avgDurationSec": 23102,
      "lastTransferredDataBytes": 984033406
    }
  ],
  "totalCount": 1
}
```

## GET Backup Copy Jobs

**Method:** `GET`

**URL:**

```text
{{baseUrl}}/jobs/backup-copy
```

**Headers:**

| Key | Value |
| --- | --- |
| `Accept` | `application/json` |

**Body:** nenhum

**Chamada interna ao Veeam ONE:**

```text
GET /api/{VEEAM_API_VERSION}/vbrJobs/backupCopyJobs
```

**Response 200:** mesmo contrato original do Veeam ONE, com `items` e chaves originais do endpoint, como `backupCopyJobUid`.

## GET Backup To Tape Jobs

**Method:** `GET`

**URL:**

```text
{{baseUrl}}/jobs/backup-to-tape
```

**Headers:**

| Key | Value |
| --- | --- |
| `Accept` | `application/json` |

**Body:** nenhum

**Chamada interna ao Veeam ONE:**

```text
GET /api/{VEEAM_API_VERSION}/vbrJobs/backupToTapeJobs
```

**Response 200:** mesmo contrato original do Veeam ONE, com `items` e chaves originais do endpoint, como `backupToTapeJobUid`.

## GET Repositories

**Method:** `GET`

**URL:**

```text
{{baseUrl}}/api/veeam-one/repositories
```

**Headers:**

| Key | Value |
| --- | --- |
| `Accept` | `application/json` |

**Query Params:** opcionais. Qualquer query string recebida e repassada ao Veeam ONE.

**Body:** nenhum

**Chamada interna ao Veeam ONE:**

```text
GET /api/{VEEAM_API_VERSION}/vbr/repositories
```

**Response 200:** payload original do Veeam ONE sem renomear, resumir ou reestruturar campos.

```json
{
  "items": [
    {
      "repositoryUid": "repo-1",
      "name": "Repo Local",
      "repositoryType": "WindowsLocal",
      "backupServerId": 5,
      "state": "Available",
      "capacityBytes": 1000,
      "usedBytes": 250,
      "freeBytes": 750
    }
  ],
  "totalCount": 1
}
```

## GET Scale-Out Repositories

**Method:** `GET`

**URL:**

```text
{{baseUrl}}/api/veeam-one/scaleout-repositories
```

**Headers:**

| Key | Value |
| --- | --- |
| `Accept` | `application/json` |

**Query Params:** opcionais. Qualquer query string recebida e repassada ao Veeam ONE.

**Body:** nenhum

**Chamada interna ao Veeam ONE:**

```text
GET /api/{VEEAM_API_VERSION}/vbr/scaleoutRepositories
```

**Response 200:** payload original do Veeam ONE sem renomear, resumir ou reestruturar campos.

```json
{
  "items": [
    {
      "scaleoutRepositoryUid": "sobr-1",
      "name": "SOBR Principal",
      "backupServerId": 5,
      "capacityBytes": 2000,
      "usedBytes": 1000,
      "freeBytes": 1000
    }
  ],
  "totalCount": 1
}
```

## GET Metrics

**Method:** `GET`

**URL:**

```text
{{baseUrl}}/metrics
```

**Headers:**

| Key | Value |
| --- | --- |
| `Accept` | `text/plain` |

**Body:** nenhum

**Response 200:**

```text
# HELP total_jobs Total de jobs coletados por tipo e status.
# TYPE total_jobs gauge
total_jobs{job_type="vm_backup",status="success"} 1
# HELP veeam_jobs_success_ratio Razao de sucesso dos jobs Veeam ONE por tipo, de 0 a 1.
# TYPE veeam_jobs_success_ratio gauge
veeam_jobs_success_ratio{job_type="vm_backup"} 1
# HELP veeam_repository_usage_ratio Razao de uso do repositorio Veeam ONE entre 0 e 1, derivada de used/capacity quando possivel.
# TYPE veeam_repository_usage_ratio gauge
veeam_repository_usage_ratio{repository_name="Repo Local",repository_type="WindowsLocal",backup_server="5",state="Available"} 0.25
```

**Quando usar:** endpoint de scrape do Prometheus.

## Erros

**Timeout ao chamar Veeam ONE:**

```json
{
  "status": "error",
  "message": "timeout of 30000ms exceeded"
}
```

**Certificado self-signed sem TLS liberado:**

```json
{
  "status": "error",
  "message": "self-signed certificate"
}
```

**Rota inexistente:**

```json
{
  "status": "error",
  "message": "Rota nao encontrada. Use /health, /jobs/vm-backup, /jobs/backup-copy, /jobs/backup-to-tape, /api/veeam-one/repositories, /api/veeam-one/scaleout-repositories ou /metrics."
}
```
