# Dashboard Panorama Geral - Execucao dos Jobs de Backup

## Escopo

Este documento descreve o dashboard principal provisionado:

- `docker/grafana/dashboards/Panorama Geral dos Jobs de Backup.json`

Objetivo operacional:

- entregar uma visao rapida da saude dos jobs Veeam
- destacar falhas, alertas, jobs sem execucao recente e pressao de volumetria
- separar claramente VMware e Tape para priorizacao no dia a dia

## Leitura Rapida

Antes de entrar painel a painel, use esta sequencia:

1. confira os filtros globais `job_name`, `job_type` e `status`
2. leia os KPIs do topo para entender saude imediata
3. veja as tabelas por status para localizar os jobs afetados
4. use os graficos de tendencia para saber se o problema e pontual ou persistente
5. use os rankings para descobrir quais jobs mais pesam na janela
6. use `Jobs sem Execucao Recente` para localizar jobs parados, fora de janela ou nunca executados

## Convencoes Importantes

- `VMware` usa a identidade visual azul
- `Tape` usa a identidade visual roxa
- `Status` usa cores operacionais: sucesso em verde, alerta em laranja, falha em vermelho, execucao em azul/ciano e idle em cinza
- rankings com `Filtro global` respeitam o time range do Grafana
- rankings com `24h fixas` ignoram o time range e sempre olham o ultimo dia
- em `Jobs sem Execucao Recente`, jobs `Nunca executado` ficam por ultimo na lista

## Variaveis Globais

### `job_name`

- Como ler: filtra o dashboard por um ou mais jobs especificos.
- O que esperar: quando um job e selecionado, todos os paineis passam a refletir so aquele recorte.
- Como usar no dia a dia: use quando o time estiver investigando um job reportado por nome.

### `job_type`

- Como ler: filtra entre `vm_backup`, `backup_to_tape` ou ambos.
- O que esperar: os paineis segmentados ficam muito mais objetivos ao isolar a tecnologia.
- Como usar no dia a dia: use para separar rapidamente incidentes de VMware dos de Tape.

### `status`

- Como ler: filtra o recorte por status conhecido do job.
- O que esperar: as tabelas e paineis relacionados passam a mostrar apenas os status escolhidos.
- Como usar no dia a dia: use para focar em falha, alerta ou idle sem ruido do restante do ambiente.

## Secao: Visao operacional imediata

### Total de Jobs

- Como ler: mostra o total de jobs visiveis no filtro atual.
- O que esperar: serve como base para interpretar todos os outros contadores.
- Como usar no dia a dia: compare com Sucesso, Falha e Idle para entender rapidamente a distribuicao do parque.

### Sucesso Geral

- Como ler: conta quantos jobs estao atualmente em sucesso.
- O que esperar: o ideal e ficar proximo do total de jobs, salvo quando houver jobs desabilitados ou ociosos.
- Como usar no dia a dia: use como principal termometro de estabilidade operacional.

### Alerta Geral

- Como ler: conta jobs em warning.
- O que esperar: qualquer aumento consistente merece atencao, porque warning costuma anteceder falha.
- Como usar no dia a dia: priorize revisao preventiva antes que a degradacao vire incidente.

### Falha Geral

- Como ler: conta jobs em `failed` ou `error`.
- O que esperar: valor acima de zero indica risco operacional imediato.
- Como usar no dia a dia: use para disparar a fila de troubleshooting e escalacao.

### Em Execucao Geral

- Como ler: mostra quantos jobs estao rodando no momento.
- O que esperar: o valor sobe dentro da janela operacional e cai quando os jobs terminam.
- Como usar no dia a dia: correlacione com lentidao, concorrencia e throughput do ambiente.

### Idle Geral

- Como ler: conta jobs em `disabled`, `none` ou `unknown`.
- O que esperar: parte desse volume pode ser normal, mas concentracoes altas pedem revisao.
- Como usar no dia a dia: identifique jobs desabilitados, sem atividade recente ou com cadastro inconsistente.

### Volume Total Transferido (24h)

- Como ler: soma o volume elegivel das ultimas 24h para jobs com status de execucao relevante.
- O que esperar: nao inclui idle nem jobs sem execucao recente.
- Como usar no dia a dia: use como referencia da carga total do ultimo dia.

### Volume VMware (24h)

- Como ler: mostra quanto do volume elegivel veio de jobs VMware.
- O que esperar: ajuda a entender o peso do ambiente virtual na janela recente.
- Como usar no dia a dia: compare com o volume Tape para ver onde esta a maior pressao de dados.

### Volume Tape (24h)

- Como ler: mostra quanto do volume elegivel veio de jobs Tape.
- O que esperar: revela o peso operacional da camada de fita no ultimo dia.
- Como usar no dia a dia: use para entender impacto de retencao, copia para fita e throughput do meio fisico.

### VMware: Sucesso

- Como ler: total de jobs VMware em sucesso.
- O que esperar: o ideal e representar a maior parte dos jobs VMware ativos.
- Como usar no dia a dia: confirme rapidamente se a camada virtual esta saudavel.

### VMware: Falha

- Como ler: total de jobs VMware em falha ou erro.
- O que esperar: qualquer valor acima de zero pede investigacao.
- Como usar no dia a dia: priorize troubleshooting do ambiente virtual quando esse card subir.

### VMware: Em Execucao

- Como ler: total de jobs VMware em execucao.
- O que esperar: sobe durante a janela de backup virtual.
- Como usar no dia a dia: valide concorrencia e pressao de janela em hosts e storage virtual.

### VMware: Idle

- Como ler: total de jobs VMware sem execucao operacional util no momento.
- O que esperar: parte pode ser normal, mas acumulacao pode esconder jobs esquecidos.
- Como usar no dia a dia: revise jobs desabilitados, sem schedule efetivo ou sem execucao recente.

### Tape: Sucesso

- Como ler: total de jobs Tape em sucesso.
- O que esperar: indica estabilidade da operacao em fita.
- Como usar no dia a dia: acompanhe a saude da camada de retencao e copia para fita.

### Tape: Falha

- Como ler: total de jobs Tape em falha ou erro.
- O que esperar: qualquer valor acima de zero merece atencao direta.
- Como usar no dia a dia: priorize verificacoes em drives, media, janelas e politicas de fita.

### Tape: Em Execucao

- Como ler: total de jobs Tape rodando agora.
- O que esperar: varia conforme a janela de copia e retencao.
- Como usar no dia a dia: acompanhe carga ativa da camada Tape e eventuais gargalos.

### Tape: Idle

- Como ler: total de jobs Tape sem atividade operacional util no momento.
- O que esperar: valores altos podem ser normais em janelas fora do horario, mas merecem contexto.
- Como usar no dia a dia: use para revisar jobs parados, desabilitados ou sem execucao recente em fita.

## Secao: Diagnostico operacional por status de job

### Jobs com Sucesso

- Como ler: tabela com uma linha por job em sucesso.
- O que esperar: cada linha mostra nome, tipo, status, ultima execucao, duracao e volume transferido.
- Como usar no dia a dia: confirme quais jobs terminaram saudaveis e use o rodape para medir quantidade total.

### Jobs com Alerta

- Como ler: tabela com uma linha por job em warning.
- O que esperar: traz o recorte de jobs degradados, sem duplicidade.
- Como usar no dia a dia: trate como fila preventiva antes que esses jobs evoluam para falha.

### Jobs com Falha

- Como ler: tabela com uma linha por job em falha.
- O que esperar: esse e o painel tabular principal para incidentes.
- Como usar no dia a dia: comece por aqui quando houver quebra de backup e ordene por ultima execucao ou volume.

### Jobs em Execucao

- Como ler: tabela dos jobs ativos agora.
- O que esperar: os registros oscilam conforme a janela operacional.
- Como usar no dia a dia: acompanhe quem esta rodando e correlacione com lentidao ou saturacao.

### Jobs Idle

- Como ler: tabela dos jobs sem atividade operacional relevante.
- O que esperar: aparecem jobs desabilitados, desconhecidos ou sem execucao observada.
- Como usar no dia a dia: use para localizar gaps de configuracao, jobs esquecidos e ausencia de execucao.

### Top Jobs por Volumetria (24h)

- Como ler: ranking tabular dos jobs com maior volume nas ultimas 24h.
- O que esperar: o topo concentra os jobs que mais movimentaram dados no ultimo dia.
- Como usar no dia a dia: investigue primeiro esses jobs quando houver pressao de rede, storage ou janela.

## Secao: Pontualidade, curvas e anomalias operacionais

### Evolucao do Estado Operacional

- Como ler: curva temporal da contagem de jobs por status.
- O que esperar: mudancas persistentes no mix de sucesso, alerta, falha, execucao e idle mostram degradacao ou recuperacao.
- Como usar no dia a dia: use para diferenciar pico pontual de tendencia operacional.

### Jobs sem Execucao Recente

- Como ler: ranking dos jobs com maior tempo desde a ultima execucao observada, em linguagem amigavel.
- O que esperar: jobs com execucao conhecida mostram `Tempo sem execucao`, `Status` e `Volume transferido`; jobs `Nunca executado` ficam no fim e mostram `N/A` nas colunas complementares.
- Como usar no dia a dia: localize jobs parados, fora de janela, sem schedule efetivo ou nunca executados.

### Duracao Media no Periodo Selecionado x Media Historica

- Como ler: compara a media do periodo filtrado com a media historica reportada pelo exporter.
- O que esperar: quando a media recente sobe acima da historica, ha sinal de lentidao ou mudanca de perfil.
- Como usar no dia a dia: use para detectar degradacao de desempenho antes que ela vire falha.

### Volume Elegivel no Periodo Selecionado

- Como ler: mostra a volumetria elegivel do periodo escolhido, separando total, VMware e Tape.
- O que esperar: o painel acompanha o time range do Grafana, nao uma janela fixa.
- Como usar no dia a dia: use para entender pressao de dados no recorte exato de uma ocorrencia.

## Secao: Rankings operacionais por tecnologia

### VMware: Maiores Volumes (Filtro global)

- Como ler: ranking dos jobs VMware que mais transferiram dados no periodo selecionado.
- O que esperar: o topo concentra os jobs mais pesados do recorte atual.
- Como usar no dia a dia: priorize investigacao de throughput, storage e janela desses jobs.

### VMware: Maiores Duracoes (Filtro global)

- Como ler: ranking dos jobs VMware mais longos no periodo selecionado.
- O que esperar: os primeiros itens tendem a alongar a janela de backup virtual.
- Como usar no dia a dia: use para identificar jobs que mais pressionam hosts, proxies e repositosrios.

### Tape: Maiores Volumes (Filtro global)

- Como ler: ranking dos jobs Tape com maior volume no periodo selecionado.
- O que esperar: revela quais cargas pressionaram mais a camada de fita.
- Como usar no dia a dia: acompanhe jobs que exigem mais midia, throughput e tempo de copia.

### Tape: Maiores Duracoes (Filtro global)

- Como ler: ranking dos jobs Tape mais longos no periodo selecionado.
- O que esperar: o topo tende a representar maior impacto na janela de fita.
- Como usar no dia a dia: identifique primeiro os jobs que mais prolongam a operacao em Tape.

### VMware: Maiores Volumes (24h fixas)

- Como ler: ranking fixo do ultimo dia, independente do time range do browser.
- O que esperar: ideal para leitura diaria padronizada.
- Como usar no dia a dia: compare dias consecutivos sem depender do filtro global do Grafana.

### VMware: Maiores Duracoes (24h fixas)

- Como ler: ranking fixo dos jobs VMware mais longos nas ultimas 24h.
- O que esperar: revela rapidamente quem mais alongou a janela recente.
- Como usar no dia a dia: use em rotinas matinais para revisar o ultimo ciclo operacional.

### Tape: Maiores Volumes (24h fixas)

- Como ler: ranking fixo dos jobs Tape com maior volume no ultimo dia.
- O que esperar: mostra a carga recente da camada de fita com leitura padronizada.
- Como usar no dia a dia: acompanhe a pressao diaria de retencao e copia para fita.

### Tape: Maiores Duracoes (24h fixas)

- Como ler: ranking fixo dos jobs Tape mais longos nas ultimas 24h.
- O que esperar: destaca rapidamente os jobs que mais consumiram a janela de fita.
- Como usar no dia a dia: use para identificar gargalos recorrentes na operacao diaria.

## Secao: Paineis a serem trabalhados

### Jobs com Recorrencia/Persistencia de Falha (7d)

- Como ler: ranking dos jobs com maior quantidade de amostras em falha nos ultimos 7 dias.
- O que esperar: leia este painel como proxy de persistencia em falha, nao como numero exato de retries ou execucoes falhas.
- Como usar no dia a dia: mantenha como painel de referencia para revisao futura, sem usar como contador oficial de recorrencia.

## Boas Praticas De Operacao

- comece sempre pelos KPIs do topo e pela tabela `Jobs com Falha`
- use `Jobs sem Execucao Recente` para revisar backlog operacional e jobs esquecidos
- compare `Filtro global` e `24h fixas` para separar anomalia do recorte atual de comportamento diario
- quando houver lentidao, cruze `Duracao Media...`, `Jobs em Execucao` e rankings por duracao
- quando houver pressao de dados, cruze `Volume Elegivel...`, `Top Jobs por Volumetria (24h)` e rankings por volume
- use o filtro `job_type` para separar imediatamente VMware e Tape durante incidentes

## Resultado Esperado Em Operacao

Ao usar esse dashboard corretamente, o operador deve conseguir:

- saber em menos de um minuto se o ambiente esta saudavel ou degradado
- localizar rapidamente os jobs em falha, warning ou sem execucao recente
- entender se o problema e pontual, recorrente ou tendencia
- identificar quais jobs mais pesam em volume e duracao
- separar claramente problemas de VMware e de Tape
