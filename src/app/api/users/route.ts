import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { createUserSchema, updateUserSchema } from "@/lib/validators/user";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { type AuthUser } from "@/lib/auth";
import { requirePermission } from "@/lib/requirePermission";
import { logger } from "@/lib/logger";
import { sanitizeObject } from "@/lib/sanitize";

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD;
if (!DEFAULT_PASSWORD && process.env.NODE_ENV === "production") {
  throw new Error("DEFAULT_USER_PASSWORD environment variable is required in production");
}

// GET /api/users
export async function GET(req: Request) {
  try {
    const authResult = await requirePermission(req, (p) => p.settings.manage_users);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const u = await prisma.user.findUnique({
        where: { id: Number(id) },
        include: {
          Role: true,
          Sector: true,
          Team: true,
          user_sectors: { include: { sector: true } },
        },
      });
      if (!u) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
      
      return NextResponse.json({
        ...u,
        password_hash: undefined,
        role: u.Role,
        sector: u.Sector,
        team: u.Team,
        user_sectors: u.user_sectors,
      });
    }

    const users = await prisma.user.findMany({
      include: {
        Role: true,
        Sector: true,
        Team: true,
        user_sectors: { include: { sector: true } },
      },
      orderBy: { name: "asc" },
    });

    const transformed = users.map((u) => ({
      ...u,
      password_hash: undefined,
      role: u.Role,
      sector: u.Sector,
      team: u.Team,
      user_sectors: u.user_sectors,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    logger.error("Erro ao buscar usuários", { error: String(error) }, req);
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 },
    );
  }
}

// POST /api/users
export async function POST(req: Request) {
  try {
    const authResult = await requirePermission(req, (p) => p.settings.manage_users);
    if (authResult instanceof NextResponse) return authResult;

    let body = await req.json();
    body = sanitizeObject(body);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, email, role_id, sector_id, role, sector, avatar, manager_id } =
      parsed.data;
    const finalRoleId = Number(role_id || role);
    const finalSectorId = Number(sector_id || sector);
    const teamId = (parsed.data as any).team_id
      ? Number((parsed.data as any).team_id)
      : null;
    const finalManagerId = manager_id ? Number(manager_id) : null;

    const initials = name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const hash = await bcrypt.hash(DEFAULT_PASSWORD ?? "Mudar@123", 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role_id: finalRoleId,
        sector_id: finalSectorId,
        team_id: teamId,
        manager_id: finalManagerId,
        avatar: avatar || initials,
        password_hash: hash,
        must_change_password: true,
        active: true,
      },
      include: { Role: true, Sector: true, Team: true },
    });

    logActivity(
      (authResult as AuthUser).id,
      (authResult as AuthUser).name,
      "user_created",
      "user",
      user.id,
      `Criou o usuário "${user.name}" (${user.email})`,
      req,
    );

    return NextResponse.json(
      {
        ...user,
        password_hash: undefined,
        role: user.Role,
        sector: user.Sector,
        team: user.Team,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Erro ao criar usuário", { error: String(error) }, req);
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 },
    );
  }
}

// PATCH /api/users
export async function PATCH(req: Request) {
  try {
    const authResult = await requirePermission(req, (p) => p.settings.manage_users);
    if (authResult instanceof NextResponse) return authResult;

    let body = await req.json();
    body = sanitizeObject(body);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      id,
      role,
      sector,
      role_id,
      sector_id,
      password,
      resetPassword,
      ...data
    } = parsed.data;

    const updateData: Record<string, unknown> = { ...data };
    if (role || role_id) updateData.role_id = Number(role_id || role);
    if (sector || sector_id)
      updateData.sector_id = Number(sector_id || sector);
    if ((data as any).team_id !== undefined) {
      updateData.team_id = (data as any).team_id
        ? Number((data as any).team_id)
        : null;
    }

    if (resetPassword) {
      updateData.password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      updateData.must_change_password = true;
    } else if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
      updateData.must_change_password = true;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { Role: true, Sector: true, Team: true, user_sectors: { include: { sector: true } } },
    });

    logActivity(
      (authResult as AuthUser).id,
      (authResult as AuthUser).name,
      "user_updated",
      "user",
      user.id,
      `Atualizou o usuário "${user.name}"`,
      req,
    );

    return NextResponse.json({
      ...user,
      password_hash: undefined,
      role: user.Role,
      sector: user.Sector,
      team: user.Team,
      user_sectors: user.user_sectors,
    });
  } catch (error) {
    logger.error("Erro ao atualizar usuário", { error: String(error) }, req);
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 },
    );
  }
}

// DELETE /api/users — soft or permanent delete
export async function DELETE(req: Request) {
  try {
    const authResult = await requirePermission(req, p => p.settings.manage_users);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const permanent = searchParams.get("permanent") === "true";

    let password = null;
    let adminIdStr = null;

    if (permanent) {
      try {
        const body = await req.json();
        password = body.password;
        adminIdStr = body.admin_id;
      } catch {
        // Fallback or ignore if no body is provided
      }
    }

    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const targetUserId = Number(id);

    if (permanent) {
      if (!adminIdStr || !password) {
        return NextResponse.json({ error: "Permissão e senha são obrigatórias para exclusão definitiva." }, { status: 401 });
      }

      // Verify Admin
      const adminUser = await prisma.user.findUnique({
        where: { id: Number(adminIdStr) },
        include: { Role: true },
      });

      if (!adminUser || adminUser.Role.name !== "Admin") {
        return NextResponse.json({ error: "Apenas administradores podem excluir usuários definitivamente." }, { status: 403 });
      }

      const passwordValid = await (adminUser.password_hash.startsWith("$2")
        ? bcrypt.compare(password, adminUser.password_hash)
        : adminUser.password_hash === password);

      if (!passwordValid) {
        return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
      }

      const userToDelete = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { name: true },
      });

      if (!userToDelete) {
        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
      }

      // Permanent Delete
      await prisma.user.delete({ where: { id: targetUserId } });

      logActivity(
        Number(adminIdStr),
        adminUser.name,
        "user_deleted_permanent",
        "user",
        targetUserId,
        `Excluiu definitivamente o usuário "${userToDelete.name}"`,
        req,
      );

      return NextResponse.json({ message: "Usuário removido definitivamente" });
    } else {
      // Soft Delete (Existing logic)
      const deactivatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { active: false },
        select: { name: true },
      });

      logActivity(
        (authResult as AuthUser).id,
        (authResult as AuthUser).name,
        "user_deactivated",
        "user",
        targetUserId,
        `Desativou o usuário "${deactivatedUser.name}"`,
        req,
      );
      return NextResponse.json({ message: "Usuário desativado" });
    }
  } catch (error) {
    logger.error("Erro ao deletar usuário", { error: String(error) }, req);
    return NextResponse.json(
      { error: "Erro ao processar exclusão" },
      { status: 500 },
    );
  }
}
