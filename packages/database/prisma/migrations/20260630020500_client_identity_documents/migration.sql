DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientIdentityDocumentType') THEN
    CREATE TYPE "ClientIdentityDocumentType" AS ENUM ('PASSPORT', 'NATIONAL_ID');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "client_identity_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "type" "ClientIdentityDocumentType" NOT NULL,
  "document_number" text,
  "issuing_country" text,
  "first_name" text,
  "last_name" text,
  "birth_date" date,
  "expiration_date" date,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "content" bytea NOT NULL,
  "ocr_text" text,
  "extracted_data" jsonb,
  "created_by_user_id" uuid,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_identity_documents_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "client_identity_documents_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_identity_documents_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "client_identity_documents_file_size_check"
    CHECK ("file_size" > 0 AND "file_size" <= 5242880),
  CONSTRAINT "client_identity_documents_mime_type_check"
    CHECK ("mime_type" IN ('image/jpeg', 'image/png', 'image/webp'))
);

CREATE INDEX IF NOT EXISTS "client_identity_documents_organization_id_client_id_idx"
  ON "client_identity_documents"("organization_id", "client_id");
CREATE INDEX IF NOT EXISTS "client_identity_documents_organization_id_type_document_number_idx"
  ON "client_identity_documents"("organization_id", "type", "document_number");
CREATE INDEX IF NOT EXISTS "client_identity_documents_created_by_user_id_idx"
  ON "client_identity_documents"("created_by_user_id");

ALTER TABLE "client_identity_documents" ENABLE ROW LEVEL SECURITY;
