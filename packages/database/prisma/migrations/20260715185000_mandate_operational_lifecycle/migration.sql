ALTER TYPE "MandateStatus" ADD VALUE IF NOT EXISTS 'PENDING_SIGNATURE' AFTER 'DRAFT';
ALTER TYPE "MandateStatus" ADD VALUE IF NOT EXISTS 'SUPERSEDED' BEFORE 'ARCHIVED';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'MandateTransitionAction'
  ) THEN
    CREATE TYPE "MandateTransitionAction" AS ENUM (
      'CREATED',
      'UPDATED',
      'SUBMIT_FOR_SIGNATURE',
      'RETURN_TO_DRAFT',
      'REGISTER_SIGNATURE',
      'ACTIVATE',
      'EXPIRE',
      'CANCEL',
      'RENEW',
      'SUPERSEDE',
      'ARCHIVE'
    );
  END IF;
END $$;

ALTER TABLE "mandates"
  ADD COLUMN IF NOT EXISTS "previous_mandate_id" uuid,
  ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp(3),
  ADD COLUMN IF NOT EXISTS "cancellation_reason" text,
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp(3);

CREATE UNIQUE INDEX IF NOT EXISTS "mandates_org_id_id_key"
  ON "mandates"("organization_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "mandates_org_previous_key"
  ON "mandates"("organization_id", "previous_mandate_id");

ALTER TABLE "mandates"
  DROP CONSTRAINT IF EXISTS "mandates_property_id_fkey",
  DROP CONSTRAINT IF EXISTS "mandates_owner_client_id_fkey";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mandates_property_org_fkey'
      AND conrelid = 'mandates'::regclass
  ) THEN
    ALTER TABLE "mandates"
      ADD CONSTRAINT "mandates_property_org_fkey"
      FOREIGN KEY ("organization_id", "property_id")
      REFERENCES "properties"("organization_id", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mandates_owner_client_org_fkey'
      AND conrelid = 'mandates'::regclass
  ) THEN
    ALTER TABLE "mandates"
      ADD CONSTRAINT "mandates_owner_client_org_fkey"
      FOREIGN KEY ("organization_id", "owner_client_id")
      REFERENCES "clients"("organization_id", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mandates_previous_mandate_org_fkey'
      AND conrelid = 'mandates'::regclass
  ) THEN
    ALTER TABLE "mandates"
      ADD CONSTRAINT "mandates_previous_mandate_org_fkey"
      FOREIGN KEY ("organization_id", "previous_mandate_id")
      REFERENCES "mandates"("organization_id", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "mandates_property_id_status_idx";
CREATE INDEX IF NOT EXISTS "mandates_organization_id_property_id_status_idx"
  ON "mandates"("organization_id", "property_id", "status");
CREATE INDEX IF NOT EXISTS "mandates_active_exclusivity_idx"
  ON "mandates"(
    "organization_id",
    "property_id",
    "starts_at",
    "ends_at",
    "type"
  )
  WHERE "status" = 'ACTIVE';

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "mandate_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_mandate_org_fkey'
      AND conrelid = 'documents'::regclass
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_mandate_org_fkey"
      FOREIGN KEY ("organization_id", "mandate_id")
      REFERENCES "mandates"("organization_id", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "documents_organization_id_mandate_id_idx"
  ON "documents"("organization_id", "mandate_id");

ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "operation_type" "BusinessOperationType";

ALTER TABLE "listings"
  DROP CONSTRAINT IF EXISTS "listings_mandate_id_fkey";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_mandate_org_fkey'
      AND conrelid = 'listings'::regclass
  ) THEN
    ALTER TABLE "listings"
      ADD CONSTRAINT "listings_mandate_org_fkey"
      FOREIGN KEY ("organization_id", "mandate_id")
      REFERENCES "mandates"("organization_id", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "listings_mandate_id_idx";
CREATE INDEX IF NOT EXISTS "listings_organization_id_mandate_id_idx"
  ON "listings"("organization_id", "mandate_id");

CREATE TABLE IF NOT EXISTS "mandate_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "mandate_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "action" "MandateTransitionAction" NOT NULL,
  "from_status" "MandateStatus",
  "to_status" "MandateStatus" NOT NULL,
  "reason" text,
  "idempotency_key" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mandate_events_organization_id_fkey"
    FOREIGN KEY ("organization_id")
    REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mandate_events_mandate_org_fkey"
    FOREIGN KEY ("organization_id", "mandate_id")
    REFERENCES "mandates"("organization_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mandate_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id")
    REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "mandate_events_organization_id_idempotency_key_key"
  ON "mandate_events"("organization_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "mandate_events_organization_id_mandate_id_created_at_idx"
  ON "mandate_events"("organization_id", "mandate_id", "created_at");
CREATE INDEX IF NOT EXISTS "mandate_events_actor_user_id_created_at_idx"
  ON "mandate_events"("actor_user_id", "created_at");

ALTER TABLE "mandate_events" ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE "mandate_events" IS
  'Immutable organization-scoped mandate lifecycle history. Direct Data API access is denied until explicit RLS policies are approved.';
