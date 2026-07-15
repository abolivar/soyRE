DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutProfileStatus') THEN
    CREATE TYPE "PayoutProfileStatus" AS ENUM ('ACTIVE', 'REVIEW_REQUIRED', 'INACTIVE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutMethodType') THEN
    CREATE TYPE "PayoutMethodType" AS ENUM ('BANK_TRANSFER', 'CHECK', 'CASH', 'EXTERNAL_PROVIDER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutMethodStatus') THEN
    CREATE TYPE "PayoutMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisbursementMode') THEN
    CREATE TYPE "DisbursementMode" AS ENUM ('DIRECT_PAYMENT', 'CREDIT_BALANCE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisbursementStatus') THEN
    CREATE TYPE "DisbursementStatus" AS ENUM (
      'DRAFT',
      'APPROVED',
      'PROCESSING',
      'PAID',
      'AVAILABLE_FOR_COMPENSATION',
      'PARTIALLY_APPLIED',
      'APPLIED',
      'CANCELLED'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompensationApplicationStatus') THEN
    CREATE TYPE "CompensationApplicationStatus" AS ENUM ('PENDING', 'APPLIED', 'REVERSED');
  END IF;
END $$;

CREATE TABLE "payout_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "client_id" uuid,
  "user_id" uuid,
  "real_estate_agent_id" uuid,
  "display_name" text NOT NULL,
  "tax_country" text,
  "tax_id_last4" text,
  "status" "PayoutProfileStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
  "created_by_user_id" uuid NOT NULL,
  "updated_by_user_id" uuid NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payout_profiles_registered_recipient_check"
    CHECK (num_nonnulls("client_id", "user_id", "real_estate_agent_id") >= 1),
  CONSTRAINT "payout_profiles_tax_country_check"
    CHECK ("tax_country" IS NULL OR "tax_country" ~ '^[A-Z]{2}$'),
  CONSTRAINT "payout_profiles_tax_id_last4_check"
    CHECK ("tax_id_last4" IS NULL OR "tax_id_last4" ~ '^[A-Za-z0-9]{4}$'),
  CONSTRAINT "payout_profiles_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payout_profiles_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payout_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payout_profiles_real_estate_agent_id_fkey"
    FOREIGN KEY ("real_estate_agent_id") REFERENCES "real_estate_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payout_profiles_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payout_profiles_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "payout_profiles_organization_id_client_id_key"
  ON "payout_profiles"("organization_id", "client_id");
CREATE UNIQUE INDEX "payout_profiles_organization_id_user_id_key"
  ON "payout_profiles"("organization_id", "user_id");
CREATE UNIQUE INDEX "payout_profiles_organization_id_real_estate_agent_id_key"
  ON "payout_profiles"("organization_id", "real_estate_agent_id");
CREATE INDEX "payout_profiles_organization_id_status_idx"
  ON "payout_profiles"("organization_id", "status");

CREATE TABLE "payout_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "payout_profile_id" uuid NOT NULL,
  "type" "PayoutMethodType" NOT NULL,
  "label" text NOT NULL,
  "bank_name" text,
  "account_holder_name" text,
  "account_last4" text,
  "provider_reference" text,
  "currency" text,
  "is_default" boolean NOT NULL DEFAULT false,
  "status" "PayoutMethodStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" uuid NOT NULL,
  "updated_by_user_id" uuid NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payout_methods_account_last4_check"
    CHECK ("account_last4" IS NULL OR "account_last4" ~ '^[0-9]{4}$'),
  CONSTRAINT "payout_methods_currency_check"
    CHECK ("currency" IS NULL OR "currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "payout_methods_bank_transfer_check"
    CHECK (
      "type" <> 'BANK_TRANSFER'
      OR (
        "bank_name" IS NOT NULL
        AND "account_holder_name" IS NOT NULL
        AND "account_last4" IS NOT NULL
        AND "provider_reference" IS NOT NULL
      )
    ),
  CONSTRAINT "payout_methods_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payout_methods_payout_profile_id_fkey"
    FOREIGN KEY ("payout_profile_id") REFERENCES "payout_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payout_methods_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payout_methods_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "payout_methods_organization_id_status_idx"
  ON "payout_methods"("organization_id", "status");
CREATE INDEX "payout_methods_payout_profile_id_is_default_idx"
  ON "payout_methods"("payout_profile_id", "is_default");
CREATE UNIQUE INDEX "payout_methods_one_default_per_profile_idx"
  ON "payout_methods"("payout_profile_id")
  WHERE "is_default" = true AND "status" = 'ACTIVE';

CREATE TABLE "disbursements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "source_business_id" uuid NOT NULL,
  "recipient_profile_id" uuid NOT NULL,
  "payout_method_id" uuid,
  "commission_allocation_id" uuid,
  "concept" text NOT NULL,
  "mode" "DisbursementMode" NOT NULL,
  "original_amount_cents" bigint NOT NULL,
  "paid_amount_cents" bigint NOT NULL DEFAULT 0,
  "applied_amount_cents" bigint NOT NULL DEFAULT 0,
  "currency" text NOT NULL,
  "status" "DisbursementStatus" NOT NULL DEFAULT 'DRAFT',
  "idempotency_key" text NOT NULL,
  "approved_by_user_id" uuid,
  "approved_at" timestamp(3),
  "executed_at" timestamp(3),
  "metadata" jsonb,
  "created_by_user_id" uuid NOT NULL,
  "updated_by_user_id" uuid NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "disbursements_amounts_check"
    CHECK (
      "original_amount_cents" > 0
      AND "paid_amount_cents" >= 0
      AND "applied_amount_cents" >= 0
      AND "paid_amount_cents" + "applied_amount_cents" <= "original_amount_cents"
    ),
  CONSTRAINT "disbursements_currency_check"
    CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "disbursements_approval_check"
    CHECK (
      ("approved_at" IS NULL AND "approved_by_user_id" IS NULL)
      OR ("approved_at" IS NOT NULL AND "approved_by_user_id" IS NOT NULL)
    ),
  CONSTRAINT "disbursements_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "disbursements_source_business_id_fkey"
    FOREIGN KEY ("source_business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "disbursements_recipient_profile_id_fkey"
    FOREIGN KEY ("recipient_profile_id") REFERENCES "payout_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "disbursements_payout_method_id_fkey"
    FOREIGN KEY ("payout_method_id") REFERENCES "payout_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "disbursements_commission_allocation_id_fkey"
    FOREIGN KEY ("commission_allocation_id") REFERENCES "commission_allocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "disbursements_approved_by_user_id_fkey"
    FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "disbursements_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "disbursements_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "disbursements_organization_id_idempotency_key_key"
  ON "disbursements"("organization_id", "idempotency_key");
CREATE INDEX "disbursements_organization_id_status_idx"
  ON "disbursements"("organization_id", "status");
CREATE INDEX "disbursements_source_business_id_status_idx"
  ON "disbursements"("source_business_id", "status");
CREATE INDEX "disbursements_recipient_profile_id_status_idx"
  ON "disbursements"("recipient_profile_id", "status");
CREATE INDEX "disbursements_commission_allocation_id_idx"
  ON "disbursements"("commission_allocation_id");

CREATE TABLE "compensation_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "disbursement_id" uuid NOT NULL,
  "destination_business_id" uuid NOT NULL,
  "amount_cents" bigint NOT NULL,
  "currency" text NOT NULL,
  "status" "CompensationApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "idempotency_key" text NOT NULL,
  "applied_by_user_id" uuid,
  "applied_at" timestamp(3),
  "reversed_by_user_id" uuid,
  "reversed_at" timestamp(3),
  "reason" text,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compensation_applications_amount_check" CHECK ("amount_cents" > 0),
  CONSTRAINT "compensation_applications_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "compensation_applications_transition_check"
    CHECK (
      ("status" = 'PENDING' AND "applied_at" IS NULL AND "applied_by_user_id" IS NULL AND "reversed_at" IS NULL AND "reversed_by_user_id" IS NULL)
      OR ("status" = 'APPLIED' AND "applied_at" IS NOT NULL AND "applied_by_user_id" IS NOT NULL AND "reversed_at" IS NULL AND "reversed_by_user_id" IS NULL)
      OR ("status" = 'REVERSED' AND "applied_at" IS NOT NULL AND "applied_by_user_id" IS NOT NULL AND "reversed_at" IS NOT NULL AND "reversed_by_user_id" IS NOT NULL)
    ),
  CONSTRAINT "compensation_applications_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "compensation_applications_disbursement_id_fkey"
    FOREIGN KEY ("disbursement_id") REFERENCES "disbursements"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "compensation_applications_destination_business_id_fkey"
    FOREIGN KEY ("destination_business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "compensation_applications_applied_by_user_id_fkey"
    FOREIGN KEY ("applied_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "compensation_applications_reversed_by_user_id_fkey"
    FOREIGN KEY ("reversed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "compensation_applications_organization_id_idempotency_key_key"
  ON "compensation_applications"("organization_id", "idempotency_key");
CREATE INDEX "compensation_applications_disbursement_id_status_idx"
  ON "compensation_applications"("disbursement_id", "status");
CREATE INDEX "compensation_applications_destination_business_id_status_idx"
  ON "compensation_applications"("destination_business_id", "status");

ALTER TABLE "payout_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payout_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "disbursements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compensation_applications" ENABLE ROW LEVEL SECURITY;
