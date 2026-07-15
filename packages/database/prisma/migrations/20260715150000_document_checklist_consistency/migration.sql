ALTER TABLE "business_document_requirements"
  ADD COLUMN "template_id" uuid NOT NULL;

CREATE UNIQUE INDEX "document_checklist_template_items_organization_id_template__key"
  ON "document_checklist_template_items"("organization_id", "template_id", "id");

CREATE UNIQUE INDEX "business_document_checklists_organization_id_id_business_id_key"
  ON "business_document_checklists"("organization_id", "id", "business_id", "template_id");

ALTER TABLE "business_document_requirements"
  DROP CONSTRAINT "business_document_requirements_organization_id_checklist_i_fkey";

ALTER TABLE "business_document_requirements"
  DROP CONSTRAINT "business_document_requirements_organization_id_template_it_fkey";

ALTER TABLE "business_document_requirements"
  ADD CONSTRAINT "business_document_requirements_organization_id_checklist_i_fkey"
  FOREIGN KEY ("organization_id", "checklist_id", "business_id", "template_id")
  REFERENCES "business_document_checklists"("organization_id", "id", "business_id", "template_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_document_requirements"
  ADD CONSTRAINT "business_document_requirements_organization_id_template_id_fkey"
  FOREIGN KEY ("organization_id", "template_id", "template_item_id")
  REFERENCES "document_checklist_template_items"("organization_id", "template_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
