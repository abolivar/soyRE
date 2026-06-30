DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyStatus') THEN
    CREATE TYPE "PropertyStatus" AS ENUM (
      'DRAFT',
      'ACTIVE',
      'PUBLISHED',
      'RESERVED',
      'UNDER_CONTRACT',
      'CLOSED',
      'WITHDRAWN',
      'ARCHIVED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyOperation') THEN
    CREATE TYPE "PropertyOperation" AS ENUM ('SALE', 'RENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "properties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "assigned_user_id" uuid,
  "owner_client_id" uuid,
  "title" text NOT NULL,
  "internal_code" text,
  "type" text NOT NULL,
  "operations" "PropertyOperation"[] NOT NULL DEFAULT ARRAY[]::"PropertyOperation"[],
  "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
  "country" text NOT NULL,
  "city" text NOT NULL,
  "zone" text NOT NULL,
  "address" text,
  "building_name" text,
  "unit_number" text,
  "bedrooms" integer,
  "bathrooms" integer,
  "parking_spaces" integer,
  "built_area" integer,
  "lot_area" integer,
  "floor" integer,
  "year_built" integer,
  "sale_price" integer,
  "rent_price" integer,
  "currency" text NOT NULL DEFAULT 'USD',
  "maintenance_fee" integer,
  "rental_deposit" integer,
  "available_from" date,
  "source" text,
  "public_description" text,
  "private_notes" text,
  "listing_conditions" text,
  "amenities" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "withdrawn_at" timestamp(3),
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "properties_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "properties_assigned_user_id_fkey"
    FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "properties_owner_client_id_fkey"
    FOREIGN KEY ("owner_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "properties_operations_not_empty_check"
    CHECK (cardinality("operations") > 0),
  CONSTRAINT "properties_sale_price_required_check"
    CHECK (NOT ("operations" @> ARRAY['SALE']::"PropertyOperation"[]) OR "sale_price" IS NOT NULL),
  CONSTRAINT "properties_rent_price_required_check"
    CHECK (NOT ("operations" @> ARRAY['RENT']::"PropertyOperation"[]) OR "rent_price" IS NOT NULL),
  CONSTRAINT "properties_non_negative_amounts_check"
    CHECK (
      ("sale_price" IS NULL OR "sale_price" >= 0) AND
      ("rent_price" IS NULL OR "rent_price" >= 0) AND
      ("maintenance_fee" IS NULL OR "maintenance_fee" >= 0) AND
      ("rental_deposit" IS NULL OR "rental_deposit" >= 0)
    ),
  CONSTRAINT "properties_non_negative_counts_check"
    CHECK (
      ("bedrooms" IS NULL OR "bedrooms" >= 0) AND
      ("bathrooms" IS NULL OR "bathrooms" >= 0) AND
      ("parking_spaces" IS NULL OR "parking_spaces" >= 0) AND
      ("built_area" IS NULL OR "built_area" >= 0) AND
      ("lot_area" IS NULL OR "lot_area" >= 0) AND
      ("floor" IS NULL OR "floor" >= 0)
    ),
  CONSTRAINT "properties_year_built_check"
    CHECK ("year_built" IS NULL OR ("year_built" >= 1800 AND "year_built" <= 2200))
);

CREATE UNIQUE INDEX IF NOT EXISTS "properties_organization_id_internal_code_key"
  ON "properties"("organization_id", "internal_code");
CREATE INDEX IF NOT EXISTS "properties_organization_id_status_idx"
  ON "properties"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "properties_organization_id_zone_idx"
  ON "properties"("organization_id", "zone");
CREATE INDEX IF NOT EXISTS "properties_assigned_user_id_idx"
  ON "properties"("assigned_user_id");
CREATE INDEX IF NOT EXISTS "properties_owner_client_id_idx"
  ON "properties"("owner_client_id");
CREATE INDEX IF NOT EXISTS "properties_operations_idx"
  ON "properties" USING GIN ("operations");
CREATE INDEX IF NOT EXISTS "properties_amenities_idx"
  ON "properties" USING GIN ("amenities");
CREATE INDEX IF NOT EXISTS "properties_tags_idx"
  ON "properties" USING GIN ("tags");

ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;
