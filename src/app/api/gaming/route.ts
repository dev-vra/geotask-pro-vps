import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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
    const userIdQuery = searchParams.get("userId");
    const cycleQuery = searchParams.get("cycle");
    const statusQuery = searchParams.get("status");
    const sectorQuery = searchParams.get("sectorId");

    const currentUser = await prisma.user.findUnique({
      where: { id: parseInt(userIdHeader) },
      include: { Role: true, Sector: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const manageAll = canManageAllGamings(currentUser as any);
    let allowedUserIds: number[] = [];

    if (!manageAll) {
      const subordinateIds = await getSubordinatesRecursiveIds(
        currentUser.id,
        prisma as any,
      );
      allowedUserIds = [currentUser.id, ...subordinateIds];

      if (userIdQuery) {
        const requestedUserId = parseInt(userIdQuery);
        if (!allowedUserIds.includes(requestedUserId)) {
          return NextResponse.json({ items: [] });
        }
        allowedUserIds = [requestedUserId];
      }
    } else {
      if (userIdQuery) {
        allowedUserIds = [parseInt(userIdQuery)];
      }
    }

    const whereClause: any = {};
    if (allowedUserIds.length > 0) {
      whereClause.user_id = { in: allowedUserIds };
    }
    
    if (cycleQuery) {
      whereClause.cycle_name = {
        contains: cycleQuery,
        mode: "insensitive",
      };
    }
    if (statusQuery) whereClause.status = statusQuery;
    
    if (sectorQuery) {
      whereClause.user = {
        sector_id: parseInt(sectorQuery)
      };
    }

    const gamings = await prisma.gaming.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, avatar: true, Sector: true, Role: true },
        },
        evaluator: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ items: gamings });
  } catch (error: any) {
    console.error("[GAMING_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const userIdHeader = req.headers.get("X-User-Id");
    if (!userIdHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: parseInt(userIdHeader) },
      include: { Role: true, Sector: true },
    });

    if (!currentUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { user_id, cycle_type, cycle_name, items } = body;

    if (!user_id || !cycle_type || !cycle_name || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Bad request: missing fields" },
        { status: 400 },
      );
    }

    const targetUserId = parseInt(user_id);
    const manageAll = canManageAllGamings(currentUser as any);
    
    if (!manageAll && currentUser.id !== targetUserId) {
      const subordinateIds = await getSubordinatesRecursiveIds(
        currentUser.id,
        prisma as any,
      );
      if (!subordinateIds.includes(targetUserId)) {
        return NextResponse.json(
          { error: "Não autorizado a criar Gaming para este credenciado." },
          { status: 403 },
        );
      }
    }

    const newGaming = await prisma.gaming.create({
      data: {
        user_id: targetUserId,
        evaluator_id: currentUser.id,
        cycle_type,
        cycle_name,
        status: "DRAFT",
        items: {
          create: items.map((i: any) => ({
            description: i.description,
            weight: parseFloat(i.weight),
            target: parseFloat(i.target),
            achieved: i.achieved !== undefined && i.achieved !== null && i.achieved !== "" ? parseFloat(i.achieved) : null,
          })),
        },
        history: {
          create: {
            user_id: currentUser.id,
            action: "CREATED",
            details: { message: "Gaming iniciada" } as any,
          },
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ gaming: newGaming }, { status: 201 });
  } catch (err) {
    console.error("[GAMING_POST]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
