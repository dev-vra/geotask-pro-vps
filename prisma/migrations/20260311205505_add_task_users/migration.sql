-- CreateTable
CREATE TABLE "TaskUser" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskUser_task_id_idx" ON "TaskUser"("task_id");

-- CreateIndex
CREATE INDEX "TaskUser_user_id_idx" ON "TaskUser"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "TaskUser_task_id_user_id_key" ON "TaskUser"("task_id", "user_id");

-- AddForeignKey
ALTER TABLE "TaskUser" ADD CONSTRAINT "TaskUser_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUser" ADD CONSTRAINT "TaskUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
