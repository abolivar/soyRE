CREATE UNIQUE INDEX "business_document_requirements_org_business_id_key"
  ON "business_document_requirements"("organization_id", "business_id", "id");

ALTER TABLE "documents"
  ADD COLUMN "requirement_id" uuid;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_requirement_business_fkey"
  FOREIGN KEY ("organization_id", "business_id", "requirement_id")
  REFERENCES "business_document_requirements"("organization_id", "business_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "documents_requirement_business_idx"
  ON "documents"("organization_id", "business_id", "requirement_id");

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'business-documents',
  'business-documents',
  false,
  15728640,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
