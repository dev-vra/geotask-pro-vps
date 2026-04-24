-- Migration: add_reurb_module
-- Adds file_hash to TaskAttachment, extends Notification, creates REURB models

-- Step 1: TaskAttachment - add file_hash (nullable for existing records)
ALTER TABLE "TaskAttachment" ADD COLUMN IF NOT EXISTS "file_hash" TEXT;

-- Step 2: Notification - add REURB FK fields
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "reurb_protocol_id" INTEGER;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "reurb_comment_id" INTEGER;
CREATE INDEX IF NOT EXISTS "Notification_reurb_protocol_id_idx" ON "Notification"("reurb_protocol_id");

-- Step 3: REURB Enums
CREATE TYPE "ReurbType" AS ENUM ('SOCIAL', 'ESPECIFICA', 'MISTA');
CREATE TYPE "ReurbEtapa" AS ENUM (
  'INSTAURACAO', 'BCI', 'MATRICULA_MAE', 'PROJETO_URBANISTICO',
  'NOTIFICACOES_PARTICULARES', 'NOTIFICACOES_EDITAL',
  'DECISAO_ADMINISTRATIVA', 'CRF_CARTORIO'
);
CREATE TYPE "ReurbStakeholder" AS ENUM ('CARTORIO', 'PREFEITURA', 'ESTADO', 'PARTICULARES', 'INTERNO');
CREATE TYPE "ReurbStatus" AS ENUM (
  'ELABORACAO_INTERNA', 'REVISAO_GERENCIA', 'PUBLICACAO_AGUARDANDO',
  'ENVIADO_PREFEITURA', 'ENVIADO_ESTADO', 'ENVIADO_CARTORIO',
  'NOTA_DEVOLUTIVA', 'EM_CORRECAO', 'APROVADO_REGISTRADO', 'CANCELADO'
);

-- Step 4: ReurbProcess
CREATE TABLE "ReurbProcess" (
  "id"              SERIAL PRIMARY KEY,
  "numero_processo" TEXT,
  "tipo_reurb"      "ReurbType" NOT NULL,
  "qtde_lotes"      INTEGER NOT NULL DEFAULT 0,
  "neighborhood_id" INTEGER NOT NULL,
  "sector_id"       INTEGER NOT NULL,
  "created_by_id"   INTEGER NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  "deleted_at"      TIMESTAMP(3),
  CONSTRAINT "ReurbProcess_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "Neighborhood"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReurbProcess_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReurbProcess_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReurbProcess_neighborhood_id_numero_processo_key" ON "ReurbProcess"("neighborhood_id", "numero_processo");
CREATE INDEX "ReurbProcess_sector_id_deleted_at_idx" ON "ReurbProcess"("sector_id", "deleted_at");
CREATE INDEX "ReurbProcess_created_by_id_idx" ON "ReurbProcess"("created_by_id");

-- Step 5: ReurbProtocol
CREATE TABLE "ReurbProtocol" (
  "id"                        SERIAL PRIMARY KEY,
  "process_id"                INTEGER NOT NULL,
  "tipo_documento"            TEXT NOT NULL,
  "etapa_atual"               "ReurbEtapa" NOT NULL DEFAULT 'INSTAURACAO',
  "orgao_destino"             "ReurbStakeholder" NOT NULL DEFAULT 'INTERNO',
  "status_atual"              "ReurbStatus" NOT NULL DEFAULT 'ELABORACAO_INTERNA',
  "versao_documento"          INTEGER NOT NULL DEFAULT 1,
  "qtd_devolutivas"           INTEGER NOT NULL DEFAULT 0,
  "data_ultimo_envio"         TIMESTAMP(3),
  "data_ultimo_retorno"       TIMESTAMP(3),
  "prazo_resposta"            TIMESTAMP(3),
  "numero_protocolo_cartorio" TEXT,
  "data_registro_cartorio"    TIMESTAMP(3),
  "registro_confirmado"       BOOLEAN NOT NULL DEFAULT false,
  "created_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReurbProtocol_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "ReurbProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReurbProtocol_process_id_idx" ON "ReurbProtocol"("process_id");
CREATE INDEX "ReurbProtocol_status_atual_registro_confirmado_idx" ON "ReurbProtocol"("status_atual", "registro_confirmado");

-- Step 6: ReurbHistory
CREATE TABLE "ReurbHistory" (
  "id"                SERIAL PRIMARY KEY,
  "protocol_id"       INTEGER NOT NULL,
  "etapa_referencia"  "ReurbEtapa" NOT NULL,
  "acao"              TEXT NOT NULL,
  "status_anterior"   "ReurbStatus",
  "status_novo"       "ReurbStatus" NOT NULL,
  "numero_oficio"     TEXT,
  "numero_nd"         TEXT,
  "link_evidencia"    TEXT,
  "versao_referencia" INTEGER NOT NULL,
  "dias_nesta_etapa"  INTEGER,
  "observacao"        TEXT,
  "user_id"           INTEGER NOT NULL,
  "ip_address"        TEXT NOT NULL,
  "user_agent"        TEXT,
  "data_acao"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previous_hash"     TEXT,
  "entry_hash"        TEXT NOT NULL,
  CONSTRAINT "ReurbHistory_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "ReurbProtocol"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReurbHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ReurbHistory_protocol_id_data_acao_idx" ON "ReurbHistory"("protocol_id", "data_acao");
CREATE INDEX "ReurbHistory_user_id_idx" ON "ReurbHistory"("user_id");

-- Prevent retroactive tampering with history entries
CREATE OR REPLACE FUNCTION prevent_reurb_history_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ReurbHistory records are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER reurb_history_immutable
  BEFORE UPDATE ON "ReurbHistory"
  FOR EACH ROW EXECUTE FUNCTION prevent_reurb_history_update();

-- Step 7: ReurbAttachment
CREATE TABLE "ReurbAttachment" (
  "id"                SERIAL PRIMARY KEY,
  "protocol_id"       INTEGER NOT NULL,
  "etapa_referencia"  "ReurbEtapa" NOT NULL,
  "versao_referencia" INTEGER NOT NULL,
  "file_name"         TEXT NOT NULL,
  "original_name"     TEXT NOT NULL,
  "file_url"          TEXT NOT NULL,
  "file_type"         TEXT NOT NULL,
  "size"              INTEGER NOT NULL,
  "file_hash"         TEXT NOT NULL,
  "uploaded_ip"       TEXT NOT NULL,
  "uploaded_by_id"    INTEGER NOT NULL,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReurbAttachment_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "ReurbProtocol"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReurbAttachment_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ReurbAttachment_protocol_id_idx" ON "ReurbAttachment"("protocol_id");

-- Step 8: ReurbComment
CREATE TABLE "ReurbComment" (
  "id"           SERIAL PRIMARY KEY,
  "content"      TEXT NOT NULL,
  "protocol_id"  INTEGER NOT NULL,
  "user_id"      INTEGER,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReurbComment_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "ReurbProtocol"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReurbComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ReurbComment_protocol_id_idx" ON "ReurbComment"("protocol_id");

-- Step 9: ReurbMention
CREATE TABLE "ReurbMention" (
  "id"                    SERIAL PRIMARY KEY,
  "mention_type"          TEXT NOT NULL,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "comment_id"            INTEGER NOT NULL,
  "protocol_id"           INTEGER NOT NULL,
  "mentioned_user_id"     INTEGER,
  "mentioned_by_id"       INTEGER,
  "mentioned_sector_id"   INTEGER,
  CONSTRAINT "ReurbMention_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "ReurbComment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReurbMention_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "ReurbProtocol"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReurbMention_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ReurbMention_mentioned_by_id_fkey" FOREIGN KEY ("mentioned_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ReurbMention_mentioned_sector_id_fkey" FOREIGN KEY ("mentioned_sector_id") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 10: FK from Notification to ReurbComment
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reurb_comment_id_fkey"
  FOREIGN KEY ("reurb_comment_id") REFERENCES "ReurbComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
