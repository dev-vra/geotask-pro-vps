import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Helper: create notifications for all users in a sector
async function notifySector(
  sectorId: number,
  type: string,
  title: string,
  message: string,
  taskId: number,
  commentId?: number,
  excludeUserId?: number,
) {
  try {
    const sectorUsers = await prisma.user.findMany({
      where: {
        sector_id: sectorId,
        NOT: { id: excludeUserId || 0 },
      },
      select: { id: true },
    });

    for (const u of sectorUsers) {
      await prisma.notification.create({
        data: {
          user_id: u.id,
          type,
          title,
          message,
          task_id: taskId,
          comment_id: commentId,
        },
      });
    }
  } catch (e) {
    console.error("Erro ao notificar setor:", e);
  }
}

// Helper: create notification for a single user
async function notifyUser(
  userId: number,
  type: string,
  title: string,
  message: string,
  taskId: number,
  commentId?: number,
) {
  try {
    await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        task_id: taskId,
        comment_id: commentId,
      },
    });
  } catch (e) {
    console.error("Erro ao notificar usuário:", e);
  }
}

// GET /api/comments?task_id=X
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskIdRaw = searchParams.get("task_id");

    if (!taskIdRaw) {
      return NextResponse.json(
        { error: "task_id obrigatório" },
        { status: 400 },
      );
    }

    const taskId = Number(taskIdRaw);

    const comments = await prisma.comment.findMany({
      where: { task_id: taskId },
      include: {
        mentions: {
          include: {
            mentioned_user: {
              select: { name: true },
            },
            Sector: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    // Fetch user names separately since Comment may not have a user relation
    const userIds = [
      ...new Set(comments.map((c) => c.user_id).filter(Boolean)),
    ] as number[];
    const usersMap: Record<number, { name: string; avatar: string | null }> =
      {};
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, avatar: true },
      });
      users.forEach((u) => {
        usersMap[u.id] = { name: u.name, avatar: u.avatar };
      });
    }

    const commentsFormatted = comments.map((c) => ({
      ...c,
      user_name: (c.user_id && usersMap[c.user_id]?.name) || "Anônimo",
      user_avatar: (c.user_id && usersMap[c.user_id]?.avatar) || "?",
    }));

    return NextResponse.json(commentsFormatted);
  } catch (error) {
    console.error("Erro ao buscar comentários:", error);
    return NextResponse.json(
      { error: "Erro ao buscar comentários" },
      { status: 500 },
    );
  }
}

// POST /api/comments
export async function POST(req: Request) {
  try {
    const { task_id, user_id, content } = await req.json();

    if (!task_id || !content) {
      return NextResponse.json(
        { error: "task_id e content são obrigatórios" },
        { status: 400 },
      );
    }

    // 1. Create Comment
    const comment = await prisma.comment.create({
      data: {
        task_id: Number(task_id),
        user_id: user_id ? Number(user_id) : null,
        content,
      },
    });

    const task = await prisma.task.findUnique({
      where: { id: Number(task_id) },
      select: { title: true, sector_id: true },
    });
    const taskTitle = task?.title || "uma tarefa";

    let authorName = "Alguém";
    if (user_id) {
      const u = await prisma.user.findUnique({
        where: { id: Number(user_id) },
      });
      if (u) authorName = u.name;
    }

    // 2. Parse @User Mentions (match full name until space/punctuation, skip @# sector mentions)
    // We use a greedy pattern to capture full names like "João Silva"
    const userMentionRegex =
      /@(?!#)([A-ZÀ-Úa-zà-ú][A-ZÀ-Úa-zà-ú0-9 ]*?)(?=\s{2}|[,.!?\n]|$)/g;
    let match;
    const mentionedUserIds = new Set<number>();

    userMentionRegex.lastIndex = 0;

    while ((match = userMentionRegex.exec(content)) !== null) {
      const namePart = match[1].trim();
      if (!namePart) continue;

      console.log(`[API] Checking mention for: "${namePart}"`);

      // Fuzzy search — find first user whose name contains the mentioned part
      const mentionedUser = await prisma.user.findFirst({
        where: {
          name: { contains: namePart, mode: "insensitive" },
          NOT: { id: user_id ? Number(user_id) : 0 },
        },
      });

      if (mentionedUser) {
        console.log(`[API] User matched: ${mentionedUser.name}`);
        if (!mentionedUserIds.has(mentionedUser.id)) {
          mentionedUserIds.add(mentionedUser.id);

          await prisma.mention.create({
            data: {
              comment_id: comment.id,
              task_id: Number(task_id),
              mention_type: "user",
              mentioned_user_id: mentionedUser.id,
              mentioned_by_id: user_id ? Number(user_id) : null,
            },
          });

          await notifyUser(
            mentionedUser.id,
            "mention",
            "Você foi mencionado",
            `${authorName} mencionou você na tarefa "${taskTitle}".`,
            Number(task_id),
            comment.id,
          );
        }
      }
    }

    // 3. Parse @#Sector Mentions (full sector name until trailing space/punctuation)
    const sectorMentionRegex =
      /@#([A-ZÀ-Úa-zà-ú][A-ZÀ-Úa-zà-ú0-9 ]*?)(?=\s{2}|[,.!?\n]|$)/g;
    const mentionedSectors = new Set<number>();

    // Fetch all sectors for lookup
    const allSectors = await prisma.sector.findMany();

    sectorMentionRegex.lastIndex = 0;
    while ((match = sectorMentionRegex.exec(content)) !== null) {
      const sectorName = match[1].trim();
      if (!sectorName) continue;
      console.log(`[API] Checking sector mention: "${sectorName}"`);

      // Find sector by name (case insensitive, exact or partial)
      const targetSector = allSectors.find(
        (s) =>
          s.name.toLowerCase() === sectorName.toLowerCase() ||
          s.name.toLowerCase().includes(sectorName.toLowerCase()),
      );

      if (targetSector) {
        console.log(`[API] Sector matched: ${targetSector.name}`);
        if (!mentionedSectors.has(targetSector.id)) {
          mentionedSectors.add(targetSector.id);

          await prisma.mention.create({
            data: {
              comment_id: comment.id,
              task_id: Number(task_id),
              mention_type: "sector",
              mentioned_sector_id: targetSector.id,
              mentioned_by_id: user_id ? Number(user_id) : null,
            },
          });

          // Notify all users of that sector
          await notifySector(
            targetSector.id,
            "mention_sector",
            `Menção ao setor ${targetSector.name}`,
            `${authorName} mencionou o setor "${targetSector.name}" na tarefa "${taskTitle}".`,
            Number(task_id),
            comment.id,
            user_id ? Number(user_id) : undefined,
          );
        }
      } else {
        console.log(`[API] No sector match for: "${sectorName}"`);
      }
    }

    logActivity(
      user_id ? Number(user_id) : null,
      authorName,
      "comment_added",
      "comment",
      comment.id,
      `Comentou na tarefa "${taskTitle}"`,
    );

    return NextResponse.json(
      { message: "Comentário adicionado", id: comment.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar comentário:", error);
    return NextResponse.json(
      { error: "Erro ao criar comentário" },
      { status: 500 },
    );
  }
}
