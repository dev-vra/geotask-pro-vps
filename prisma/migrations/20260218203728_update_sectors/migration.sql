/*
  Warnings:

  - The values [Operacoes,Campo,Tecnico,Ambiental,Juridico] on the enum `Sector` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Sector_new" AS ENUM ('AtendimentoAoCliente', 'AtendimentoSocial', 'Administrativo', 'Cadastro', 'Engenharia', 'Financeiro', 'Reurb', 'RH', 'TI', 'Coordenacao', 'Gerencia', 'Controladoria');
ALTER TABLE "User" ALTER COLUMN "sector" TYPE "Sector_new" USING ("sector"::text::"Sector_new");
ALTER TABLE "Task" ALTER COLUMN "sector" TYPE "Sector_new" USING ("sector"::text::"Sector_new");
ALTER TABLE "Subtask" ALTER COLUMN "sector" TYPE "Sector_new" USING ("sector"::text::"Sector_new");
ALTER TABLE "Template" ALTER COLUMN "sector" TYPE "Sector_new" USING ("sector"::text::"Sector_new");
ALTER TABLE "Mention" ALTER COLUMN "mentioned_sector" TYPE "Sector_new" USING ("mentioned_sector"::text::"Sector_new");
ALTER TYPE "Sector" RENAME TO "Sector_old";
ALTER TYPE "Sector_new" RENAME TO "Sector";
DROP TYPE "Sector_old";
COMMIT;
