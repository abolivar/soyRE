CREATE UNIQUE INDEX "clients_org_id_id_key"
  ON "clients"("organization_id", "id");

CREATE UNIQUE INDEX "properties_org_id_id_key"
  ON "properties"("organization_id", "id");

CREATE UNIQUE INDEX "business_participants_org_business_id_id_key"
  ON "business_participants"("organization_id", "business_id", "id");

CREATE UNIQUE INDEX "business_contracts_business_id_id_key"
  ON "business_contracts"("business_id", "id");

ALTER TABLE "business_document_requirements"
  ADD COLUMN "client_id" uuid,
  ADD COLUMN "property_id" uuid,
  ADD COLUMN "business_contract_id" uuid,
  ADD COLUMN "participant_id" uuid;

ALTER TABLE "business_document_requirements"
  ADD CONSTRAINT "business_document_requirements_client_org_fkey"
  FOREIGN KEY ("organization_id", "client_id")
  REFERENCES "clients"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "business_document_requirements_property_org_fkey"
  FOREIGN KEY ("organization_id", "property_id")
  REFERENCES "properties"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "business_document_requirements_contract_business_fkey"
  FOREIGN KEY ("business_id", "business_contract_id")
  REFERENCES "business_contracts"("business_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "business_document_requirements_participant_business_fkey"
  FOREIGN KEY ("organization_id", "business_id", "participant_id")
  REFERENCES "business_participants"("organization_id", "business_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "business_document_requirements_org_client_idx"
  ON "business_document_requirements"("organization_id", "client_id");

CREATE INDEX "business_document_requirements_org_property_idx"
  ON "business_document_requirements"("organization_id", "property_id");

CREATE INDEX "business_document_requirements_business_contract_idx"
  ON "business_document_requirements"("business_id", "business_contract_id");

CREATE INDEX "business_document_requirements_business_participant_idx"
  ON "business_document_requirements"("organization_id", "business_id", "participant_id");
