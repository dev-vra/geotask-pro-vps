const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TabStopType, TabStopPosition,
} = require("docx");

// ─── Colors & Fonts ──────────────────────────────────────────────
const C = {
  primary: "98AF3B",
  primaryDark: "7A8E2E",
  accent: "0D9488",
  dark: "1E293B",
  gray: "64748B",
  lightGray: "F1F5F9",
  white: "FFFFFF",
  border: "E2E8F0",
};

const FONT = "Segoe UI";
const FONT_MONO = "Consolas";

// ─── Logo ────────────────────────────────────────────────────────
const logoPath = "public/logoicone.png";
const logoData = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;

// ─── Helpers ─────────────────────────────────────────────────────
const numbering = {
  config: [
    {
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: "bullets2",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u25CB",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      }],
    },
    {
      reference: "steps",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: "steps2",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: "steps3",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: "steps4",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: "steps5",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: "steps6",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: "steps7",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: "steps8",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
  ],
};

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.primary, space: 4 } },
  children: [new TextRun({ text, font: FONT, size: 32, bold: true, color: C.dark })],
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 160 },
  children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: C.primaryDark })],
});

const h3 = (text) => new Paragraph({
  spacing: { before: 200, after: 120 },
  children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: C.accent })],
});

const p = (text, opts = {}) => new Paragraph({
  spacing: { after: 120 },
  ...opts.pOpts,
  children: [new TextRun({ text, font: FONT, size: 20, color: C.dark, ...opts })],
});

const bold = (text) => new TextRun({ text, font: FONT, size: 20, bold: true, color: C.dark });
const normal = (text) => new TextRun({ text, font: FONT, size: 20, color: C.dark });
const gray = (text) => new TextRun({ text, font: FONT, size: 18, color: C.gray, italics: true });

const mixed = (runs, opts = {}) => new Paragraph({
  spacing: { after: 120 },
  ...opts,
  children: runs,
});

const bullet = (text, ref = "bullets") => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 80 },
  children: [new TextRun({ text, font: FONT, size: 20, color: C.dark })],
});

const step = (text, ref = "steps") => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 100 },
  children: [new TextRun({ text, font: FONT, size: 20, color: C.dark })],
});

const stepBold = (label, desc, ref = "steps") => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 100 },
  children: [
    new TextRun({ text: label, font: FONT, size: 20, bold: true, color: C.dark }),
    new TextRun({ text: " " + desc, font: FONT, size: 20, color: C.dark }),
  ],
});

const tip = (text) => new Paragraph({
  spacing: { before: 80, after: 120 },
  indent: { left: 360 },
  border: { left: { style: BorderStyle.SINGLE, size: 8, color: C.primary, space: 8 } },
  children: [
    new TextRun({ text: "Dica: ", font: FONT, size: 19, bold: true, color: C.primary }),
    new TextRun({ text, font: FONT, size: 19, color: C.gray }),
  ],
});

const spacer = () => new Paragraph({ spacing: { after: 60 }, children: [] });

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

const headerCell = (text, width) => new TableCell({
  borders, width: { size: width, type: WidthType.DXA },
  shading: { fill: C.primary, type: ShadingType.CLEAR },
  margins: cellMargins,
  verticalAlign: "center",
  children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18, bold: true, color: C.white })] })],
});

const cell = (text, width, opts = {}) => new TableCell({
  borders, width: { size: width, type: WidthType.DXA },
  margins: cellMargins,
  shading: opts.shade ? { fill: C.lightGray, type: ShadingType.CLEAR } : undefined,
  children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18, color: C.dark })] })],
});

const simpleTable = (headers, rows, widths) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: widths,
  rows: [
    new TableRow({ children: headers.map((h, i) => headerCell(h, widths[i])) }),
    ...rows.map((row, ri) => new TableRow({
      children: row.map((c, ci) => cell(c, widths[ci], { shade: ri % 2 === 1 })),
    })),
  ],
});

// ─── DOCUMENT ────────────────────────────────────────────────────
const children = [];

// ── COVER PAGE ───────────────────────────────────────────────────
if (logoData) {
  children.push(new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [
    new ImageRun({ type: "png", data: logoData, transformation: { width: 120, height: 120 },
      altText: { title: "GeoTask Pro", description: "Logo", name: "logo" } }),
  ]}));
}

children.push(
  new Paragraph({ spacing: { before: logoData ? 400 : 3200, after: 200 }, alignment: AlignmentType.CENTER, children: [
    new TextRun({ text: "GeoTask Pro", font: FONT, size: 56, bold: true, color: C.primary }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [
    new TextRun({ text: "Manual do Utilizador", font: FONT, size: 32, color: C.dark }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [
    new TextRun({ text: "Guia completo de funcionalidades", font: FONT, size: 22, color: C.gray }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
    new TextRun({ text: `Vers\u00e3o 1.0  \u2014  Abril 2026`, font: FONT, size: 20, color: C.gray }),
  ]}),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── SUMARIO ──────────────────────────────────────────────────────
children.push(
  h1("Sum\u00e1rio"),
  p("1. Acesso ao Sistema (Login)"),
  p("2. Navega\u00e7\u00e3o Principal"),
  p("3. Dashboard"),
  p("4. Gerenciamento de Tarefas"),
  p("5. Criando Tarefas e Subtarefas"),
  p("6. Manipulando Tarefas (Status)"),
  p("7. Filtros e Busca"),
  p("8. Coment\u00e1rios e Men\u00e7\u00f5es"),
  p("9. Equipes (Times)"),
  p("10. Templates"),
  p("11. Notifica\u00e7\u00f5es"),
  p("12. Configura\u00e7\u00f5es e Administra\u00e7\u00e3o"),
  p("13. Atalhos e Dicas R\u00e1pidas"),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 1. LOGIN ─────────────────────────────────────────────────────
children.push(
  h1("1. Acesso ao Sistema"),
  p("O GeoTask Pro utiliza autentica\u00e7\u00e3o por e-mail e senha. No primeiro acesso, o sistema solicitar\u00e1 a troca obrigat\u00f3ria de senha."),
  spacer(),
  h2("Como fazer login"),
  stepBold("Acesse a URL", "do sistema no navegador.", "steps"),
  stepBold("Informe seu e-mail", "cadastrado pelo administrador.", "steps"),
  stepBold("Digite sua senha.", "Na primeira vez, use a senha tempor\u00e1ria fornecida.", "steps"),
  stepBold("Clique em Entrar.", "", "steps"),
  stepBold("Se for o primeiro acesso,", "defina uma nova senha segura.", "steps"),
  spacer(),
  tip("Sua sess\u00e3o \u00e9 mantida automaticamente. Para sair, clique no seu nome no menu lateral e selecione Sair."),
  spacer(),

  simpleTable(
    ["Cargo", "N\u00edvel de Acesso"],
    [
      ["Admin / Gerente / Diretor", "Acesso total \u2014 v\u00ea todas as tarefas e configura\u00e7\u00f5es"],
      ["Coordenador de Polo", "Tarefas do seu time + pr\u00f3prias"],
      ["Coordenador de Setores", "Tarefas do seu setor + pr\u00f3prias"],
      ["Gestor", "Tarefas atribu\u00eddas + setor"],
      ["Liderado", "Apenas tarefas atribu\u00eddas a si"],
    ],
    [3500, 5860],
  ),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 2. NAVEGACAO ─────────────────────────────────────────────────
children.push(
  h1("2. Navega\u00e7\u00e3o Principal"),
  p("O menu lateral (sidebar) \u00e9 o ponto central de navega\u00e7\u00e3o. Ele se adapta ao tamanho da tela e pode ser recolhido."),
  spacer(),
  simpleTable(
    ["Menu", "Fun\u00e7\u00e3o"],
    [
      ["Dashboard", "Vis\u00e3o geral com gr\u00e1ficos e KPIs"],
      ["Minhas Tarefas", "Gerenciar tarefas em 4 visualiza\u00e7\u00f5es"],
      ["Notifica\u00e7\u00f5es", "Alertas de atribui\u00e7\u00f5es, men\u00e7\u00f5es e atrasos"],
      ["Templates", "Modelos reutiliz\u00e1veis de tarefas"],
      ["Log de Atividades", "Hist\u00f3rico de a\u00e7\u00f5es de todos os usu\u00e1rios"],
      ["Configura\u00e7\u00f5es", "Usu\u00e1rios, cargos, setores, times, localidades"],
    ],
    [3200, 6160],
  ),
  spacer(),
  tip("Use o \u00edcone de lua/sol no canto inferior do menu para alternar entre modo claro e escuro."),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 3. DASHBOARD ─────────────────────────────────────────────────
children.push(
  h1("3. Dashboard"),
  p("O Dashboard oferece uma vis\u00e3o consolidada do andamento de todas as tarefas com gr\u00e1ficos interativos."),
  spacer(),
  h2("O que voc\u00ea encontra"),
  bullet("Total de tarefas por status (A Fazer, Em Andamento, Pausado, Conclu\u00eddo)"),
  bullet("Distribui\u00e7\u00e3o por prioridade e tipo"),
  bullet("Desempenho por setor e por usu\u00e1rio"),
  bullet("Tempo m\u00e9dio de conclus\u00e3o"),
  bullet("Filtros por time, setor e per\u00edodo"),
  spacer(),
  h2("Exportando dados"),
  mixed([
    normal("Clique no bot\u00e3o "),
    bold("Exportar"),
    normal(" para gerar um relat\u00f3rio Excel com os KPIs filtrados. Tamb\u00e9m \u00e9 poss\u00edvel gerar relat\u00f3rios com IA clicando em "),
    bold("Relat\u00f3rio IA"),
    normal("."),
  ]),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 4. GERENCIAMENTO DE TAREFAS ──────────────────────────────────
children.push(
  h1("4. Gerenciamento de Tarefas"),
  p("A \u00e1rea Minhas Tarefas \u00e9 o cora\u00e7\u00e3o do sistema. Ela oferece 4 modos de visualiza\u00e7\u00e3o:"),
  spacer(),
  simpleTable(
    ["Visualiza\u00e7\u00e3o", "Descri\u00e7\u00e3o", "Melhor para"],
    [
      ["Kanban", "Colunas por status com drag-and-drop", "Vis\u00e3o r\u00e1pida do fluxo"],
      ["Lista", "Tabela ordenavel com colunas", "An\u00e1lise detalhada"],
      ["Cronograma", "Linha do tempo estilo Gantt", "Planejamento de prazos"],
      ["Mapa Mental", "Hierarquia Contrato \u2192 Cidade \u2192 Bairro", "Vis\u00e3o geogr\u00e1fica"],
    ],
    [2000, 4000, 3360],
  ),
  spacer(),
  h2("Kanban (Arrastar e Soltar)"),
  p("No modo Kanban, as tarefas s\u00e3o organizadas em colunas por status. Para mover uma tarefa:"),
  stepBold("Clique e segure", "o card da tarefa.", "steps2"),
  stepBold("Arraste", "para a coluna de destino (ex: de \"A Fazer\" para \"Em Andamento\").", "steps2"),
  stepBold("Solte", "o card. O status \u00e9 atualizado automaticamente.", "steps2"),
  spacer(),
  h2("Detalhes da Tarefa"),
  mixed([
    normal("Clique em qualquer tarefa para abrir o "),
    bold("Modal de Detalhes"),
    normal(" com 4 abas:"),
  ]),
  bullet("Dados \u2014 Visualizar e editar todos os campos"),
  bullet("Coment\u00e1rios \u2014 Adicionar coment\u00e1rios e mencionar usu\u00e1rios"),
  bullet("Hist\u00f3rico \u2014 Audit trail de todas as altera\u00e7\u00f5es"),
  bullet("Anexos \u2014 Upload e download de arquivos"),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 5. CRIANDO TAREFAS ──────────────────────────────────────────
children.push(
  h1("5. Criando Tarefas e Subtarefas"),
  spacer(),
  h2("Criando uma Nova Tarefa"),
  stepBold("Clique no bot\u00e3o", "\"+\" ou \"Nova Tarefa\" no canto superior.", "steps3"),
  stepBold("Preencha o t\u00edtulo", "(obrigat\u00f3rio).", "steps3"),
  stepBold("Defina a prioridade:", "Alta, M\u00e9dia ou Baixa.", "steps3"),
  stepBold("Selecione o tipo de tarefa", "(ex: Vistoria, Cadastro).", "steps3"),
  stepBold("Defina o prazo", "(deadline) no calend\u00e1rio.", "steps3"),
  stepBold("Selecione o contrato", "vinculado.", "steps3"),
  stepBold("Preencha a localiza\u00e7\u00e3o:", "Cidade, Bairro, N\u00facleo, Quadra, Lote.", "steps3"),
  stepBold("Atribua o setor", "respons\u00e1vel.", "steps3"),
  stepBold("Selecione o respons\u00e1vel", "(filtrado por setor).", "steps3"),
  stepBold("Adicione colaboradores", "(coworkers) se necess\u00e1rio.", "steps3"),
  stepBold("Clique em Salvar.", "", "steps3"),
  spacer(),
  tip("Voc\u00ea pode usar um Template para preencher automaticamente todos os campos. Selecione o template desejado no topo do formul\u00e1rio."),
  spacer(),

  h2("Adicionando Subtarefas"),
  p("Subtarefas s\u00e3o tarefas filhas que comp\u00f5em uma tarefa principal. Quando todas as subtarefas s\u00e3o conclu\u00eddas, a tarefa pai \u00e9 automaticamente marcada como conclu\u00edda."),
  spacer(),
  stepBold("Ao criar a tarefa,", "role at\u00e9 a se\u00e7\u00e3o Subtarefas.", "steps4"),
  stepBold("Clique em", "\"Adicionar Subtarefa\".", "steps4"),
  stepBold("Preencha t\u00edtulo,", "setor e respons\u00e1vel da subtarefa.", "steps4"),
  stepBold("Repita", "para adicionar mais subtarefas.", "steps4"),
  stepBold("Cada subtarefa", "pode ter seu pr\u00f3prio respons\u00e1vel e descri\u00e7\u00e3o.", "steps4"),
  spacer(),
  tip("Tamb\u00e9m \u00e9 poss\u00edvel adicionar subtarefas ap\u00f3s a cria\u00e7\u00e3o, abrindo a tarefa e editando na aba Dados."),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 6. MANIPULANDO TAREFAS ──────────────────────────────────────
children.push(
  h1("6. Manipulando Tarefas (Status)"),
  p("Cada tarefa passa por um fluxo de status. Voc\u00ea pode alter\u00e1-lo de diversas formas:"),
  spacer(),
  simpleTable(
    ["A\u00e7\u00e3o", "\u00cdcone", "O que acontece"],
    [
      ["Iniciar", "\u25B6 (Play)", "Muda para \"Em Andamento\", marca hora de in\u00edcio"],
      ["Pausar", "\u23F8 (Pause)", "Muda para \"Pausado\", registra pausa"],
      ["Retomar", "\u25B6 (Play)", "Volta para \"Em Andamento\", encerra pausa"],
      ["Concluir", "\u2714 (Check)", "Muda para \"Conclu\u00eddo\", calcula tempo total"],
      ["Resetar", "\u21BA (Reset)", "Volta para \"A Fazer\" (requer senha)"],
      ["Excluir", "\uD83D\uDDD1 (Lixeira)", "Remove a tarefa (requer senha)"],
    ],
    [1800, 2000, 5560],
  ),
  spacer(),
  h2("Formas de alterar status"),
  bullet("Kanban: Arraste o card entre colunas"),
  bullet("Card: Clique nos bot\u00f5es de a\u00e7\u00e3o diretamente no card"),
  bullet("Modal: Abra a tarefa e use os bot\u00f5es no topo"),
  spacer(),
  h2("Controle de Tempo"),
  p("O sistema calcula automaticamente o tempo gasto em cada tarefa:"),
  bullet("Ao iniciar, o cron\u00f4metro come\u00e7a"),
  bullet("Pausas s\u00e3o descontadas do tempo total"),
  bullet("Ao concluir, o tempo l\u00edquido \u00e9 registrado"),
  spacer(),
  tip("Gestores podem editar datas retroativamente (in\u00edcio, conclus\u00e3o, pausas) no modal de detalhes."),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 7. FILTROS ──────────────────────────────────────────────────
children.push(
  h1("7. Filtros e Busca"),
  p("O sistema oferece filtros avan\u00e7ados para localizar tarefas rapidamente."),
  spacer(),
  h2("Filtros dispon\u00edveis"),
  simpleTable(
    ["Filtro", "Descri\u00e7\u00e3o"],
    [
      ["Busca por texto", "Pesquisa no t\u00edtulo da tarefa"],
      ["Status", "A Fazer, Em Andamento, Pausado, Conclu\u00eddo"],
      ["Prioridade", "Alta, M\u00e9dia, Baixa"],
      ["Setor", "Filtrar por um ou mais setores"],
      ["Situa\u00e7\u00e3o", "Dentro do Prazo, Pr\u00f3ximo, Em Atraso, Entregue no Prazo"],
      ["Contrato", "Filtrar por contrato espec\u00edfico"],
      ["Cidade / Bairro", "Sele\u00e7\u00e3o em cascata"],
      ["Tipo de Tarefa", "Agrupado por setor"],
      ["Respons\u00e1vel", "Agrupado por setor"],
      ["Time / Polo", "Filtrar por equipe"],
      ["Per\u00edodo", "Data de cria\u00e7\u00e3o ou prazo"],
      ["Criadas por mim", "Toggle para ver apenas suas cria\u00e7\u00f5es"],
      ["Mostrar Subtarefas", "Incluir subtarefas nos resultados"],
    ],
    [3000, 6360],
  ),
  spacer(),
  h2("Como usar os filtros"),
  stepBold("Na barra superior,", "use a busca r\u00e1pida por t\u00edtulo.", "steps5"),
  stepBold("Clique em \"Filtros\"", "para expandir os filtros avan\u00e7ados.", "steps5"),
  stepBold("Selecione os crit\u00e9rios", "desejados. Os resultados atualizam em tempo real.", "steps5"),
  stepBold("O badge", "ao lado de \"Filtros\" mostra quantos filtros est\u00e3o ativos.", "steps5"),
  stepBold("Clique em \"Limpar\"", "para resetar todos os filtros.", "steps5"),
  spacer(),
  tip("Os filtros do Dashboard s\u00e3o independentes dos filtros de Minhas Tarefas. Cada \u00e1rea mant\u00e9m seu pr\u00f3prio estado."),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 8. COMENTARIOS ──────────────────────────────────────────────
children.push(
  h1("8. Coment\u00e1rios e Men\u00e7\u00f5es"),
  p("Cada tarefa possui uma aba de coment\u00e1rios para comunica\u00e7\u00e3o da equipe."),
  spacer(),
  h2("Adicionando um coment\u00e1rio"),
  stepBold("Abra a tarefa", "clicando nela.", "steps6"),
  stepBold("V\u00e1 at\u00e9 a aba", "\"Coment\u00e1rios\".", "steps6"),
  stepBold("Digite seu coment\u00e1rio", "na caixa de texto.", "steps6"),
  stepBold("Clique em Enviar", "ou pressione Enter.", "steps6"),
  spacer(),
  h2("Mencionando usu\u00e1rios"),
  mixed([
    normal("Para notificar algu\u00e9m diretamente, use "),
    bold("@nome"),
    normal(" no coment\u00e1rio:"),
  ]),
  bullet("Digite @ seguido do nome do usu\u00e1rio"),
  bullet("Uma lista de sugest\u00f5es aparecer\u00e1 automaticamente"),
  bullet("Selecione o usu\u00e1rio desejado"),
  bullet("O usu\u00e1rio mencionado receber\u00e1 uma notifica\u00e7\u00e3o"),
  spacer(),
  h2("Mencionando setores"),
  mixed([
    normal("Use "),
    bold("@#nomeDoSetor"),
    normal(" para notificar todos os gestores de um setor espec\u00edfico."),
  ]),
  spacer(),
  tip("Coment\u00e1rios aparecem com avatar, nome e data/hora. Eles ficam no hist\u00f3rico permanente da tarefa."),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 9. EQUIPES ──────────────────────────────────────────────────
children.push(
  h1("9. Equipes (Times)"),
  p("Times permitem agrupar usu\u00e1rios de diferentes setores para trabalhar juntos. Eles s\u00e3o usados como filtro em tarefas e no dashboard."),
  spacer(),
  h2("Criando um Time"),
  stepBold("V\u00e1 em", "Configura\u00e7\u00f5es \u2192 Times.", "steps7"),
  stepBold("Clique em", "\"Novo Time\".", "steps7"),
  stepBold("D\u00ea um nome", "ao time (ex: \"Polo Norte\").", "steps7"),
  stepBold("Salve.", "", "steps7"),
  spacer(),
  h2("Gerenciando membros"),
  stepBold("Na lista de times,", "clique em \"Gerenciar Membros\".", "steps8"),
  stepBold("Pesquise e selecione", "os usu\u00e1rios desejados.", "steps8"),
  stepBold("Use os bot\u00f5es", "para adicionar ou remover membros.", "steps8"),
  stepBold("Salve as altera\u00e7\u00f5es.", "", "steps8"),
  spacer(),
  h2("Adicionando colaboradores a uma tarefa"),
  p("Ao criar ou editar uma tarefa, clique em \"Colaboradores\" para abrir o seletor de equipe. Voc\u00ea pode buscar por nome e filtrar por setor. Todos os colaboradores adicionados receber\u00e3o notifica\u00e7\u00e3o e poder\u00e3o ver a tarefa."),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 10. TEMPLATES ───────────────────────────────────────────────
children.push(
  h1("10. Templates"),
  p("Templates s\u00e3o modelos de tarefa reutiliz\u00e1veis. Ideais para tarefas recorrentes com a mesma estrutura."),
  spacer(),
  h2("Criando um Template"),
  bullet("V\u00e1 em Templates no menu lateral"),
  bullet("Clique em \"Novo Template\""),
  bullet("Defina: nome do template, setor, campos padr\u00e3o da tarefa principal"),
  bullet("Adicione subtarefas-modelo com seus pr\u00f3prios campos"),
  bullet("Salve o template"),
  spacer(),
  h2("Usando um Template"),
  mixed([
    normal("Ao criar uma nova tarefa, selecione o template desejado no topo do formul\u00e1rio. Todos os campos ser\u00e3o "),
    bold("preenchidos automaticamente"),
    normal(". Voc\u00ea pode editar qualquer campo antes de salvar."),
  ]),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 11. NOTIFICACOES ────────────────────────────────────────────
children.push(
  h1("11. Notifica\u00e7\u00f5es"),
  p("O sistema notifica voc\u00ea em tempo real sobre eventos importantes."),
  spacer(),
  simpleTable(
    ["Tipo", "Quando voc\u00ea recebe"],
    [
      ["Tarefa Atribu\u00edda", "Quando algu\u00e9m designa uma tarefa a voc\u00ea"],
      ["Tarefa Conclu\u00edda", "Quando uma tarefa que voc\u00ea criou \u00e9 finalizada"],
      ["Tarefa Atrasada", "Quando uma tarefa passa do prazo"],
      ["Men\u00e7\u00e3o", "Quando algu\u00e9m usa @seuNome num coment\u00e1rio"],
      ["Subtarefa Finalizada", "Quando uma subtarefa vinculada \u00e9 conclu\u00edda"],
    ],
    [3500, 5860],
  ),
  spacer(),
  bullet("O badge vermelho no menu mostra quantas notifica\u00e7\u00f5es n\u00e3o lidas voc\u00ea tem"),
  bullet("Clique na notifica\u00e7\u00e3o para ir direto \u00e0 tarefa"),
  bullet("Use \"Marcar todas como lidas\" para limpar"),
  spacer(),
  tip("As notifica\u00e7\u00f5es chegam em tempo real via conex\u00e3o SSE \u2014 n\u00e3o \u00e9 preciso atualizar a p\u00e1gina."),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 12. CONFIGURACOES ───────────────────────────────────────────
children.push(
  h1("12. Configura\u00e7\u00f5es e Administra\u00e7\u00e3o"),
  p("A \u00e1rea de Configura\u00e7\u00f5es (acess\u00edvel para Admins/Gestores) permite gerenciar toda a estrutura do sistema."),
  spacer(),
  simpleTable(
    ["Se\u00e7\u00e3o", "O que gerenciar"],
    [
      ["Minha Conta", "Alterar nome, e-mail e senha"],
      ["Usu\u00e1rios", "Criar, editar, importar via Excel, ativar/desativar"],
      ["Cargos", "Criar cargos e definir permiss\u00f5es granulares"],
      ["Setores", "Criar e organizar setores da empresa"],
      ["Times / Polos", "Criar times e gerenciar membros"],
      ["Tipos de Tarefa", "Definir tipos (Vistoria, Cadastro, etc.)"],
      ["Localidades", "Cadastrar cidades e bairros"],
      ["Permiss\u00f5es", "Matriz de permiss\u00f5es por cargo"],
    ],
    [3200, 6160],
  ),
  spacer(),
  h2("Importando usu\u00e1rios"),
  mixed([
    normal("Em Usu\u00e1rios, clique em "),
    bold("Importar"),
    normal(" para carregar uma planilha Excel com os dados dos usu\u00e1rios (nome, e-mail, cargo, setor). O sistema mapeia automaticamente as colunas."),
  ]),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── 13. DICAS ───────────────────────────────────────────────────
children.push(
  h1("13. Atalhos e Dicas R\u00e1pidas"),
  spacer(),
  simpleTable(
    ["Atalho / A\u00e7\u00e3o", "Resultado"],
    [
      ["ESC", "Fechar modal aberto"],
      ["Modo Escuro", "\u00cdcone lua/sol no menu lateral"],
      ["Arrastar card no Kanban", "Muda status automaticamente"],
      ["@nome no coment\u00e1rio", "Menciona e notifica o usu\u00e1rio"],
      ["@#setor no coment\u00e1rio", "Notifica gestores do setor"],
      ["Bot\u00e3o Exportar", "Gera relat\u00f3rio Excel da visualiza\u00e7\u00e3o atual"],
      ["Filtro \"Criadas por mim\"", "Mostra apenas tarefas que voc\u00ea criou"],
    ],
    [4000, 5360],
  ),
  spacer(),
  spacer(),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [
    new TextRun({ text: "\u2014  Fim do Manual  \u2014", font: FONT, size: 22, color: C.gray, italics: true }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [
    new TextRun({ text: "D\u00favidas? Entre em contato com o administrador do sistema.", font: FONT, size: 18, color: C.gray }),
  ]}),
);

// ─── BUILD DOCUMENT ──────────────────────────────────────────────
const doc = new Document({
  numbering,
  styles: {
    default: { document: { run: { font: FONT, size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: C.dark },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: C.primaryDark },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1418 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: "GeoTask Pro", font: FONT, size: 16, bold: true, color: C.primary }),
            new TextRun({ text: "\tManual do Utilizador", font: FONT, size: 16, color: C.gray }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border, space: 4 } },
          children: [
            new TextRun({ text: "P\u00e1gina ", font: FONT, size: 16, color: C.gray }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.gray }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = "Manual_GeoTask_Pro.docx";
  fs.writeFileSync(outPath, buffer);
  console.log(`Manual gerado: ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
});
