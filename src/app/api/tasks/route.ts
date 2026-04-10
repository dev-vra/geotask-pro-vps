import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { broadcast } from "../events/route";
import { calculateNextRecurrence } from "@/lib/recurrence";

async function resolveSectorId(s: any, cache?: Record<string, number | null>): Promise<number | null> {
  if (!s) return null;

  // If it's already an ID
  if (typeof s === "number") return s;
  if (typeof s === "string" && !isNaN(Number(s)) && s.trim() !== "")
    return Number(s);

  // If it's an object { id, name }
  if (typeof s === "object") {
    if (s.id && !isNaN(Number(s.id))) return Number(s.id);
    if (s.name) s = s.name;
    else return null;
  }

  const name = String(s).trim();
  if (cache && name in cache) return cache[name];

  // Try to find by name (case-insensitive and trimmed)
  const sector = await prisma.sector.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });
  const id = sector?.id || null;
  if (cache) cache[name] = id;
  return id;
}

async function resolveResponsibleId(r: any, cache?: Record<string, number | null>): Promise<number | null> {
  if (!r) return null;

  // If already an ID
  if (typeof r === "number") return r;
  if (typeof r === "string" && !isNaN(Number(r)) && r.trim() !== "")
    return Number(r);

  // If it's an object { id, name }
  if (typeof r === "object") {
    if (r.id && !isNaN(Number(r.id))) return Number(r.id);
    if (r.name) r = r.name;
    else return null;
  }

  const name = String(r).trim();
  if (cache && name in cache) return cache[name];

  // Find by name (case-insensitive and trimmed)
  const u = await prisma.user.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });
  const id = u?.id || null;
  if (cache) cache[name] = id;
  return id;
}

async function notifyUser(
  userId: number,
  type: string,
  title: string,
  message: string,
  taskId: number,
) {
  try {
    await prisma.notification.create({
      data: { user_id: userId, type, title, message, task_id: taskId },
    });
  } catch (e) {
    console.error("Erro ao criar notificação:", e);
  }
}

async function notifyManagers(
  type: string,
  title: string,
  message: string,
  taskId: number,
) {
  try {
    const managers = await prisma.user.findMany({
      where: {
        Role: {
          name: {
            in: [
              "Gestor",
              "Gerente",
              "Coordenador de Setores",
              "Coordenador de Polo",
              "Admin",
            ],
          },
        },
      },
      select: { id: true },
    });
    for (const m of managers) {
      await notifyUser(m.id, type, title, message, taskId);
    }
  } catch (e) {
    console.error("Erro ao notificar gestores:", e);
  }
}

function parseBackendDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;

  const dStr = String(d).trim();
  if (!dStr || dStr.toLowerCase() === "null" || dStr === "undefined")
    return null;

  // Handles DD/MM/YYYY
  if (dStr.includes("/")) {
    const parts = dStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      const parsed = new Date(year, month - 1, day);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  // Fallback to native (ISO, etc.)
  const fallback = new Date(dStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// GET /api/tasks?page=1&limit=50&status=A+Fazer&sector_id=3
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = url.searchParams.get("limit")
      ? Math.min(200, Math.max(1, Number(url.searchParams.get("limit"))))
      : 0;
    const status = url.searchParams.get("status");
    const taskId = url.searchParams.get("id") ? Number(url.searchParams.get("id")) : undefined;
    const sectorId = Number(url.searchParams.get("sector_id")) || undefined;
    const responsibleId =
      Number(url.searchParams.get("responsible_id")) || undefined;
    const teamIdFilter = Number(url.searchParams.get("team_id")) || undefined;
    const createdByMe = url.searchParams.get("created_by_me");
    const createdById =
      Number(url.searchParams.get("created_by_id")) || undefined;
    const summary = url.searchParams.get("summary") === "true";
    const search = url.searchParams.get("search");
    const orderByField = url.searchParams.get("orderBy") || "created_at";
    const orderDirection = url.searchParams.get("order") || "desc";

    // Valid fields for ordering
    const validOrderBy = [
      "created_at",
      "updated_at",
      "status_updated_at",
      "deadline",
      "title",
    ];
    const actualOrderBy = validOrderBy.includes(orderByField)
      ? orderByField
      : "created_at";
    const actualOrder = orderDirection === "asc" ? "asc" : "desc";

    // Build optional where clause
    const where: Prisma.TaskWhereInput = {
      ...(taskId ? { id: taskId } : {}),
      ...(status ? { status } : {}),
      ...(sectorId ? { sector_id: sectorId } : {}),
      ...(responsibleId ? { responsible_id: responsibleId } : {}),
      ...(teamIdFilter
        ? {
            OR: [
              { team_id: teamIdFilter },
              { responsible: { team_id: teamIdFilter } },
            ],
          }
        : {}),
      ...(createdByMe === "true" && createdById
        ? { created_by_id: createdById }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { parent: { title: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    if (summary) {
      const tasks = await prisma.task.findMany({
        where,
        ...(limit > 0 ? { take: limit, skip: (page - 1) * limit } : {}),
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          type: true,
          deadline: true,
          created_at: true,
          sector_id: true,
          responsible_id: true,
          team_id: true,
          Sector: { select: { id: true, name: true } },
          responsible: { select: { id: true, name: true, team_id: true } },
          city: { select: { name: true } },
          contract: { select: { name: true } },
          is_recurring: true,
          recurrence_config: true,
          next_recurrence_at: true,
        },
        orderBy: { [actualOrderBy]: actualOrder },
      });

      const total =
        limit > 0 ? await prisma.task.count({ where }) : tasks.length;
      const result = tasks.map((t) => ({
        ...t,
        sector: t.Sector,
        city: t.city?.name || "",
        contract: t.contract?.name || "",
        created: t.created_at
          ? new Date(t.created_at).toLocaleDateString("pt-BR")
          : null,
        deadline: t.deadline ? t.deadline.toISOString() : null,
      }));

      if (limit > 0) {
        return NextResponse.json({
          data: result,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }
      return NextResponse.json(result);
    }

    const tasks = await prisma.task.findMany({
      where,
      ...(limit > 0 ? { take: limit, skip: (page - 1) * limit } : {}),
      include: {
        contract: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },
        Sector: { select: { id: true, name: true } },
        responsible: {
          select: {
            id: true,
            name: true,
            team_id: true,
            Role: { select: { name: true } },
            Sector: { select: { name: true } },
          },
        },
        created_by: { select: { id: true, name: true } },
        pauses: true,
        subtasks: true,
        coworkers: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                Role: { select: { name: true } },
                Sector: { select: { name: true } },
              },
            },
          },
        },
        children: {
          orderBy: { id: "asc" },
          include: {
            Sector: { select: { id: true, name: true } },
            created_by: { select: { id: true, name: true } },
            responsible: {
              select: {
                id: true,
                name: true,
                team_id: true,
                Role: { select: { name: true } },
                Sector: { select: { name: true } },
              },
            },
          },
        },
        parent: { select: { title: true } },
      },
      orderBy: { [actualOrderBy]: actualOrder },
    });

    const result = tasks.map((t) => ({
      ...t,
      contract: t.contract?.name ?? "",
      city: t.city?.name ?? "",
      // Return objects for role/sector
      sector: (t as any).Sector
        ? { name: (t as any).Sector.name, id: (t as any).Sector.id }
        : null,
      responsible: t.responsible
        ? {
            ...t.responsible,
            role: (t.responsible as any).Role
              ? { name: (t.responsible as any).Role.name }
              : null,
            sector: (t.responsible as any).Sector
              ? { name: (t.responsible as any).Sector.name }
              : null,
          }
        : null,
      responsible_id: t.responsible_id,
      created_by: t.created_by?.name ?? "",
      created: t.created_at
        ? new Date(t.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      started: t.started_at
        ? new Date(t.started_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      paused: t.paused_at
        ? new Date(t.paused_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      completed: t.completed_at
        ? new Date(t.completed_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      assigned: t.responsible_id
        ? new Date(t.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : null,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      time:
        t.children && t.children.length > 0
          ? Math.round(
              t.children.reduce(
                (acc: number, c: any) => acc + (c.time_spent || 0),
                0,
              ) / 60,
            )
          : t.time_spent
            ? Math.round(t.time_spent / 60)
            : 0,
      subtasks: [
        ...(t.subtasks || []).map((s: any) => ({ ...s, isLegacy: true })),
        ...(t.children || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          sector: c.Sector ? { name: c.Sector.name, id: c.Sector.id } : null,
          responsible_id: c.responsible_id,
          done: c.status === "Concluído",
          status: c.status,
          priority: c.priority,
          isLegacy: false,
          responsible: c.responsible
            ? {
                ...c.responsible,
                role: c.responsible.Role
                  ? { name: c.responsible.Role.name }
                  : null,
                sector: c.responsible.Sector
                  ? { name: c.responsible.Sector.name }
                  : null,
              }
            : null,
        })),
      ],
      coworkers: (t.coworkers || [])
        .filter((cw: any) => cw?.user?.id)
        .map((cw: any) => ({
          id: cw.user.id,
          name: cw.user.name,
          avatar: cw.user.avatar,
          role: cw.user.Role?.name || null,
          sector: cw.user.Sector?.name || null,
        })),
      pauses: t.pauses || [],
    }));

    // If pagination was requested, return paginated response with metadata
    if (limit > 0) {
      const total = await prisma.task.count({ where });
      return NextResponse.json({
        data: result,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Default: return flat array (backward compatible)
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar tarefas" },
      { status: 500 },
    );
  }
}

// POST /api/tasks
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cache = {
      sectors: {} as Record<string, number | null>,
      users: {} as Record<string, number | null>,
    };

    const {
      title,
      description,
      type,
      priority,
      status,
      sector,
      sector_id,
      responsible_id,
      contract,
      city,
      nucleus,
      quadra,
      lote,
      deadline,
      link,
      subtasks,
      children,
      created_by,
      parent_id,
      coworkers,
      team_id,
      is_recurring,
      recurrence_config,
    } = body;

    // Parallelize initial lookups
    const [contractIdRes, cityIdRes, resolvedResponsibleId, resolvedSectorId] = await Promise.all([
      (async () => {
        if (body.contract_id) return Number(body.contract_id);
        if (contract) {
          const c = await prisma.contract.findUnique({ where: { name: contract }, select: { id: true } });
          return c?.id || null;
        }
        return null;
      })(),
      (async () => {
        if (body.city_id) return Number(body.city_id);
        if (city) {
          const c = await prisma.city.findUnique({ where: { name: city }, select: { id: true } });
          return c?.id || null;
        }
        return null;
      })(),
      resolveResponsibleId(responsible_id || body.responsible, cache.users),
      resolveSectorId(sector_id || sector, cache.sectors),
    ]);

    const contractId = contractIdRes;
    const cityId = cityIdRes;
    const createdById = created_by && !isNaN(Number(created_by)) ? Number(created_by) : null;
    const parentId = parent_id && !isNaN(Number(parent_id)) ? Number(parent_id) : null;

    const taskData: any = {
      title,
      description: description || "",
      type,
      priority,
      status: status || "A Fazer",
      sector_id: resolvedSectorId,
      responsible_id: resolvedResponsibleId,
      contract_id: contractId,
      city_id: cityId,
      nucleus,
      quadra: quadra || "",
      lote: lote || "",
      deadline: parseBackendDate(deadline),
      link: link || "",
      created_by_id: createdById,
      parent_id: parentId,
      team_id: team_id && !isNaN(Number(team_id)) ? Number(team_id) : null,
      is_recurring: !!is_recurring,
      recurrence_config: is_recurring ? recurrence_config : null,
      next_recurrence_at: is_recurring ? calculateNextRecurrence(recurrence_config) : null,
    };

    if (coworkers && Array.isArray(coworkers) && coworkers.length > 0) {
      taskData.coworkers = {
        create: coworkers.map((uid: number) => ({ user_id: Number(uid) })),
      };
    }

    if ((subtasks || children) && Array.isArray(subtasks || children)) {
      taskData.children = {
        create: await Promise.all(
          (subtasks || children).map(async (st: any) => {
            const sId =
              st.sector_id || st.sector
                ? await resolveSectorId(st.sector_id || st.sector, cache.sectors)
                : resolvedSectorId;

            const sRid = await resolveResponsibleId(
              st.responsible_id || st.responsible,
              cache.users
            );

            return {
              title: st.title,
              status: st.status || "A Fazer",
              sector_id: sId,
              description: st.description || "",
              priority: st.priority || priority,
              type: st.type || type,
              created_by_id: createdById,
              contract_id: contractId,
              city_id: cityId,
              nucleus: nucleus,
              quadra: quadra || "",
              lote: lote || "",
              responsible_id: sRid,
            };
          }),
        ),
      };
    }

    const newTask = await prisma.task.create({
      data: taskData,
      include: { children: true, coworkers: true },
    });

    // Send response early, then do background work
    const response = NextResponse.json({
      message: "Tarefa criada com sucesso",
      id: newTask.id,
    });

    const backgroundWork = async () => {
      try {
        let creatorName = "Alguém";
        if (created_by) {
          const u = await prisma.user.findUnique({
            where: { id: Number(created_by) },
            select: { name: true }
          });
          if (u) creatorName = u.name;
        }
        const dateStr = new Date().toLocaleDateString();
        const timeStr = new Date().toLocaleTimeString().slice(0, 5);

        const notifications: any[] = [];

        // Notify responsible of the main task
        if (resolvedResponsibleId) {
          notifications.push({
            user_id: resolvedResponsibleId,
            type: "task_assigned",
            title: "Nova Atribuição",
            message: `${creatorName} atribuiu uma tarefa a você em ${dateStr} às ${timeStr}h: "${title}"`,
            task_id: newTask.id,
          });
        }

        // Notify new coworkers
        if (newTask.coworkers && newTask.coworkers.length > 0) {
          for (const cw of newTask.coworkers) {
            if (cw.user_id !== resolvedResponsibleId) {
              notifications.push({
                user_id: cw.user_id,
                type: "task_assigned",
                title: "Nova Atribuição (Equipe)",
                message: `${creatorName} adicionou você à equipe da tarefa "${title}" em ${dateStr} às ${timeStr}h.`,
                task_id: newTask.id,
              });
            }
          }
        }

        // Notify subtasks
        const subtaskSectorGestoresCache: Record<number, number[]> = {};

        for (const child of newTask.children || []) {
          if (child.responsible_id) {
            if (child.responsible_id !== resolvedResponsibleId) {
              notifications.push({
                user_id: child.responsible_id,
                type: "task_assigned",
                title: "Nova Atribuição (Subtarefa)",
                message: `${creatorName} atribuiu uma subtarefa a você em ${dateStr} às ${timeStr}h: "${child.title}"`,
                task_id: child.id,
              });
            }
          } else if (child.sector_id) {
            if (!subtaskSectorGestoresCache[child.sector_id]) {
              const gestores = await prisma.user.findMany({
                where: {
                  sector_id: child.sector_id,
                  Role: { name: { in: ["Gestor", "Gerente", "Coordenador de Setores", "Coordenador de Polo", "Admin"] } },
                },
                select: { id: true },
              });
              subtaskSectorGestoresCache[child.sector_id] = gestores.map(g => g.id);
            }

            for (const gId of subtaskSectorGestoresCache[child.sector_id]) {
              notifications.push({
                user_id: gId,
                type: "subtask_sector",
                title: "Subtarefa sem responsável",
                message: `${creatorName} criou a subtarefa "${child.title}" sem responsável atribuído no seu setor.`,
                task_id: child.id,
              });
            }
          }
        }

        if (notifications.length > 0) {
          await prisma.notification.createMany({ data: notifications });
        }

        logActivity(
          createdById,
          creatorName,
          "task_created",
          "task",
          newTask.id,
          `Criou a tarefa "${title}"`,
        );

        broadcast("TASK_CREATED", { taskId: newTask.id, creatorId: createdById });
      } catch (err) {
        console.error("Error in POST background work:", err);
      }
    };

    backgroundWork();
    return response;
  } catch (error: any) {
    console.error("Erro ao criar tarefa:", error);
    return NextResponse.json(
      { error: "Erro ao criar tarefa: " + error.message },
      { status: 500 },
    );
  }
}

// PATCH /api/tasks
const FIELD_NAMES: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  priority: "Prioridade",
  type: "Tipo",
  nucleus: "Bairro",
  quadra: "Quadra",
  lote: "Lote",
  deadline: "Prazo",
  status: "Status",
  sector_id: "Setor",
  responsible_id: "Responsável",
  contract_id: "Contrato",
  city_id: "Cidade",
};

async function logHistory(
  taskId: number,
  userId: number | null,
  field: string,
  oldValue: any,
  newValue: any,
  cache?: {
    sectors: Record<number, string>;
    users: Record<number, string>;
    contracts: Record<number, string>;
    cities: Record<number, string>;
  }
) {
  const maskedField = FIELD_NAMES[field] || field;

  let ov = oldValue;
  let nv = newValue;

  const resolveName = async (
    id: any,
    type: "sectors" | "users" | "contracts" | "cities"
  ) => {
    if (!id) return null;
    const numericId = Number(id);
    if (isNaN(numericId)) return id;

    if (cache && cache[type] && numericId in cache[type]) {
      return cache[type][numericId];
    }

    let name = id;
    if (type === "sectors") {
      const s = await prisma.sector.findUnique({ where: { id: numericId }, select: { name: true } });
      if (s) name = s.name;
    } else if (type === "users") {
      const u = await prisma.user.findUnique({ where: { id: numericId }, select: { name: true } });
      if (u) name = u.name;
    } else if (type === "contracts") {
      const c = await prisma.contract.findUnique({ where: { id: numericId }, select: { name: true } });
      if (c) name = c.name;
    } else if (type === "cities") {
      const c = await prisma.city.findUnique({ where: { id: numericId }, select: { name: true } });
      if (c) name = c.name;
    }

    if (cache && cache[type]) cache[type][numericId] = name;
    return name;
  };

  if (field === "sector_id") {
    ov = await resolveName(ov, "sectors");
    nv = await resolveName(nv, "sectors");
  } else if (field === "responsible_id") {
    ov = await resolveName(ov, "users");
    nv = await resolveName(nv, "users");
  } else if (field === "contract_id") {
    ov = await resolveName(ov, "contracts");
    nv = await resolveName(nv, "contracts");
  } else if (field === "city_id") {
    ov = await resolveName(ov, "cities");
    nv = await resolveName(nv, "cities");
  }

  const formatValue = (v: any) => {
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return "";
      return v.toLocaleDateString("pt-BR");
    }
    if (typeof v === "object" && v !== null) return JSON.stringify(v);
    const s = String(v || "");
    return s === "null" || s === "undefined" || s === "Invalid Date" ? "" : s;
  };

  const finalOv = formatValue(ov);
  const finalNv = formatValue(nv);

  if (finalOv === finalNv) return;

  await prisma.taskHistory.create({
    data: {
      task_id: taskId,
      user_id: userId,
      field: maskedField,
      old_value: finalOv,
      new_value: finalNv,
    },
  });
}

// PATCH /api/tasks
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, user_id, ...data } = body;
    const userId = user_id ? Number(user_id) : null;

    const cache = {
      sectors: {} as Record<number, string>,
      users: {} as Record<number, string>,
      contracts: {} as Record<number, string>,
      cities: {} as Record<number, string>,
      resolution: {
        sectors: {} as Record<string, number | null>,
        users: {} as Record<string, number | null>,
      }
    };

    if (!id)
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

    const task = await prisma.task.findUnique({
      where: { id: Number(id) },
      include: { coworkers: true },
    });
    if (!task)
      return NextResponse.json(
        { error: "Tarefa não encontrada" },
        { status: 404 },
      );

    const updateData: any = { updated_at: new Date() };

    // Ensure IDs are numbers
    [
      "sector_id",
      "responsible_id",
      "city_id",
      "contract_id",
      "team_id",
    ].forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        data[key] = Number(data[key]);
      }
    });

    if (action === "update_status") {
      const { status } = data;
      if (status) {
        updateData.status = status;
        updateData.status_updated_at = new Date();

        if (status === "Em Andamento" && !task.started_at) {
          updateData.started_at = new Date();
          updateData.paused_at = null;
        } else {
          if (task.status === "Em Andamento" && task.started_at) {
            const nowMs = new Date().getTime();
            const startMs = new Date(task.started_at).getTime();
            const existingPauses = await prisma.taskPause.findMany({
              where: { task_id: Number(id) },
              select: { started_at: true, ended_at: true }
            });
            let totalPauseMs = 0;
            for (const p of existingPauses) {
              const pStart = new Date(p.started_at).getTime();
              const pEnd = p.ended_at
                ? new Date(p.ended_at).getTime()
                : nowMs;
              totalPauseMs += pEnd - pStart;
            }
            const effectiveMs = Math.max(0, nowMs - startMs - totalPauseMs);
            updateData.time_spent = Math.floor(effectiveMs / 1000);
          }
        }
        if (status === "Pausado") updateData.paused_at = new Date();
        else if (status === "Concluído") updateData.completed_at = new Date();
      }

      // Critical path: update task + log history in parallel
      await Promise.all([
        prisma.task.update({ where: { id: Number(id) }, data: updateData }),
        logHistory(task.id, userId, "status", task.status, status, cache),
      ]);

      // Respond immediately
      broadcast("TASK_UPDATED", { taskId: Number(id), userId });
      const response = NextResponse.json({ message: "Atualizado com sucesso" });

      // Background logic (explicitly non-blocking)
      const runBackgroundWork = async () => {
        try {
          if (status === "Pausado") {
            await prisma.taskPause.create({
              data: { task_id: Number(id), started_at: new Date() },
            });
          } else if (task.status === "Pausado") {
            const lastPause = await prisma.taskPause.findFirst({
              where: { task_id: Number(id), ended_at: null },
              orderBy: { started_at: "desc" },
              select: { id: true }
            });
            if (lastPause)
              await prisma.taskPause.update({
                where: { id: lastPause.id },
                data: { ended_at: new Date() },
              });
          }

          const userName = userId
            ? (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name || "Usuário"
            : "Sistema";
          
          logActivity(userId, userName, "task_status_changed", "task", task.id, `Status: ${task.status} → ${status} — "${task.title}"`);

          if (task.parent_id) {
            const parent = await prisma.task.findUnique({
              where: { id: task.parent_id },
              include: { children: { select: { id: true, status: true } }, subtasks: { select: { done: true } } },
            });

            if (parent) {
              const childrenStatus = parent.children.map((c: any) =>
                c.id === task.id ? status : c.status,
              );
              const checklistItemsDone = parent.subtasks.map((s: any) => s.done);
              const anyChildInProgress = childrenStatus.some((s) => s === "Em Andamento");

              if (
                (status === "Em Andamento" || anyChildInProgress) &&
                (parent.status === "A Fazer" || parent.status === "Pausado")
              ) {
                await prisma.task.update({
                  where: { id: parent.id },
                  data: { status: "Em Andamento", started_at: parent.started_at || new Date(), paused_at: null },
                });
              }

              if (status === "Concluído" || status === "A Fazer" || status === "Pausado") {
                const allTasksDone = childrenStatus.every((s) => s === "Concluído");
                const allChecklistDone = checklistItemsDone.every((d) => d === true);
                if (allTasksDone && allChecklistDone) {
                  if (parent.status !== "Concluído") {
                    await prisma.task.update({
                      where: { id: parent.id },
                      data: { status: "Concluído", completed_at: new Date() },
                    });
                  }
                } else if (parent.status === "Concluído") {
                  await prisma.task.update({
                    where: { id: parent.id },
                    data: { status: "Em Andamento", completed_at: null },
                  });
                }
              }

              if (status === "Pausado" || status === "Concluído") {
                const activeChildren = childrenStatus.filter((s) => s !== "Concluído");
                const allPaused = activeChildren.length > 0 && activeChildren.every((s) => s === "Pausado");
                if (allPaused && parent.status === "Em Andamento") {
                  await prisma.task.update({
                    where: { id: parent.id },
                    data: { status: "Pausado", paused_at: new Date(), status_updated_at: new Date() },
                  });
                }
              }
            }
          }

          if (status === "Concluído") {
            const ds = new Date().toLocaleDateString();
            const notificationsToCreate: any[] = [];

            if (task.created_by_id) {
              notificationsToCreate.push({
                user_id: task.created_by_id, type: "task_completed",
                title: `Tarefa Concluída: "${task.title}"`, message: `Tarefa concluída na data ${ds}`, task_id: Number(id),
              });
            }

            if (task.sector_id) {
              const gestores = await prisma.user.findMany({
                where: { sector_id: task.sector_id, Role: { name: { in: ["Gestor", "Gerente", "Coordenador de Setores", "Coordenador de Polo", "Admin"] } } },
                select: { id: true },
              });
              for (const g of gestores) {
                if (g.id !== task.created_by_id && g.id !== userId) {
                  notificationsToCreate.push({
                    user_id: g.id, type: "task_completed",
                    title: `Tarefa Concluída no Setor: "${task.title}"`, message: `Tarefa concluída na data ${ds}`, task_id: Number(id),
                  });
                }
              }
            }

            if (task.parent_id) {
              const [siblingsTasks, legacySubtasks] = await Promise.all([
                prisma.task.findMany({ where: { parent_id: task.parent_id, id: { not: task.id } }, select: { responsible_id: true } }),
                prisma.subtask.findMany({ where: { task_id: task.parent_id }, select: { responsible_id: true } }),
              ]);
              const notifiedSet = new Set<number>();
              if (task.created_by_id) notifiedSet.add(task.created_by_id);
              if (userId) notifiedSet.add(userId);
              const siblingUsers = new Set<number>();
              siblingsTasks.forEach((s) => { if (s.responsible_id && !notifiedSet.has(s.responsible_id)) siblingUsers.add(s.responsible_id); });
              legacySubtasks.forEach((s) => { if (s.responsible_id && !notifiedSet.has(s.responsible_id)) siblingUsers.add(s.responsible_id); });
              for (const uid of siblingUsers) {
                notificationsToCreate.push({
                  user_id: uid, type: "task_completed",
                  title: `Subtarefa Finalizada`, message: `A subtarefa "${task.title}" vinculada à tarefa principal foi concluída.`, task_id: task.parent_id,
                });
              }
            }

            if (notificationsToCreate.length > 0) {
              await prisma.notification.createMany({ data: notificationsToCreate });
              broadcast("NOTIFICATIONS_UPDATED", {});
            }
          }
        } catch (err) {
          console.error("Error in status update background work:", err);
        }
      };

      runBackgroundWork();

      return response;
    } else if (action === "update_fields") {
      // Permission Validation
      const userRequesting = await prisma.user.findUnique({
        where: { id: Number(userId) },
        include: { Role: true },
      });
      const roleName = userRequesting?.Role?.name || "";
      const isCreator = task.created_by_id === userId;
      const isLeadership = [
        "Gestor",
        "Gerente",
        "Coordenador de Setores",
        "Coordenador de Polo",
        "Diretor",
        "Admin",
      ].includes(roleName);

      // "apenas quem criou a tarefa poderá editar o campo do prazo"
      if (data.deadline !== undefined && !isCreator) {
        const d = parseBackendDate(data.deadline);
        const oldD = task.deadline ? new Date(task.deadline) : null;
        if (d?.getTime() !== oldD?.getTime()) {
          return NextResponse.json(
            {
              error:
                "Apenas o criador da tarefa pode editar o prazo de entrega.",
            },
            { status: 403 },
          );
        }
      }

      // Check if trying to reassign (only if value actually changed)
      let isReassigning = false;

      if (
        data.responsible_id !== undefined &&
        data.responsible_id !== task.responsible_id
      ) {
        isReassigning = true;
      }
      if (data.sector_id !== undefined && data.sector_id !== task.sector_id) {
        isReassigning = true;
      }
      if (data.team_id !== undefined && data.team_id !== task.team_id) {
        isReassigning = true;
      }
      if (data.coworkers !== undefined) {
        const currentCoworkers = (task.coworkers || [])
          .map((c: any) => c.user_id)
          .sort();
        const newCoworkers = data.coworkers.map(Number).sort();
        if (JSON.stringify(currentCoworkers) !== JSON.stringify(newCoworkers)) {
          isReassigning = true;
        }
      }

      if (isReassigning && !isCreator && !isLeadership) {
        return NextResponse.json(
          {
            error:
              "Apenas o criador da tarefa, ou perfis de liderança, podem reatribuir esta tarefa.",
          },
          { status: 403 },
        );
      }

      const basicFields = ["title", "description", "priority", "type", "nucleus", "quadra", "lote"];
      for (const f of basicFields) {
        if (data[f] !== undefined) {
          await logHistory(task.id, userId, f, (task as any)[f], data[f], cache);
          updateData[f] = data[f];
        }
      }

      // Handle retroactive date changes
      const updatedStarted = data.started_at !== undefined ? data.started_at : data.started;
      const updatedCompleted = data.completed_at !== undefined ? data.completed_at : data.completed;

      if (updatedStarted !== undefined || updatedCompleted !== undefined) {
        let newStarted = task.started_at;
        let newCompleted = task.completed_at;

        if (updatedStarted !== undefined) {
          const s = updatedStarted ? new Date(updatedStarted) : null;
          if (s?.getTime() !== task.started_at?.getTime()) {
            await logHistory(task.id, userId, "started_at", task.started_at, s, cache);
            updateData.started_at = s;
            newStarted = s;
          }
        }

        if (updatedCompleted !== undefined) {
          const c = updatedCompleted ? new Date(updatedCompleted) : null;
          if (c?.getTime() !== task.completed_at?.getTime()) {
            await logHistory(task.id, userId, "completed_at", task.completed_at, c, cache);
            updateData.completed_at = c;
            newCompleted = c;
          }
        }

        // Recalculate time_spent if both are valid dates, subtracting pauses
        if (newStarted && newCompleted && !isNaN(newStarted.getTime()) && !isNaN(newCompleted.getTime())) {
          const existingPauses = await prisma.taskPause.findMany({
            where: { task_id: Number(id) },
            select: { started_at: true, ended_at: true }
          });
          let totalPauseMs = 0;
          for (const p of existingPauses) {
            if (p.started_at && p.ended_at) {
              totalPauseMs += new Date(p.ended_at).getTime() - new Date(p.started_at).getTime();
            }
          }
          const diffMs = newCompleted.getTime() - newStarted.getTime() - totalPauseMs;
          if (diffMs > 0) updateData.time_spent = Math.floor(diffMs / 1000);
        }
      }

      const notifications: any[] = [];

      if (data.sector !== undefined) {
        const sId = await resolveSectorId(data.sector, cache.resolution.sectors);
        if (sId !== task.sector_id) {
          await logHistory(task.id, userId, "sector_id", task.sector_id, sId, cache);
          updateData.sector_id = sId;
        }
      }

      if (data.responsible_id !== undefined) {
        const rId = data.responsible_id && !isNaN(Number(data.responsible_id)) ? Number(data.responsible_id) : null;
        if (rId !== task.responsible_id) {
          await logHistory(task.id, userId, "responsible_id", task.responsible_id, rId, cache);
          updateData.responsible_id = rId;

          if (rId) {
            notifications.push({
              userId: rId,
              type: "task_assigned",
              title: "Nova Atribuição",
              message: (changerName: string) => `${changerName} atribuiu a tarefa "${task.title}" a você em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString().slice(0, 5)}h.`,
              taskId: task.id
            });
          }
        }
      }

      if (data.contract !== undefined) {
        const contractName = String(data.contract || "").trim();
        let cId: number | null = null;
        if (contractName && contractName !== "Selecione...") {
          const c = await prisma.contract.findFirst({ where: { name: { equals: contractName, mode: "insensitive" } }, select: { id: true } });
          if (c) cId = c.id;
        }
        if (cId !== task.contract_id) {
          await logHistory(task.id, userId, "contract_id", task.contract_id, cId, cache);
          updateData.contract_id = cId;
        }
      }

      if (data.city !== undefined) {
        const cityName = String(data.city || "").trim();
        let cityId: number | null = null;
        if (cityName && cityName !== "Selecione...") {
          const c = await prisma.city.findFirst({ where: { name: { equals: cityName, mode: "insensitive" } }, select: { id: true } });
          if (c) cityId = c.id;
        }
        if (cityId !== task.city_id) {
          await logHistory(task.id, userId, "city_id", task.city_id, cityId, cache);
          updateData.city_id = cityId;
        }
      }

      if (data.deadline !== undefined) {
        const d = parseBackendDate(data.deadline);
        const oldD = task.deadline ? new Date(task.deadline) : null;
        if (d?.getTime() !== oldD?.getTime()) {
          await logHistory(task.id, userId, "deadline", task.deadline, d, cache);
          updateData.deadline = d;
        }
      }

      if (data.coworkers !== undefined) {
        updateData.coworkers = {
          deleteMany: {},
          create: data.coworkers.map((uid: number) => ({ user_id: Number(uid) })),
        };
        const currentCoworkers = (task.coworkers || []).map((c: any) => c.user_id);
        const newCoworkers = data.coworkers.map(Number).filter((uid: number) => !currentCoworkers.includes(uid));
        const currentResponsibleId = updateData.responsible_id !== undefined ? updateData.responsible_id : task.responsible_id;

        for (const uid of newCoworkers) {
          if (uid !== currentResponsibleId && uid !== userId) {
            notifications.push({
              userId: uid,
              type: "task_assigned",
              title: "Nova Atribuição (Equipe)",
              message: (changerName: string) => `${changerName} adicionou você à equipe da tarefa "${task.title}" em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString().slice(0, 5)}h.`,
              taskId: task.id
            });
          }
        }
      }

      await prisma.task.update({ where: { id: Number(id) }, data: updateData });

      // Response early
      broadcast("TASK_UPDATED", { taskId: Number(id), userId });
      const response = NextResponse.json({ message: "Campos atualizados com sucesso" });

      // Background Work
      const runFieldsBgWork = async () => {
        try {
          const updater = userId ? (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })) : null;
          const updaterName = updater?.name || "Usuário";

          // Process complex notifications that need the updater's name
          if (notifications.length > 0) {
            const finalNotifications = notifications.map(n => ({
              user_id: n.userId,
              type: n.type,
              title: n.title,
              message: typeof n.message === "function" ? n.message(updaterName) : n.message,
              task_id: n.taskId
            }));
            await prisma.notification.createMany({ data: finalNotifications });
            broadcast("NOTIFICATIONS_UPDATED", {});
          }

          // Build before→after diff for logActivity
          const FIELD_LABELS: Record<string, string> = {
            title: "Título", description: "Descrição", priority: "Prioridade", status: "Status", type: "Tipo",
            sector_id: "Setor", responsible_id: "Responsável", contract_id: "Contrato", city_id: "Cidade",
            deadline: "Prazo", started_at: "Início", completed_at: "Conclusão", address: "Endereço"
          };

          const diffParts: string[] = [];
          for (const key of Object.keys(updateData)) {
            if (key === "updated_at" || key === "time_spent" || key === "paused_at" || key === "coworkers") continue;
            const label = FIELD_LABELS[key] || key;
            
            // Re-resolve using the cache from logHistory
            let oldValRaw = (task as any)[key];
            let newValRaw = (updateData as any)[key];

            const format = (v: any) => {
              if (v instanceof Date) return v.toLocaleDateString("pt-BR");
              return v ?? "vazio";
            };

            const resolveForLogs = async (val: any) => {
              if (key === "sector_id") {
                if (!val) return "vazio";
                if (cache.sectors[val]) return cache.sectors[val];
                const s = await prisma.sector.findUnique({ where: { id: val }, select: { name: true } });
                if (s) cache.sectors[val] = s.name;
                return s?.name || val;
              }
              if (key === "responsible_id") {
                if (!val) return "vazio";
                if (cache.users[val]) return cache.users[val];
                const u = await prisma.user.findUnique({ where: { id: val }, select: { name: true } });
                if (u) cache.users[val] = u.name;
                return u?.name || val;
              }
              if (key === "contract_id") {
                if (!val) return "vazio";
                if (cache.contracts[val]) return cache.contracts[val];
                const c = await prisma.contract.findUnique({ where: { id: val }, select: { name: true } });
                if (c) cache.contracts[val] = c.name;
                return c?.name || val;
              }
              if (key === "city_id") {
                if (!val) return "vazio";
                if (cache.cities[val]) return cache.cities[val];
                const c = await prisma.city.findUnique({ where: { id: val }, select: { name: true } });
                if (c) cache.cities[val] = c.name;
                return c?.name || val;
              }
              return format(val);
            };

            const oldVal = await resolveForLogs(oldValRaw);
            const newVal = await resolveForLogs(newValRaw);
            if (oldVal !== newVal) diffParts.push(`${label}: "${oldVal}" → "${newVal}"`);
          }

          const diffStr = diffParts.length > 0 ? diffParts.join(" | ") : "campos editados";
          logActivity(userId, updaterName, "task_updated", "task", task.id, `"${task.title}" — ${diffStr}`);
        } catch (err) {
          console.error("Error in fields update background work:", err);
        }
      };

      runFieldsBgWork();
      return response;
    } else if (action === "manage_pauses") {
      // Manage retroactive pauses — receives array of {started_at, ended_at}
      // Also optionally accepts started_at / completed_at to update dates in same request
      const { pauses, started_at: reqStarted, completed_at: reqCompleted } = data;
      if (!Array.isArray(pauses)) {
        return NextResponse.json(
          { error: "pauses deve ser um array" },
          { status: 400 },
        );
      }

      // Delete existing pauses and recreate
      await prisma.taskPause.deleteMany({ where: { task_id: Number(id) } });
      for (const p of pauses) {
        await prisma.taskPause.create({
          data: {
            task_id: Number(id),
            started_at: new Date(p.started_at),
            ended_at: p.ended_at ? new Date(p.ended_at) : null,
          },
        });
      }

      // If started_at / completed_at were sent, update them too
      const taskUpdate: any = {};
      let effectiveStarted = task.started_at;
      let effectiveCompleted = task.completed_at;

      if (reqStarted !== undefined) {
        const s = reqStarted ? new Date(reqStarted) : null;
        if (s?.getTime() !== task.started_at?.getTime()) {
          await logHistory(task.id, userId, "started_at", task.started_at, s);
          taskUpdate.started_at = s;
          effectiveStarted = s;
        }
      }
      if (reqCompleted !== undefined) {
        const c = reqCompleted ? new Date(reqCompleted) : null;
        if (c?.getTime() !== task.completed_at?.getTime()) {
          await logHistory(task.id, userId, "completed_at", task.completed_at, c);
          taskUpdate.completed_at = c;
          effectiveCompleted = c;
        }
      }

      // Recalculate time_spent excluding pauses
      if (effectiveStarted) {
        const endTime = effectiveCompleted
          ? new Date(effectiveCompleted).getTime()
          : new Date().getTime();
        const startTime = new Date(effectiveStarted).getTime();
        let totalPauseMs = 0;
        for (const p of pauses) {
          if (p.started_at && p.ended_at) {
            totalPauseMs +=
              new Date(p.ended_at).getTime() - new Date(p.started_at).getTime();
          }
        }
        const effectiveMs = Math.max(0, endTime - startTime - totalPauseMs);
        taskUpdate.time_spent = Math.floor(effectiveMs / 1000);
      }

      if (Object.keys(taskUpdate).length > 0) {
        await prisma.task.update({
          where: { id: Number(id) },
          data: taskUpdate,
        });
      }

      // Log history
      await logHistory(
        task.id,
        userId,
        "Pausas",
        "editado",
        `${pauses.length} pausa(s)`,
      );

      // Activity log
      const pauseUpdater = userId
        ? (
            await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true },
            })
          )?.name || "Usuário"
        : "Sistema";
      logActivity(
        userId,
        pauseUpdater,
        "task_pauses_updated",
        "task",
        task.id,
        `Pausas atualizadas: ${pauses.length} período(s) — "${task.title}"`,
      );

      return NextResponse.json({ message: "Pausas atualizadas com sucesso" });
    } else if (action === "toggle_subtask") {
      const { subtask_id, done } = data;
      await prisma.subtask.update({
        where: { id: Number(subtask_id) },
        data: { done, done_at: done ? new Date() : null },
      });
      if (done) {
        const remainingChecklist = await prisma.subtask.count({
          where: {
            task_id: task.id,
            done: false,
            NOT: { id: Number(subtask_id) },
          },
        });
        const remainingChildTasks = await prisma.task.count({
          where: {
            parent_id: task.id,
            status: { not: "Concluído" },
          },
        });

        if (
          remainingChecklist === 0 &&
          remainingChildTasks === 0 &&
          task.status !== "Concluído"
        ) {
          await prisma.task.update({
            where: { id: task.id },
            data: { status: "Concluído", completed_at: new Date() },
          });
        } else if (task.status === "A Fazer" || task.status === "Pausado") {
          // If we completed a subtask, the parent is now in progress
          await prisma.task.update({
            where: { id: task.id },
            data: {
              status: "Em Andamento",
              started_at: task.started_at || new Date(),
              paused_at: null,
            },
          });
        }
      } else {
        // If we unchecked a subtask, and parent was concluded, reopen it
        if (task.status === "Concluído") {
          await prisma.task.update({
            where: { id: task.id },
            data: { status: "Em Andamento", completed_at: null },
          });
        }
      }
      return NextResponse.json({ message: "Subtarefa atualizada" });
    } else if (action === "reset_status") {
      const { password } = data;
      // Permission Validation
      const userRequesting = await prisma.user.findUnique({
        where: { id: Number(userId) },
        include: { Role: true },
      });
      const roleName = userRequesting?.Role?.name || "";
      if (!["Admin", "Gerente"].includes(roleName)) {
        return NextResponse.json(
          { error: "Apenas Admin ou Gerente pode resetar uma tarefa." },
          { status: 403 },
        );
      }

      // Password Validation
      if (!userRequesting) {
        return NextResponse.json(
          { error: "Usuário não encontrado." },
          { status: 404 },
        );
      }
      const bcrypt = require("bcryptjs");
      let passwordValid = false;
      if (userRequesting.password_hash.startsWith("$2")) {
        passwordValid = await bcrypt.compare(
          password,
          userRequesting.password_hash,
        );
      } else {
        passwordValid = userRequesting.password_hash === password;
      }

      if (!passwordValid) {
        return NextResponse.json(
          { error: "Senha incorreta." },
          { status: 401 },
        );
      }

      // Action: Reset task
      await prisma.task.update({
        where: { id: Number(id) },
        data: {
          status: "A Fazer",
          started_at: null,
          completed_at: null,
          paused_at: null,
          time_spent: 0,
        },
      });

      // Clear pauses
      await prisma.taskPause.deleteMany({
        where: { task_id: Number(id) },
      });

      // Log History
      await logHistory(
        task.id,
        userId,
        "status",
        task.status,
        "A Fazer (Reset)",
      );

      // Activity Log
      logActivity(
        userId,
        userRequesting.name,
        "task_reset",
        "task",
        task.id,
        `Tarefa resetada para "A Fazer" — "${task.title}"`,
      );

      broadcast("TASK_UPDATED", { taskId: Number(id), userId });
      return NextResponse.json({ message: "Tarefa resetada com sucesso." });
    }
    broadcast("TASK_UPDATED", { taskId: Number(id), userId });
    return NextResponse.json({ message: "Atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar tarefa" },
      { status: 500 },
    );
  }
}

// DELETE /api/tasks
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const adminId = searchParams.get("admin_id"); // User making the deletion request
    const password = searchParams.get("password"); // Password of the admin

    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    if (!adminId || !password) {
      return NextResponse.json({ error: "Permissão e senha são obrigatórias para exclusão." }, { status: 401 });
    }

    // Verify Admin permission and Password
    const adminUser = await prisma.user.findUnique({
      where: { id: Number(adminId) },
      include: { Role: true },
    });

    if (!adminUser || adminUser.Role.name !== "Admin") {
      return NextResponse.json({ error: "Apenas administradores podem excluir tarefas." }, { status: 403 });
    }

    const bcrypt = require("bcryptjs");
    const passwordValid = await (adminUser.password_hash.startsWith("$2") 
      ? bcrypt.compare(password, adminUser.password_hash) 
      : adminUser.password_hash === password);

    if (!passwordValid) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }

    const taskToDelete = await prisma.task.findUnique({
      where: { id: Number(id) },
      select: { title: true },
    });

    if (!taskToDelete) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: Number(id) } });

    logActivity(
      Number(adminId),
      adminUser.name,
      "task_deleted",
      "task",
      Number(id),
      `Excluiu definitivamente a tarefa "${taskToDelete.title}"`,
    );

    broadcast("TASK_DELETED", { taskId: Number(id), userId: adminId });
    return NextResponse.json({ message: "Tarefa removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover tarefa:", error);
    return NextResponse.json(
      { error: "Erro ao remover tarefa" },
      { status: 500 },
    );
  }
}
