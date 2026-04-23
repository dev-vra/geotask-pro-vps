import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { signJWT, createAuthCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getClientIP, logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = getClientIP(req);
    const isAllowed = rateLimit(`login_${ip}`, 5, 60000); // 5 attempts per minute

    if (!isAllowed) {
      logger.security("Rate limit excedido no login", { ip }, req);
      return NextResponse.json(
        { error: "Muitas tentativas de login. Tente novamente em 1 minuto." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        Role: true,
        Sector: true,
        Team: true,
        user_sectors: { include: { sector: true } },
      },
    });

    if (!user) {
      logger.security(`Failed login attempt: user not found (${email})`, {}, req);
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 },
      );
    }

    if (!user.active) {
      logger.security(`Failed login attempt: disabled user (${email})`, {}, req, user.id);
      return NextResponse.json(
        { error: "Usuário desativado" },
        { status: 403 },
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      logger.security(`Failed login attempt: wrong password (${email})`, {}, req, user.id);
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 },
      );
    }

    // Generate JWT and set HttpOnly cookie
    const token = await signJWT({
      id: user.id,
      role_id: user.role_id,
      sector_id: user.sector_id,
      team_id: user.team_id,
    });

    logActivity(
      user.id,
      user.name,
      "user_login",
      "user",
      user.id,
      `Login realizado`,
      req,
    );

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      sector_id: user.sector_id,
      avatar: user.avatar,
      active: user.active,
      must_change_password: user.must_change_password,
      created_at: user.created_at,
      role: user.Role ? { name: user.Role.name } : { name: "Sem Cargo" },
      sector: user.Sector ? { name: user.Sector.name } : { name: "Sem Setor" },
      team: user.Team ? { id: user.Team.id, name: user.Team.name } : null,
      user_sectors: user.user_sectors || [],
    });

    response.headers.set("Set-Cookie", createAuthCookie(token));
    return response;
  } catch (error) {
    logger.error("Login error", { error: String(error) }, req);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
