# Docker

Documentacao oficial da stack Docker do projeto, consolidando a estrutura da pasta `docker/`, a operacao local e remota, a comunicacao entre containers e os componentes de observabilidade provisionados.

## Visao Geral

- Containers ativos na stack local e remota: `veeam-one-api`, `veeam-one-prometheus` e `veeam-one-grafana`
- Runtime da API: containerizado no Compose, escutando `9469` e publicado no host como `9469`
- Prometheus publicado no host como `19090`
- Grafana publicado no host como `13000`
- Dashboard principal provisionado: `Panorama Geral dos Jobs de Backup - Ajustes 01`
- Volumes persistentes: `prometheus-data` e `grafana-data`
- Rede Docker dedicada: `veeam-one-observability` para `api`, `Prometheus` e `Grafana`

## Estrutura

```text
docker/
  Dockerfile
  docker-compose.yml
  .env.example
  prometheus/
    prometheus.yml
  grafana/
    provisioning/
      datasources/prometheus.yml
      dashboards/dashboards.yml
    dashboards/veeam-one-jobs-sre.json
    dashboards/veeam-one-jobs-detail.json
    dashboards/veeam-one-repositories-capacity.json
```

## Operacao Local

- Local: `docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build`
- Local URLs: `http://localhost:9469`, `http://localhost:19090`, `http://localhost:13000`

Antes de subir:

```bash
cp .env.example .env
cp docker/.env.example docker/.env
```

Ajuste no `.env` raiz:

- `VEEAM_BASE_URL` ou `VEEAM_ONE_BASE_URL` deve apontar para o IP ou DNS real do Veeam ONE

O arquivo `docker/.env` define:

- nomes dos containers
- portas publicadas no host
- nomes de volumes
- nome da rede Docker

## Operacao Remota

- Remoto: `bash deploy/deploy_docker.sh`
- Remoto default host: `10.166.64.12`
- Remoto URLs padrao: `http://10.166.64.12:9469`, `http://10.166.64.12:19090`, `http://10.166.64.12:13000`
- Destroy remoto: `bash deploy/destroy_docker.sh`

Defaults dos scripts:

- `REMOTE_USER=suporte`
- `REMOTE_HOST=10.166.64.12`
- `REMOTE_DIR=/var/www/appv2`
- `SSH_KEY=$HOME/.ssh/id_rsa`

O `deploy/deploy_docker.sh` faz rebuild completo da stack remota e valida API, Prometheus, Grafana e o acesso ao Veeam ONE.

O `deploy/destroy_docker.sh` remove a stack remota, incluindo containers, volumes, rede e a imagem local da API.

## Arquitetura Visual

![Docker Blueprint do Backup Observability Gateway](/docker/docker-architecture.png)

Arquivo-fonte editavel versionado em `docs/public/docker/docker-architecture.excalidraw.png`.

## Rede E Comunicacao

- O `docker/docker-compose.yml` e a fonte de verdade da stack.
- A API publica `9469` no host e responde internamente na mesma porta.
- O Prometheus raspa metricas da API em `api:9469`, usando `docker/prometheus/prometheus.yml`.
- O Grafana consulta o Prometheus em `http://prometheus:9090`, usando o provisioning versionado.
- A API sai do container para o Veeam ONE usando `VEEAM_BASE_URL` ou `VEEAM_ONE_BASE_URL` do `.env` raiz.
- Os conflitos de porta ficam concentrados em `API_HOST_PORT`, `PROMETHEUS_HOST_PORT` e `GRAFANA_HOST_PORT` dentro de `docker/.env`.

## Dashboards

- `Veeam ONE Jobs - SRE Overview`: visao geral de saude, sucesso, falhas, warning, execucao e eficiencia
- `Veeam ONE Jobs - Operational Detail`: drill-down por job com inventario, status, duracao, bytes, retries, anomalias, retencao e tape
- `Veeam ONE - Repositorios e Capacidade`: visao executiva, operacional e avancada de capacidade de repositories, SOBR e extents

## Comandos Uteis

Subir localmente:

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build
```

Parar localmente:

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml down
```

Publicar no host remoto:

```bash
bash deploy/deploy_docker.sh
```

Destruir a stack remota:

```bash
bash deploy/destroy_docker.sh
```
