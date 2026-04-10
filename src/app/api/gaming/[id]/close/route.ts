import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  canManageAllGamings,
  getSubordinatesRecursiveIds,
} from "@/lib/gaming/hierarchy";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userIdHeader = req.headers.get("X-User-Id");
    if (!userIdHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gamingId = parseInt(id);

    const currentUser = await prisma.user.findUnique({
      where: { id: parseInt(userIdHeader) },
      include: { Role: true, Sector: true },
    });

    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const gaming = await prisma.gaming.findUnique({
      where: { id: gamingId },
    });

    if (!gaming) return NextResponse.json({ error: "Gaming not found" }, { status: 404 });

    const manageAll = canManageAllGamings(currentUser as any);
    if (!manageAll && gaming.user_id !== currentUser.id) {
      const subordinateIds = await getSubordinatesRecursiveIds(currentUser.id, prisma as any);
      if (!subordinateIds.includes(gaming.user_id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!manageAll && gaming.user_id === currentUser.id) {
        return NextResponse.json({ error: "Liderados não podem fechar sua própria Gaming." }, { status: 403 });
    }

    if (gaming.status === "CLOSED") {
      return NextResponse.json({ error: "Gaming already closed." }, { status: 400 });
    }

    const closedGaming = await prisma.$transaction(async (tx) => {
        const closed = await tx.gaming.update({
            where: { id: gamingId },
            data: {
                status: "CLOSED",
                closed_at: new Date(),
                evaluator_id: currentUser.id,
            }
        });

        await tx.gamingHistory.create({
            data: {
                gaming_id: gamingId,
                user_id: currentUser.id,
                action: "CLOSED",
                details: { message: "Ciclo de Gaming finalizado." } as any
            }
        });

        await tx.gamingSnapshot.create({
            data: {
                gaming_id: gamingId,
                file_url: `/api/gaming/export?gamingId=${gamingId}&type=pdf`,
                file_type: "PDF_REFERENCE"
            }
        });

        return closed;
    });

    return NextResponse.json({ gaming: closedGaming });
  } catch(error) {
    console.error("[GAMING_CLOSE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
