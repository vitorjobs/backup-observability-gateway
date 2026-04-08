# Documento Tecnico — Proximas Entregas do Backup Observability Gateway

## 1. Objetivo

Implementar as próximas entregas do projeto com as seguintes regras obrigatórias:

1. **REST API de resposta**
   - Os dados retornados pela nossa REST API devem ser **iguais aos dados vindos da API oficial do Veeam ONE**.
   - A regra é: **não transformar, não renomear, não resumir e não reestruturar o payload original** no endpoint REST principal.
   - Se for necessário incluir informações locais, isso deve ser feito de forma opcional e separada do payload original.

2. **Exporters Prometheus**
   - Os dados dos exporters **podem e devem ser transformados** para atender o objetivo do monitoramento.
   - Exporters podem:
     - agregar
     - contar
     - resumir
     - normalizar status
     - converter datas
     - converter unidades
     - criar métricas derivadas

3. **Prioridade funcional**
   - Primeiro: capacidade e risco de armazenamento
   - Segundo: cobertura real de proteção
   - Terceiro: alarmes e risco operacional
   - Quarto: infraestrutura operacional complementar

---

## 2. Regra Arquitetural Obrigatória

### 2.1 REST API = payload fiel da API oficial

Para todos os novos módulos:

- A `service` deve buscar os dados na API oficial do Veeam ONE.
- A `controller` deve devolver a resposta **sem alterar a estrutura funcional do payload**.
- O endpoint REST do projeto deve funcionar como um **proxy técnico limpo** do endpoint oficial.

### 2.2 O que é permitido na REST API

Permitido:
- repassar o payload original
- repassar status code adequado
- repassar paginação/filtros, se existirem
- adicionar logs internos
- adicionar tratamento de erro técnico

Não permitido:
- trocar nomes de campos
- agrupar itens de forma diferente
- converter arrays em objetos
- remover campos do payload oficial
- inventar estrutura JSON própria no endpoint principal

### 2.3 Exporter = camada de observabilidade

A camada de exporter pode:
- normalizar status
- gerar gauges, counters e summaries
- gerar métricas agregadas por tipo, status, severidade e compliance
- criar labels úteis para Grafana/Prometheus

---

## 3. Ordem de Implementação

### Entrega 2 — Repositórios e Capacidade
Motivo:
O Veeam ONE possui relatórios e dashboards específicos para capacidade de repositórios, uso de espaço, espaço livre, crescimento, quantidade de restore points e previsão de esgotamento. Isso é central para planejamento de capacidade e prevenção de falha de backup por falta de espaço. :contentReference[oaicite:1]{index=1}

### Entrega 3 — Protected VMs / Cobertura de Proteção
Motivo:
O Veeam ONE usa relatórios de Protected VMs, VM Daily Protection Status e Job Schedule para mostrar VMs protegidas, não protegidas, VMs em múltiplos jobs, idade do último backup e aderência ao RPO. :contentReference[oaicite:2]{index=2}

### Entrega 4 — Alarms
Motivo:
O Veeam ONE trata alarmes como núcleo de detecção de problemas e priorização operacional, com severidade, estado, reconhecimento e resolução. :contentReference[oaicite:3]{index=3}

### Entrega 5 — Infraestrutura Operacional Complementar
Motivo:
O dashboard do Veeam Backup & Replication destaca componentes-chave de infraestrutura; para evoluir a operação, devemos incorporar depois proxies/tape/inventário operacional quando os endpoints estiverem disponíveis e estáveis no ambiente. :contentReference[oaicite:4]{index=4}

---

## 4. Entrega 2 — Repositórios e Capacidade

## 4.1 Escopo

Implementar coleta REST fiel e exporters para:

- Repositories
- Scale-Out Repositories (SOBR)

O Veeam ONE possui visões específicas de:
- capacidade total
- espaço usado
- espaço livre
- restore points
- jobs armazenados
- estimativa de dias restantes
- uso por repositório e por extent em SOBR. :contentReference[oaicite:5]{index=5}

## 4.2 Endpoints a implementar

Usar os endpoints correspondentes da referência REST v2.2 do Veeam ONE para:
- **Repositories**
- **Scale-Out Repositories**

Observação importante:
- Preservar exatamente o payload oficial desses endpoints.
- Não criar DTO de saída para a REST API pública do projeto.
- Se houver paginação/filtro na API oficial, suportar o mesmo comportamento.

## 4.3 Estrutura esperada dos módulos

```text
src/modules/repositories/
  repositories.service.ts
  repositories.controller.ts

src/modules/scaleout-repositories/
  scaleout-repositories.service.ts
  scaleout-repositories.controller.ts

src/exporters/repositories.exporter.ts
``` 

## 4.4 REST API — regra de resposta

Endpoint local sugerido
- GET /api/veeam-one/repositories
- GET /api/veeam-one/scaleout-repositories

Regra de saída
- Retornar o payload original da API oficial
- Sem renomear campos
- Sem enxugar estrutura
- Sem consolidar objetos

```json
{
  "data": "USAR EXATAMENTE O PAYLOAD ORIGINAL DA API OFICIAL"
}
```

Regra prática

Se a API oficial responder com:
- um array → devolver array
- um objeto com results, items, data ou outro nome → devolver igual
- paginação nativa → devolver igual

Não inventar contrato novo.

## 4.5 Métricas Prometheus

Métricas por repositório
- veeam_repository_capacity_bytes
- veeam_repository_used_bytes
- veeam_repository_free_bytes
- veeam_repository_usage_ratio
- veeam_repository_restore_points_total
- veeam_repository_backups_total
- veeam_repository_vms_total
- veeam_repository_days_left_estimate
  
Labels recomendadas
- repository_name
- repository_type
- backup_server
- state

Métricas para SOBR
- veeam_sobr_capacity_bytes
- veeam_sobr_used_bytes
- veeam_sobr_free_bytes
- veeam_sobr_usage_ratio
- veeam_sobr_extents_total

Labels recomendadas
- sobr_name
- backup_server
- performance_tier
- capacity_tier
- archive_tier

Métricas por extent, se o payload permitir
- veeam_sobr_extent_capacity_bytes
- veeam_sobr_extent_used_bytes
- veeam_sobr_extent_free_bytes
- veeam_sobr_extent_usage_ratio

Labels
- sobr_name
- extent_name
- extent_type
- backup_server

## 4.6 Regras de transformação no exporter

O exporter pode:
- converter percentuais para ratio numérico
- converter valores nulos para 0 onde fizer sentido
- calcular usage_ratio = used / capacity
- calcular days_left_estimate somente se existir dado suficiente

O exporter não deve:

- inferir capacidade se não houver base confiável
- fabricar números de tendência sem série histórica

## .7 Prioridade técnica desta entrega

Prioridade alta:

- repositories REST fiel
- scale-out repositories REST fiel
- métricas básicas de capacity/used/free
- métricas de utilização por repositório
- métricas por extent, se disponíveis
