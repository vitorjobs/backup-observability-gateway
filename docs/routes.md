# Rotas e Metricas

## Rotas HTTP

| Metodo | Rota | Content-Type | Descricao |
| --- | --- | --- | --- |
| `GET` | `/health` | `application/json` | Health check local. |
| `GET` | `/jobs/vm-backup` | `application/json` | Lista VM backup jobs no contrato original do Veeam ONE. |
| `GET` | `/jobs/backup-copy` | `application/json` | Lista backup copy jobs no contrato original do Veeam ONE. |
| `GET` | `/jobs/backup-to-tape` | `application/json` | Lista backup to tape jobs no contrato original do Veeam ONE. |
| `GET` | `/api/veeam-one/repositories` | `application/json` | Lista repositórios no contrato original do Veeam ONE. |
| `GET` | `/api/veeam-one/scaleout-repositories` | `application/json` | Lista Scale-Out Repositories no contrato original do Veeam ONE. |
| `GET` | `/metrics` | `text/plain` | Exporta metricas Prometheus. |

`GET /jobs` nao e uma rota agregada de listagem.

## Exemplo /jobs/vm-backup

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

## Exemplo /api/veeam-one/repositories

Esta rota devolve exatamente o payload do endpoint oficial `GET /api/{VEEAM_API_VERSION}/vbr/repositories`. Query strings recebidas tambem sao repassadas.

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

## Exemplo /api/veeam-one/scaleout-repositories

Esta rota devolve exatamente o payload do endpoint oficial `GET /api/{VEEAM_API_VERSION}/vbr/scaleoutRepositories`.

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

## Metricas

| Metrica | Labels | Descricao |
| --- | --- | --- |
| `total_jobs` | `job_type`, `status` | Total de jobs por tipo e status. |
| `active_jobs` | `job_name`, `job_type`, `status` | Jobs em execucao. |
| `failed_jobs` | `job_name`, `job_type`, `status` | Jobs com falha. |
| `success_jobs` | `job_name`, `job_type`, `status` | Jobs com sucesso. |
| `job_last_run_timestamp_seconds` | `job_name`, `job_type`, `status` | Ultima execucao em Unix seconds. |
| `job_last_run_duration_seconds` | `job_name`, `job_type`, `status` | Duracao da ultima execucao. |
| `job_last_transferred_data_bytes` | `job_name`, `job_type`, `status` | Bytes transferidos na ultima execucao. |
| `veeam_job_info` | `job_name`, `job_type`, `platform` | Informacoes estaticas existentes no payload original do job. |
| `veeam_job_status` | `job_name`, `job_type`, `status` | Status do ultimo resultado. |
| `veeam_job_last_run_timestamp_seconds` | `job_name`, `job_type` | Ultima execucao em Unix seconds. |
| `veeam_job_duration_seconds` | `job_name`, `job_type` | Duracao da ultima sessao, lida de `lastRunDurationSec`. |
| `veeam_job_transferred_bytes` | `job_name`, `job_type` | Bytes transferidos, lidos de `lastTransferredDataBytes`. |
| `veeam_job_avg_duration_seconds` | `job_name`, `job_type` | Duracao media, lida de `avgDurationSec`. |
| `veeam_jobs_total` | `job_type` | Total agregado por tipo. |
| `veeam_jobs_success_total` | `job_type` | Total agregado de sucesso. |
| `veeam_jobs_warning_total` | `job_type` | Total agregado de warning. |
| `veeam_jobs_failed_total` | `job_type` | Total agregado de falha. |
| `veeam_jobs_running_total` | `job_type` | Total agregado em execucao. |
| `veeam_jobs_idle_total` | `job_type` | Total agregado idle/no data/unknown. |
| `veeam_jobs_success_ratio` | `job_type` | Razao de sucesso entre 0 e 1. |
| `veeam_repository_capacity_bytes` | `repository_name`, `repository_type`, `backup_server`, `state` | Capacidade total do repositório. |
| `veeam_repository_used_bytes` | `repository_name`, `repository_type`, `backup_server`, `state` | Espaço usado do repositório. |
| `veeam_repository_free_bytes` | `repository_name`, `repository_type`, `backup_server`, `state` | Espaço livre do repositório. |
| `veeam_repository_usage_ratio` | `repository_name`, `repository_type`, `backup_server`, `state` | Razão de uso entre 0 e 1. |
| `veeam_repository_restore_points_total` | `repository_name`, `repository_type`, `backup_server`, `state` | Restore points, quando vier no payload. |
| `veeam_repository_backups_total` | `repository_name`, `repository_type`, `backup_server`, `state` | Backups, quando vier no payload. |
| `veeam_repository_vms_total` | `repository_name`, `repository_type`, `backup_server`, `state` | VMs, quando vier no payload. |
| `veeam_repository_days_left_estimate` | `repository_name`, `repository_type`, `backup_server`, `state` | Dias restantes estimados, quando vier no payload. |
| `veeam_sobr_capacity_bytes` | `sobr_name`, `backup_server`, `performance_tier`, `capacity_tier`, `archive_tier` | Capacidade total do SOBR. |
| `veeam_sobr_used_bytes` | `sobr_name`, `backup_server`, `performance_tier`, `capacity_tier`, `archive_tier` | Espaço usado do SOBR. |
| `veeam_sobr_free_bytes` | `sobr_name`, `backup_server`, `performance_tier`, `capacity_tier`, `archive_tier` | Espaço livre do SOBR. |
| `veeam_sobr_usage_ratio` | `sobr_name`, `backup_server`, `performance_tier`, `capacity_tier`, `archive_tier` | Razão de uso do SOBR entre 0 e 1. |
| `veeam_sobr_extents_total` | `sobr_name`, `backup_server`, `performance_tier`, `capacity_tier`, `archive_tier` | Total de extents, quando vier no payload. |
| `veeam_sobr_extent_capacity_bytes` | `sobr_name`, `extent_name`, `extent_type`, `backup_server` | Capacidade do extent, quando vier no payload. |
| `veeam_sobr_extent_used_bytes` | `sobr_name`, `extent_name`, `extent_type`, `backup_server` | Espaço usado do extent, quando vier no payload. |
| `veeam_sobr_extent_free_bytes` | `sobr_name`, `extent_name`, `extent_type`, `backup_server` | Espaço livre do extent, quando vier no payload. |
| `veeam_sobr_extent_usage_ratio` | `sobr_name`, `extent_name`, `extent_type`, `backup_server` | Razão de uso do extent entre 0 e 1. |
