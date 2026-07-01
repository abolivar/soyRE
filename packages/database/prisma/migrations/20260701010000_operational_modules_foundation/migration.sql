DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentEntityType') THEN
    CREATE TYPE "DocumentEntityType" AS ENUM ('CLIENT', 'PROPERTY', 'BUSINESS', 'CONTRACT', 'MANDATE', 'LISTING', 'OFFER', 'SHOWING', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
    CREATE TYPE "DocumentStatus" AS ENUM ('REQUIRED', 'UPLOADED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MandateStatus') THEN
    CREATE TYPE "MandateStatus" AS ENUM ('DRAFT', 'PENDING_DOCUMENTS', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MandateType') THEN
    CREATE TYPE "MandateType" AS ENUM ('SALE', 'RENT', 'BOTH');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingStatus') THEN
    CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'READY', 'APPROVED', 'PUBLISHED', 'PAUSED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShowingStatus') THEN
    CREATE TYPE "ShowingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfferStatus') THEN
    CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'SENT', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowStageScope') THEN
    CREATE TYPE "WorkflowStageScope" AS ENUM ('PROPERTY', 'MANDATE', 'LISTING', 'SHOWING', 'OFFER', 'BUSINESS');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "entity_type" "DocumentEntityType" NOT NULL,
  "client_id" uuid,
  "property_id" uuid,
  "business_id" uuid,
  "business_contract_id" uuid,
  "name" text NOT NULL,
  "document_type" text NOT NULL,
  "status" "DocumentStatus" NOT NULL DEFAULT 'REQUIRED',
  "file_name" text,
  "mime_type" text,
  "file_size" integer,
  "storage_path" text,
  "required_by" date,
  "expires_at" date,
  "reviewed_at" timestamp(3),
  "uploaded_by_user_id" uuid,
  "reviewed_by_user_id" uuid,
  "notes" text,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "documents_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "documents_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "documents_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "documents_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "documents_business_contract_id_fkey"
    FOREIGN KEY ("business_contract_id") REFERENCES "business_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "documents_uploaded_by_user_id_fkey"
    FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "documents_reviewed_by_user_id_fkey"
    FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "documents_file_size_check"
    CHECK ("file_size" IS NULL OR "file_size" >= 0)
);

CREATE TABLE IF NOT EXISTS "mandates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "owner_client_id" uuid,
  "assigned_user_id" uuid,
  "type" "MandateType" NOT NULL,
  "status" "MandateStatus" NOT NULL DEFAULT 'DRAFT',
  "exclusive" boolean NOT NULL DEFAULT false,
  "authorized_price_cents" bigint,
  "currency" text NOT NULL DEFAULT 'USD',
  "commission_bps" integer,
  "starts_at" date,
  "ends_at" date,
  "signed_at" date,
  "notes" text,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "mandates_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mandates_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mandates_owner_client_id_fkey"
    FOREIGN KEY ("owner_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "mandates_assigned_user_id_fkey"
    FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "mandates_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "mandates_authorized_price_check"
    CHECK ("authorized_price_cents" IS NULL OR "authorized_price_cents" >= 0),
  CONSTRAINT "mandates_commission_bps_check"
    CHECK ("commission_bps" IS NULL OR ("commission_bps" >= 0 AND "commission_bps" <= 10000)),
  CONSTRAINT "mandates_dates_check"
    CHECK ("starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" >= "starts_at")
);

CREATE TABLE IF NOT EXISTS "listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "mandate_id" uuid,
  "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
  "title" text NOT NULL,
  "public_copy" text,
  "channels" text[] NOT NULL DEFAULT '{}',
  "readiness" jsonb,
  "approved_at" timestamp(3),
  "published_at" timestamp(3),
  "paused_at" timestamp(3),
  "archived_at" timestamp(3),
  "notes" text,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "listings_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "listings_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "listings_mandate_id_fkey"
    FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "showings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "client_id" uuid,
  "business_id" uuid,
  "assigned_user_id" uuid,
  "real_estate_agent_id" uuid,
  "status" "ShowingStatus" NOT NULL DEFAULT 'REQUESTED',
  "scheduled_for" timestamp(3) NOT NULL,
  "completed_at" timestamp(3),
  "outcome" text,
  "feedback" text,
  "next_action_at" timestamp(3),
  "notes" text,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "showings_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "showings_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "showings_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "showings_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "showings_assigned_user_id_fkey"
    FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "showings_real_estate_agent_id_fkey"
    FOREIGN KEY ("real_estate_agent_id") REFERENCES "real_estate_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "property_id" uuid,
  "client_id" uuid NOT NULL,
  "business_id" uuid,
  "assigned_user_id" uuid,
  "operation_type" "BusinessOperationType" NOT NULL,
  "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
  "amount_cents" bigint NOT NULL,
  "currency" text NOT NULL DEFAULT 'USD',
  "terms" text,
  "expires_at" timestamp(3),
  "sent_at" timestamp(3),
  "accepted_at" timestamp(3),
  "rejected_at" timestamp(3),
  "notes" text,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "offers_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "offers_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "offers_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "offers_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "offers_assigned_user_id_fkey"
    FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "offers_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "offers_amount_cents_check" CHECK ("amount_cents" >= 0)
);

CREATE TABLE IF NOT EXISTS "workflow_stages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "scope" "WorkflowStageScope" NOT NULL,
  "name" text NOT NULL,
  "position" integer NOT NULL,
  "tone" text NOT NULL DEFAULT 'neutral',
  "is_active" boolean NOT NULL DEFAULT true,
  "applies_to" text[] NOT NULL DEFAULT '{}',
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "workflow_stages_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "documents_organization_id_status_idx" ON "documents"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "documents_organization_id_entity_type_idx" ON "documents"("organization_id", "entity_type");
CREATE INDEX IF NOT EXISTS "documents_client_id_idx" ON "documents"("client_id");
CREATE INDEX IF NOT EXISTS "documents_property_id_idx" ON "documents"("property_id");
CREATE INDEX IF NOT EXISTS "documents_business_id_idx" ON "documents"("business_id");
CREATE INDEX IF NOT EXISTS "documents_business_contract_id_idx" ON "documents"("business_contract_id");

CREATE INDEX IF NOT EXISTS "mandates_organization_id_status_idx" ON "mandates"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "mandates_property_id_status_idx" ON "mandates"("property_id", "status");
CREATE INDEX IF NOT EXISTS "mandates_owner_client_id_idx" ON "mandates"("owner_client_id");
CREATE INDEX IF NOT EXISTS "mandates_assigned_user_id_idx" ON "mandates"("assigned_user_id");

CREATE INDEX IF NOT EXISTS "listings_organization_id_status_idx" ON "listings"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "listings_property_id_status_idx" ON "listings"("property_id", "status");
CREATE INDEX IF NOT EXISTS "listings_mandate_id_idx" ON "listings"("mandate_id");

CREATE INDEX IF NOT EXISTS "showings_organization_id_status_idx" ON "showings"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "showings_property_id_scheduled_for_idx" ON "showings"("property_id", "scheduled_for");
CREATE INDEX IF NOT EXISTS "showings_client_id_idx" ON "showings"("client_id");
CREATE INDEX IF NOT EXISTS "showings_business_id_idx" ON "showings"("business_id");
CREATE INDEX IF NOT EXISTS "showings_assigned_user_id_idx" ON "showings"("assigned_user_id");
CREATE INDEX IF NOT EXISTS "showings_real_estate_agent_id_idx" ON "showings"("real_estate_agent_id");

CREATE INDEX IF NOT EXISTS "offers_organization_id_status_idx" ON "offers"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "offers_property_id_status_idx" ON "offers"("property_id", "status");
CREATE INDEX IF NOT EXISTS "offers_client_id_idx" ON "offers"("client_id");
CREATE INDEX IF NOT EXISTS "offers_business_id_idx" ON "offers"("business_id");
CREATE INDEX IF NOT EXISTS "offers_assigned_user_id_idx" ON "offers"("assigned_user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_stages_organization_id_scope_name_key" ON "workflow_stages"("organization_id", "scope", "name");
CREATE INDEX IF NOT EXISTS "workflow_stages_organization_id_scope_is_active_idx" ON "workflow_stages"("organization_id", "scope", "is_active");
