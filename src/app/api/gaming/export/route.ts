import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import ExcelJS from "exceljs";
import {
  canManageAllGamings,
  getSubordinatesRecursiveIds,
} from "@/lib/gaming/hierarchy";

export async function GET(req: Request) {
  try {
    const userIdHeader = req.headers.get("X-User-Id");
    if (!userIdHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gamingId = searchParams.get("gamingId");
    const exportType = searchParams.get("type") || "xlsx";
    // Podem vir filtros de query (userId, cycle) para relatórios em lote, mas vamos focar em individual primeiro ou todos que ele tem acesso.

    const currentUser = await prisma.user.findUnique({
      where: { id: parseInt(userIdHeader) },
      include: { Role: true, Sector: true },
    });

    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const manageAll = canManageAllGamings(currentUser as any);
    let allowedUserIds: number[] = [];

    if (!manageAll) {
      const subordinateIds = await getSubordinatesRecursiveIds(currentUser.id, prisma as any);
      allowedUserIds = [currentUser.id, ...subordinateIds];
    }

    let whereClause: any = {};
    if (!manageAll) {
      whereClause.user_id = { in: allowedUserIds };
    }

    if (gamingId) {
      whereClause.id = parseInt(gamingId);
    }

    const gamings = await prisma.gaming.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, Sector: { select: { name: true } } } },
        evaluator: { select: { name: true } },
        items: true,
      },
      orderBy: { created_at: "desc" },
    });

    if (gamings.length === 0) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    // Calcular notas
    const data = gamings.map(g => {
        let totalScore = 0;
        const itemsCalc = g.items.map(item => {
            const achieved = item.achieved || 0;
            const target = item.target || 1; 
            const ratio = Math.min(achieved / target, 1.0); // trava em 100%
            const itemScore = ratio * item.weight;
            totalScore += itemScore;
            return {
                ...item,
                itemScore,
                ratio: ratio * 100
            };
        });

        return {
            ...g,
            totalScore,
            itemsCalc
        };
    });

    if (exportType === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Relatório Gaming");

      sheet.columns = [
        { header: "ID Gaming", key: "id", width: 10 },
        { header: "Credenciado", key: "user", width: 30 },
        { header: "Setor", key: "sector", width: 25 },
        { header: "Avaliador", key: "evaluator", width: 30 },
        { header: "Ciclo", key: "cycle", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Nota Final (%)", key: "score", width: 15 },
      ];

      data.forEach((g) => {
        sheet.addRow({
          id: g.id,
          user: g.user.name,
          sector: g.user.Sector?.name || "N/A",
          evaluator: g.evaluator?.name || "N/A",
          cycle: g.cycle_name,
          status: g.status,
          score: g.totalScore.toFixed(2),
        });
      });

      sheet.getRow(1).font = { bold: true };
      
      const buffer = await workbook.xlsx.writeBuffer();
      
      return new NextResponse(buffer, {
        headers: {
          "Content-Disposition": `attachment; filename="relatorio_gaming.xlsx"`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }

    if (exportType === "pdf" || exportType === "html") {
       // Retornar um layout HTML limpo para janela de impressão
       const htmlBuffer = data.map(g => `
          <div style="font-family: Arial, sans-serif; padding: 20px; page-break-after: always;">
             <h2>Fechamento de Gaming - ${g.user.name}</h2>
             <p><strong>Setor:</strong> ${g.user.Sector?.name || 'N/A'}</p>
             <p><strong>Ciclo:</strong> ${g.cycle_name} (${g.cycle_type})</p>
             <p><strong>Gestor Avaliador:</strong> ${g.evaluator?.name || 'N/A'}</p>
             <p><strong>Status:</strong> ${g.status}</p>
             <hr />
             <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                   <tr style="background-color: #f3f4f6; text-align: left;">
                      <th style="padding: 10px; border: 1px solid #ddd;">Descrição</th>
                      <th style="padding: 10px; border: 1px solid #ddd;">Peso (%)</th>
                      <th style="padding: 10px; border: 1px solid #ddd;">Meta</th>
                      <th style="padding: 10px; border: 1px solid #ddd;">Realizado</th>
                      <th style="padding: 10px; border: 1px solid #ddd;">Atingimento</th>
                      <th style="padding: 10px; border: 1px solid #ddd;">Pontuação</th>
                   </tr>
                </thead>
                <tbody>
                   ${g.itemsCalc.map(i => `
                     <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${i.description}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${i.weight}%</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${i.target}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${i.achieved !== null ? i.achieved : '-'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${i.ratio.toFixed(1)}%</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${i.itemScore.toFixed(2)}%</td>
                     </tr>
                   `).join("")}
                </tbody>
             </table>
             <h3 style="text-align: right; margin-top: 20px;">Nota Final Aprovada: <span style="color: #2563eb;">${g.totalScore.toFixed(2)}%</span></h3>
          </div>
       `).join("");

       const fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Gaming Report</title>
              <style>
                  @media print {
                      body { -webkit-print-color-adjust: exact; margin: 0; }
                  }
              </style>
          </head>
          <body onload="window.print()">
              ${htmlBuffer}
          </body>
          </html>
       `;

       return new NextResponse(fullHtml, {
           headers: {
               "Content-Type": "text/html; charset=utf-8"
           }
       });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  } catch (error) {
    console.error("[GAMING_EXPORT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
