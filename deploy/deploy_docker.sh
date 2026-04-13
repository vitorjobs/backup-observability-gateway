#!/usr/bin/env bash

set -euo pipefail

REMOTE_USER="${REMOTE_USER:-suporte}"
REMOTE_HOST="${REMOTE_HOST:-10.166.64.12}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/appv2}"
LOCAL_DOCKER_DIR="${LOCAL_DOCKER_DIR:-$HOME/Documentos/Asp_Guedes/01_Veeam/2026/backup-observability-gateway}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"

echo "Iniciando deploy Docker da v2..."

if [ ! -d "$LOCAL_DOCKER_DIR" ]; then
  echo "Diretorio local do projeto nao encontrado: $LOCAL_DOCKER_DIR"
  exit 1
fi

echo "Enviando projeto completo para $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."

rsync -avz --delete \
  --no-group --no-perms \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'coverage/' \
  --exclude '.env' \
  --exclude 'docs/.vitepress/dist/' \
  -e "ssh -i $SSH_KEY" \
  "$LOCAL_DOCKER_DIR"/ \
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

set -a
. docker/.env
set +a

API_PORT="\${APP_PORT:-9470}"

mkdir -p logs

docker compose --env-file docker/.env -f docker/docker-compose.yml down || true
docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build
docker compose --env-file docker/.env -f docker/docker-compose.yml ps

if command -v curl >/dev/null 2>&1; then
  echo "Validando health check da API em http://127.0.0.1:\$API_PORT/health ..."
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent --show-error "http://127.0.0.1:\$API_PORT/health" >/dev/null; then
      echo "API v2 respondeu com sucesso na porta \$API_PORT."
      exit 0
    fi
    sleep 2
  done

  echo "A API nao respondeu em http://127.0.0.1:\$API_PORT/health apos o deploy."
  exit 1
fi
EOF

echo "Deploy Docker da v2 finalizado."
