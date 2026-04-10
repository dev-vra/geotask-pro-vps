# GeoTask Pro — Sistema de Gestao de Tarefas | GeoGis

> Sistema de gestao de tarefas georreferenciadas para operacoes em campo, contratos, equipes e setores.

| Revisao | Data       | Observacoes    |
|---------|------------|----------------|
| 00      | 2025-03-30 | Elaboracao     |

| Responsavel       | Funcao               | Papel          |
|-------------------|----------------------|----------------|
| Vinicios Araujo   | Analista de Processos| Elaboracao     |

---

## Indice

1. [Visao Geral](#1-visao-geral)
2. [Stack Tecnologica](#2-stack-tecnologica)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Pre-requisitos](#4-pre-requisitos)
5. [Instalacao e Configuracao](#5-instalacao-e-configuracao)
6. [Variaveis de Ambiente](#6-variaveis-de-ambiente)
7. [Banco de Dados](#7-banco-de-dados)
8. [API Routes](#8-api-routes)
9. [Sistema de Permissoes (RBAC)](#9-sistema-de-permissoes-rbac)
10. [Funcionalidades](#10-funcionalidades)
11. [Storage de Arquivos](#11-storage-de-arquivos)
12. [Deploy Atual — Vercel + Supabase](#12-deploy-atual--vercel--supabase)
13. [Deploy Futuro — AWS](#13-deploy-futuro--aws)
14. [Manutencao](#14-manutencao)
15. [Seguranca](#15-seguranca)
16. [Logs e Monitoramento](#16-logs-e-monitoramento)
17. [Contribuicao](#17-contribuicao)

---

## 1. Visao Geral

**Nome do sistema:** GeoTask Pro (Modulo de Gestao de Tarefas — GeoGis)

**Descricao:** Aplicacao web full-stack para gestao de tarefas com foco em operacoes georreferenciadas de Regularizacao Fundiaria Urbana (REURB). Permite gerenciamento de tarefas por contrato, cidade, bairro, setor e equipe, com sistema de permissoes granular por cargo.

**Arquitetura:** Aplicacao monolitica Next.js (SSR + API Routes) — frontend e backend no mesmo projeto.

**Publico-alvo:** Diretoria, Gerentes, Coordenadores de Setores/Polos, Gestores e Colaboradores de operacao.

### Principais Capacidades

- **Kanban Board** — Visualizacao e movimentacao de tarefas por status
- **Dashboard** — Metricas e graficos de desempenho por setor, equipe e responsavel
- **Cronograma** — Visualizacao temporal de tarefas com prazos
- **Mind Map** — Visualizacao hierarquica de tarefas (Contrato > Cidade > Bairro > Tarefas)
- **Lista** — Tabela com filtros avancados e exportacao (Excel/PDF)
- **Templates** — Modelos de tarefas reutilizaveis com subtarefas
- **Notificacoes** — Sistema de mencoes e alertas em tempo real (SSE)
- **Log de Atividades** — Auditoria completa de acoes no sistema com IP
- **Gestao de Equipes** — Times/Polos com membros vinculados
- **Multi-setor** — Coordenadores podem gerenciar multiplos setores
- **Anexos** — Upload de imagens e PDFs vinculados a tarefas (local, Supabase ou S3)
- **Relatorios IA** — Geracao de relatorios com analise via XAI/Grok
- **Controle de Tempo** — Tracking de tempo gasto por tarefa com pausas

---

## 2. Stack Tecnologica

| Camada           | Tecnologia             | Versao   |
|------------------|------------------------|----------|
| Framework        | Next.js (App Router)   | 16.x     |
| Frontend         | React                  | 19.x     |
| Linguagem        | TypeScript             | 5.x      |
| Estilizacao      | Tailwind CSS           | 4.x      |
| ORM              | Prisma                 | 5.22+    |
| Banco de Dados   | PostgreSQL             | 15+      |
| State Management | Zustand                | 5.x      |
| Data Fetching    | SWR                    | 2.x      |
| Validacao        | Zod                    | 3.x      |
| Graficos         | Recharts               | 3.x      |
| Icones           | Lucide React           | 0.574+   |
| Export Excel     | ExcelJS                | 4.x      |
| Export PDF       | jsPDF + jsPDF-AutoTable| 4.x/5.x  |
| Autenticacao     | bcryptjs (hash)        | 3.x      |
| IA               | OpenAI SDK (XAI/Grok)  | 6.x      |
| Testes           | Vitest                 | 4.x      |
| Runtime          | Node.js                | 20+      |
| Containerizacao  | Docker (multi-stage)   | —        |

---

## 3. Arquitetura do Sistema

```
                    ┌─────────────────────────────────────┐
                    │          USUARIO (Browser)           │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS
                    ┌──────────────▼──────────────────────┐
                    │      Next.js (SSR + API Routes)      │
                    │                                      │
                    │  ┌─────────┐    ┌─────────────────┐  │
                    │  │ React   │    │ API /api/*       │  │
                    │  │ Frontend│    │ (28+ endpoints)  │  │
                    │  └─────────┘    └────────┬────────┘  │
                    │                          │           │
                    └──────────────────────────┼───────────┘
                                               │
                    ┌──────────────────────────▼───────────┐
                    │          PostgreSQL (Prisma)          │
                    │     22 models / 13+ migrations        │
                    └──────────────────────────────────────┘
                                               │
                    ┌──────────────────────────▼───────────┐
                    │       Storage (Local / Supabase / S3) │
                    │     Uploads de imagens e PDFs         │
                    └──────────────────────────────────────┘
```

**Fluxo de Autenticacao:**
1. Usuario envia email + senha para `POST /api/auth/login`
2. API valida credenciais com bcryptjs contra hash no banco
3. Retorna dados do usuario com role, setor, time e permissoes
4. Frontend armazena no Zustand store + localStorage (`geotask_user`)
5. Todas requisicoes incluem header `X-User-Id` para identificacao
6. Middleware valida presenca do header em rotas protegidas

**Atualizacoes em Tempo Real:**
- Server-Sent Events (SSE) via `GET /api/events?userId={id}`
- Eventos: `TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`, `NOTIFICATIONS_UPDATED`
- Heartbeat a cada 15 segundos

---

## 4. Pre-requisitos

| Software    | Versao Minima | Uso                        |
|-------------|---------------|----------------------------|
| Node.js     | 20+           | Runtime da aplicacao       |
| npm         | 9+            | Gerenciador de pacotes     |
| PostgreSQL  | 15+           | Banco de dados             |
| Docker      | 24+           | Containerizacao (opcional) |
| Git         | 2.x           | Controle de versao         |

---

## 5. Instalacao e Configuracao

### 5.1 Desenvolvimento Local (sem Docker)

```bash
# 1. Clonar repositorio
git clone <url-do-repo>
cd geotask-pro

# 2. Instalar dependencias
npm install

# 3. Configurar ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais (ver secao 6)

# 4. Gerar Prisma Client
npx prisma generate

# 5. Executar migrations no banco
npx prisma migrate dev

# 6. Seed de roles padroes
npx tsx prisma/seed_roles_v2.ts

# 7. Iniciar servidor de desenvolvimento
npm run dev
# Acesso: http://localhost:3000
```

### 5.2 Desenvolvimento Local (com Docker)

```bash
# 1. Clonar e configurar
git clone <url-do-repo>
cd geotask-pro
cp .env.example .env.local
# Editar .env.local (DATABASE_URL deve apontar para o container)
# DATABASE_URL="postgresql://postgres:SUA_SENHA@127.0.0.1:5433/geotask-pro"

# 2. Subir banco PostgreSQL
docker-compose up -d db

# 3. Instalar deps e rodar migrations
npm install
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed_roles_v2.ts

# 4. Iniciar aplicacao
npm run dev
```

### 5.3 Producao (Docker completo)

```bash
# Build da imagem
docker build -t geotask-pro .

# Executar
docker run -p 3000:3000 --env-file .env.local geotask-pro

# Ou com docker-compose (inclui PostgreSQL)
docker-compose up -d
```

---

## 6. Variaveis de Ambiente

Arquivo: `.env.local` (nunca commitar)

### Obrigatorias

| Variavel            | Descricao                                      | Exemplo                                          |
|---------------------|-------------------------------------------------|--------------------------------------------------|
| `DATABASE_URL`      | Connection string PostgreSQL (pooled)           | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `DIRECT_URL`        | Connection string direta (para migrations)      | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET`        | Chave secreta para sessoes. Gerar: `openssl rand -base64 32` | `abc123...` |
| `CRON_SECRET`       | Chave para proteger endpoints cron/admin        | `xyz789...` |
| `DEFAULT_USER_PASSWORD` | Senha padrao para novos usuarios (alterar no 1o acesso) | `Mudar@123` |

### Opcionais — Supabase (ambiente atual)

| Variavel                      | Descricao                          |
|-------------------------------|------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`    | URL do projeto Supabase            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anonima Supabase          |
| `SUPABASE_STORAGE_BUCKET`     | Nome do bucket (padrao: `task-attachments`) |

### Opcionais — AWS (deploy futuro)

| Variavel                | Descricao                                    |
|-------------------------|----------------------------------------------|
| `AWS_S3_BUCKET`         | Nome do bucket S3 para uploads               |
| `AWS_REGION`            | Regiao AWS (ex: `sa-east-1`)                 |
| `AWS_CLOUDFRONT_DOMAIN` | Dominio CloudFront para servir uploads (CDN) |

### Opcionais — IA

| Variavel      | Descricao                                |
|---------------|------------------------------------------|
| `XAI_API_KEY` | API key do XAI (Grok) para relatorios IA |

### Prioridade do Storage

O sistema detecta automaticamente qual backend usar:
1. Se `AWS_S3_BUCKET` + `AWS_REGION` configurados → **AWS S3**
2. Se `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurados → **Supabase Storage**
3. Se nenhum configurado → **Filesystem local** (`/public/uploads/`)

---

## 7. Banco de Dados

### 7.1 Tecnologia

- **PostgreSQL 15+** via Prisma ORM
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`

### 7.2 Models (22 tabelas)

| Model            | Descricao                                        |
|------------------|--------------------------------------------------|
| `User`           | Usuarios com role, setor, time, status ativo     |
| `Role`           | Cargos com permissoes JSON (RBAC)                |
| `Sector`         | Setores/departamentos                            |
| `Team`           | Times/Polos                                      |
| `UserSector`     | N:N — coordenadores com multiplos setores        |
| `Task`           | Tarefas com status, prioridade, geoloc, tempo    |
| `Subtask`        | Subtarefas vinculadas a tarefas                  |
| `TaskUser`       | N:N — colaboradores em tarefas                   |
| `TaskHistory`    | Auditoria: cada campo alterado com old/new       |
| `TaskPause`      | Pausas/retomadas para tracking de tempo          |
| `TaskAttachment` | Arquivos anexados (imagens, PDFs)                |
| `TaskType`       | Tipos de tarefa por setor                        |
| `Template`       | Templates de tarefas reutilizaveis               |
| `TemplateTask`   | Tarefas dentro de templates                      |
| `TemplateSubtask`| Subtarefas dentro de template tasks              |
| `Comment`        | Comentarios em tarefas                           |
| `Mention`        | Mencoes @usuario e @setor em comentarios         |
| `Notification`   | Notificacoes in-app                              |
| `Contract`       | Contratos de servico                             |
| `City`           | Cidades                                          |
| `Neighborhood`   | Bairros (vinculados a cidade + contrato)         |
| `ActivityLog`    | Log global de acoes com IP                       |

### 7.3 Relacionamentos Principais

```
Contract ──┬── Neighborhood ──── City
           │
Task ──────┼── User (responsible)
           ├── User (created_by)
           ├── Sector
           ├── Team
           ├── TaskUser[] (coworkers)
           ├── Subtask[]
           ├── TaskHistory[]
           ├── TaskPause[]
           ├── TaskAttachment[]
           ├── Comment[] ── Mention[]
           └── Task (parent) ── Task[] (children)

User ──────┼── Role (permissions JSON)
           ├── Sector
           ├── Team
           └── UserSector[] (multi-setor)
```

### 7.4 Comandos Uteis

```bash
# Gerar Prisma Client apos alterar schema
npx prisma generate

# Criar migration apos alterar schema
npx prisma migrate dev --name descricao_da_alteracao

# Aplicar migrations em producao
npx prisma migrate deploy

# Seed de roles padrao
npx tsx prisma/seed_roles_v2.ts

# Seed completo (contratos, cidades, bairros)
npx tsx seed.ts

# Abrir Prisma Studio (interface visual do banco)
npx prisma studio
```

---

## 8. API Routes

Todas as rotas estao em `src/app/api/`. Rotas protegidas exigem header `X-User-Id`.

### Autenticacao

| Metodo | Rota                        | Descricao                     | Protegida |
|--------|-----------------------------|-------------------------------|-----------|
| POST   | `/api/auth/login`           | Login (email + senha)         | Nao       |
| GET    | `/api/auth/me`              | Validar sessao do usuario     | Nao       |
| POST   | `/api/auth/change-password` | Alterar senha                 | Sim       |

### Tarefas

| Metodo | Rota                              | Descricao                              |
|--------|-----------------------------------|----------------------------------------|
| GET    | `/api/tasks`                      | Listar tarefas (filtros, paginacao)    |
| POST   | `/api/tasks`                      | Criar tarefa                           |
| PATCH  | `/api/tasks`                      | Atualizar tarefa                       |
| DELETE | `/api/tasks`                      | Excluir tarefa                         |
| GET    | `/api/tasks/history`              | Historico de alteracoes                |
| GET    | `/api/tasks/{id}/attachments`     | Listar anexos                          |
| POST   | `/api/tasks/{id}/attachments`     | Upload de arquivo (max 10MB)           |
| DELETE | `/api/tasks/{id}/attachments`     | Remover anexo                          |

### Usuarios e Administracao

| Metodo | Rota                   | Descricao                          |
|--------|------------------------|------------------------------------|
| GET    | `/api/users`           | Listar usuarios                    |
| POST   | `/api/users`           | Criar usuario                      |
| PATCH  | `/api/users`           | Atualizar usuario                  |
| POST   | `/api/users/import`    | Importar usuarios (bulk Excel)     |
| GET    | `/api/roles`           | Listar cargos                      |
| PUT    | `/api/roles`           | Atualizar permissoes do cargo      |
| GET    | `/api/sectors`         | Listar setores                     |
| POST   | `/api/sectors`         | Criar setor                        |
| PUT    | `/api/sectors`         | Atualizar setor                    |
| GET    | `/api/teams`           | Listar times/polos                 |
| POST   | `/api/teams`           | Criar time                         |
| PUT    | `/api/teams`           | Atualizar time                     |
| GET    | `/api/user-sectors`    | Listar associacoes usuario-setor   |
| POST   | `/api/user-sectors`    | Associar usuario a setor           |
| GET    | `/api/task-types`      | Listar tipos de tarefa             |
| POST   | `/api/task-types`      | Criar tipo de tarefa               |
| PUT    | `/api/task-types`      | Atualizar tipo de tarefa           |

### Localizacoes

| Metodo | Rota                   | Descricao              |
|--------|------------------------|------------------------|
| GET    | `/api/cities`          | Listar cidades         |
| POST   | `/api/cities`          | Criar cidade           |
| PUT    | `/api/cities`          | Atualizar cidade       |
| GET    | `/api/neighborhoods`   | Listar bairros         |
| POST   | `/api/neighborhoods`   | Criar bairro           |
| PUT    | `/api/neighborhoods`   | Atualizar bairro       |
| GET    | `/api/contracts`       | Listar contratos       |
| POST   | `/api/contracts`       | Criar contrato         |
| PUT    | `/api/contracts`       | Atualizar contrato     |

### Recursos Especiais

| Metodo | Rota                         | Descricao                                 |
|--------|------------------------------|-------------------------------------------|
| GET    | `/api/comments`              | Listar comentarios de uma tarefa          |
| POST   | `/api/comments`              | Criar comentario (com mencoes)            |
| GET    | `/api/notifications`         | Notificacoes do usuario                   |
| PATCH  | `/api/notifications`         | Marcar como lida(s)                       |
| GET    | `/api/activity-log`          | Log global de auditoria                   |
| GET    | `/api/lookups`               | Dados de dropdowns (cidades, setores etc) |
| GET    | `/api/events`                | SSE — atualizacoes em tempo real          |
| GET    | `/api/dashboard/stats`       | Metricas do dashboard                     |
| GET    | `/api/templates`             | Listar templates                          |
| POST   | `/api/templates`             | Criar template                            |
| DELETE | `/api/templates`             | Excluir template                          |
| POST   | `/api/reports/weekly`        | Gerar relatorio semanal                   |
| POST   | `/api/ai/analyze`            | Gerar relatorio com IA (XAI/Grok)        |
| GET    | `/api/cron/late-tasks`       | Cron: detectar tarefas atrasadas (secret) |
| GET    | `/api/admin/recalculate-time`| Recalcular time_spent (secret)            |
| GET    | `/api/setup`                 | Status de setup inicial                   |

---

## 9. Sistema de Permissoes (RBAC)

### 9.1 Cargos

| Cargo                  | Nome UI  | Nivel de Acesso                          |
|------------------------|----------|------------------------------------------|
| Admin                  | Gestor   | Acesso total ao sistema                  |
| Gerente                | Gerente  | Acesso total exceto gerenciar roles      |
| Socio                  | Socio    | Visualiza todos os setores (somente leitura) |
| Diretor                | Diretor  | Visualiza e cria tarefas em todos os setores |
| GM                     | GM       | Visualiza tudo + log de atividades       |
| Coordenador de Setores | —        | Gerencia setores vinculados              |
| Coordenador de Polo    | —        | Gerencia apenas seu time/polo            |
| Gestor (REURB)         | —        | Cria e gerencia tarefas do seu setor     |
| Liderado               | —        | Ve apenas tarefas atribuidas a ele       |

### 9.2 Categorias de Permissao

**Paginas:**
`dashboard`, `kanban`, `cronograma`, `mindmap`, `list`, `templates`, `activity_log`, `settings`, `view_all_templates`

**Tarefas:**
`create`, `edit_all`, `edit_retroactive_dates`, `view_all_sectors`, `view_own_team`, `view_own_sector`, `view_created_by_me`, `assign_any`, `assign_own_team`, `assign_own_sector`, `manage_pauses`, `edit_deadline_all`

**Configuracoes:**
`manage_users`, `manage_roles`, `manage_locations`, `manage_task_types`, `manage_teams`, `manage_user_sectors`

### 9.3 Visibilidade de Tarefas

| Modo       | Quem                              | O que ve                            |
|------------|-----------------------------------|-------------------------------------|
| `all`      | Admin, Socio, Diretor, Gerente, GM| Todas as tarefas de todos os setores|
| `team`     | Coordenador de Polo               | Tarefas do seu time + atribuidas    |
| `sectors`  | Coord. de Setores, Gestor         | Tarefas dos seus setores + atribuidas|
| `assigned` | Liderado                          | Apenas tarefas atribuidas a ele     |

### 9.4 Alterando Permissoes

Permissoes sao armazenadas como JSON no campo `permissions` da tabela `Role`. Para alterar:

1. Via interface: **Configuracoes > Cargos > Editar permissoes**
2. Via API: `PUT /api/roles` com body `{ id, permissions: { pages: {...}, tasks: {...}, settings: {...} } }`
3. Via seed: Editar `prisma/seed_roles_v2.ts` e executar novamente

---

## 10. Funcionalidades

### 10.1 Kanban Board
Visualizacao de tarefas em colunas por status: **A Fazer → Em Andamento → Em Pausa → Concluido**. Drag-and-drop para mover tarefas entre status.

### 10.2 Dashboard
Metricas em tempo real: tarefas por status, por setor, por responsavel. Graficos de barras e pizza (Recharts). Filtros por periodo, setor, time.

### 10.3 Cronograma
Visualizacao temporal (timeline) de tarefas com prazos. Identifica tarefas atrasadas visualmente.

### 10.4 Mind Map
Visualizacao hierarquica: **Contrato > Cidade > Bairro > Tarefas**. Permite navegar pela estrutura geografica dos projetos.

### 10.5 Lista
Tabela completa com filtros avancados (status, setor, responsavel, busca, tipo, prioridade). Ordenacao por qualquer coluna. Exportacao para Excel e PDF.

### 10.6 Templates
Modelos de tarefas reutilizaveis com subtarefas pre-definidas. Util para criar conjuntos padronizados de tarefas por setor.

### 10.7 Notificacoes
Sistema de mencoes (@usuario, @setor) em comentarios. Alertas de tarefas atrasadas (via cron). Entrega em tempo real via SSE.

### 10.8 Controle de Tempo
Cada tarefa registra: `started_at`, `paused_at`, `completed_at`, `time_spent` (segundos). Historico de pausas em `TaskPause`. Recalculo via endpoint admin.

### 10.9 Anexos
Upload de imagens (JPEG, PNG, GIF, WebP, SVG) e PDFs. Maximo 10MB por arquivo. Storage adaptavel (local/Supabase/S3).

### 10.10 Relatorios IA
Geracao de relatorios semanais com analise automatica via XAI/Grok. Requer `XAI_API_KEY` configurada.

---

## 11. Storage de Arquivos

O sistema possui uma camada de abstracao de storage (`src/lib/storage.ts`) que suporta 3 backends:

| Backend    | Quando Usar                        | Configuracao                          |
|------------|------------------------------------|---------------------------------------|
| **Local**  | Desenvolvimento                    | Nenhuma config (padrao)               |
| **Supabase** | Producao atual (Vercel + Supabase)| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **AWS S3** | Producao futura (AWS)              | `AWS_S3_BUCKET` + `AWS_REGION`        |

A deteccao e automatica. Se ambos S3 e Supabase estiverem configurados, S3 tem prioridade.

**Restricoes de upload:**
- Tipos permitidos: JPEG, PNG, GIF, WebP, SVG, PDF
- Tamanho maximo: 10MB
- Armazenamento: `uploads/tasks/{taskId}/{timestamp}_{random}.{ext}`

---

## 12. Deploy Atual — Vercel + Supabase

O sistema esta atualmente em producao usando:

| Componente | Servico                    |
|------------|----------------------------|
| App        | Vercel (Next.js)           |
| Banco      | Supabase PostgreSQL        |
| Storage    | Filesystem local / Supabase|

### Build Command (Vercel)

```
prisma generate && prisma migrate deploy && npx ts-node prisma/seed_roles_v2.ts && npx ts-node scripts/sync_excel.ts && next build
```

### Variaveis no Vercel

Todas as variaveis da secao 6 marcadas como obrigatorias devem ser configuradas no painel do Vercel (Settings > Environment Variables).

---

## 13. Deploy Futuro — AWS

### 13.1 Opcao A: EC2 + Docker (Recomendada — Custo Otimizado)

Ideal para o volume atual de usuarios. Custo estimado: **~$35/mes**.

| Componente        | Servico AWS                    | Custo Est.   |
|--------------------|-------------------------------|--------------|
| App (Next.js SSR)  | EC2 t3.small + Docker + Nginx | ~$15/mes     |
| Banco de Dados     | RDS PostgreSQL t3.micro       | ~$15/mes     |
| Storage (uploads)  | S3 Standard                   | ~$1/mes      |
| SSL                | ACM (gratuito)                | $0           |
| DNS                | Route 53                      | ~$1/mes      |
| Secrets            | SSM Parameter Store           | $0           |
| Logs               | CloudWatch Logs               | ~$2/mes      |

**Passo a passo:**

```bash
# 1. Provisionar EC2 (Amazon Linux 2023 ou Ubuntu 22.04)
# Instalar Docker e Docker Compose

# 2. Provisionar RDS PostgreSQL 15+ (t3.micro, Multi-AZ desligado para economia)
# Habilitar backups automaticos (7 dias retencao)

# 3. Criar bucket S3 privado para uploads
# Criar IAM Role com permissao s3:PutObject e s3:DeleteObject

# 4. Configurar Parameter Store com as variaveis de ambiente
# DATABASE_URL, JWT_SECRET, CRON_SECRET, AWS_S3_BUCKET, AWS_REGION

# 5. Na EC2, clonar o repo e buildar
git clone <url-do-repo>
cd geotask-pro
docker build -t geotask-pro .

# 6. Executar com variaveis do Parameter Store
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e JWT_SECRET="..." \
  -e CRON_SECRET="..." \
  -e AWS_S3_BUCKET="..." \
  -e AWS_REGION="sa-east-1" \
  --restart unless-stopped \
  geotask-pro

# 7. Configurar Nginx como reverse proxy (porta 80/443 -> 3000)
# 8. Configurar certificado SSL via ACM ou Let's Encrypt
# 9. Configurar Route 53 para o dominio
```

**Nginx config (exemplo):**

```nginx
server {
    listen 80;
    server_name geotask.geogis.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name geotask.geogis.com.br;

    ssl_certificate     /etc/ssl/certs/geotask.crt;
    ssl_certificate_key /etc/ssl/private/geotask.key;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 13.2 Opcao B: ECS Fargate (Escala Futura)

Para quando o volume de usuarios crescer e precisar de auto-scaling. Custo estimado: **~$100-150/mes**.

| Componente         | Servico AWS                   |
|--------------------|-------------------------------|
| App                | ECS Fargate (min 2 tasks)     |
| Load Balancer      | Application Load Balancer     |
| Banco              | RDS PostgreSQL (Multi-AZ)     |
| Storage            | S3 + CloudFront (CDN)         |
| Secrets            | SSM Parameter Store           |
| CI/CD              | GitHub Actions + ECR          |
| Logs               | CloudWatch Logs               |

**Pipeline CI/CD sugerido:**
1. Push na branch `main` → GitHub Actions
2. Build imagem Docker + testes
3. Push para Amazon ECR
4. Atualizar Task Definition no ECS
5. Rolling update (zero downtime)
6. Rollback automatico via ECS Circuit Breaker

### 13.3 Estrategia de Backup

| Recurso   | Estrategia                                     |
|-----------|-------------------------------------------------|
| Banco RDS | Snapshots automaticos diarios (7 dias retencao)|
| Uploads S3| Versionamento de objetos habilitado             |
| Codigo    | Repositorio GitHub (historico completo)         |

### 13.4 Migrar de Supabase para AWS

1. Exportar banco Supabase: `pg_dump` da connection string atual
2. Importar no RDS: `psql -h <rds-endpoint> -U postgres -d geotask-pro < dump.sql`
3. Migrar uploads: baixar do Supabase Storage e subir para S3
4. Atualizar variaveis de ambiente no novo deploy
5. Testar todas as funcionalidades
6. Apontar DNS para o novo servidor
7. Desativar Vercel/Supabase apos confirmacao

---

## 14. Manutencao

### 14.1 Scripts Disponíveis

| Comando                          | Descricao                                   |
|----------------------------------|---------------------------------------------|
| `npm run dev`                    | Servidor de desenvolvimento (hot reload)    |
| `npm run build`                  | Build de producao                           |
| `npm start`                      | Iniciar servidor de producao                |
| `npm run lint`                   | Verificar qualidade do codigo (ESLint)      |
| `npm test`                       | Executar testes (Vitest)                    |
| `npm run test:watch`             | Testes em modo watch                        |
| `npx prisma generate`           | Regenerar Prisma Client                     |
| `npx prisma migrate dev`        | Criar/aplicar migrations (dev)              |
| `npx prisma migrate deploy`     | Aplicar migrations (producao)               |
| `npx prisma studio`             | Interface visual do banco                   |
| `npx tsx prisma/seed_roles_v2.ts`| Seed de roles padrao                        |
| `npx tsx scripts/sync_excel.ts` | Sincronizar dados com Excel                 |
| `npx tsx scripts/recalculate_time_spent.ts` | Recalcular tempo gasto em tarefas |

### 14.2 Endpoints de Manutencao

Protegidos por `?secret=CRON_SECRET`:

- `GET /api/cron/late-tasks?secret=...` — Detecta tarefas atrasadas e envia notificacoes
- `GET /api/admin/recalculate-time?secret=...` — Recalcula `time_spent` baseado em historico

### 14.3 Troubleshooting

| Problema                          | Solucao                                           |
|-----------------------------------|---------------------------------------------------|
| Build falha com erro Prisma       | `npx prisma generate` antes do build              |
| Migrations pendentes              | `npx prisma migrate deploy`                       |
| Usuarios sem permissoes           | Reexecutar `npx tsx prisma/seed_roles_v2.ts`      |
| Uploads nao funcionam (prod)      | Verificar variaveis S3/Supabase e permissoes IAM  |
| SSE nao conecta                   | Verificar timeout do proxy (Nginx/ALB > 30s)      |
| Senha esquecida                   | Resetar via Prisma Studio ou update direto no DB   |

### 14.4 Atualizando o Sistema

```bash
# 1. Pull das alteracoes
git pull origin main

# 2. Instalar novas dependencias
npm install

# 3. Aplicar migrations
npx prisma migrate deploy

# 4. Rebuild
npm run build

# 5. Reiniciar
# Em Docker: docker restart geotask_pro_app
# Em systemd: sudo systemctl restart geotask-pro
# Em Vercel: deploy automatico via push
```

---

## 15. Seguranca

### 15.1 Autenticacao
- Senhas armazenadas como hash bcryptjs (10 rounds)
- Novos usuarios obrigados a trocar senha no primeiro acesso (`must_change_password`)
- Identificacao via header `X-User-Id` em todas as requisicoes API

### 15.2 Middleware de Protecao
- Arquivo: `src/middleware.ts`
- Todas as rotas `/api/*` exigem `X-User-Id` (exceto login, setup)
- Endpoints cron/admin protegidos por query param `secret`

### 15.3 Headers de Seguranca (next.config.ts)
- `X-Frame-Options: DENY` — impede embedding em iframes
- `X-Content-Type-Options: nosniff` — previne MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — desabilita sensores

### 15.4 Gestao de Segredos
- **Dev:** `.env.local` (nunca commitar)
- **Vercel:** Environment Variables no painel
- **AWS:** SSM Parameter Store (recomendado) ou Secrets Manager
- **Nunca usar chaves AWS estaticas em producao** — usar IAM Role (EC2 Instance Role ou ECS Task Role)

### 15.5 HTTPS
- **Vercel:** Automatico
- **AWS EC2:** Certificado via ACM no ALB ou Let's Encrypt no Nginx
- **AWS ECS:** ACM no Application Load Balancer

---

## 16. Logs e Monitoramento

### 16.1 Logs da Aplicacao
- **ActivityLog:** Tabela no banco com todas as acoes dos usuarios (login, criar tarefa, upload, etc.) com IP
- **TaskHistory:** Historico de cada alteracao em tarefas (campo, valor antigo, valor novo)
- **Console:** Erros de API logados via `console.error`

### 16.2 Monitoramento (AWS)
- **CloudWatch Logs:** Captura stdout/stderr do container (driver `awslogs`)
- **CloudWatch Alarms:** Configurar alarmes para CPU > 80%, memoria > 80%, erros 5xx
- **RDS Performance Insights:** Monitorar queries lentas

### 16.3 Niveis de Log Recomendados
- `ERROR`: Falhas criticas (banco inacessivel, upload falhou)
- `WARN`: Situacoes atipicas (tarefa sem responsavel, permissao negada)
- `INFO`: Auditoria de negocio (login, criacao de tarefa)
- `DEBUG`: Apenas em ambiente DEV

---

## 17. Contribuicao

### 17.1 Git Workflow

```
main          ←── branch de producao (deploy automatico)
  └── feature/xxx  ←── branch de desenvolvimento
  └── fix/xxx      ←── branch de correcao
  └── hotfix/xxx   ←── correcao urgente em producao
```

### 17.2 Convencao de Commits

```
feat: nova funcionalidade
fix: correcao de bug
docs: documentacao
refactor: refatoracao sem mudanca funcional
chore: manutencao (deps, configs)
test: adicionar/alterar testes
```

### 17.3 Checklist para PR

- [ ] Build passa (`npm run build`)
- [ ] Lint passa (`npm run lint`)
- [ ] Testes passam (`npm test`)
- [ ] Migrations criadas se alterou schema
- [ ] Variaveis novas documentadas em `.env.example`
- [ ] README atualizado se necessario

---

## Estrutura de Pastas

```
geotask-pro/
├── prisma/
│   ├── schema.prisma          # Schema do banco de dados
│   ├── migrations/            # Migrations (nao editar manualmente)
│   ├── seed.ts                # Seed completo
│   └── seed_roles_v2.ts       # Seed de roles/permissoes
├── scripts/
│   ├── recalculate_time_spent.ts
│   ├── sync_excel.ts
│   └── export_mapping.ts
├── src/
│   ├── app/
│   │   ├── api/               # 28+ endpoints API
│   │   ├── login/             # Pagina de login
│   │   ├── layout.tsx         # Layout raiz (dark mode, fonts)
│   │   └── page.tsx           # Pagina principal (SPA)
│   ├── components/
│   │   ├── dashboard/         # Dashboard com KPIs
│   │   ├── kanban/            # Kanban board
│   │   ├── list/              # Tabela/lista
│   │   ├── cronograma/        # Timeline
│   │   ├── mindmap/           # Mind map hierarquico
│   │   ├── tasks/             # Modais de tarefa
│   │   ├── templates/         # Templates
│   │   ├── notifications/     # Notificacoes
│   │   ├── activitylog/       # Log de atividades
│   │   ├── layout/            # Sidebar, TopBar
│   │   ├── shared/            # Filtros, headers
│   │   ├── ui/                # Componentes de formulario
│   │   └── skeletons/         # Loading skeletons
│   ├── hooks/                 # useTasks, useUsers, useLookups, etc.
│   ├── lib/
│   │   ├── auth.ts            # Autenticacao backend
│   │   ├── authFetch.ts       # Fetch com X-User-Id
│   │   ├── permissions.ts     # RBAC (getPermissions, visibility)
│   │   ├── storage.ts         # Abstracao storage (local/Supabase/S3)
│   │   ├── prisma.ts          # Singleton Prisma client
│   │   ├── constants.ts       # Constantes do sistema
│   │   ├── helpers.ts         # Funcoes utilitarias
│   │   ├── exportUtils.ts     # Export Excel/PDF
│   │   ├── activityLog.ts     # Logger de atividades
│   │   ├── utils.ts           # cn() (Tailwind merge)
│   │   ├── services/          # authService, notificationService
│   │   └── validators/        # Schemas Zod (auth, task, user, comment)
│   ├── stores/
│   │   ├── authStore.ts       # Estado de autenticacao (Zustand)
│   │   └── uiStore.ts         # Estado da UI (pagina, sidebar, modais)
│   └── types/                 # TypeScript interfaces
├── public/
│   └── uploads/               # Uploads locais (nao commitado)
├── docs/                      # Documentacao formal (DOCX)
├── .env.example               # Template de variaveis de ambiente
├── Dockerfile                 # Build multi-stage (producao)
├── docker-compose.yml         # Stack local (PostgreSQL + App)
├── next.config.ts             # Config Next.js (headers, output)
├── package.json               # Dependencias e scripts
└── README.md                  # Esta documentacao
```
