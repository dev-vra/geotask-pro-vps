import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "A chave XAI_API_KEY não está configurada." },
        { status: 500 },
      );
    }

    const body = await req.json();
    const {
      analyses = ["weekly"],
      customMessage = "",
      periodDays = 7,
      userId,
      userName,
    }: {
      analyses: string[];
      customMessage: string;
      periodDays: number;
      userId?: number;
      userName?: string;
    } = body;

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
    });

    // ─── Janela de tempo ───────────────────────────────────────────────────────
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // ─── Buscar dados ──────────────────────────────────────────────────────────
    const [tasks, contracts, sectors] = await Promise.all([
      prisma.task.findMany({
        where: {
          OR: [
            { created_at: { gte: since } },
            { completed_at: { gte: since } },
            { status: { not: "Concluído" } },
          ],
        },
        include: {
          Sector: true,
          responsible: true,
          contract: true,
          subtasks: true,
          history: { orderBy: { created_at: "desc" }, take: 5, include: { user: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.contract.findMany({ include: { tasks: true } }),
      prisma.sector.findMany(),
    ]);

    // ─── Estatísticas gerais ───────────────────────────────────────────────────
    const stats = {
      total: tasks.length,
      created: tasks.filter((t) => t.created_at >= since).length,
      completed: tasks.filter((t) => t.completed_at && t.completed_at >= since)
        .length,
      pending: tasks.filter((t) => t.status !== "Concluído").length,
      overdue: tasks.filter(
        (t) =>
          t.deadline &&
          new Date(t.deadline) < new Date() &&
          t.status !== "Concluído",
      ).length,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      bySector: {} as Record<string, number>,
      byContract: {} as Record<string, number>,
    };

    tasks.forEach((t) => {
      stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;
      if (t.priority)
        stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;
      if (t.Sector?.name)
        stats.bySector[t.Sector.name] =
          (stats.bySector[t.Sector.name] || 0) + 1;
      if (t.contract?.name)
        stats.byContract[t.contract.name] =
          (stats.byContract[t.contract.name] || 0) + 1;
    });

    // ─── Montar seções do prompt ───────────────────────────────────────────────
    const sections: string[] = [];

    sections.push(`
## CONTEXTO DO SISTEMA
Você é o assistente inteligente do GeoTask Pro, sistema de gestão de tarefas de uma empresa de regularização fundiária urbana, que atua em licitações públicas.
Período analisado: últimos ${periodDays} dias (de ${since.toLocaleDateString("pt-BR")} até hoje).
Responda SEMPRE em português do Brasil, usando Markdown com seções bem formatadas.
Pense que quem vai utilizar relatório são os Gestores de cada setor, Gerente, Cordenador e Ceo, o intuito principal é saber como está o andamento das tarefas, prazos, tempo de execução, gargalos e o que precisa ser feito para melhorar.
`);

    // ANÁLISE SEMANAL / GERAL
    if (analyses.includes("weekly") || analyses.includes("general")) {
      sections.push(`
## DADOS GERAIS DO PERÍODO
- Total de tarefas no sistema: ${stats.total}
- Novas tarefas criadas: ${stats.created}
- Tarefas concluídas: ${stats.completed}
- Tarefas pendentes: ${stats.pending}
- Tarefas atrasadas (prazo vencido): ${stats.overdue}

**Por Status:** ${JSON.stringify(stats.byStatus)}
**Por Prioridade:** ${JSON.stringify(stats.byPriority)}
**Por Setor:** ${JSON.stringify(stats.bySector)}

Gere um **Relatório Semanal** com: resumo executivo, principais realizações, pontos de atenção, tarefas atrasadas, tarefas pendentes, tarefas concluídas, tempo médio de execução, tempo médio de conclusão, tempo médio de atraso, tempo médio de pendência, tempo médio de conclusão.
`);
    }

    // ANÁLISE POR SETOR
    if (analyses.includes("sector")) {
      const sectorDetail = sectors.map((s) => {
        const sectorTasks = tasks.filter((t) => t.sector_id === s.id);
        return {
          sector: s.name,
          total: sectorTasks.length,
          completed: sectorTasks.filter((t) => t.status === "Concluído").length,
          pending: sectorTasks.filter((t) => t.status !== "Concluído").length,
          overdue: sectorTasks.filter(
            (t) =>
              t.deadline &&
              new Date(t.deadline) < new Date() &&
              t.status !== "Concluído",
          ).length,
        };
      });
      sections.push(`
## ANÁLISE POR SETOR
${JSON.stringify(sectorDetail, null, 2)}

Gere uma **Análise por Setor**: identifique setores com melhor e pior desempenho, identifique o que foi feito por cada um no setor durante a semana, como um cronograma de atividades semanal de cada um no setor, identifique gargalos, tempo ocioso, tempo de execução e tempo médio de conclusão.
`);
    }

    // PRIORIZAÇÃO / ORGANIZAÇÃO DE TAREFAS
    if (analyses.includes("priorities")) {
      const urgentPending = tasks
        .filter((t) => t.status !== "Concluído")
        .sort((a, b) => {
          const pa =
            a.priority === "Urgente" ? 0 : a.priority === "Alta" ? 1 : 2;
          const pb =
            b.priority === "Urgente" ? 0 : b.priority === "Alta" ? 1 : 2;
          return pa - pb;
        })
        .slice(0, 15)
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          sector: t.Sector?.name,
          responsible: t.responsible?.name,
          deadline: t.deadline?.toLocaleDateString("pt-BR"),
          contract: t.contract?.name,
        }));

      sections.push(`
## ANÁLISE DE PRIORIZAÇÃO
Tarefas pendentes mais críticas:
${JSON.stringify(urgentPending, null, 2)}

Gere uma **Análise e Sugestão de Priorização**: sugira a ordem de execução ideal de acordo com a prioridade, prazo, setor, responsável e contrato, identifique riscos baseado em tarefas semelhantes que ja foram concluidas e seus prazos/tempo de execução.
`);
    }

    // ANÁLISE DE CONTRATOS
    if (analyses.includes("contracts")) {
      const contractAnalysis = contracts.map((c) => {
        const ctTasks = c.tasks;
        return {
          contract: c.name,
          total: ctTasks.length,
          completed: ctTasks.filter((t) => t.status === "Concluído").length,
          pending: ctTasks.filter((t) => t.status !== "Concluído").length,
          completionRate:
            ctTasks.length > 0
              ? `${Math.round((ctTasks.filter((t) => t.status === "Concluído").length / ctTasks.length) * 100)}%`
              : "0%",
          overdue: ctTasks.filter(
            (t) =>
              t.deadline &&
              new Date(t.deadline) < new Date() &&
              t.status !== "Concluído",
          ).length,
        };
      });

      sections.push(`
## ANÁLISE DE CONTRATOS
${JSON.stringify(contractAnalysis, null, 2)}

Gere uma **Análise de Contratos**: destaque contratos com baixo índice de conclusão, riscos, tempo médio de execução, tempo médio de conclusão, tempo médio de atraso, tempo médio de pendência, tempo médio de conclusão, setores e usuário com mais tarefas concluidas e pendentes.
`);
    }

    // RESUMO DOS RESPONSÁVEIS
    if (analyses.includes("responsible")) {
      const byResponsible: Record<
        string,
        { total: number; completed: number; pending: number; overdue: number }
      > = {};
      tasks.forEach((t) => {
        const name = t.responsible?.name || "Sem responsável";
        if (!byResponsible[name])
          byResponsible[name] = {
            total: 0,
            completed: 0,
            pending: 0,
            overdue: 0,
          };
        byResponsible[name].total++;
        if (t.status === "Concluído") byResponsible[name].completed++;
        else byResponsible[name].pending++;
        if (
          t.deadline &&
          new Date(t.deadline) < new Date() &&
          t.status !== "Concluído"
        )
          byResponsible[name].overdue++;
      });

      sections.push(`
## ANÁLISE POR RESPONSÁVEL
${JSON.stringify(byResponsible, null, 2)}

Gere uma **Análise de Desempenho por Responsável**: identifique quem está sobrecarregado, quem tem melhor produtividade, e sugira redistribuição de carga se necessário.
`);
    }

    // RELATÓRIO DE EXECUÇÃO DIÁRIA
    if (analyses.includes("execution")) {
      const executionData: Record<string, Record<string, any[]>> = {};

      tasks.forEach((t) => {
        const sectorName = t.Sector?.name || "Sem setor";
        const responsibleName = t.responsible?.name || "Sem responsável";
        
        if (!executionData[sectorName]) executionData[sectorName] = {};
        if (!executionData[sectorName][responsibleName]) {
          executionData[sectorName][responsibleName] = [];
        }

        // Add task data 
        const executionInfo = {
          task_id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          created_at: t.created_at,
          completed_at: t.completed_at,
          history_updates: t.history.map((h: any) => ({
            date: h.created_at,
            field_changed: h.field,
            old: h.old_value,
            new: h.new_value,
            user: h.user?.name || "Sistema"
          }))
        };
        
        executionData[sectorName][responsibleName].push(executionInfo);
      });

      sections.push(`
## EXECUÇÃO DIÁRIA (POR SETOR E USUÁRIO)
${JSON.stringify(executionData, null, 2)}

Gere um detalhado **Relatório de Execução Diária**: 
1. Quebre detalhadamente (em formato de linha do tempo ou cronograma diário - Ex: Segunda, Terça, Quarta) o que os usuários de cada setor fizeram durante a semana, usando as datas de "created_at", "completed_at", e os dados de "history_updates".
2. Identifique explicitamente os **períodos de ociosidade** de cada usuário (falta de atualizações ou tarefas ativas no período).
3. Calcule e apresente a **média de tempo por tarefa concluída** para cada usuário com base nas datas das tarefas.
`);
    }

    // MENSAGEM CUSTOMIZADA DO USUÁRIO
    if (customMessage?.trim()) {
      sections.push(`
## SOLICITAÇÃO ESPECIAL DO USUÁRIO
O usuário fez a seguinte solicitação específica. RESPONDA DIRETAMENTE a ela usando os dados já fornecidos acima:

"${customMessage.trim()}"
`);
    }

    // ─── Montar prompt final ───────────────────────────────────────────────────
    const prompt =
      sections.join("\n\n---\n\n") +
      `

---

## INSTRUÇÕES FINAIS
- Responda em Markdown bem estruturado com emojis para facilitar a leitura
- Use tabelas quando houver dados comparativos
- Seja objetivo mas completo
`;

    const completion = await client.chat.completions.create({
      model: "grok-4-1-fast-reasoning",
      messages: [
        {
          role: "system",
          content:
            "Você é o assistente inteligente do GeoTask Pro, sistema de gestão de tarefas geoespaciais. Responda SEMPRE em português do Brasil, usando Markdown com seções bem formatadas. Pense que quem vai utilizar relatório são os Gestores de cada setor, Gerente, Cordenador e Ceo, o intuito principal é saber como está o andamento das tarefas, prazos, tempo de execução, gargalos e o que precisa ser feito para melhorar.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    const text =
      completion.choices[0]?.message?.content || "Sem resposta da IA.";

    logActivity(
      userId || null,
      userName || "Usuário",
      "report_ai_requested",
      "ai_report",
      null,
      `Relatório IA: ${analyses.join(", ")} (${periodDays} dias)`,
    );

    return NextResponse.json({
      report: text,
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Analyze Error:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar a análise com IA.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
