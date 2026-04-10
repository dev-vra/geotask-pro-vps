-- Migration resiliente para resolver drift de colunas já existentes
DO $$ 
BEGIN 
    -- 1. Hierarquia de Usuários
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='manager_id') THEN
        ALTER TABLE "User" ADD COLUMN "manager_id" INTEGER;
        ALTER TABLE "User" ADD CONSTRAINT "User_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_manager_id_idx" ON "User"("manager_id");

DO $$ 
BEGIN 
    -- 2. Campos de Recorrência na Task
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='is_recurring') THEN
        ALTER TABLE "Task" ADD COLUMN "is_recurring" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='last_recurrence_at') THEN
        ALTER TABLE "Task" ADD COLUMN "last_recurrence_at" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='next_recurrence_at') THEN
        ALTER TABLE "Task" ADD COLUMN "next_recurrence_at" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='recurrence_config') THEN
        ALTER TABLE "Task" ADD COLUMN "recurrence_config" JSONB;
    END IF;
END $$;

-- 3. Tabelas de Gaming (Usando IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "Gaming" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "evaluator_id" INTEGER,
    "cycle_type" TEXT NOT NULL,
    "cycle_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "GamingItem" (
    "id" SERIAL PRIMARY KEY,
    "gaming_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "achieved" DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS "GamingHistory" (
    "id" SERIAL PRIMARY KEY,
    "gaming_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GamingSnapshot" (
    "id" SERIAL PRIMARY KEY,
    "gaming_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Constraints de Foreign Key (Garantindo que não falhe se já existir)
DO $$ 
BEGIN 
    BEGIN ALTER TABLE "Gaming" ADD CONSTRAINT "Gaming_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE "Gaming" ADD CONSTRAINT "Gaming_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE "GamingItem" ADD CONSTRAINT "GamingItem_gaming_id_fkey" FOREIGN KEY ("gaming_id") REFERENCES "Gaming"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE "GamingHistory" ADD CONSTRAINT "GamingHistory_gaming_id_fkey" FOREIGN KEY ("gaming_id") REFERENCES "Gaming"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE "GamingHistory" ADD CONSTRAINT "GamingHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE "GamingSnapshot" ADD CONSTRAINT "GamingSnapshot_gaming_id_fkey" FOREIGN KEY ("gaming_id") REFERENCES "Gaming"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS "Gaming_user_id_idx" ON "Gaming"("user_id");
CREATE INDEX IF NOT EXISTS "Gaming_evaluator_id_idx" ON "Gaming"("evaluator_id");
CREATE INDEX IF NOT EXISTS "Gaming_status_idx" ON "Gaming"("status");
CREATE INDEX IF NOT EXISTS "GamingItem_gaming_id_idx" ON "GamingItem"("gaming_id");
CREATE INDEX IF NOT EXISTS "GamingHistory_gaming_id_idx" ON "GamingHistory"("gaming_id");
CREATE INDEX IF NOT EXISTS "GamingSnapshot_gaming_id_idx" ON "GamingSnapshot"("gaming_id");
