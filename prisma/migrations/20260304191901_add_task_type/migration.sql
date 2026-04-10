-- CreateTable
CREATE TABLE "TaskType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sector_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskType_name_key" ON "TaskType"("name");

-- CreateIndex
CREATE INDEX "TaskType_sector_id_idx" ON "TaskType"("sector_id");

-- CreateIndex
CREATE INDEX "Comment_task_id_idx" ON "Comment"("task_id");

-- CreateIndex
CREATE INDEX "Notification_user_id_read_idx" ON "Notification"("user_id", "read");

-- CreateIndex
CREATE INDEX "Notification_task_id_idx" ON "Notification"("task_id");

-- CreateIndex
CREATE INDEX "Task_responsible_id_idx" ON "Task"("responsible_id");

-- CreateIndex
CREATE INDEX "Task_sector_id_idx" ON "Task"("sector_id");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_parent_id_idx" ON "Task"("parent_id");

-- CreateIndex
CREATE INDEX "Task_created_by_id_idx" ON "Task"("created_by_id");

-- CreateIndex
CREATE INDEX "TaskHistory_task_id_idx" ON "TaskHistory"("task_id");

-- AddForeignKey
ALTER TABLE "TaskType" ADD CONSTRAINT "TaskType_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
