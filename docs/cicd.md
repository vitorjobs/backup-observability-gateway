# CI/CD

## Objetivo

O projeto usa GitHub Actions para validar e publicar a documentacao VitePress do diretorio `docs/`.

## Branch Da Verdade

A branch de verdade do projeto e a `main`.

Toda nova branch deve nascer da `main` atualizada.

## Fluxo Oficial

1. Atualizar o projeto com a `main` remota.
2. Criar uma nova branch partindo da `main` atualizada.
3. Executar a codificacao na branch nova.
4. Fazer `add` e `commit` das alteracoes.
5. Publicar a branch no remoto.
6. Abrir Pull Request da branch nova para a `main`.
7. Aguardar o CI rodar no Pull Request.
8. Revisar e fazer o merge na `main`.
9. Esperar o CD rodar apos o merge em `main`.
10. Voltar a IDE para a branch `main` e atualizar o codigo local com a versao do repositorio online.

## Padrao De Nome De Branch

- `feature/nome-da-feature`
- `hotfix/nome-do-ajuste`
- `chore/nome-do-ajuste`

## Fluxo Completo Com Comandos

Substitua:

- `feature/minha-feature` pelo nome real da branch
- `feat: descreva a feature` pela mensagem real do commit
- `feat: titulo do PR` pelo titulo real do Pull Request

### 1. Atualizar a `main` local com a `main` remota

```bash
git switch main
git pull origin main
```

### 2. Criar a nova branch a partir da `main` atualizada

```bash
git switch -c feature/minha-feature
```

### 3. Codificar na nova branch

Fazer normalmente as alteracoes necessarias no codigo.

### 4. Conferir o que mudou

```bash
git status
```

### 5. Adicionar os arquivos alterados

Opcao recomendada:

```bash
git add <arquivos-alterados>
```

Se quiser adicionar tudo:

```bash
git add .
```

### 6. Criar o commit

```bash
git commit -m "feat: descreva a feature"
```

### 7. Publicar a branch no remoto

```bash
git push -u origin feature/minha-feature
```

### 8. Abrir Pull Request da branch nova para a `main`

Opcao padrao do time:

- abrir no GitHub o PR `feature/minha-feature -> main`

Opcao por linha de comando, se `gh` estiver instalado e autenticado:

```bash
gh pr create --base main --head feature/minha-feature --title "feat: titulo do PR" --body "Resumo da feature"
```

## Quando O CI Roda

O CI da documentacao roda automaticamente quando o Pull Request para `main` e:

- aberto
- atualizado com novos commits
- reaberto

O CI valida:

- `npm ci`
- `npm run docs:build`

## Merge Na `main`

Depois da aprovacao do Pull Request:

Opcao padrao do time:

- aprovar e fazer merge do PR no GitHub

Opcao por linha de comando, se `gh` estiver instalado e autenticado:

```bash
gh pr merge --merge --delete-branch
```

## Quando O CD Roda

Depois do merge em `main`, o CD roda automaticamente.

O deploy publica a documentacao no GitHub Pages.

## Atualizar O Codigo Local Apos O Merge Em `main`

Assim que o Pull Request for merged em `main`, execute:

```bash
git switch main
git pull origin main
git fetch --prune origin
```

Se a branch local da feature ainda existir e voce quiser remove-la:

```bash
git branch -d feature/minha-feature
```

Se a branch remota nao tiver sido apagada no merge e voce quiser remove-la:

```bash
git push origin --delete feature/minha-feature
```

## Resultado Esperado Ao Final

- a sua IDE termina na branch `main`
- o codigo local fica igual ao da `main` remota
- o CI foi executado no Pull Request
- o CD foi executado depois do merge em `main`
- a proxima feature deve nascer novamente da `main`

## Resumo Rapido De Comandos

### Inicio da feature

```bash
git switch main
git pull origin main
git switch -c feature/minha-feature
git status
git add <arquivos-alterados>
git commit -m "feat: descreva a feature"
git push -u origin feature/minha-feature
```

### Depois do merge em `main`

```bash
git switch main
git pull origin main
git fetch --prune origin
git branch -d feature/minha-feature
```

## Regras Importantes

- nunca criar feature a partir de outra feature
- nunca criar feature a partir de branch desatualizada
- nunca abrir Pull Request da feature para outra branch que nao seja `main`
- nunca deixar a IDE parada na branch de feature depois do merge
- sempre atualizar a `main` local depois do merge em `main`

## Requisitos No GitHub

Para o fluxo ficar realmente protegido no repositorio, mantenha estas configuracoes no GitHub:

- GitHub Pages com source em `GitHub Actions`
- branch protection em `main`
- bloqueio de push direto em `main`
- exigencia de Pull Request antes do merge em `main`
- exigencia do workflow de CI como check obrigatorio
