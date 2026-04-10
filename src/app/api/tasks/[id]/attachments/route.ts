import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import path from "path";
import { uploadFile, deleteFile } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const attachments = await prisma.taskAttachment.findMany({
    where: { task_id: Number(id) },
    include: { uploaded_by: { select: { id: true, name: true, avatar: true } } },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json(attachments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const taskId = Number(id);

  // Verify task exists
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const uploadedById = formData.get("uploaded_by_id") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }

  // Validate mime type (only images and PDFs)
  const allowedTypes = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido. Apenas imagens e PDFs." },
      { status: 400 },
    );
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo excede 10MB" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".bin";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { url } = await uploadFile(buffer, taskId, filename, file.type);

  const attachment = await prisma.taskAttachment.create({
    data: {
      task_id: taskId,
      filename,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
      url,
      uploaded_by_id: uploadedById ? Number(uploadedById) : null,
    },
    include: { uploaded_by: { select: { id: true, name: true, avatar: true } } },
  });

  // Log to task history
  await prisma.taskHistory.create({
    data: {
      task_id: taskId,
      user_id: uploadedById ? Number(uploadedById) : null,
      field: "anexo",
      old_value: null,
      new_value: file.name,
    },
  });

  // Log to activity log
  if (uploadedById) {
    const user = await prisma.user.findUnique({ where: { id: Number(uploadedById) }, select: { name: true } });
    await prisma.activityLog.create({
      data: {
        user_id: Number(uploadedById),
        user_name: user?.name || "Sistema",
        action: "upload_attachment",
        entity: "task",
        entity_id: taskId,
        details: `Anexou arquivo: ${file.name}`,
      },
    });
  }

  return NextResponse.json(attachment, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const attachmentId = req.nextUrl.searchParams.get("attachment_id");
  const userId = req.nextUrl.searchParams.get("user_id");

  if (!attachmentId) {
    return NextResponse.json({ error: "attachment_id obrigatório" }, { status: 400 });
  }

  const attachment = await prisma.taskAttachment.findUnique({
    where: { id: Number(attachmentId) },
  });

  if (!attachment || attachment.task_id !== Number(id)) {
    return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
  }

  // Delete file from storage (local, Supabase, or S3)
  try {
    await deleteFile(attachment.url);
  } catch {
    // File may not exist in storage, continue with DB cleanup
  }

  await prisma.taskAttachment.delete({ where: { id: Number(attachmentId) } });

  // Log to task history
  await prisma.taskHistory.create({
    data: {
      task_id: Number(id),
      user_id: userId ? Number(userId) : null,
      field: "anexo",
      old_value: attachment.original_name,
      new_value: null,
    },
  });

  // Log to activity log
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: Number(userId) }, select: { name: true } });
    await prisma.activityLog.create({
      data: {
        user_id: Number(userId),
        user_name: user?.name || "Sistema",
        action: "delete_attachment",
        entity: "task",
        entity_id: Number(id),
        details: `Removeu anexo: ${attachment.original_name}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
