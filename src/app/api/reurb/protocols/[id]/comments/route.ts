import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { createCommentSchema } from "@/lib/validators/reurb";

type Params = { params: Promise<{ id: string }> };

const USER_MENTION_RE = /@(?!#)([A-ZÀ-Úa-zà-ú][A-ZÀ-Úa-zà-ú\s]*?)(?=\s{2}|[,!?\n]|$)/g;
const SECTOR_MENTION_RE = /@#([A-ZÀ-Úa-zà-ú][A-ZÀ-Úa-zà-ú\s]*?)(?=\s{2}|[,!?\n]|$)/g;

export async function GET(req: Request, { params }: Params) {
  const user = await requirePermission(req, (p) => p.reurb.view);
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  const comments = await prisma.reurbComment.findMany({
    where: { solicitacao_id: Number(id) },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      mentions: {
        include: {
          mentioned_user: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: Params) {
  const user = await requirePermission(req, (p) => p.reurb.add_comment);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const solicitacaoId = Number(id);

  const body = await req.json();
  const parsed = createCommentSchema.safeParse({ ...body, solicitacao_id: solicitacaoId });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const comment = await prisma.reurbComment.create({
    data: { content: parsed.data.content, solicitacao_id: solicitacaoId, user_id: (user as any).id },
  });

  // Parse @user mentions
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
  const allSectors = await prisma.sector.findMany({ select: { id: true, name: true } });
  const mentions: any[] = [];

  for (const match of parsed.data.content.matchAll(USER_MENTION_RE)) {
    const mentionedUser = allUsers.find(
      (u) => u.name.toLowerCase().includes(match[1].trim().toLowerCase()),
    );
    if (mentionedUser) {
      mentions.push({
        mention_type: "user", comment_id: comment.id, solicitacao_id: solicitacaoId,
        mentioned_user_id: mentionedUser.id, mentioned_by_id: (user as any).id,
      });
      await prisma.notification.create({
        data: {
          type: "reurb_mention",
          title: `${(user as any).name} mencionou você`,
          message: parsed.data.content.slice(0, 120),
          user_id: mentionedUser.id,
          reurb_protocol_id: solicitacaoId,
          reurb_comment_id: comment.id,
        },
      });
    }
  }

  for (const match of parsed.data.content.matchAll(SECTOR_MENTION_RE)) {
    const sector = allSectors.find(
      (s) => s.name.toLowerCase() === match[1].trim().toLowerCase(),
    );
    if (sector) {
      mentions.push({
        mention_type: "sector", comment_id: comment.id, solicitacao_id: solicitacaoId,
        mentioned_sector_id: sector.id, mentioned_by_id: (user as any).id,
      });
      const sectorUsers = await prisma.user.findMany({ where: { sector_id: sector.id }, select: { id: true } });
      for (const su of sectorUsers) {
        if (su.id === (user as any).id) continue;
        await prisma.notification.create({
          data: {
            type: "reurb_mention_sector",
            title: `${(user as any).name} mencionou ${sector.name}`,
            message: parsed.data.content.slice(0, 120),
            user_id: su.id,
            reurb_protocol_id: solicitacaoId,
            reurb_comment_id: comment.id,
          },
        });
      }
    }
  }

  if (mentions.length) await prisma.reurbMention.createMany({ data: mentions });

  logActivity((user as any).id, (user as any).name, "reurb_comment_added",
    "reurb_solicitacao", solicitacaoId, null, req);

  const full = await prisma.reurbComment.findUnique({
    where: { id: comment.id },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      mentions: { include: { mentioned_user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(full, { status: 201 });
}
