import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { logActivity } from "@/lib/activityLog";
import bcrypt from "bcryptjs";

/**
 * DELETE /api/auth/me
 * LGPD: Right to Erasure (Right to be Forgotten).
 * Allows users to delete their own account and personal data.
 * Requires password verification.
 */
export async function DELETE(req: Request) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Faca login para excluir sua conta" }, { status: 401 });
    }

    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: "Senha e obrigatoria para confirmar exclusao" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      logger.security("Falha na verificacao de senha para auto-exclusao", { user: user.email }, req);
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    // 1. Log the event BEFORE deletion (since user id will be gone)
    logActivity(
      user.id,
      user.name,
      "account_self_deleted_lgpd",
      "user",
      user.id,
      `Usuario solicitou exclusao definitiva de seus dados (${user.email})`,
      req
    );

    // 2. Perform deletion
    // The schema has onDelete: Cascade in most relations, but we should be careful.
    await prisma.user.delete({
      where: { id: user.id }
    });

    // 3. Clear the session cookie
    const response = NextResponse.json({ message: "Sua conta e todos os seus dados foram excluídos com sucesso." });
    response.cookies.set("gtp_token", "", { maxAge: 0 });

    logger.info("Conta excluida por solicitacao do usuario", { email: user.email });

    return response;

  } catch (error) {
    logger.error("Erro ao processar exclusao de conta", { error: String(error) }, req);
    return NextResponse.json({ error: "Erro ao excluir conta" }, { status: 500 });
  }
}
