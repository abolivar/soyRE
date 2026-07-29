DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingTransitionAction') THEN
    CREATE TYPE "ListingTransitionAction" AS ENUM (
      'CREATED', 'UPDATED', 'DECLARE_READY', 'RETURN_TO_DRAFT', 'APPROVE',
      'PUBLISH', 'PAUSE', 'RESUME', 'WITHDRAW', 'ARCHIVE', 'MATERIAL_ADDED',
      'MATERIAL_REPLACED', 'MATERIAL_ARCHIVED', 'MATERIAL_REORDERED'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingMaterialType') THEN
    CREATE TYPE "ListingMaterialType" AS ENUM (
      'COVER_IMAGE', 'GALLERY_IMAGE', 'FLOOR_PLAN', 'VIDEO_LINK', 'OTHER'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingMaterialStatus') THEN
    CREATE TYPE "ListingMaterialStatus" AS ENUM ('ACTIVE', 'REPLACED', 'ARCHIVED');
  END IF;
END $$;

ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "assigned_user_id" uuid,
  ADD COLUMN IF NOT EXISTS "approved_by_user_id" uuid,
  ADD COLUMN IF NOT EXISTS "withdrawn_at" timestamp(3);

UPDATE "listings" AS listing
SET "operation_type" = CASE mandate."type"::text
  WHEN 'SALE' THEN 'SALE'::"BusinessOperationType"
  WHEN 'RENT' THEN 'RENT'::"BusinessOperationType"
  ELSE listing."operation_type"
END
FROM "mandates" AS mandate
WHERE listing."mandate_id" = mandate."id"
  AND listing."organization_id" = mandate."organization_id"
  AND listing."operation_type" IS NULL;

UPDATE "listings" AS listing
SET "operation_type" = CASE
  WHEN 'SALE'::"PropertyOperation" = ANY(property."operations")
    AND NOT ('RENT'::"PropertyOperation" = ANY(property."operations"))
    THEN 'SALE'::"BusinessOperationType"
  WHEN 'RENT'::"PropertyOperation" = ANY(property."operations")
    AND NOT ('SALE'::"PropertyOperation" = ANY(property."operations"))
    THEN 'RENT'::"BusinessOperationType"
  ELSE listing."operation_type"
END
FROM "properties" AS property
WHERE listing."property_id" = property."id"
  AND listing."organization_id" = property."organization_id"
  AND listing."operation_type" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "listings" WHERE "operation_type" IS NULL) THEN
    RAISE EXCEPTION 'Listing migration requires an explicit SALE or RENT operation for legacy ambiguous rows.';
  END IF;
END $$;

ALTER TABLE "listings" ALTER COLUMN "operation_type" SET NOT NULL;

ALTER TABLE "listings" DROP CONSTRAINT IF EXISTS "listings_property_id_fkey";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_org_id_id_key'
      AND conrelid = 'listings'::regclass
  ) THEN
    ALTER TABLE "listings"
      ADD CONSTRAINT "listings_org_id_id_key" UNIQUE ("organization_id", "id");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_property_org_fkey'
      AND conrelid = 'listings'::regclass
  ) THEN
    ALTER TABLE "listings"
      ADD CONSTRAINT "listings_property_org_fkey"
      FOREIGN KEY ("organization_id", "property_id")
      REFERENCES "properties"("organization_id", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_assigned_user_id_fkey'
      AND conrelid = 'listings'::regclass
  ) THEN
    ALTER TABLE "listings"
      ADD CONSTRAINT "listings_assigned_user_id_fkey"
      FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_approved_by_user_id_fkey'
      AND conrelid = 'listings'::regclass
  ) THEN
    ALTER TABLE "listings"
      ADD CONSTRAINT "listings_approved_by_user_id_fkey"
      FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "listings_property_id_status_idx";
CREATE INDEX IF NOT EXISTS "listings_organization_id_property_id_status_idx"
  ON "listings"("organization_id", "property_id", "status");
CREATE INDEX IF NOT EXISTS "listings_assigned_user_id_status_idx"
  ON "listings"("assigned_user_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "listings_one_open_operation_idx"
  ON "listings"("organization_id", "property_id", "operation_type")
  WHERE "status" NOT IN ('WITHDRAWN', 'ARCHIVED');

CREATE TABLE IF NOT EXISTS "listing_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "listing_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "action" "ListingTransitionAction" NOT NULL,
  "from_status" "ListingStatus",
  "to_status" "ListingStatus" NOT NULL,
  "reason" text,
  "idempotency_key" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_events_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "listing_events_listing_org_fkey"
    FOREIGN KEY ("organization_id", "listing_id")
    REFERENCES "listings"("organization_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "listing_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "listing_events_org_idempotency_key" UNIQUE ("organization_id", "idempotency_key")
);

CREATE INDEX IF NOT EXISTS "listing_events_org_listing_created_idx"
  ON "listing_events"("organization_id", "listing_id", "created_at");
CREATE INDEX IF NOT EXISTS "listing_events_actor_created_idx"
  ON "listing_events"("actor_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "listing_materials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "listing_id" uuid NOT NULL,
  "type" "ListingMaterialType" NOT NULL,
  "status" "ListingMaterialStatus" NOT NULL DEFAULT 'ACTIVE',
  "name" text NOT NULL,
  "alt_text" text,
  "external_url" text,
  "storage_path" text,
  "mime_type" text,
  "file_size" integer,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_current" boolean NOT NULL DEFAULT true,
  "replaces_material_id" uuid,
  "created_by_user_id" uuid,
  "replaced_by_user_id" uuid,
  "replaced_at" timestamp(3),
  "replacement_reason" text,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "listing_materials_org_listing_id_key" UNIQUE ("organization_id", "listing_id", "id"),
  CONSTRAINT "listing_materials_replaces_once_key" UNIQUE ("organization_id", "listing_id", "replaces_material_id"),
  CONSTRAINT "listing_materials_source_check" CHECK (
    ("type" = 'VIDEO_LINK' AND "external_url" IS NOT NULL AND "storage_path" IS NULL)
    OR ("type" <> 'VIDEO_LINK' AND "storage_path" IS NOT NULL AND "external_url" IS NULL)
  ),
  CONSTRAINT "listing_materials_file_size_check" CHECK ("file_size" IS NULL OR "file_size" >= 0),
  CONSTRAINT "listing_materials_sort_order_check" CHECK ("sort_order" >= 0),
  CONSTRAINT "listing_materials_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "listing_materials_listing_org_fkey"
    FOREIGN KEY ("organization_id", "listing_id")
    REFERENCES "listings"("organization_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "listing_materials_replaces_org_fkey"
    FOREIGN KEY ("organization_id", "listing_id", "replaces_material_id")
    REFERENCES "listing_materials"("organization_id", "listing_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "listing_materials_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "listing_materials_replaced_by_user_id_fkey"
    FOREIGN KEY ("replaced_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "listing_materials_org_listing_status_order_idx"
  ON "listing_materials"("organization_id", "listing_id", "status", "sort_order");
CREATE INDEX IF NOT EXISTS "listing_materials_created_by_created_idx"
  ON "listing_materials"("created_by_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "listing_materials_replaced_by_replaced_idx"
  ON "listing_materials"("replaced_by_user_id", "replaced_at");
CREATE UNIQUE INDEX IF NOT EXISTS "listing_materials_one_current_cover_idx"
  ON "listing_materials"("organization_id", "listing_id")
  WHERE "type" = 'COVER_IMAGE' AND "is_current" = true;

ALTER TABLE "listing_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "listing_materials" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "listing_events" FROM anon, authenticated;
REVOKE ALL ON TABLE "listing_materials" FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-materials',
  'listing-materials',
  false,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
