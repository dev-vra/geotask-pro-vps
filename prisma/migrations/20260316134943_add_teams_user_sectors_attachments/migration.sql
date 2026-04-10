-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "team_id" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "team_id" INTEGER;

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSector" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sector_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAttachment" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "UserSector_user_id_idx" ON "UserSector"("user_id");

-- CreateIndex
CREATE INDEX "UserSector_sector_id_idx" ON "UserSector"("sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserSector_user_id_sector_id_key" ON "UserSector"("user_id", "sector_id");

-- CreateIndex
CREATE INDEX "TaskAttachment_task_id_idx" ON "TaskAttachment"("task_id");

-- CreateIndex
CREATE INDEX "Task_team_id_idx" ON "Task"("team_id");

-- CreateIndex
CREATE INDEX "User_team_id_idx" ON "User"("team_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSector" ADD CONSTRAINT "UserSector_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSector" ADD CONSTRAINT "UserSector_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
