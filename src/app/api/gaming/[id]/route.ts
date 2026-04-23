import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  canManageAllGamings,
  getSubordinatesRecursiveIds,
} from "@/lib/gaming/hierarchy";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const currentUser = authResult;

    const gamingId = parseInt(id);

    const gaming = await prisma.gaming.findUnique({
      where: { id: gamingId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        evaluator: { select: { id: true, name: true } },
        items: true,
        history: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { created_at: "desc" },
        },
        snapshots: { orderBy: { created_at: "desc" } },
      },
    });

    if (!gaming) return NextResponse.json({ error: "Gaming not found" }, { status: 404 });

    // Permissions check
    const manageAll = canManageAllGamings(currentUser as any);
    if (!manageAll && gaming.user_id !== currentUser.id) {
      const subordinateIds = await getSubordinatesRecursiveIds(currentUser.id, prisma as any);
      if (!subordinateIds.includes(gaming.user_id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ gaming });
  } catch (error) {
    console.error("[GAMING_GET_ID]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const currentUser = authResult;

    const gamingId = parseInt(id);

    const gaming = await prisma.gaming.findUnique({
      where: { id: gamingId },
      include: { items: true },
    });

    if (!gaming) return NextResponse.json({ error: "Gaming not found" }, { status: 404 });

    if (gaming.status === "CLOSED") {
      return NextResponse.json({ error: "Cannot edit a closed gaming" }, { status: 400 });
    }

    const manageAll = canManageAllGamings(currentUser as any);
    if (!manageAll && gaming.user_id !== currentUser.id) {
      const subordinateIds = await getSubordinatesRecursiveIds(currentUser.id, prisma as any);
      // Ensure the current user is managing this user's gaming
      if (!subordinateIds.includes(gaming.user_id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Only managers or above can edit OTHER's metrics, but if they are the user_id, typically they might not be allowed to edit their own targets?
    if (!manageAll && gaming.user_id === currentUser.id) {
        return NextResponse.json({ error: "Liderados não podem alterar sua própria Gaming." }, { status: 403 });
    }

    const body = await req.json();
    const { items } = body; 

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing items" }, { status: 400 });
    }

    // Process items updates
    const updates = [];
    const changesDetails: any[] = [];

    for (const incomingItem of items) {
      const existingItem = gaming.items.find(i => i.id === incomingItem.id);
      if (existingItem) {
        let changed = false;
        let details: any = { itemId: existingItem.id, field: incomingItem.description };

        // Parse numerical values carefully
        const newTarget = incomingItem.target !== undefined ? parseFloat(incomingItem.target) : existingItem.target;
        const newAchieved = incomingItem.achieved !== undefined && incomingItem.achieved !== null && incomingItem.achieved !== "" ? parseFloat(incomingItem.achieved) : null;
        const newWeight = incomingItem.weight !== undefined ? parseFloat(incomingItem.weight) : existingItem.weight;

        if (existingItem.target !== newTarget) { changed = true; details.oldTarget = existingItem.target; details.newTarget = newTarget; }
        if (existingItem.achieved !== newAchieved) { changed = true; details.oldAchieved = existingItem.achieved; details.newAchieved = newAchieved; }
        if (existingItem.weight !== newWeight) { changed = true; details.oldWeight = existingItem.weight; details.newWeight = newWeight; }

        if (changed) {
          changesDetails.push(details);
          updates.push(
            prisma.gamingItem.update({
              where: { id: existingItem.id },
              data: {
                target: newTarget,
                achieved: newAchieved,
                weight: newWeight,
              }
            })
          );
        }
      }
    }

    if (updates.length > 0) {
      // Registrar no histórico
      updates.push(
        prisma.gamingHistory.create({
          data: {
            gaming_id: gaming.id,
            user_id: currentUser.id,
            action: "UPDATED_ITEM",
            details: changesDetails as any
          }
        })
      );
      
      // Atualizar o 'evaluator_id' e 'updated_at' 
      updates.push(
        prisma.gaming.update({
           where: { id: gaming.id },
           data: { evaluator_id: currentUser.id }
        })
      );

      await prisma.$transaction(updates);
    }

    const updatedGaming = await prisma.gaming.findUnique({
      where: { id: gamingId },
      include: { items: true, history: { orderBy: { created_at: "desc" }, take: 10 } }
    });

    return NextResponse.json({ gaming: updatedGaming });
    
  } catch (error) {
    console.error("[GAMING_PUT_ID]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
