const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FONT = "Arial";
const PAGE_W = 12240; // US Letter
const PAGE_H = 15840;
const CONTENT_W = 9360; // 1-inch margins
const PRIMARY = "2E75B6"; // header blue
const HEADER_BG = "D5E8F0";
const LIGHT_BG = "F2F7FA";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: FONT, size: 20 })] })],
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({ text: String(text), font: FONT, size: 20, bold: opts.bold || false })],
      alignment: opts.align || AlignmentType.LEFT,
    })],
  });
}

function makeTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map((row) =>
        new TableRow({
          children: row.map((c, i) => cell(c, colWidths[i])),
        })
      ),
    ],
  });
}

function heading(text, level) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: FONT, bold: true })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, font: FONT, size: 22, ...opts })],
  });
}

function bulletItem(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, font: FONT, size: 22 })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: PRIMARY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: FONT, color: PRIMARY },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: FONT },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [
    // =====================================================================
    // CAPA
    // =====================================================================
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "GEOGIS", font: FONT, size: 56, bold: true, color: PRIMARY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "Tecnologia e Processos", font: FONT, size: 28, color: "666666" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "DOCUMENTACAO TECNICA", font: FONT, size: 40, bold: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "GEOTASK PRO", font: FONT, size: 48, bold: true, color: PRIMARY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Sistema de Gestao de Tarefas Georreferenciadas", font: FONT, size: 24, color: "666666" })],
        }),
        spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
        // Revision table
        makeTable(
          ["Revisao", "Data", "Observacoes"],
          [["00", "30/03/2026", "Elaboracao"]],
          [1500, 2000, 5860]
        ),
        spacer(),
        makeTable(
          ["Responsavel", "Funcao", "Papel"],
          [
            ["Vinicios Araujo", "Analista de Processos", "Elaboracao"],
            ["", "Desenvolvedor", "Analise Critica"],
            ["", "Gerente de TI", "Aprovacao"],
          ],
          [3120, 3120, 3120]
        ),
      ],
    },

    // =====================================================================
    // CONTEUDO PRINCIPAL
    // =====================================================================
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: "GeoGis — GeoTask Pro | Documentacao Tecnica", font: FONT, size: 16, color: "999999" })],
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY, space: 4 } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Pagina ", font: FONT, size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "999999" }),
            ],
          })],
        }),
      },
      children: [
        // =================================================================
        // 1. VISAO GERAL
        // =================================================================
        heading("1. VISAO GERAL", HeadingLevel.HEADING_1),
        para("Nome do sistema: GeoTask Pro (Modulo de Gestao de Tarefas — GeoGis)", { bold: true }),
        spacer(),
        para("Descricao: Sistema responsavel pela gestao de tarefas georreferenciadas para operacoes de Regularizacao Fundiaria Urbana (REURB). Permite gerenciamento de tarefas por contrato, cidade, bairro, setor e equipe, com sistema de permissoes granular por cargo."),
        spacer(),
        para("Arquitetura: Aplicacao monolitica Next.js (Server-Side Rendering + API Routes). Frontend e backend no mesmo projeto, comunicacao via API REST interna."),
        spacer(),
        para("Publico-alvo: Diretoria, Gerentes, Coordenadores de Setores/Polos, Gestores e Colaboradores de operacao."),
        spacer(),

        heading("Principais Capacidades", HeadingLevel.HEADING_3),
        bulletItem("Kanban Board — Visualizacao e movimentacao de tarefas por status"),
        bulletItem("Dashboard — Metricas e graficos de desempenho por setor, equipe e responsavel"),
        bulletItem("Cronograma — Visualizacao temporal de tarefas com prazos"),
        bulletItem("Mind Map — Visualizacao hierarquica (Contrato > Cidade > Bairro > Tarefas)"),
        bulletItem("Lista — Tabela com filtros avancados e exportacao (Excel/PDF)"),
        bulletItem("Templates — Modelos de tarefas reutilizaveis com subtarefas"),
        bulletItem("Notificacoes — Mencoes e alertas em tempo real (SSE)"),
        bulletItem("Log de Atividades — Auditoria completa de acoes com IP"),
        bulletItem("Gestao de Equipes — Times/Polos com membros vinculados"),
        bulletItem("Multi-setor — Coordenadores gerenciando multiplos setores"),
        bulletItem("Anexos — Upload de imagens e PDFs (local, Supabase ou S3)"),
        bulletItem("Relatorios IA — Geracao automatica via XAI/Grok"),
        bulletItem("Controle de Tempo — Tracking com pausas e recalculo"),

        // =================================================================
        // 2. STACK TECNOLOGICA
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("2. LINGUAGENS E FRAMEWORKS", HeadingLevel.HEADING_1),

        heading("2.1 Backend / Full-Stack", HeadingLevel.HEADING_2),
        makeTable(
          ["Item", "Tecnologia", "Versao"],
          [
            ["Framework", "Next.js (App Router — SSR + API Routes)", "16.x"],
            ["Linguagem", "TypeScript (Node.js 20+)", "5.x"],
            ["ORM", "Prisma", "5.22+"],
            ["Banco de Dados", "PostgreSQL", "15+"],
            ["Autenticacao", "bcryptjs (hash de senhas)", "3.x"],
            ["Validacao", "Zod", "3.x"],
            ["Testes", "Vitest", "4.x"],
          ],
          [2200, 5000, 2160]
        ),
        spacer(),

        heading("2.2 Frontend", HeadingLevel.HEADING_2),
        makeTable(
          ["Item", "Tecnologia", "Versao"],
          [
            ["UI", "React", "19.x"],
            ["Estilizacao", "Tailwind CSS", "4.x"],
            ["State Management", "Zustand", "5.x"],
            ["Data Fetching", "SWR (stale-while-revalidate)", "2.x"],
            ["Graficos", "Recharts", "3.x"],
            ["Icones", "Lucide React", "0.574+"],
            ["Export Excel", "ExcelJS", "4.x"],
            ["Export PDF", "jsPDF + jsPDF-AutoTable", "4.x / 5.x"],
          ],
          [2200, 5000, 2160]
        ),
        spacer(),

        heading("2.3 Banco de Dados", HeadingLevel.HEADING_2),
        para("Tipo: PostgreSQL 15+ via Prisma ORM."),
        para("DEV: Container PostgreSQL local (Docker) ou banco remoto."),
        para("PRODUCAO ATUAL: Supabase PostgreSQL (pooled connection)."),
        para("PRODUCAO FUTURA (AWS): Amazon RDS for PostgreSQL (servico gerenciado)."),

        // =================================================================
        // 3. DESIGN PATTERNS
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("3. DESIGN PATTERNS E ESTRUTURA", HeadingLevel.HEADING_1),

        heading("3.1 Arquitetura Adotada", HeadingLevel.HEADING_2),
        para("Aplicacao Next.js monolitica organizada por features no frontend e rotas API RESTful no backend. Prisma ORM para acesso ao banco, Zustand para estado global, SWR para cache de dados."),
        spacer(),

        heading("3.2 Padroes Utilizados", HeadingLevel.HEADING_2),
        bulletItem("Repository Pattern: Prisma como camada de abstracao entre regra de negocio e persistencia"),
        bulletItem("RBAC (Role-Based Access Control): Permissoes granulares por cargo armazenadas em JSON"),
        bulletItem("Storage Abstraction: Modulo que detecta automaticamente backend (Local/Supabase/S3)"),
        bulletItem("Server-Sent Events: Atualizacoes em tempo real sem polling"),
        bulletItem("SWR (Stale-While-Revalidate): Cache otimista com revalidacao automatica"),
        spacer(),

        heading("3.3 Organizacao do Codigo", HeadingLevel.HEADING_2),
        bulletItem("src/app/api/ — Endpoints API (controllers)"),
        bulletItem("src/lib/ — Logica de negocio, auth, permissoes, storage, validators"),
        bulletItem("src/components/ — Componentes React por feature (dashboard, kanban, etc.)"),
        bulletItem("src/hooks/ — Custom hooks SWR (useTasks, useUsers, etc.)"),
        bulletItem("src/stores/ — Estado global Zustand (auth, UI)"),
        bulletItem("src/types/ — Interfaces TypeScript"),
        bulletItem("prisma/ — Schema, migrations, seeds"),

        // =================================================================
        // 4. INSTALACAO E CONFIGURACAO
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("4. INSTALACAO E CONFIGURACAO", HeadingLevel.HEADING_1),

        heading("4.1 Pre-requisitos", HeadingLevel.HEADING_2),
        makeTable(
          ["Software", "Versao Minima", "Uso"],
          [
            ["Node.js", "20+", "Runtime da aplicacao"],
            ["npm", "9+", "Gerenciador de pacotes"],
            ["PostgreSQL", "15+", "Banco de dados"],
            ["Docker", "24+", "Containerizacao (opcional)"],
            ["Git", "2.x", "Controle de versao"],
          ],
          [2500, 2500, 4360]
        ),
        spacer(),

        heading("4.2 Variaveis de Ambiente", HeadingLevel.HEADING_2),
        para("Arquivo: .env.local (NUNCA commitar no repositorio)"),
        spacer(),
        para("Obrigatorias:", { bold: true }),
        makeTable(
          ["Variavel", "Descricao"],
          [
            ["DATABASE_URL", "Connection string PostgreSQL (pooled)"],
            ["DIRECT_URL", "Connection string direta (para migrations)"],
            ["JWT_SECRET", "Chave secreta para sessoes"],
            ["CRON_SECRET", "Chave para endpoints cron/admin"],
            ["DEFAULT_USER_PASSWORD", "Senha padrao para novos usuarios"],
          ],
          [3500, 5860]
        ),
        spacer(),
        para("Opcionais — Supabase (ambiente atual):", { bold: true }),
        makeTable(
          ["Variavel", "Descricao"],
          [
            ["NEXT_PUBLIC_SUPABASE_URL", "URL do projeto Supabase"],
            ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Chave anonima Supabase"],
            ["SUPABASE_STORAGE_BUCKET", "Nome do bucket (padrao: task-attachments)"],
          ],
          [3500, 5860]
        ),
        spacer(),
        para("Opcionais — AWS (deploy futuro):", { bold: true }),
        makeTable(
          ["Variavel", "Descricao"],
          [
            ["AWS_S3_BUCKET", "Nome do bucket S3 para uploads"],
            ["AWS_REGION", "Regiao AWS (ex: sa-east-1)"],
            ["AWS_CLOUDFRONT_DOMAIN", "Dominio CloudFront para CDN"],
          ],
          [3500, 5860]
        ),
        spacer(),

        heading("4.3 Passo a Passo", HeadingLevel.HEADING_2),
        para("1. Clonar: git clone [url-repo]"),
        para("2. Ambiente: Copiar .env.example para .env.local e preencher chaves"),
        para("3. Dependencias: npm install"),
        para("4. Prisma: npx prisma generate"),
        para("5. Migrations: npx prisma migrate dev"),
        para("6. Seeds: npx tsx prisma/seed_roles_v2.ts"),
        para("7. Iniciar: npm run dev"),
        para("8. Acesso: http://localhost:3000"),

        // =================================================================
        // 5. BANCO DE DADOS
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("5. BANCO DE DADOS", HeadingLevel.HEADING_1),

        heading("5.1 Models (22 tabelas)", HeadingLevel.HEADING_2),
        makeTable(
          ["Model", "Descricao"],
          [
            ["User", "Usuarios com role, setor, time, status ativo"],
            ["Role", "Cargos com permissoes JSON (RBAC)"],
            ["Sector", "Setores/departamentos"],
            ["Team", "Times/Polos"],
            ["UserSector", "N:N — coordenadores com multiplos setores"],
            ["Task", "Tarefas com status, prioridade, geoloc, tempo"],
            ["Subtask", "Subtarefas vinculadas a tarefas"],
            ["TaskUser", "N:N — colaboradores em tarefas"],
            ["TaskHistory", "Auditoria de cada campo alterado"],
            ["TaskPause", "Pausas/retomadas para tracking de tempo"],
            ["TaskAttachment", "Arquivos anexados (imagens, PDFs)"],
            ["TaskType", "Tipos de tarefa por setor"],
            ["Template", "Templates de tarefas reutilizaveis"],
            ["TemplateTask", "Tarefas dentro de templates"],
            ["TemplateSubtask", "Subtarefas dentro de template tasks"],
            ["Comment", "Comentarios em tarefas"],
            ["Mention", "Mencoes @usuario e @setor"],
            ["Notification", "Notificacoes in-app"],
            ["Contract", "Contratos de servico"],
            ["City", "Cidades"],
            ["Neighborhood", "Bairros (cidade + contrato)"],
            ["ActivityLog", "Log global de acoes com IP"],
          ],
          [3000, 6360]
        ),

        // =================================================================
        // 6. API ROUTES
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("6. API ROUTES", HeadingLevel.HEADING_1),
        para("Todas as rotas estao em src/app/api/. Rotas protegidas exigem header X-User-Id."),
        spacer(),

        heading("6.1 Autenticacao", HeadingLevel.HEADING_2),
        makeTable(
          ["Metodo", "Rota", "Descricao"],
          [
            ["POST", "/api/auth/login", "Login (email + senha)"],
            ["GET", "/api/auth/me", "Validar sessao"],
            ["POST", "/api/auth/change-password", "Alterar senha"],
          ],
          [1200, 4000, 4160]
        ),
        spacer(),

        heading("6.2 Tarefas", HeadingLevel.HEADING_2),
        makeTable(
          ["Metodo", "Rota", "Descricao"],
          [
            ["GET", "/api/tasks", "Listar (filtros, paginacao)"],
            ["POST", "/api/tasks", "Criar tarefa"],
            ["PATCH", "/api/tasks", "Atualizar tarefa"],
            ["DELETE", "/api/tasks", "Excluir tarefa"],
            ["GET", "/api/tasks/history", "Historico de alteracoes"],
            ["GET", "/api/tasks/{id}/attachments", "Listar anexos"],
            ["POST", "/api/tasks/{id}/attachments", "Upload arquivo (max 10MB)"],
            ["DELETE", "/api/tasks/{id}/attachments", "Remover anexo"],
          ],
          [1200, 4000, 4160]
        ),
        spacer(),

        heading("6.3 Administracao", HeadingLevel.HEADING_2),
        makeTable(
          ["Metodo", "Rota", "Descricao"],
          [
            ["GET/POST", "/api/users", "Listar/criar usuarios"],
            ["PATCH", "/api/users", "Atualizar usuario"],
            ["POST", "/api/users/import", "Importar usuarios (Excel)"],
            ["GET/PUT", "/api/roles", "Cargos e permissoes"],
            ["GET/POST/PUT", "/api/sectors", "Setores"],
            ["GET/POST/PUT", "/api/teams", "Times/Polos"],
            ["GET/POST", "/api/user-sectors", "Associacoes usuario-setor"],
            ["GET/POST/PUT", "/api/task-types", "Tipos de tarefa"],
            ["GET/POST/PUT", "/api/cities", "Cidades"],
            ["GET/POST/PUT", "/api/neighborhoods", "Bairros"],
            ["GET/POST/PUT", "/api/contracts", "Contratos"],
          ],
          [1500, 3800, 4060]
        ),
        spacer(),

        heading("6.4 Recursos Especiais", HeadingLevel.HEADING_2),
        makeTable(
          ["Metodo", "Rota", "Descricao"],
          [
            ["GET/POST", "/api/comments", "Comentarios"],
            ["GET/PATCH", "/api/notifications", "Notificacoes"],
            ["GET", "/api/activity-log", "Log de auditoria"],
            ["GET", "/api/lookups", "Dados de dropdowns"],
            ["GET", "/api/events", "SSE (tempo real)"],
            ["GET", "/api/dashboard/stats", "Metricas dashboard"],
            ["GET/POST/DELETE", "/api/templates", "Templates"],
            ["POST", "/api/reports/weekly", "Relatorio semanal"],
            ["POST", "/api/ai/analyze", "Relatorio IA"],
            ["GET", "/api/cron/late-tasks", "Cron: tarefas atrasadas"],
            ["GET", "/api/admin/recalculate-time", "Recalcular tempos"],
          ],
          [1800, 4000, 3560]
        ),

        // =================================================================
        // 7. SISTEMA DE PERMISSOES
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("7. SISTEMA DE PERMISSOES (RBAC)", HeadingLevel.HEADING_1),

        heading("7.1 Cargos", HeadingLevel.HEADING_2),
        makeTable(
          ["Cargo", "Nome UI", "Nivel de Acesso"],
          [
            ["Admin", "Gestor", "Acesso total ao sistema"],
            ["Gerente", "Gerente", "Acesso total exceto gerenciar roles"],
            ["Socio", "Socio", "Visualiza todos os setores (somente leitura)"],
            ["Diretor", "Diretor", "Visualiza e cria em todos os setores"],
            ["GM", "GM", "Visualiza tudo + log de atividades"],
            ["Coord. de Setores", "-", "Gerencia setores vinculados"],
            ["Coord. de Polo", "-", "Gerencia apenas seu time/polo"],
            ["Gestor (REURB)", "-", "Cria/gerencia tarefas do seu setor"],
            ["Liderado", "-", "Ve apenas tarefas atribuidas"],
          ],
          [2500, 1500, 5360]
        ),
        spacer(),

        heading("7.2 Visibilidade de Tarefas", HeadingLevel.HEADING_2),
        makeTable(
          ["Modo", "Quem", "O que Ve"],
          [
            ["all", "Admin, Socio, Diretor, Gerente, GM", "Todas as tarefas"],
            ["team", "Coordenador de Polo", "Tarefas do seu time"],
            ["sectors", "Coord. Setores, Gestor", "Tarefas dos seus setores"],
            ["assigned", "Liderado", "Apenas tarefas atribuidas"],
          ],
          [1500, 3500, 4360]
        ),
        spacer(),
        para("Permissoes sao armazenadas como JSON no campo permissions da tabela Role. Podem ser alteradas via interface (Configuracoes > Cargos) ou via API (PUT /api/roles)."),

        // =================================================================
        // 8. STORAGE DE ARQUIVOS
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("8. STORAGE DE ARQUIVOS", HeadingLevel.HEADING_1),
        para("O sistema possui uma camada de abstracao (src/lib/storage.ts) que suporta 3 backends:"),
        spacer(),
        makeTable(
          ["Backend", "Quando Usar", "Configuracao"],
          [
            ["Local", "Desenvolvimento", "Nenhuma (padrao)"],
            ["Supabase", "Producao atual", "NEXT_PUBLIC_SUPABASE_URL + KEY"],
            ["AWS S3", "Producao futura (AWS)", "AWS_S3_BUCKET + AWS_REGION"],
          ],
          [1800, 3500, 4060]
        ),
        spacer(),
        para("Deteccao automatica: S3 > Supabase > Local. Se ambos estiverem configurados, S3 tem prioridade."),
        spacer(),
        para("Restricoes de upload:", { bold: true }),
        bulletItem("Tipos permitidos: JPEG, PNG, GIF, WebP, SVG, PDF"),
        bulletItem("Tamanho maximo: 10MB por arquivo"),
        bulletItem("Caminho: uploads/tasks/{taskId}/{timestamp}_{random}.{ext}"),

        // =================================================================
        // 9. DEPLOY
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("9. DEPLOY", HeadingLevel.HEADING_1),

        heading("9.1 Deploy Atual — Vercel + Supabase", HeadingLevel.HEADING_2),
        makeTable(
          ["Componente", "Servico"],
          [
            ["Aplicacao", "Vercel (Next.js SSR)"],
            ["Banco de Dados", "Supabase PostgreSQL"],
            ["Storage", "Filesystem local / Supabase Storage"],
          ],
          [3000, 6360]
        ),
        spacer(),
        para("Build command Vercel: prisma generate && prisma migrate deploy && npx ts-node prisma/seed_roles_v2.ts && npx ts-node scripts/sync_excel.ts && next build"),
        spacer(),

        heading("9.2 Deploy Futuro — AWS (Opcao A: EC2 — Custo Otimizado)", HeadingLevel.HEADING_2),
        para("Custo estimado: ~$35/mes", { bold: true }),
        spacer(),
        makeTable(
          ["Componente", "Servico AWS", "Custo Est."],
          [
            ["App (Next.js)", "EC2 t3.small + Docker + Nginx", "~$15/mes"],
            ["Banco de Dados", "RDS PostgreSQL t3.micro", "~$15/mes"],
            ["Storage", "S3 Standard", "~$1/mes"],
            ["SSL", "ACM (gratuito)", "$0"],
            ["DNS", "Route 53", "~$1/mes"],
            ["Secrets", "SSM Parameter Store", "$0"],
            ["Logs", "CloudWatch Logs", "~$2/mes"],
          ],
          [2500, 4500, 2360]
        ),
        spacer(),
        para("Passo a passo do deploy EC2:", { bold: true }),
        para("1. Provisionar EC2 (Amazon Linux 2023 ou Ubuntu 22.04)"),
        para("2. Instalar Docker e Docker Compose na EC2"),
        para("3. Provisionar RDS PostgreSQL t3.micro (backups diarios)"),
        para("4. Criar bucket S3 privado + IAM Role com permissoes S3"),
        para("5. Configurar Parameter Store com variaveis de ambiente"),
        para("6. Clonar repo, buildar imagem Docker, executar container"),
        para("7. Configurar Nginx como reverse proxy (80/443 -> 3000)"),
        para("8. Configurar SSL via ACM ou Let's Encrypt"),
        para("9. Configurar Route 53 para o dominio"),
        spacer(),

        heading("9.3 Deploy Futuro — AWS (Opcao B: ECS Fargate — Escala)", HeadingLevel.HEADING_2),
        para("Para quando o volume crescer. Custo estimado: ~$100-150/mes", { bold: true }),
        spacer(),
        makeTable(
          ["Componente", "Servico AWS"],
          [
            ["App", "ECS Fargate (min 2 tasks)"],
            ["Load Balancer", "Application Load Balancer"],
            ["Banco", "RDS PostgreSQL (Multi-AZ)"],
            ["Storage", "S3 + CloudFront (CDN)"],
            ["CI/CD", "GitHub Actions + ECR"],
            ["Logs", "CloudWatch Logs"],
          ],
          [3000, 6360]
        ),
        spacer(),

        heading("9.4 Migracao Supabase -> AWS", HeadingLevel.HEADING_2),
        para("1. Exportar banco Supabase: pg_dump da connection string atual"),
        para("2. Importar no RDS: psql -h <rds-endpoint> -U postgres < dump.sql"),
        para("3. Migrar uploads: baixar do Supabase Storage e subir para S3"),
        para("4. Atualizar variaveis de ambiente no novo deploy"),
        para("5. Testar todas as funcionalidades"),
        para("6. Apontar DNS para o novo servidor"),
        para("7. Desativar Vercel/Supabase apos confirmacao"),

        // =================================================================
        // 10. SEGURANCA
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("10. SEGURANCA", HeadingLevel.HEADING_1),

        heading("10.1 Autenticacao", HeadingLevel.HEADING_2),
        bulletItem("Senhas armazenadas como hash bcryptjs (10 rounds)"),
        bulletItem("Novos usuarios obrigados a trocar senha no 1o acesso"),
        bulletItem("Identificacao via header X-User-Id em todas as requisicoes"),
        spacer(),

        heading("10.2 Autorizacao (RBAC)", HeadingLevel.HEADING_2),
        para("Controle de acesso aplicado via middleware e funcao getPermissions()."),
        para("Cada endpoint valida se o usuario possui a permissao necessaria."),
        para("Perfis: Admin, Gerente, Socio, Diretor, GM, Coord. Setores, Coord. Polo, Gestor, Liderado."),
        spacer(),

        heading("10.3 Gestao de Segredos", HeadingLevel.HEADING_2),
        bulletItem("Dev: .env.local (nunca commitar)"),
        bulletItem("Vercel: Environment Variables no painel"),
        bulletItem("AWS: SSM Parameter Store (recomendado)"),
        bulletItem("Nunca usar chaves AWS estaticas em producao — usar IAM Role"),
        spacer(),

        heading("10.4 HTTPS", HeadingLevel.HEADING_2),
        para("Vercel: automatico. AWS EC2: Let's Encrypt ou ACM. AWS ECS: ACM no ALB."),
        spacer(),

        heading("10.5 Headers de Seguranca", HeadingLevel.HEADING_2),
        bulletItem("X-Frame-Options: DENY"),
        bulletItem("X-Content-Type-Options: nosniff"),
        bulletItem("Referrer-Policy: strict-origin-when-cross-origin"),
        bulletItem("Permissions-Policy: camera=(), microphone=(), geolocation=()"),

        // =================================================================
        // 11. LOGS E MONITORAMENTO
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("11. LOGS E MONITORAMENTO", HeadingLevel.HEADING_1),

        heading("11.1 Logs da Aplicacao", HeadingLevel.HEADING_2),
        bulletItem("ActivityLog: Tabela no banco com acoes dos usuarios + IP"),
        bulletItem("TaskHistory: Historico de cada alteracao em tarefas"),
        bulletItem("Console: Erros de API logados via console.error"),
        spacer(),

        heading("11.2 Monitoramento AWS", HeadingLevel.HEADING_2),
        bulletItem("CloudWatch Logs: captura stdout/stderr do container"),
        bulletItem("CloudWatch Alarms: CPU > 80%, memoria > 80%, erros 5xx"),
        bulletItem("RDS Performance Insights: queries lentas"),
        spacer(),

        heading("11.3 Niveis de Log", HeadingLevel.HEADING_2),
        makeTable(
          ["Nivel", "Uso"],
          [
            ["ERROR", "Falhas criticas (banco inacessivel, upload falhou)"],
            ["WARN", "Situacoes atipicas (permissao negada)"],
            ["INFO", "Auditoria de negocio (login, criacao de tarefa)"],
            ["DEBUG", "Apenas em ambiente DEV"],
          ],
          [2000, 7360]
        ),

        // =================================================================
        // 12. MANUTENCAO
        // =================================================================
        new Paragraph({ children: [new PageBreak()] }),
        heading("12. MANUTENCAO", HeadingLevel.HEADING_1),

        heading("12.1 Scripts Disponiveis", HeadingLevel.HEADING_2),
        makeTable(
          ["Comando", "Descricao"],
          [
            ["npm run dev", "Servidor de desenvolvimento"],
            ["npm run build", "Build de producao"],
            ["npm start", "Servidor de producao"],
            ["npm run lint", "Verificar codigo (ESLint)"],
            ["npm test", "Executar testes (Vitest)"],
            ["npx prisma generate", "Regenerar Prisma Client"],
            ["npx prisma migrate dev", "Criar/aplicar migrations"],
            ["npx prisma migrate deploy", "Aplicar migrations (prod)"],
            ["npx prisma studio", "Interface visual do banco"],
            ["npx tsx prisma/seed_roles_v2.ts", "Seed de roles padrao"],
            ["npx tsx scripts/sync_excel.ts", "Sincronizar dados Excel"],
            ["npx tsx scripts/recalculate_time_spent.ts", "Recalcular tempos"],
          ],
          [4500, 4860]
        ),
        spacer(),

        heading("12.2 Atualizando o Sistema", HeadingLevel.HEADING_2),
        para("1. git pull origin main"),
        para("2. npm install"),
        para("3. npx prisma migrate deploy"),
        para("4. npm run build"),
        para("5. Reiniciar: docker restart geotask_pro_app (ou systemctl restart)"),
        spacer(),

        heading("12.3 Troubleshooting", HeadingLevel.HEADING_2),
        makeTable(
          ["Problema", "Solucao"],
          [
            ["Build falha (Prisma)", "npx prisma generate antes do build"],
            ["Migrations pendentes", "npx prisma migrate deploy"],
            ["Usuarios sem permissoes", "Reexecutar seed_roles_v2.ts"],
            ["Uploads nao funcionam", "Verificar variaveis S3/Supabase + IAM"],
            ["SSE nao conecta", "Verificar timeout do proxy (> 30s)"],
            ["Senha esquecida", "Resetar via Prisma Studio"],
          ],
          [3500, 5860]
        ),
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------
const outPath = path.join(__dirname, "..", "docs", "DOCUMENTACAO_GEOTASK_PRO.docx");
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log("DOCX generated:", outPath);
});
