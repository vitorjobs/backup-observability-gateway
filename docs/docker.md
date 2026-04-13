# Docker

Arquitetura visual da stack Docker atual do projeto, priorizando o que esta efetivamente implementado em `docker/docker-compose.yml`, nos arquivos de provisioning do Grafana e na configuracao do Prometheus.

## Visao Geral

- Containers ativos no Compose: `veeam-one-prometheus` e `veeam-one-grafana`
- Runtime da API: externo ao Compose, raspado pelo Prometheus em `host.docker.internal:9469`
- Dashboard principal provisionado: `Panorama Geral dos Jobs de Backup - Ajustes 01`
- Volumes persistentes: `prometheus-data` e `grafana-data`
- Rede Docker dedicada: `veeam-one-observability`

## Arquitetura Visual

![Docker Blueprint do Backup Observability Gateway](/docker/docker-architecture.png)

Arquivo-fonte editavel versionado em `docs/public/docker/docker-architecture.excalidraw.png`.

## O Que O Desenho Destaca

- O blueprint usa o `docker/docker-compose.yml` como fonte de verdade da stack.
- A camada de aplicacao destaca a `API` como runtime no host, coerente com o scrape atual em `host.docker.internal:9469`.
- A camada de observabilidade destaca `Prometheus` e `Grafana (Main Dashboard)` como os containers centrais.
- A camada de configuracao separa `prometheus.yml` e `Provisioning`, com persistencia em `prometheus-data` e `grafana-data`.
