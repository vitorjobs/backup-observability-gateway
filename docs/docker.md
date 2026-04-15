# Docker

Documentacao oficial da stack Docker do projeto, consolidando a estrutura da pasta `docker/`, a operacao local e remota, a comunicacao entre containers e os componentes de observabilidade provisionados, incluindo a publicacao da documentacao VitePress.

## Visao Geral

- Containers ativos na stack local e remota: `veeam-one-api`, `veeam-one-prometheus`, `veeam-one-grafana` e `veeam-one-vitepress`
- Runtime da API: containerizado no Compose com `network_mode: host`, escutando diretamente `9469` no host Linux
- Prometheus publicado no host como `19090`
- Grafana publicado no host como `13000`
- VitePress publicado no host como `4173`
- Dashboard principal provisionado: `Panorama Geral - Execução dos Jobs de Backup`
- Dashboard relacionado provisionado: `Panorama Geral - Repositórios de Backup`
- Volumes persistentes: `prometheus-data` e `grafana-data`
- Rede Docker dedicada: `veeam-one-observability` para `Prometheus`, `Grafana` e `VitePress`; a API usa a rede do host

## Estrutura

```text
docker/
  Dockerfile
  Dockerfile.vitepress
  docker-compose.yml
  .env.example
  prometheus/
    prometheus.yml
  grafana/
    provisioning/
      datasources/prometheus.yml
      dashboards/dashboards.yml
    dashboards/Panorama Geral dos Jobs de Backup.json
    dashboards/veeam-one-repositories-panorama-executivo-consolidado.json
```

## Operacao Local

- Local: `docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build`
- Local URLs: `http://localhost:9469`, `http://localhost:19090`, `http://localhost:13000`, `http://localhost:4173`

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
- Remoto URLs padrao: `http://10.166.64.12:9469`, `http://10.166.64.12:19090`, `http://10.166.64.12:13000`, `http://10.166.64.12:4173`
- Destroy remoto: `bash deploy/destroy_docker.sh`

Defaults dos scripts:

- `REMOTE_USER=suporte`
- `REMOTE_HOST=10.166.64.12`
- `REMOTE_DIR=/var/www/appv2`
- `SSH_KEY=$HOME/.ssh/id_rsa`

O `deploy/deploy_docker.sh` faz rebuild completo da stack remota e valida API, Prometheus, Grafana, VitePress e o acesso ao Veeam ONE.

O `deploy/destroy_docker.sh` remove a stack remota, incluindo containers, volumes, rede e a imagem local da API.

## Arquitetura Visual

![Docker Blueprint do Backup Observability Gateway](/docker/docker-architecture.png)

Arquivo-fonte editavel versionado em `docs/public/docker/docker-architecture.excalidraw.png`.

## Rede E Comunicacao

- O `docker/docker-compose.yml` e a fonte de verdade da stack.
- A API usa `network_mode: host`, escuta diretamente `9469` no host Linux e herda a mesma rota de rede usada pelo host para acessar o Veeam ONE.
- O Prometheus raspa metricas da API em `host.docker.internal:9469`, usando `docker/prometheus/prometheus.yml`.
- O Grafana consulta o Prometheus em `http://prometheus:9090`, usando o provisioning versionado.
- O VitePress e buildado com `npm run docs:build` e publicado com `npm run docs:preview` na porta `4173`.
- A API sai do container para o Veeam ONE usando `VEEAM_BASE_URL` ou `VEEAM_ONE_BASE_URL` do `.env` raiz.
- Os conflitos de porta ficam concentrados em `API_HOST_PORT`, `PROMETHEUS_HOST_PORT`, `GRAFANA_HOST_PORT` e `VITEPRESS_HOST_PORT` dentro de `docker/.env`.

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
