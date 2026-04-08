# CI/CD

## Objetivo

O projeto usa GitHub Actions para validar e publicar a documentacao VitePress do diretorio `docs/`.

## Estrategia de Branches

A branch base para iniciar qualquer novo trabalho continua sendo a `main`.

Fluxo padrao:

1. Criar uma branch de feature a partir de `main`.
2. Abrir Pull Request da branch de trabalho para `develop`.
3. O CI da documentacao roda nesse Pull Request.
4. Revisar e fazer merge em `develop`.
5. Quando voce decidir promover a versao, abrir manualmente um Pull Request de `develop` para `main`.
6. Fazer o merge final em `main`.
7. O deploy da documentacao acontece automaticamente quando o merge chega em `main`.

Padrao recomendado para nome de branch:

- `feature/nome-da-feature`
- `hotfix/nome-do-ajuste`
- `chore/nome-do-ajuste`

## Comandos Recomendados

Criar nova branch sempre a partir da `main`:

```bash
git switch main
git pull origin main
git switch -c feature/minha-feature
```

Promocao para a branch intermediaria:

```bash
git push -u origin feature/minha-feature
```

Depois disso:

- abrir PR da branch atual para `develop`
- depois do merge em `develop`, a promocao para `main` fica manual e feita por voce

## O Que O CI Valida

Nos Pull Requests:

- o CI roda em Pull Requests com destino `develop`
- `npm ci`
- `npm run docs:build`

No merge para `main`:

- a documentacao e publicada no GitHub Pages

## Requisitos no GitHub

Para o fluxo ficar realmente protegido no repositorio, mantenha estas configuracoes no GitHub:

- GitHub Pages com source em `GitHub Actions`
- branch protection em `develop`
- branch protection em `main`
- bloqueio de push direto em `develop` e `main`
- exigencia de Pull Request antes do merge, principalmente para `develop`
- exigencia dos workflows de CI como checks obrigatorios

## Observacao

`develop` e a branch intermediaria obrigatoria para o fluxo do time.
