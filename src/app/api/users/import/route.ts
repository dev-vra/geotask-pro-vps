import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Mudar@123";

export async function POST(req: Request) {
  try {
    const { users } = await req.json();

    if (!Array.isArray(users)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const u of users) {
      try {
        const name = String(u.name || u.Nome || "").trim();
        const email = String(u.email || u["e-mail"] || "").trim().toLowerCase();
        const cargoName = String(u.cargo || u.Cargo || "").trim();
        const setorName = String(u.setor || u.Setor || "").trim();

        if (!email || !name) continue;

        // Upsert Role
        let roleId: number | undefined;
        if (cargoName) {
          const role = await prisma.role.upsert({
            where: { name: cargoName },
            update: {},
            create: { name: cargoName },
          });
          roleId = role.id;
        }

        // Upsert Sector
        let sectorId: number | undefined;
        if (setorName) {
          const sector = await prisma.sector.upsert({
            where: { name: setorName },
            update: {},
            create: { name: setorName },
          });
          sectorId = sector.id;
        }

        const initials = name
          .split(" ")
          .filter(Boolean)
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2);

        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
          await prisma.user.update({
            where: { email },
            data: {
              name,
              role_id: roleId || existingUser.role_id,
              sector_id: sectorId || existingUser.sector_id,
              active: true,
            },
          });
          results.updated++;
        } else {
          // Para criação, o cargo e setor são obrigatórios
          if (!roleId || !sectorId) {
            results.errors.push(`Usuário ${email} ignorado: Cargo (${cargoName}) ou Setor (${setorName}) ausente ou inválido.`);
            continue;
          }

          await prisma.user.create({
            data: {
              email,
              name,
              password_hash: passwordHash,
              role_id: roleId,
              sector_id: sectorId,
              avatar: initials,
              active: true,
              must_change_password: true,
            },
          });
          results.created++;
        }
      } catch (err: any) {
        results.errors.push(`Erro no usuário ${u.email || u.Nome || "desconhecido"}: ${err.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Erro na importação:", error);
    return NextResponse.json(
      { error: "Erro interno na importação" },
      { status: 500 },
    );
  }
}
