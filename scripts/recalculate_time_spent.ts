/**
 * recalculate_time_spent.ts
 *
 * Script de migração para recalcular o time_spent de TODAS as tarefas
 * com base nas datas started_at/completed_at e nos registros de TaskPause.
 *
 * Uso:  npx ts-node scripts/recalculate_time_spent.ts
 *
 * O que faz:
 * - Para cada tarefa com started_at preenchido:
 *   1. Calcula   totalMs = (completed_at || now) - started_at
 *   2. Soma      todas as pausas finalizadas (ended_at != null) → totalPauseMs
 *   3. Subtrai   effectiveMs = totalMs - totalPauseMs
 *   4. Atualiza  time_spent = effectiveMs em SEGUNDOS
 * - Tarefas sem started_at ficam com time_spent = 0
 * - Exibe resumo com OLD vs NEW para conferência
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL || process.env.DIRECT_URL },
  },
});

// ─────────── Helpers ───────────
const fmtSec = (s: number): string => {
  if (s <= 0) return "0s";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RECÁLCULO DE time_spent — GeoTask-Pro");
  console.log("═══════════════════════════════════════════════════════════\n");

  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      started_at: true,
      completed_at: true,
      time_spent: true,
      status: true,
    },
    orderBy: { id: "asc" },
  });

  const allPauses = await prisma.taskPause.findMany({
    orderBy: { started_at: "asc" },
  });

  // Index pauses by task_id for O(1) access
  const pausesByTask = new Map<number, typeof allPauses>();
  for (const p of allPauses) {
    const list = pausesByTask.get(p.task_id) || [];
    list.push(p);
    pausesByTask.set(p.task_id, list);
  }

  const now = new Date();
  let updatedCount = 0;
  let skippedCount = 0;
  let unchangedCount = 0;
  let totalOldError = 0;

  console.log(`Total de tarefas: ${tasks.length}`);
  console.log(`Total de registros de pausa: ${allPauses.length}\n`);
  console.log("─── Processando ───────────────────────────────────────────\n");

  for (const task of tasks) {
    if (!task.started_at) {
      // Tarefa nunca foi iniciada — garante time_spent = 0
      if ((task.time_spent || 0) !== 0) {
        await prisma.task.update({
          where: { id: task.id },
          data: { time_spent: 0 },
        });
        console.log(
          `  #${task.id} "${task.title.slice(0, 40)}" — sem started_at, zerado (era ${fmtSec(task.time_spent || 0)})`
        );
        updatedCount++;
      } else {
        skippedCount++;
      }
      continue;
    }

    const startMs = new Date(task.started_at).getTime();
    const endMs = task.completed_at
      ? new Date(task.completed_at).getTime()
      : now.getTime();

    // Calcular total de pausas finalizadas
    const pauses = pausesByTask.get(task.id) || [];
    let totalPauseMs = 0;
    for (const p of pauses) {
      const pStart = new Date(p.started_at).getTime();
      const pEnd = p.ended_at ? new Date(p.ended_at).getTime() : now.getTime();
      // Limitar pausa ao intervalo [started_at, completed_at/now]
      const clampedStart = Math.max(pStart, startMs);
      const clampedEnd = Math.min(pEnd, endMs);
      if (clampedEnd > clampedStart) {
        totalPauseMs += clampedEnd - clampedStart;
      }
    }

    const effectiveMs = Math.max(0, endMs - startMs - totalPauseMs);
    const newTimeSpent = Math.floor(effectiveMs / 1000);
    const oldTimeSpent = task.time_spent || 0;

    if (newTimeSpent === oldTimeSpent) {
      unchangedCount++;
      continue;
    }

    const diff = oldTimeSpent - newTimeSpent;
    totalOldError += Math.abs(diff);

    await prisma.task.update({
      where: { id: task.id },
      data: { time_spent: newTimeSpent },
    });

    const arrow = diff > 0 ? "↓" : "↑";
    console.log(
      `  #${task.id} "${task.title.slice(0, 40).padEnd(40)}"` +
        `  OLD: ${fmtSec(oldTimeSpent).padStart(8)}` +
        `  NEW: ${fmtSec(newTimeSpent).padStart(8)}` +
        `  ${arrow} ${fmtSec(Math.abs(diff))}` +
        `  (${pauses.length} pausa(s))`
    );
    updatedCount++;
  }

  console.log("\n─── Resumo ────────────────────────────────────────────────\n");
  console.log(`  ✅ Atualizadas:   ${updatedCount}`);
  console.log(`  ⏭️  Sem alteração: ${unchangedCount}`);
  console.log(`  ➖ Sem started_at: ${skippedCount}`);
  console.log(`  📊 Erro total corrigido: ${fmtSec(totalOldError)}`);
  console.log("\n═══════════════════════════════════════════════════════════\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Concluído com sucesso.");
  })
  .catch(async (e) => {
    console.error("ERRO:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
