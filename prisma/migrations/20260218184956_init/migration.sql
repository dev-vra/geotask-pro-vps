-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Coordenador', 'Gerente', 'Gestor', 'Liderado');

-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('TI', 'Operacoes', 'Campo', 'Tecnico', 'Ambiental', 'Juridico', 'Administrativo');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL DEFAULT 'mock',
    "role" "Role" NOT NULL,
    "sector" "Sector" NOT NULL,
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'A Fazer',
    "priority" TEXT,
    "sector" "Sector",
    "responsible_id" INTEGER,
    "contract_id" INTEGER,
    "city_id" INTEGER,
    "neighborhood_id" INTEGER,
    "nucleus" TEXT,
    "quadra" TEXT,
    "lote" TEXT,
    "deadline" TIMESTAMP(3),
    "link" TEXT,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "time_spent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtask" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sector" "Sector",
    "task_id" INTEGER NOT NULL,
    "responsible_id" INTEGER,
    "done_at" TIMESTAMP(3),

    CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sector" "Sector" NOT NULL,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateTask" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "template_id" INTEGER NOT NULL,

    CONSTRAINT "TemplateTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateSubtask" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "template_task_id" INTEGER NOT NULL,

    CONSTRAINT "TemplateSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mention" (
    "id" SERIAL NOT NULL,
    "mention_type" TEXT NOT NULL,
    "mentioned_sector" "Sector",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "mentioned_user_id" INTEGER,
    "mentioned_by_id" INTEGER,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER,
    "comment_id" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Neighborhood" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_name_key" ON "Contract"("name");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Neighborhood_city_id_name_key" ON "Neighborhood"("city_id", "name");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "Neighborhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTask" ADD CONSTRAINT "TemplateTask_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateSubtask" ADD CONSTRAINT "TemplateSubtask_template_task_id_fkey" FOREIGN KEY ("template_task_id") REFERENCES "TemplateTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_mentioned_by_id_fkey" FOREIGN KEY ("mentioned_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Neighborhood" ADD CONSTRAINT "Neighborhood_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
