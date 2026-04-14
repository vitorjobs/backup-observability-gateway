#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

REMOTE_USER="${REMOTE_USER:-suporte}"
REMOTE_HOST="${REMOTE_HOST:-10.166.64.12}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/appv2}"
LOCAL_PROJECT_DIR="${LOCAL_PROJECT_DIR:-$PROJECT_ROOT}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"

echo "Iniciando deploy Docker da v2..."

if [ ! -d "$LOCAL_PROJECT_DIR" ]; then
  echo "Diretorio local do projeto nao encontrado: $LOCAL_PROJECT_DIR"
  exit 1
fi

RSYNC_ARGS=(
  -avz
  --delete
  --no-group
  --no-perms
  --exclude '.git/'
  --exclude 'node_modules/'
  --exclude 'dist/'
  --exclude 'coverage/'
  --exclude 'docs/.vitepress/dist/'
  -e "ssh -i $SSH_KEY"
)

if [ ! -f "$LOCAL_PROJECT_DIR/.env" ]; then
  RSYNC_ARGS+=(--exclude '.env')
  echo "Arquivo .env local nao encontrado. O servidor remoto precisara ter um .env ja configurado."
fi

echo "Enviando projeto completo para $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."

rsync "${RSYNC_ARGS[@]}" \
  "$LOCAL_PROJECT_DIR"/ \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo "Executando docker compose remoto..."

ssh -t -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" <<EOF
set -euo pipefail

mkdir -p "$REMOTE_DIR"
cd "$REMOTE_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ ! -f docker/.env ]; then
  cp docker/.env.example docker/.env
fi

if ! grep -qE '^(VEEAM_BASE_URL|VEEAM_ONE_BASE_URL)=' .env; then
  echo "O arquivo .env remoto precisa definir VEEAM_BASE_URL ou VEEAM_ONE_BASE_URL com o IP/DNS do Veeam ONE."
  exit 1
fi

set -a
. docker/.env
set +a

STACK_NAME="\${OBSERVABILITY_STACK_NAME:-veeam-one-monitoring}"
NETWORK_NAME="\${OBSERVABILITY_NETWORK_NAME:-veeam-one-observability}"
API_CONTAINER="\${API_CONTAINER_NAME:-veeam-one-api}"
PROMETHEUS_CONTAINER="\${PROMETHEUS_CONTAINER_NAME:-veeam-one-prometheus}"
GRAFANA_CONTAINER="\${GRAFANA_CONTAINER_NAME:-veeam-one-grafana}"
VITEPRESS_CONTAINER="\${VITEPRESS_CONTAINER_NAME:-veeam-one-vitepress}"
API_PORT="\${API_HOST_PORT:-9469}"
PROMETHEUS_PORT="\${PROMETHEUS_HOST_PORT:-19090}"
GRAFANA_PORT="\${GRAFANA_HOST_PORT:-13000}"
VITEPRESS_PORT="\${VITEPRESS_HOST_PORT:-4173}"
PROMETHEUS_VOLUME="\${PROMETHEUS_VOLUME_NAME:-veeam-one-monitoring-prometheus-data}"
GRAFANA_VOLUME="\${GRAFANA_VOLUME_NAME:-veeam-one-monitoring-grafana-data}"
VEEAM_BASE_URL="\$(grep -E '^(VEEAM_BASE_URL|VEEAM_ONE_BASE_URL)=' .env | head -n1 | cut -d= -f2-)"

LEGACY_STACK_NAME="backup-observability-gateway-v2"
LEGACY_NETWORK_NAME="backup-observability-gateway-v2-network"
LEGACY_API_CONTAINER="v2-backup-observability-gateway-api"
LEGACY_PROMETHEUS_CONTAINER="v2-backup-observability-gateway-prometheus"
LEGACY_GRAFANA_CONTAINER="v2-backup-observability-gateway-grafana"
LEGACY_PROMETHEUS_VOLUME="v2-backup-observability-gateway-prometheus-data"
LEGACY_GRAFANA_VOLUME="v2-backup-observability-gateway-grafana-data"

remove_container_if_exists() {
  local container_name="\$1"
  if docker container inspect "\$container_name" >/dev/null 2>&1; then
    echo "Removendo container \$container_name ..."
    docker rm -f "\$container_name" >/dev/null
  fi
}

remove_containers_by_project_label() {
  local project_name="\$1"
  local container_ids
  container_ids="\$(docker ps -aq --filter "label=com.docker.compose.project=\$project_name")"

  if [ -n "\$container_ids" ]; then
    echo "Removendo containers remanescentes do projeto Compose \$project_name ..."
    for container_id in \$container_ids; do
      docker rm -f "\$container_id" >/dev/null
    done
  fi
}

remove_containers_by_published_port() {
  local port="\$1"
  local description="\$2"
  local container_ids
  container_ids="\$(docker ps -aq --filter "publish=\$port")"

  if [ -n "\$container_ids" ]; then
    echo "Removendo containers que ainda ocupam a porta \$port (\$description) ..."
    for container_id in \$container_ids; do
      docker rm -f "\$container_id" >/dev/null
    done
  fi
}

remove_volume_if_exists() {
  local volume_name="\$1"
  if docker volume inspect "\$volume_name" >/dev/null 2>&1; then
    echo "Removendo volume \$volume_name ..."
    docker volume rm -f "\$volume_name" >/dev/null
  fi
}

remove_network_if_exists() {
  local network_name="\$1"
  if docker network inspect "\$network_name" >/dev/null 2>&1; then
    echo "Removendo rede \$network_name ..."
    docker network rm "\$network_name" >/dev/null 2>&1 || true
  fi
}

assert_port_free() {
  local port="\$1"
  local description="\$2"

  if command -v ss >/dev/null 2>&1; then
    if ss -ltn "( sport = :\$port )" | grep -Eq "[:]\$port[[:space:]]"; then
      echo "A porta \$port (\$description) continua ocupada no host apos a limpeza."
      ss -ltnp "( sport = :\$port )" || true
      exit 1
    fi
  fi
}

docker compose --env-file docker/.env -f docker/docker-compose.yml config >/dev/null

echo "Derrubando a stack atual (\$STACK_NAME) ..."
docker compose --env-file docker/.env -f docker/docker-compose.yml down --remove-orphans --volumes || true

echo "Derrubando a stack legada (\$LEGACY_STACK_NAME), se existir ..."
docker compose -p "\$LEGACY_STACK_NAME" --env-file docker/.env -f docker/docker-compose.yml down --remove-orphans --volumes || true

remove_containers_by_project_label "\$STACK_NAME"
remove_containers_by_project_label "\$LEGACY_STACK_NAME"

remove_container_if_exists "\$API_CONTAINER"
remove_container_if_exists "\$PROMETHEUS_CONTAINER"
remove_container_if_exists "\$GRAFANA_CONTAINER"
remove_container_if_exists "\$VITEPRESS_CONTAINER"
remove_container_if_exists "\$LEGACY_API_CONTAINER"
remove_container_if_exists "\$LEGACY_PROMETHEUS_CONTAINER"
remove_container_if_exists "\$LEGACY_GRAFANA_CONTAINER"

remove_containers_by_published_port "\$API_PORT" "API"
remove_containers_by_published_port "\$PROMETHEUS_PORT" "Prometheus"
remove_containers_by_published_port "\$GRAFANA_PORT" "Grafana"
remove_containers_by_published_port "\$VITEPRESS_PORT" "VitePress"

remove_volume_if_exists "\$PROMETHEUS_VOLUME"
remove_volume_if_exists "\$GRAFANA_VOLUME"
remove_volume_if_exists "\$LEGACY_PROMETHEUS_VOLUME"
remove_volume_if_exists "\$LEGACY_GRAFANA_VOLUME"

remove_network_if_exists "\$NETWORK_NAME"
remove_network_if_exists "\$LEGACY_NETWORK_NAME"

assert_port_free "\$API_PORT" "API"
assert_port_free "\$PROMETHEUS_PORT" "Prometheus"
assert_port_free "\$GRAFANA_PORT" "Grafana"
assert_port_free "\$VITEPRESS_PORT" "VitePress"

docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build --force-recreate --remove-orphans
docker compose --env-file docker/.env -f docker/docker-compose.yml ps

if command -v curl >/dev/null 2>&1; then
  echo "Validando health check da API em http://127.0.0.1:\$API_PORT/health ..."
  API_HEALTH_OK=false
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent --show-error "http://127.0.0.1:\$API_PORT/health" >/dev/null; then
      API_HEALTH_OK=true
      break
    fi
    sleep 2
  done

  if [ "\$API_HEALTH_OK" != "true" ]; then
    echo "A API nao respondeu em http://127.0.0.1:\$API_PORT/health apos o deploy."
    exit 1
  fi

  echo "Validando acesso da API ao Veeam ONE em \$VEEAM_BASE_URL ..."
  API_UPSTREAM_OK=false
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent --show-error "http://127.0.0.1:\$API_PORT/api/veeam-one/repositories?pageSize=1" >/dev/null; then
      API_UPSTREAM_OK=true
      break
    fi
    sleep 3
  done

  if [ "\$API_UPSTREAM_OK" != "true" ]; then
    echo "A API iniciou, mas nao conseguiu consultar o Veeam ONE em \$VEEAM_BASE_URL."
    exit 1
  fi

  echo "Validando scrape do Prometheus em http://127.0.0.1:\$PROMETHEUS_PORT ..."
  PROMETHEUS_OK=false
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    TARGETS_RESPONSE="\$(curl --fail --silent --show-error "http://127.0.0.1:\$PROMETHEUS_PORT/api/v1/targets" || true)"
    if [[ "\$TARGETS_RESPONSE" == *'"app-v2-api"'* ]] && [[ "\$TARGETS_RESPONSE" == *'"health":"up"'* ]]; then
      PROMETHEUS_OK=true
      break
    fi
    sleep 3
  done

  if [ "\$PROMETHEUS_OK" != "true" ]; then
    echo "O Prometheus nao conseguiu raspar a API no alvo interno api:9469."
    exit 1
  fi

  echo "Validando health do Grafana em http://127.0.0.1:\$GRAFANA_PORT/api/health ..."
  GRAFANA_OK=false
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent --show-error "http://127.0.0.1:\$GRAFANA_PORT/api/health" >/dev/null; then
      GRAFANA_OK=true
      break
    fi
    sleep 3
  done

  if [ "\$GRAFANA_OK" != "true" ]; then
    echo "O Grafana nao respondeu em http://127.0.0.1:\$GRAFANA_PORT/api/health apos o deploy."
    exit 1
  fi

  echo "Validando VitePress em http://127.0.0.1:\$VITEPRESS_PORT/ ..."
  VITEPRESS_OK=false
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent --show-error "http://127.0.0.1:\$VITEPRESS_PORT/" >/dev/null; then
      VITEPRESS_OK=true
      break
    fi
    sleep 3
  done

  if [ "\$VITEPRESS_OK" != "true" ]; then
    echo "O VitePress nao respondeu em http://127.0.0.1:\$VITEPRESS_PORT/ apos o deploy."
    exit 1
  fi
fi

echo
echo "Deploy Docker da v2 finalizado com sucesso."
echo "API_URL=http://$REMOTE_HOST:\$API_PORT"
echo "PROMETHEUS_URL=http://$REMOTE_HOST:\$PROMETHEUS_PORT"
echo "GRAFANA_URL=http://$REMOTE_HOST:\$GRAFANA_PORT"
echo "VITEPRESS_URL=http://$REMOTE_HOST:\$VITEPRESS_PORT"
echo "VEEAM_ONE_BASE_URL=\$VEEAM_BASE_URL"
EOF
