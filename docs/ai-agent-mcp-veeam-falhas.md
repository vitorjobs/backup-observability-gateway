# Aula: agente de IA (MCP) para investigar jobs falhados da Veeam

Este guia mostra uma arquitetura pratica para voce criar um agente de IA, baseado em MCP (Model Context Protocol), que:

1. identifica jobs falhados neste gateway;
2. le o objeto com VMs falhas e mensagens/logs de erro;
3. consulta KBs oficiais da Veeam Backup & Replication;
4. sugere causa raiz, nivel de confianca e plano de resolucao.

## 1) Objetivo funcional do agente

Saida esperada para cada job falhado:

- **resumo executivo** (1-3 linhas);
- **causa provavel**;
- **evidencias** (campos do payload + trechos de log);
- **KBs oficiais correlacionadas** (com link);
- **passos de remediation** em ordem de menor risco;
- **criterio de validacao** (como confirmar que resolveu);
- **acao automatizavel** vs **acao manual**.

## 2) Onde buscar os dados neste projeto

No gateway atual, os jobs sao separados por tipo e expostos em rotas proprias:

- `GET /jobs/vm-backup`
- `GET /jobs/backup-copy`
- `GET /jobs/backup-to-tape`

A implementacao de consulta da API Veeam ONE esta em services dedicados por tipo:

- `src/modules/jobs/vm-backup-jobs.service.ts`
- `src/modules/jobs/backup-copy-jobs.service.ts`
- `src/modules/jobs/backup-to-tape-jobs.service.ts`

Esses services chamam endpoints Veeam ONE REST (`/vbrJobs/...`) com paginacao e retorno bruto para o controller/exporter.

## 3) Arquitetura recomendada (MCP + ferramentas)

Use um agente com **4 tools MCP** principais:

### Tool A: `list_failed_jobs`

Responsabilidade:

- chamar o gateway local (`/jobs/*`),
- normalizar os diferentes tipos de job,
- filtrar status de falha,
- devolver um array compacto com `jobId`, `jobName`, `jobType`, `lastRun`, `status`, `failureHint`.

### Tool B: `get_failed_vm_details`

Responsabilidade:

- para um `jobId`, recuperar os objetos/itens falhados (VMs, objetos protegidos, task sessions),
- retornar campos como:
  - `vmName`
  - `taskState`
  - `errorCode` (quando houver)
  - `errorMessage`
  - `logSnippet`
  - `infrastructureContext` (proxy, repository, transport mode, host, datastore).

> Dica: se algum campo ainda nao estiver exposto pelo gateway, crie rota de enriquecimento em `src/modules/jobs` mantendo o padrao service/controller ja existente.

### Tool C: `search_veeam_kb`

Responsabilidade:

- consultar **somente fontes oficiais** da Veeam (Help Center e KBs),
- usar busca lexical + semantica por assinatura de erro,
- retornar lista ranqueada com:
  - `kbId`
  - `title`
  - `url`
  - `matchedTerms`
  - `confidence`.

### Tool D: `propose_remediation`

Responsabilidade:

- consolidar evidencias do job + VMs + KBs,
- montar diagnostico em formato padrao,
- separar:
  - hipoteses de alta confianca,
  - hipoteses alternativas,
  - checklist de correcoes,
  - rollback/contingencia.

## 4) Fluxo fim a fim (orquestracao)

1. scheduler dispara a cada 5 ou 10 min;
2. agente roda `list_failed_jobs`;
3. para cada job falhado, roda `get_failed_vm_details`;
4. extrai assinaturas: codigos, mensagens e padroes de excecao;
5. roda `search_veeam_kb` com essas assinaturas;
6. roda `propose_remediation`;
7. publica resultado em:
   - ticket (Jira/ServiceNow),
   - Slack/Teams,
   - ou endpoint interno.

## 5) Estrategia de matching de erro (pratica)

Priorize matching nesta ordem:

1. **Error code exato** (maior precisao);
2. **frase canonica de erro** sem ruido (ex.: remover IDs dinamicos);
3. **contexto operacional** (tipo de job, transporte, repository, proxy, hypervisor);
4. **co-ocorrencia** de 2+ sintomas.

Crie um normalizador simples antes da busca em KB:

- remover timestamps, GUIDs, caminhos temporarios;
- reduzir para lowercase;
- manter tokens tecnicos (`vddk`, `cbt`, `rpc`, `timeout`, `immutable`, `sobr`, etc.).

## 6) Prompt/base de decisao do agente

Modelo de instrucao para o agente:

> "Com base em evidencias do job e em KBs oficiais da Veeam, explique causa provavel, alternativas, risco, e plano de remediacao em passos verificaveis. Nao invente KB inexistente. Se a evidencia for fraca, marcar como baixa confianca."

Formato de saida recomendado (JSON):

```json
{
  "job": {
    "id": "...",
    "name": "...",
    "type": "vm-backup"
  },
  "summary": "...",
  "rootCauseHypotheses": [
    {
      "label": "...",
      "confidence": 0.82,
      "evidence": ["..."],
      "kbRefs": ["KBxxxx", "..."]
    }
  ],
  "remediationPlan": [
    {
      "step": 1,
      "action": "...",
      "risk": "baixo",
      "validation": "..."
    }
  ],
  "needsHumanApproval": true
}
```

## 7) Boas praticas de confiabilidade

- **nunca** fechar diagnostico com uma unica evidencia textual;
- exigir no minimo 2 evidencias independentes para alta confianca;
- guardar historico de decisoes do agente para auditoria;
- anexar links das KBs usadas;
- registrar quando a resposta for inferencia (nao fato confirmado);
- definir `SLO` do proprio agente (tempo medio de analise, taxa de sugestao aproveitada).

## 8) Seguranca e governanca

- nao enviar logs completos com dados sensiveis para LLM externo sem mascaramento;
- aplicar redacao de segredos (tokens, chaves, hosts internos);
- usar allowlist de dominios oficiais para KB:
  - `helpcenter.veeam.com`
  - `www.veeam.com/kb*`
- separar permissoes:
  - tool de leitura de jobs (read-only),
  - tool de acao corretiva (quando existir) com aprovacao humana.

## 9) MVP em 3 fases

### Fase 1 (rapida)

- coletar jobs falhados;
- correlacionar com KB por busca textual;
- entregar recomendacao em markdown no Slack.

### Fase 2

- incluir parse de objetos de VM falha + log snippet;
- adicionar score de confianca;
- abrir ticket automaticamente com template padrao.

### Fase 3

- ranking semantico (embeddings) em base local de KBs indexadas;
- memoria de incidentes internos (RAG hibrido: KB oficial + historico da empresa);
- recomendacao de "proxima melhor acao" por tipo de ambiente.

## 10) Exemplo de backlog tecnico para este repo

1. criar `src/modules/jobs/failed-jobs.controller.ts` com rota agregada `/jobs/failed`;
2. criar `src/modules/jobs/failed-jobs.service.ts` para normalizar statuses;
3. adicionar `src/modules/jobs/failed-jobs.types.ts` com contrato estavel para o agente;
4. opcional: adicionar endpoint `/jobs/failed/:id/details` para objetos/VMs/logs;
5. documentar no VitePress em `docs/routes.md` e colecao Postman.

## 11) Como medir resultado

KPIs sugeridos:

- `MTTR` antes/depois do agente;
- `% de jobs falhados com causa classificada automaticamente`;
- `precision@1` da KB sugerida;
- `% de recomendacoes aceitas pelo time sem retrabalho`;
- `tempo medio entre falha e abertura de acao`.

## 12) Conclusao

Voce nao precisa comecar com um agente "autonomo" completo. O caminho mais seguro e:

1. **observabilidade consistente dos jobs falhados**,
2. **correlacao confiavel com KB oficial**,
3. **recomendacoes explicaveis e auditaveis**,
4. **automacao gradual com aprovacao humana**.

Se quiser, o proximo passo e eu te entregar um esqueleto de servidor MCP (tools + schemas) e os contratos TypeScript prontos para plugar neste gateway.
