# Plano de Acao — CI/CD e Deploy Seguro

## Objetivo

Reduzir risco de deploy quebrado em `main`, garantindo validacao tecnica antes do deploy e fluxo operacional seguro para o time.

## Riscos Identificados

1. O workflow de deploy nao bloqueia por testes/build da aplicacao.
2. `docker compose up -d` local falha com `unauthorized` no GHCR sem login.
3. Ha muitas mudancas acumuladas, elevando risco de push direto em `main`.

## Plano de Execucao

### 1) Inserir "quality gate" no GitHub Actions

- Adicionar job `quality-gate` no workflow de deploy.
- Rodar:
  - `npm ci`
  - `npm test`
  - `npm run build`
- Fazer `build-and-push` depender de `quality-gate`.
- Fazer `deploy` depender de `build-and-push`.

**Status:** Concluido

### 2) Definir procedimento para uso local com GHCR

- Para subir stack completa localmente:
  - `docker login ghcr.io`
  - usar usuario GitHub + token com `read:packages`
- Para desenvolvimento local sem imagem privada:
  - subir apenas infra: `docker compose up -d db storage`
  - rodar app com `npm run dev`

**Status:** Concluido

### 3) Politica de push seguro

- Nao fazer push direto em `main` para pacote grande de mudancas.
- Fluxo recomendado:
  1. branch de trabalho
  2. commits pequenos por escopo
  3. PR
  4. merge em `main` (dispara deploy)

**Status:** Concluido (processo definido)

## Evidencias de Execucao

- Validacao local apos ajustes:
  - `npm test` passando
  - `npm run build` passando
- Workflow de deploy atualizado para bloquear deploy sem quality gate.

## Proximos Passos Recomendados

1. Ativar branch protection em `main` exigindo checks do workflow.
2. Criar workflow dedicado de CI para PR (`pull_request`) com os mesmos gates.
3. Fatiar o conjunto atual de mudancas em commits menores antes do push.
