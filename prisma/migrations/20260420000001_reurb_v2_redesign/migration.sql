-- Migration: reurb_v2_redesign
-- Drops old REURB tables (empty) and recreates with v2 schema
-- SAFE: ReurbProcess/Protocol/History tables are empty (never had data)
-- PRESERVED: file_hash on TaskAttachment, reurb_* columns on Notification

-- Step 1: Drop old REURB tables (CASCADE removes FK deps)
DROP TABLE IF EXISTS "ReurbMention" CASCADE;
DROP TABLE IF EXISTS "ReurbComment" CASCADE;
DROP TABLE IF EXISTS "ReurbAttachment" CASCADE;
DROP TABLE IF EXISTS "ReurbHistory" CASCADE;
DROP TABLE IF EXISTS "ReurbProtocol" CASCADE;
DROP TABLE IF EXISTS "ReurbProcess" CASCADE;

-- Step 2: Drop old REURB enums
DROP TYPE IF EXISTS "ReurbType";
DROP TYPE IF EXISTS "ReurbEtapa";
DROP TYPE IF EXISTS "ReurbStakeholder";
DROP TYPE IF EXISTS "ReurbStatus";

-- Step 3: New enum
CREATE TYPE "ReurbTipoSolicitacao" AS ENUM (
  'INSTAURACAO', 'MATRICULAS', 'MAPA_CADASTRAL', 'EDITAL', 'CRF'
);

-- Step 4: ReurbProcess (v2)
CREATE TABLE "ReurbProcess" (
  "id"               SERIAL PRIMARY KEY,
  "neighborhood_id"  INTEGER NOT NULL,
  "contract_id"      INTEGER,
  "sector_id"        INTEGER NOT NULL,
  "qtde_lotes"       INTEGER NOT NULL DEFAULT 0,
  "created_by_id"    INTEGER NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,
  "deleted_at"       TIMESTAMP(3),
  CONSTRAINT "ReurbProcess_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "Neighborhood"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReurbProcess_contract_id_fkey"     FOREIGN KEY ("contract_id")     REFERENCES "Contract"("id")     ON DELETE SET NULL  ON UPDATE CASCADE,
  CONSTRAINT "ReurbProcess_sector_id_fkey"        FOREIGN KEY ("sector_id")       REFERENCES "Sector"("id")       ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReurbProcess_created_by_id_fkey"   FOREIGN KEY ("created_by_id")   REFERENCES "User"("id")         ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReurbProcess_neighborhood_id_key" ON "ReurbProcess"("neighborhood_id");
CREATE INDEX "ReurbProcess_contract_id_idx"        ON "ReurbProcess"("contract_id");
CREATE INDEX "ReurbProcess_sector_id_deleted_at_idx" ON "ReurbProcess"("sector_id", "deleted_at");
CREATE INDEX "ReurbProcess_created_by_id_idx"      ON "ReurbProcess"("created_by_id");

-- Step 5: ReurbSolicitacao
CREATE TABLE "ReurbSolicitacao" (
  "id"             SERIAL PRIMARY KEY,
  "process_id"     INTEGER NOT NULL,
  "tipo"           "ReurbTipoSolicitacao" NOT NULL,
  "status_atual"   TEXT NOT NULL,
  "prazo_alerta"   TIMESTAMP(3),
  "link"           TEXT,
  "created_by_id"  INTEGER NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReurbSolicitacao_process_id_fkey"    FOREIGN KEY ("process_id")    REFERENCES "ReurbProcess"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "ReurbSolicitacao_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id")        ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ReurbSolicitacao_process_id_idx"      ON "ReurbSolicitacao"("process_id");
CREATE INDEX "ReurbSolicitacao_tipo_status_idx"     ON "ReurbSolicitacao"("tipo", "status_atual");

-- Step 6: ReurbSolicitacaoHistory (immutable)
CREATE TABLE "ReurbSolicitacaoHistory" (
  "id"               SERIAL PRIMARY KEY,
  "solicitacao_id"   INTEGER NOT NULL,
  "status_anterior"  TEXT,
  "status_novo"      TEXT NOT NULL,
  "metadata"         JSONB,
  "user_id"          INTEGER NOT NULL,
  "ip_address"       TEXT NOT NULL,
  "user_agent"       TEXT,
  "data_acao"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previous_hash"    TEXT,
  "entry_hash"       TEXT NOT NULL,
  CONSTRAINT "ReurbSolicitacaoHistory_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "ReurbSolicitacao"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "ReurbSolicitacaoHistory_user_id_fkey"        FOREIGN KEY ("user_id")        REFERENCES "User"("id")            ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ReurbSolicitacaoHistory_solicitacao_id_data_acao_idx" ON "ReurbSolicitacaoHistory"("solicitacao_id", "data_acao");
CREATE INDEX "ReurbSolicitacaoHistory_user_id_idx" ON "ReurbSolicitacaoHistory"("user_id");

-- Immutability trigger
CREATE OR REPLACE FUNCTION prevent_reurb_history_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ReurbSolicitacaoHistory records are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER reurb_history_immutable
  BEFORE UPDATE ON "ReurbSolicitacaoHistory"
  FOR EACH ROW EXECUTE FUNCTION prevent_reurb_history_update();

-- Step 7: ReurbAttachment
CREATE TABLE "ReurbAttachment" (
  "id"               SERIAL PRIMARY KEY,
  "solicitacao_id"   INTEGER NOT NULL,
  "file_name"        TEXT NOT NULL,
  "original_name"    TEXT NOT NULL,
  "file_url"         TEXT NOT NULL,
  "file_type"        TEXT NOT NULL,
  "size"             INTEGER NOT NULL,
  "file_hash"        TEXT NOT NULL,
  "uploaded_ip"      TEXT NOT NULL,
  "uploaded_by_id"   INTEGER NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReurbAttachment_solicitacao_id_fkey"   FOREIGN KEY ("solicitacao_id")   REFERENCES "ReurbSolicitacao"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "ReurbAttachment_uploaded_by_id_fkey"   FOREIGN KEY ("uploaded_by_id")   REFERENCES "User"("id")            ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ReurbAttachment_solicitacao_id_idx" ON "ReurbAttachment"("solicitacao_id");

-- Step 8: ReurbComment
CREATE TABLE "ReurbComment" (
  "id"              SERIAL PRIMARY KEY,
  "content"         TEXT NOT NULL,
  "solicitacao_id"  INTEGER NOT NULL,
  "user_id"         INTEGER,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReurbComment_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "ReurbSolicitacao"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "ReurbComment_user_id_fkey"        FOREIGN KEY ("user_id")        REFERENCES "User"("id")            ON DELETE SET NULL  ON UPDATE CASCADE
);
CREATE INDEX "ReurbComment_solicitacao_id_idx" ON "ReurbComment"("solicitacao_id");

-- Step 9: ReurbMention
CREATE TABLE "ReurbMention" (
  "id"                    SERIAL PRIMARY KEY,
  "mention_type"          TEXT NOT NULL,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "comment_id"            INTEGER NOT NULL,
  "solicitacao_id"        INTEGER NOT NULL,
  "mentioned_user_id"     INTEGER,
  "mentioned_by_id"       INTEGER,
  "mentioned_sector_id"   INTEGER,
  CONSTRAINT "ReurbMention_comment_id_fkey"          FOREIGN KEY ("comment_id")          REFERENCES "ReurbComment"("id")     ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "ReurbMention_solicitacao_id_fkey"      FOREIGN KEY ("solicitacao_id")      REFERENCES "ReurbSolicitacao"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "ReurbMention_mentioned_user_id_fkey"   FOREIGN KEY ("mentioned_user_id")   REFERENCES "User"("id")             ON DELETE SET NULL  ON UPDATE CASCADE,
  CONSTRAINT "ReurbMention_mentioned_by_id_fkey"     FOREIGN KEY ("mentioned_by_id")     REFERENCES "User"("id")             ON DELETE SET NULL  ON UPDATE CASCADE,
  CONSTRAINT "ReurbMention_mentioned_sector_id_fkey" FOREIGN KEY ("mentioned_sector_id") REFERENCES "Sector"("id")           ON DELETE SET NULL  ON UPDATE CASCADE
);

-- Step 10: Update Notification FK for reurb_comment (ReurbComment table recreated, FK needs re-add)
-- The reurb_comment_id column was already added by migration v1, just re-add FK constraint
-- (old FK was dropped with old ReurbComment table cascade)
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_reurb_comment_id_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reurb_comment_id_fkey"
  FOREIGN KEY ("reurb_comment_id") REFERENCES "ReurbComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
