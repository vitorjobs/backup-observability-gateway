# Execucao

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

Os nomes antigos `VEEAM_ONE_*` continuam aceitos para facilitar migracao.

## Local

```bash
npm install
cp .env.example .env
# Ajuste VEEAM_BASE_URL ou VEEAM_ONE_BASE_URL para o IP/DNS real do Veeam ONE.
npm run check
npm test
npm run build
npm start
```

## Docker Local

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
- VitePress: `http://localhost:4173`

No estado atual do `docker/docker-compose.yml`, os containers ativos da stack sao `veeam-one-api`, `veeam-one-prometheus`, `veeam-one-grafana` e `veeam-one-vitepress`.

A API sobe no Compose escutando `9469` no container e publicada no host pela porta `API_HOST_PORT`, hoje `9469`. O Prometheus raspa a API pela rede interna do Compose em `api:9469`, o Grafana acessa `http://prometheus:9090` dentro da rede do Compose, o VitePress publica a documentacao em `4173` e a API acessa o Veeam ONE pelo `VEEAM_BASE_URL` ou `VEEAM_ONE_BASE_URL` configurado no `.env` raiz.

Para a visao completa da implementacao Docker, incluindo rede, volumes, bind mounts, provisioning e dashboard principal, veja [Docker](/docker).

Os arquivos Docker ficam isolados em `docker/`:

- `docker/Dockerfile`
- `docker/docker-compose.yml`
- `docker/.env.example`
- `docker/Dockerfile.vitepress`
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

## Docker Remoto

Para publicar a mesma stack Docker no host remoto:

```bash
bash deploy/deploy_docker.sh
```

Defaults atuais do script:

- `REMOTE_USER=suporte`
- `REMOTE_HOST=10.166.64.12`
- `REMOTE_DIR=/var/www/appv2`

Acessos remotos padrao:

- API: `http://10.166.64.12:9469`
- Prometheus: `http://10.166.64.12:19090`
- Grafana: `http://10.166.64.12:13000`
- VitePress: `http://10.166.64.12:4173`

Para destruir a stack remota:

```bash
bash deploy/destroy_docker.sh
```

## Documentacao

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```
