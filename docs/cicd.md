# CI/CD

## Objetivo

O projeto usa GitHub Actions para validar e publicar a documentacao VitePress do diretorio `docs/`.

## Estrategia de Branches

A branch de verdade para iniciar qualquer novo trabalho e sempre a `main`.

Fluxo padrao:

1. Criar uma branch de feature a partir de `main`.
2. Abrir Pull Request da `feature/*` para `develop`.
3. Validar a documentacao no CI e revisar o PR.
4. Fazer merge em `develop`.
5. Abrir Pull Request de `develop` para `main`.
6. Fazer o merge final em `main`.
7. O deploy da documentacao acontece automaticamente quando o merge chega em `main`.

Padrao recomendado para nome de branch:

- `feature/nome-da-feature`
- `hotfix/nome-do-ajuste`

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

- abrir PR de `feature/minha-feature` para `develop`
- apos homologacao, abrir PR de `develop` para `main`

## O Que O CI Valida

Nos Pull Requests:

- PR para `develop` deve sair de `feature/*` ou `hotfix/*`
- PR para `main` deve sair de `develop`
- `npm ci`
- `npm run docs:build`

No merge para `develop`:

- a documentacao e recompilada para validar o resultado integrado

No merge para `main`:

- a documentacao e publicada no GitHub Pages

## Requisitos no GitHub

Para o fluxo ficar realmente protegido no repositorio, mantenha estas configuracoes no GitHub:

- GitHub Pages com source em `GitHub Actions`
- branch protection em `develop`
- branch protection em `main`
- bloqueio de push direto em `develop` e `main`
- exigencia de Pull Request antes do merge
- exigencia dos workflows de CI como checks obrigatorios

## Observacao

Este projeto assume `develop` como branch intermediaria.
