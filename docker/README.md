# Docker

Stack Docker isolada para executar:

- API Node.js/Fastify
- Prometheus
- Grafana com datasource e dashboards provisionados

## Arquivos

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

## Antes de subir

O arquivo raiz `.env` contem as variaveis da API e credenciais do Veeam ONE.

```bash
cp .env.example .env
```

O arquivo `docker/.env` contem variaveis da stack Docker, imagens, nomes de containers e portas.

```bash
cp docker/.env.example docker/.env
```

## Subir

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build
```

## Acessos

- API: `http://localhost:9470`
- Prometheus: `http://localhost:29090`
- Grafana: `http://localhost:23000`

## Dashboards

- `Veeam ONE Jobs - SRE Overview`: visao geral de saude, sucesso, falhas, warning, execucao e eficiencia.
- `Veeam ONE Jobs - Operational Detail`: drill-down por job com inventario, status, duracao, bytes, retries, anomalias, retencao e tape.
- `Veeam ONE - Repositórios e Capacidade`: visao executiva, operacional e avancada de capacidade de repositories, SOBR e extents.

## Rede

A API participa da rede `observability` do Compose e publica `9470` no host mapeando para `9469` no container.

O Prometheus usa `api:9469` configurado em `docker/prometheus/prometheus.yml`.

Se a porta interna da API mudar, ajuste `APP_PORT` no `docker/.env`, o mapeamento em `docker/docker-compose.yml` e o target em `docker/prometheus/prometheus.yml`.

## Parar

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml down
```
