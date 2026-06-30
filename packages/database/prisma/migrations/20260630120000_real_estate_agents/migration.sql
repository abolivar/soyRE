DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RealEstateAgentCategory') THEN
    CREATE TYPE "RealEstateAgentCategory" AS ENUM (
      'BROKER',
      'EXTERNAL_BROKER',
      'REFERRER'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "real_estate_agents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "category" "RealEstateAgentCategory" NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "display_name" text NOT NULL,
  "company_name" text,
  "email" text,
  "phone" text,
  "whatsapp" text,
  "license_number" text,
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "real_estate_agents_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "real_estate_agents_contact_check"
    CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL OR "whatsapp" IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS "real_estate_agents_organization_id_email_key"
  ON "real_estate_agents"("organization_id", "email");
CREATE INDEX IF NOT EXISTS "real_estate_agents_organization_id_category_idx"
  ON "real_estate_agents"("organization_id", "category");
CREATE INDEX IF NOT EXISTS "real_estate_agents_organization_id_is_active_idx"
  ON "real_estate_agents"("organization_id", "is_active");

ALTER TABLE "real_estate_agents" ENABLE ROW LEVEL SECURITY;
