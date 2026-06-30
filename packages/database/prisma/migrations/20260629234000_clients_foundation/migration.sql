DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientType') THEN
    CREATE TYPE "ClientType" AS ENUM ('PERSON', 'COMPANY');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientRole') THEN
    CREATE TYPE "ClientRole" AS ENUM (
      'BUYER',
      'SELLER',
      'LESSOR',
      'LESSEE',
      'INVESTOR',
      'LEAD',
      'REFERRER',
      'RELATED_CONTACT'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientStatus') THEN
    CREATE TYPE "ClientStatus" AS ENUM (
      'NEW',
      'ACTIVE',
      'NURTURING',
      'INACTIVE',
      'ARCHIVED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientTemperature') THEN
    CREATE TYPE "ClientTemperature" AS ENUM ('COLD', 'WARM', 'HOT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContactMethod') THEN
    CREATE TYPE "ContactMethod" AS ENUM (
      'EMAIL',
      'PHONE',
      'WHATSAPP',
      'SMS',
      'IN_PERSON'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientInterestType') THEN
    CREATE TYPE "ClientInterestType" AS ENUM (
      'BUY',
      'RENT',
      'SELL',
      'LEASE',
      'INVEST',
      'MANAGE',
      'REFER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientTimeline') THEN
    CREATE TYPE "ClientTimeline" AS ENUM (
      'IMMEDIATE',
      'ONE_TO_THREE_MONTHS',
      'THREE_TO_SIX_MONTHS',
      'SIX_PLUS_MONTHS',
      'EXPLORING'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinancingStatus') THEN
    CREATE TYPE "FinancingStatus" AS ENUM (
      'CASH',
      'PRE_APPROVED',
      'NEEDS_FINANCING',
      'UNKNOWN'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "assigned_user_id" uuid,
  "type" "ClientType" NOT NULL DEFAULT 'PERSON',
  "roles" "ClientRole"[] NOT NULL DEFAULT ARRAY[]::"ClientRole"[],
  "status" "ClientStatus" NOT NULL DEFAULT 'NEW',
  "temperature" "ClientTemperature" NOT NULL DEFAULT 'WARM',
  "first_name" text,
  "last_name" text,
  "company_name" text,
  "display_name" text NOT NULL,
  "legal_id" text,
  "email" text,
  "phone" text,
  "alternate_phone" text,
  "whatsapp" text,
  "preferred_contact_method" "ContactMethod",
  "country" text,
  "city" text,
  "zone" text,
  "address" text,
  "source" text,
  "interest_type" "ClientInterestType",
  "budget_min" integer,
  "budget_max" integer,
  "currency" text NOT NULL DEFAULT 'USD',
  "preferred_zones" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "property_types" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "bedrooms_min" integer,
  "bathrooms_min" integer,
  "parking_min" integer,
  "area_min" integer,
  "area_max" integer,
  "timeline" "ClientTimeline",
  "financing_status" "FinancingStatus",
  "last_contact_at" timestamp(3),
  "next_follow_up_at" timestamp(3),
  "notes" text,
  "tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "marketing_consent" boolean NOT NULL DEFAULT false,
  "data_consent" boolean NOT NULL DEFAULT false,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "clients_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clients_assigned_user_id_fkey"
    FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "clients_budget_range_check"
    CHECK ("budget_min" IS NULL OR "budget_max" IS NULL OR "budget_min" <= "budget_max"),
  CONSTRAINT "clients_area_range_check"
    CHECK ("area_min" IS NULL OR "area_max" IS NULL OR "area_min" <= "area_max")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clients_organization_id_email_key"
  ON "clients"("organization_id", "email");
CREATE INDEX IF NOT EXISTS "clients_organization_id_status_idx"
  ON "clients"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "clients_organization_id_next_follow_up_at_idx"
  ON "clients"("organization_id", "next_follow_up_at");
CREATE INDEX IF NOT EXISTS "clients_assigned_user_id_idx"
  ON "clients"("assigned_user_id");
CREATE INDEX IF NOT EXISTS "clients_roles_idx"
  ON "clients" USING GIN ("roles");
CREATE INDEX IF NOT EXISTS "clients_tags_idx"
  ON "clients" USING GIN ("tags");

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
