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
5. Depois do merge em `develop`, atualizar a sua maquina local e voltar a IDE para `main`.
6. Quando voce decidir promover a versao, abrir manualmente um Pull Request de `develop` para `main`.
7. Fazer o merge final em `main`.
8. O deploy da documentacao acontece automaticamente quando o merge chega em `main`.

Padrao recomendado para nome de branch:

- `feature/nome-da-feature`
- `hotfix/nome-do-ajuste`
- `chore/nome-do-ajuste`

## Padrao Para Novas Features

Toda nova feature deve seguir exatamente esta sequencia.

Substitua os valores abaixo:

- `feature/minha-feature` pelo nome real da branch
- `feat: descreva a feature` pela mensagem real do commit
- `feat: titulo do PR` pelo titulo real do Pull Request

### 1. Atualizar a `main` local e criar a nova branch

```bash
git switch main
git pull origin main
git switch -c feature/minha-feature
```

### 2. Fazer as alteracoes, adicionar arquivos e criar o commit

```bash
git status
git add <arquivos-alterados>
git commit -m "feat: descreva a feature"
```

Se quiser adicionar tudo de uma vez:

```bash
git add .
git commit -m "feat: descreva a feature"
```

### 3. Publicar a branch no remoto

```bash
git push -u origin feature/minha-feature
```

### 4. Abrir o Pull Request da feature para `develop`

Opcao padrao do time:

- abrir no GitHub o PR `feature/minha-feature -> develop`

Opcao por linha de comando, se `gh` estiver instalado e autenticado:

```bash
gh pr create --base develop --head feature/minha-feature --title "feat: titulo do PR" --body "Resumo da feature"
```

O CI da documentacao roda automaticamente nesse PR.

### 5. Aguardar revisao e fazer o merge em `develop`

Opcao padrao do time:

- aprovar e fazer merge do PR no GitHub

Opcao por linha de comando, se `gh` estiver instalado e autenticado:

```bash
gh pr merge --merge --delete-branch
```

### 6. Depois do merge em `develop`, atualizar a maquina local e voltar para `main`

```bash
git switch main
git pull origin main
git fetch --prune origin
git branch -d feature/minha-feature
```

Se a branch remota ainda nao tiver sido apagada no merge:

```bash
git push origin --delete feature/minha-feature
```

### 7. Quando voce quiser promover `develop` para `main`

Opcao padrao do time:

- abrir manualmente no GitHub o PR `develop -> main`

Opcao por linha de comando, se `gh` estiver instalado e autenticado:

```bash
gh pr create --base main --head develop --title "release: promote develop to main" --body "Promocao manual de develop para main"
```

### 8. Fazer o merge do PR `develop -> main`

Opcao padrao do time:

- aprovar e fazer merge do PR no GitHub

Opcao por linha de comando, se `gh` estiver instalado e autenticado:

```bash
gh pr merge --merge
```

### 9. Atualizar o codigo local com a `main` do repositorio

```bash
git switch main
git pull origin main
git fetch --prune origin
```

Resultado esperado ao final:

- o repositorio local termina na branch `main`
- o codigo aberto na IDE reflete a `main` mais recente do remoto
- a proxima feature nasce novamente da `main`

### 10. Resumo rapido de comandos Git

Inicio da feature:

```bash
git switch main
git pull origin main
git switch -c feature/minha-feature
git add <arquivos-alterados>
git commit -m "feat: descreva a feature"
git push -u origin feature/minha-feature
```

Depois do merge em `develop`:

```bash
git switch main
git pull origin main
git fetch --prune origin
git branch -d feature/minha-feature
```

Depois do merge em `main`:

```bash
git switch main
git pull origin main
git fetch --prune origin
```

Checklist rapido:

- nunca criar feature a partir de `develop`
- nunca abrir feature direto para `main`
- nunca continuar a proxima feature em cima da branch anterior
- sempre voltar para `main` ao final do ciclo

## Acoes Pos-Merge

### Depois do merge do PR para `develop`

Assim que o Pull Request da branch de trabalho for aprovado e merged em `develop`, execute:

```bash
git switch main
git pull origin main
```

Se quiser limpar a branch local ja finalizada:

```bash
git branch -d feature/minha-feature
```

Resultado esperado:

- a sua IDE termina posicionada na branch `main`
- a proxima branch nova continua nascendo da `main`

### Depois do merge manual de `develop` para `main`

Quando voce mesmo concluir o PR de `develop` para `main`, atualize a sua maquina local com:

```bash
git switch main
git pull origin main
```

Resultado esperado:

- a branch `main` local fica sincronizada com o repositorio remoto
- o codigo atual da sua IDE passa a refletir o estado mais recente publicado

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
