ALTER TABLE "Neighborhood" ADD COLUMN "contract_id" INTEGER;
ALTER TABLE "Neighborhood" ADD CONSTRAINT "Neighborhood_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
