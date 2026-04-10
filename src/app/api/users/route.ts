import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { createUserSchema, updateUserSchema } from "@/lib/validators/user";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Mudar@123";

// GET /api/users
export async function GET(req: Request) {
  try {
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
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 },
    );
  }
}

// POST /api/users
export async function POST(req: Request) {
  try {
    const body = await req.json();
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

    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

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
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 },
    );
  }
}

// PATCH /api/users
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
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

    return NextResponse.json({
      ...user,
      password_hash: undefined,
      role: user.Role,
      sector: user.Sector,
      team: user.Team,
      user_sectors: user.user_sectors,
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 },
    );
  }
}

// DELETE /api/users — soft or permanent delete
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const adminId = searchParams.get("admin_id");
    const password = searchParams.get("password");
    const permanent = searchParams.get("permanent") === "true";

    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const targetUserId = Number(id);

    if (permanent) {
      if (!adminId || !password) {
        return NextResponse.json({ error: "Permissão e senha são obrigatórias para exclusão definitiva." }, { status: 401 });
      }

      // Verify Admin
      const adminUser = await prisma.user.findUnique({
        where: { id: Number(adminId) },
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
        Number(adminId),
        adminUser.name,
        "user_deleted_permanent",
        "user",
        targetUserId,
        `Excluiu definitivamente o usuário "${userToDelete.name}"`,
      );

      return NextResponse.json({ message: "Usuário removido definitivamente" });
    } else {
      // Soft Delete (Existing logic)
      await prisma.user.update({
        where: { id: targetUserId },
        data: { active: false },
      });
      return NextResponse.json({ message: "Usuário desativado" });
    }
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao processar exclusão" },
      { status: 500 },
    );
  }
}
