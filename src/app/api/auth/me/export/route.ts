import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { logActivity } from "@/lib/activityLog";

/**
 * GET /api/auth/me/export
 * LGPD: Right to Portability. 
 * Allows users to download all their personal data in JSON format.
 */
export async function GET(req: Request) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Faca login para exportar seus dados" }, { status: 401 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        Role: true,
        Sector: true,
        Team: true,
        tasksResponsible: {
          take: 100, // Limit for performance, user can ask for more if needed
          select: { id: true, title: true, status: true, created_at: true }
        },
        comments: {
          take: 100,
          select: { id: true, content: true, created_at: true }
        },
        activityLogs: {
          take: 50,
          orderBy: { created_at: "desc" }
        }
      }
    });

    if (!userData) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    // Remove sensitive fields
    const exportData = {
      ...userData,
      password_hash: undefined,
    };

    logActivity(
      authUser.id,
      authUser.name,
      "data_export_lgpd",
      "user",
      authUser.id,
      "Exportou seus dados pessoais (LGPD)",
      req
    );

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="geotask_data_${authUser.id}.json"`,
        "Content-Type": "application/json",
      }
    });

  } catch (error) {
    logger.error("Erro ao exportar dados do usuario", { error: String(error) }, req);
    return NextResponse.json({ error: "Erro ao exportar dados" }, { status: 500 });
  }
}
