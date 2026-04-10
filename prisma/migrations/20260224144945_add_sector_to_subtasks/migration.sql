/*
  Warnings:

  - You are about to drop the column `mentioned_sector` on the `Mention` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `Subtask` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `Template` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `User` table. All the data in the column will be lost.
  - Added the required column `sector_id` to the `Template` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sector_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Mention" DROP COLUMN "mentioned_sector",
ADD COLUMN     "mentioned_sector_id" INTEGER;

-- AlterTable
ALTER TABLE "Subtask" DROP COLUMN "sector",
ADD COLUMN     "sector_id" INTEGER;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "sector",
ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "sector_id" INTEGER;

-- AlterTable
ALTER TABLE "Template" DROP COLUMN "sector",
ADD COLUMN     "sector_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TemplateSubtask" ADD COLUMN     "responsible_id" INTEGER,
ADD COLUMN     "sector_id" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
DROP COLUMN "sector",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role_id" INTEGER NOT NULL,
ADD COLUMN     "sector_id" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "Sector";

-- CreateTable
CREATE TABLE "TaskPause" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "TaskPause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateSubtask" ADD CONSTRAINT "TemplateSubtask_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateSubtask" ADD CONSTRAINT "TemplateSubtask_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPause" ADD CONSTRAINT "TaskPause_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_mentioned_sector_id_fkey" FOREIGN KEY ("mentioned_sector_id") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
