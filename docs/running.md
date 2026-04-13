# Execucao

## Variaveis

```ini
VEEAM_BASE_URL=https://veeam-one.local:1239
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

Os nomes antigos `VEEAM_ONE_*` continuam aceitos para facilitar migracao.

## Local

```bash
npm install
npm run check
npm test
npm run build
npm start
```

## Docker

```bash
cp .env.example .env
cp docker/.env.example docker/.env
docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build
```

Acessos padrao:

- API: `http://localhost:9469`
- Prometheus: `http://localhost:19090`
- Grafana: `http://localhost:13000`

No estado atual do `docker/docker-compose.yml`, os containers ativos da stack sao `prometheus` e `grafana`.

A API continua sendo raspada fora do Compose por `host.docker.internal:9469`. O bloco do servico `api`, com `network_mode: host`, existe no arquivo, mas esta comentado neste momento.

Para a visao completa da implementacao Docker, incluindo rede, volumes, bind mounts, provisioning e dashboard principal, veja [Docker](/docker).

Os arquivos Docker ficam isolados em `docker/`:

- `docker/Dockerfile`
- `docker/docker-compose.yml`
- `docker/.env.example`
- `docker/prometheus/prometheus.yml`
- `docker/grafana/provisioning/datasources/prometheus.yml`
- `docker/grafana/provisioning/dashboards/dashboards.yml`
- `docker/grafana/dashboards/veeam-one-jobs-sre.json`
- `docker/grafana/dashboards/veeam-one-jobs-detail.json`
- `docker/grafana/dashboards/veeam-one-repositories-capacity.json`

Depois de subir a API, valide os novos endpoints da Entrega 2:

```bash
curl http://localhost:9469/api/veeam-one/repositories
curl http://localhost:9469/api/veeam-one/scaleout-repositories
curl http://localhost:9469/metrics
```

## Documentacao

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```
