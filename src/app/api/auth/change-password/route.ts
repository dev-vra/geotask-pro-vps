import { getAuthUser } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { getPermissions } from "@/lib/permissions";
import { changePasswordSchema } from "@/lib/validators/auth";
import { logger, getClientIP } from "@/lib/logger";
import { rateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const ip = getClientIP(req);
    if (!rateLimit(`change-password_${ip}`, 5, 60000)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em 1 minuto." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { userId, currentPassword, newPassword } = parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // Determine who is making this request
    const authUser = await getAuthUser(req);

    // If changing someone else's password, require admin/manage_users permission
    const isOwnPassword = authUser && authUser.id === userId;
    const isMustChange = targetUser.must_change_password;

    if (!isOwnPassword && !isMustChange) {
      // Someone else is changing this user's password — require admin permissions
      if (!authUser) {
        return NextResponse.json(
          { error: "Autenticação necessária" },
          { status: 401 },
        );
      }
      const perms = getPermissions({ role: authUser.role } as any);
      if (!perms.settings.manage_users) {
        return NextResponse.json(
          { error: "Sem permissão para alterar senha de outro usuário" },
          { status: 403 },
        );
      }
    } else if (isOwnPassword && !isMustChange) {
      // User changing own password — must provide current password
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Senha atual é obrigatória" },
          { status: 400 },
        );
      }
      const valid = await bcrypt.compare(currentPassword, targetUser.password_hash);
      if (!valid) {
        return NextResponse.json(
          { error: "Senha atual incorreta" },
          { status: 401 },
        );
      }
    }
    // If must_change_password is true, allow without current password (first login)

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: hash,
        must_change_password: false,
      },
    });

    logActivity(
      authUser?.id ?? userId,
      authUser?.name ?? targetUser.name,
      "password_changed",
      "user",
      userId,
      isOwnPassword ? "Alterou a própria senha" : `Alterou a senha de ${targetUser.name}`,
      req,
    );

    if (isMustChange) {
      logActivity(
        userId,
        targetUser.name,
        "consent_accepted",
        "user",
        userId,
        "Aceitou os termos de uso e política de privacidade no primeiro acesso",
        req,
      );
    }

    return NextResponse.json({ message: "Senha alterada com sucesso" });
  } catch (error) {
    logger.error("Erro ao alterar senha", { error: String(error) }, req);
    return NextResponse.json(
      { error: "Erro interno ao alterar senha" },
      { status: 500 },
    );
  }
}
