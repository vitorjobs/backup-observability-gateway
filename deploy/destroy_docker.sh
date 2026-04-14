#!/usr/bin/env bash

set -euo pipefail

REMOTE_USER="${REMOTE_USER:-suporte}"
REMOTE_HOST="${REMOTE_HOST:-10.166.64.12}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/appv2}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"

echo "Iniciando destruicao remota da stack Docker..."

ssh -t -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" <<EOF
set -euo pipefail

if [ -d "$REMOTE_DIR" ] && [ -f "$REMOTE_DIR/docker/.env" ]; then
  cd "$REMOTE_DIR"
  set -a
  . docker/.env
  set +a
fi

STACK_NAME="\${OBSERVABILITY_STACK_NAME:-veeam-one-monitoring}"
NETWORK_NAME="\${OBSERVABILITY_NETWORK_NAME:-veeam-one-observability}"
API_IMAGE="\${API_IMAGE:-backup-observability-gateway-v2:latest}"
API_PORT="\${API_HOST_PORT:-9469}"
PROMETHEUS_PORT="\${PROMETHEUS_HOST_PORT:-19090}"
GRAFANA_PORT="\${GRAFANA_HOST_PORT:-13000}"

CONTAINERS=(
  "\${API_CONTAINER_NAME:-veeam-one-api}"
  "\${PROMETHEUS_CONTAINER_NAME:-veeam-one-prometheus}"
  "\${GRAFANA_CONTAINER_NAME:-veeam-one-grafana}"
  "v2-backup-observability-gateway-api"
  "v2-backup-observability-gateway-prometheus"
  "v2-backup-observability-gateway-grafana"
)

VOLUMES=(
  "\${PROMETHEUS_VOLUME_NAME:-veeam-one-monitoring-prometheus-data}"
  "\${GRAFANA_VOLUME_NAME:-veeam-one-monitoring-grafana-data}"
  "v2-backup-observability-gateway-prometheus-data"
  "v2-backup-observability-gateway-grafana-data"
)

NETWORKS=(
  "\$NETWORK_NAME"
  "backup-observability-gateway-v2-network"
)

if [ -d "$REMOTE_DIR" ] && [ -f "$REMOTE_DIR/docker/docker-compose.yml" ] && [ -f "$REMOTE_DIR/docker/.env" ]; then
  cd "$REMOTE_DIR"
  docker compose --env-file docker/.env -f docker/docker-compose.yml down --remove-orphans --volumes || true
  docker compose -p backup-observability-gateway-v2 --env-file docker/.env -f docker/docker-compose.yml down --remove-orphans --volumes || true
fi

for container_name in "\${CONTAINERS[@]}"; do
  docker rm -f "\$container_name" >/dev/null 2>&1 || true
done

for published_port in "\$API_PORT" "\$PROMETHEUS_PORT" "\$GRAFANA_PORT"; do
  for container_id in \$(docker ps -aq --filter "publish=\$published_port"); do
    docker rm -f "\$container_id" >/dev/null 2>&1 || true
  done
done

for volume_name in "\${VOLUMES[@]}"; do
  docker volume rm -f "\$volume_name" >/dev/null 2>&1 || true
done

for network_name in "\${NETWORKS[@]}"; do
  docker network rm "\$network_name" >/dev/null 2>&1 || true
done

docker image rm -f "\$API_IMAGE" >/dev/null 2>&1 || true

echo
echo "Infraestrutura Docker removida com sucesso em $REMOTE_HOST."
echo "PORTAS_LIBERADAS=\$API_PORT,\$PROMETHEUS_PORT,\$GRAFANA_PORT"
echo "STACK_REMOVIDA=\$STACK_NAME"
EOF
