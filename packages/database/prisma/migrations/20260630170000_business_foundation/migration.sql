DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessStatus') THEN
    CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'CONTRACT_GENERATED', 'PENDING_SIGNATURE', 'ACTIVE', 'CLOSED', 'CANCELLED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessMode') THEN
    CREATE TYPE "BusinessMode" AS ENUM ('SIMPLE', 'ADVANCED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessOperationType') THEN
    CREATE TYPE "BusinessOperationType" AS ENUM ('SALE', 'RENT', 'RESERVATION', 'ASSIGNMENT', 'PRE_SALE', 'SEPARATION', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessPartyType') THEN
    CREATE TYPE "BusinessPartyType" AS ENUM ('CLIENT', 'USER', 'COMPANY', 'REAL_ESTATE_AGENT', 'EXTERNAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessParticipantRole') THEN
    CREATE TYPE "BusinessParticipantRole" AS ENUM ('BUYER', 'SELLER', 'TENANT', 'LANDLORD', 'PRIMARY_AGENT', 'CO_AGENT', 'REFERRER', 'BROKER', 'DEVELOPER', 'LEGAL_REPRESENTATIVE', 'LAWYER', 'NOTARY', 'BANK', 'GUARANTOR', 'WITNESS', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessContractStatus') THEN
    CREATE TYPE "BusinessContractStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT_FOR_REVIEW', 'APPROVED', 'SENT_FOR_SIGNATURE', 'SIGNED', 'VOIDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractClauseType') THEN
    CREATE TYPE "ContractClauseType" AS ENUM ('MATERIAL_ESCALATION', 'ASSIGNMENT_FEE', 'LATE_FEE', 'PENALTY', 'CANCELLATION', 'SPECIAL_CONDITION', 'FINANCING_CONDITION', 'DELIVERY_CONDITION', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClauseCalculationType') THEN
    CREATE TYPE "ClauseCalculationType" AS ENUM ('NONE', 'FIXED_AMOUNT', 'PERCENTAGE', 'FORMULA', 'MANUAL', 'INDEX_BASED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClauseAppliesTo') THEN
    CREATE TYPE "ClauseAppliesTo" AS ENUM ('BUYER', 'SELLER', 'DEVELOPER', 'AGENT', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessTriggerEvent') THEN
    CREATE TYPE "BusinessTriggerEvent" AS ENUM ('ON_SIGNATURE', 'ON_ASSIGNMENT_REQUEST', 'ON_MATERIAL_INCREASE', 'ON_LATE_PAYMENT', 'ON_CLOSING', 'MANUAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentPlanStatus') THEN
    CREATE TYPE "PaymentPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'COMPLETED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentPlanType') THEN
    CREATE TYPE "PaymentPlanType" AS ENUM ('CASH', 'REGULAR_INSTALLMENTS', 'SIGNATURE_PLUS_INSTALLMENTS', 'MILESTONE_BASED', 'CUSTOM', 'FINANCED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentFrequency') THEN
    CREATE TYPE "PaymentFrequency" AS ENUM ('NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'CUSTOM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoundingStrategy') THEN
    CREATE TYPE "RoundingStrategy" AS ENUM ('LAST_INSTALLMENT', 'FIRST_INSTALLMENT', 'DISTRIBUTE', 'MANUAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentScheduleLineType') THEN
    CREATE TYPE "PaymentScheduleLineType" AS ENUM ('RESERVATION', 'DOWN_PAYMENT', 'SIGNATURE', 'REGULAR_INSTALLMENT', 'SPECIAL_INSTALLMENT', 'MILESTONE', 'CLOSING', 'HANDOVER', 'ASSIGNMENT_FEE', 'MATERIAL_ADJUSTMENT', 'LATE_FEE', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentScheduleLineStatus') THEN
    CREATE TYPE "PaymentScheduleLineStatus" AS ENUM ('PENDING', 'INVOICED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentScheduleLineSource') THEN
    CREATE TYPE "PaymentScheduleLineSource" AS ENUM ('GENERATED', 'USER_ADDED', 'CONTRACT_CLAUSE', 'ADJUSTMENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommissionPlanStatus') THEN
    CREATE TYPE "CommissionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'PAID', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommissionPlanMode') THEN
    CREATE TYPE "CommissionPlanMode" AS ENUM ('SIMPLE', 'ADVANCED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommissionBase') THEN
    CREATE TYPE "CommissionBase" AS ENUM ('SALE_PRICE', 'NEGOTIATED_PRICE', 'COLLECTED_AMOUNT', 'NET_AMOUNT', 'CUSTOM_AMOUNT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommissionReleasePolicy') THEN
    CREATE TYPE "CommissionReleasePolicy" AS ENUM ('ON_SIGNATURE', 'ON_CLOSING', 'ON_COLLECTION', 'BY_PAYMENT_MILESTONE', 'MANUAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommissionRecipientType') THEN
    CREATE TYPE "CommissionRecipientType" AS ENUM ('AGENT', 'CO_AGENT', 'REFERRER', 'BROKER', 'COMPANY', 'EXTERNAL', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommissionCalculationType') THEN
    CREATE TYPE "CommissionCalculationType" AS ENUM ('PERCENTAGE_OF_SALE', 'PERCENTAGE_OF_COMMISSION', 'FIXED_AMOUNT', 'TIERED', 'SLIDING_SCALE', 'CAPPED', 'CUSTOM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommissionReleaseTrigger') THEN
    CREATE TYPE "CommissionReleaseTrigger" AS ENUM ('ON_SIGNATURE', 'ON_CLOSING', 'ON_COLLECTION', 'BY_PAYMENT_LINE', 'MANUAL_APPROVAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommissionAllocationStatus') THEN
    CREATE TYPE "CommissionAllocationStatus" AS ENUM ('PENDING', 'APPROVED', 'PAYABLE', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessFeeType') THEN
    CREATE TYPE "BusinessFeeType" AS ENUM ('ASSIGNMENT', 'MATERIAL_ESCALATION', 'ADMIN', 'LEGAL', 'NOTARY', 'TAX', 'MAINTENANCE', 'PENALTY', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessFeePayerRole') THEN
    CREATE TYPE "BusinessFeePayerRole" AS ENUM ('BUYER', 'SELLER', 'COMPANY', 'AGENT', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessFeeStatus') THEN
    CREATE TYPE "BusinessFeeStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'CHARGED', 'WAIVED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalculationSnapshotType') THEN
    CREATE TYPE "CalculationSnapshotType" AS ENUM ('PAYMENT_PLAN', 'COMMISSION_PLAN', 'CONTRACT_TOTAL', 'FULL_PREVIEW');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScheduledActionType') THEN
    CREATE TYPE "ScheduledActionType" AS ENUM ('PAYMENT_DUE', 'PAYMENT_OVERDUE', 'COMMISSION_DUE', 'CONTRACT_REVIEW_DUE', 'SIGNATURE_DUE', 'DOCUMENT_REQUIRED', 'APPROVAL_REQUIRED', 'CUSTOM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScheduledActionStatus') THEN
    CREATE TYPE "ScheduledActionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "contract_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid,
  "name" text NOT NULL,
  "operation_type" "BusinessOperationType" NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "requires_property" boolean NOT NULL DEFAULT false,
  "requires_payment_plan" boolean NOT NULL DEFAULT true,
  "requires_commission_plan" boolean NOT NULL DEFAULT false,
  "default_template_id" uuid,
  "default_clauses" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "contract_types_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "businesses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "code" text,
  "title" text,
  "status" "BusinessStatus" NOT NULL DEFAULT 'DRAFT',
  "mode" "BusinessMode" NOT NULL DEFAULT 'SIMPLE',
  "operation_type" "BusinessOperationType" NOT NULL,
  "property_id" uuid,
  "primary_client_id" uuid,
  "contract_type_id" uuid,
  "currency" text NOT NULL DEFAULT 'USD',
  "base_price_cents" bigint,
  "negotiated_price_cents" bigint,
  "total_contract_amount_cents" bigint,
  "payable_amount_cents" bigint,
  "commission_base_amount_cents" bigint,
  "expected_signature_date" date,
  "expected_closing_date" date,
  "effective_date" date,
  "notes" text,
  "draft_data" jsonb,
  "last_preview" jsonb,
  "idempotency_key" text,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "locked_at" timestamp(3),
  "locked_by_user_id" uuid,
  "version" integer NOT NULL DEFAULT 1,
  "committed_at" timestamp(3),
  "cancelled_at" timestamp(3),
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "businesses_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "businesses_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "businesses_primary_client_id_fkey"
    FOREIGN KEY ("primary_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "businesses_contract_type_id_fkey"
    FOREIGN KEY ("contract_type_id") REFERENCES "contract_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "businesses_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "businesses_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "businesses_locked_by_user_id_fkey"
    FOREIGN KEY ("locked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "businesses_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "businesses_non_negative_amounts_check" CHECK (
    ("base_price_cents" IS NULL OR "base_price_cents" >= 0) AND
    ("negotiated_price_cents" IS NULL OR "negotiated_price_cents" >= 0) AND
    ("total_contract_amount_cents" IS NULL OR "total_contract_amount_cents" >= 0) AND
    ("payable_amount_cents" IS NULL OR "payable_amount_cents" >= 0) AND
    ("commission_base_amount_cents" IS NULL OR "commission_base_amount_cents" >= 0)
  )
);

CREATE TABLE IF NOT EXISTS "business_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "party_type" "BusinessPartyType" NOT NULL,
  "client_id" uuid,
  "user_id" uuid,
  "real_estate_agent_id" uuid,
  "display_name" text NOT NULL,
  "email" text,
  "phone" text,
  "document_id" text,
  "role" "BusinessParticipantRole" NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "ownership_percentage_bps" integer,
  "commission_eligible" boolean NOT NULL DEFAULT false,
  "receives_notifications" boolean NOT NULL DEFAULT true,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "business_participants_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "business_participants_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "business_participants_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "business_participants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "business_participants_real_estate_agent_id_fkey"
    FOREIGN KEY ("real_estate_agent_id") REFERENCES "real_estate_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "business_participants_ownership_bps_check"
    CHECK ("ownership_percentage_bps" IS NULL OR ("ownership_percentage_bps" >= 0 AND "ownership_percentage_bps" <= 10000))
);

CREATE TABLE IF NOT EXISTS "business_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL,
  "contract_type_id" uuid NOT NULL,
  "template_id" uuid,
  "status" "BusinessContractStatus" NOT NULL DEFAULT 'DRAFT',
  "contract_number" text,
  "generated_document_id" uuid,
  "signed_document_id" uuid,
  "selected_clauses" jsonb,
  "custom_conditions" jsonb,
  "legal_notes" text,
  "generated_at" timestamp(3),
  "signed_at" timestamp(3),
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "business_contracts_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "business_contracts_contract_type_id_fkey"
    FOREIGN KEY ("contract_type_id") REFERENCES "contract_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "business_contracts_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "business_contracts_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "business_contract_clauses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_contract_id" uuid NOT NULL,
  "clause_type" "ContractClauseType" NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "calculation_type" "ClauseCalculationType" NOT NULL DEFAULT 'NONE',
  "amount_cents" bigint,
  "percentage_bps" integer,
  "formula" jsonb,
  "applies_to" "ClauseAppliesTo" NOT NULL DEFAULT 'OTHER',
  "trigger_event" "BusinessTriggerEvent" NOT NULL DEFAULT 'MANUAL',
  "creates_receivable" boolean NOT NULL DEFAULT false,
  "requires_approval" boolean NOT NULL DEFAULT false,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "business_contract_clauses_business_contract_id_fkey"
    FOREIGN KEY ("business_contract_id") REFERENCES "business_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "business_contract_clauses_amount_check" CHECK ("amount_cents" IS NULL OR "amount_cents" >= 0),
  CONSTRAINT "business_contract_clauses_percentage_check" CHECK ("percentage_bps" IS NULL OR ("percentage_bps" >= 0 AND "percentage_bps" <= 10000))
);

CREATE TABLE IF NOT EXISTS "payment_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL,
  "status" "PaymentPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "plan_type" "PaymentPlanType" NOT NULL,
  "currency" text NOT NULL DEFAULT 'USD',
  "total_amount_cents" bigint NOT NULL,
  "generated_total_cents" bigint NOT NULL,
  "difference_cents" bigint NOT NULL,
  "rounding_strategy" "RoundingStrategy" NOT NULL DEFAULT 'LAST_INSTALLMENT',
  "start_date" date,
  "end_date" date,
  "frequency" "PaymentFrequency" NOT NULL DEFAULT 'NONE',
  "number_of_installments" integer,
  "due_day" integer,
  "grace_days" integer,
  "late_fee_policy_id" uuid,
  "notes" text,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "payment_plans_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payment_plans_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "payment_plans_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "payment_plans_amounts_check" CHECK ("total_amount_cents" >= 0 AND "generated_total_cents" >= 0),
  CONSTRAINT "payment_plans_due_day_check" CHECK ("due_day" IS NULL OR ("due_day" >= 1 AND "due_day" <= 31))
);

CREATE TABLE IF NOT EXISTS "payment_schedule_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "payment_plan_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "label" text NOT NULL,
  "line_type" "PaymentScheduleLineType" NOT NULL,
  "amount_cents" bigint NOT NULL,
  "percentage_bps" integer,
  "due_date" date,
  "due_event" text,
  "milestone_id" uuid,
  "is_manual" boolean NOT NULL DEFAULT false,
  "is_locked" boolean NOT NULL DEFAULT false,
  "status" "PaymentScheduleLineStatus" NOT NULL DEFAULT 'PENDING',
  "source" "PaymentScheduleLineSource" NOT NULL DEFAULT 'GENERATED',
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "payment_schedule_lines_payment_plan_id_fkey"
    FOREIGN KEY ("payment_plan_id") REFERENCES "payment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payment_schedule_lines_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payment_schedule_lines_amount_check" CHECK ("amount_cents" >= 0),
  CONSTRAINT "payment_schedule_lines_percentage_check" CHECK ("percentage_bps" IS NULL OR ("percentage_bps" >= 0 AND "percentage_bps" <= 10000))
);

CREATE TABLE IF NOT EXISTS "commission_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL,
  "status" "CommissionPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "mode" "CommissionPlanMode" NOT NULL DEFAULT 'SIMPLE',
  "commission_base" "CommissionBase" NOT NULL,
  "base_amount_cents" bigint NOT NULL,
  "total_commission_amount_cents" bigint NOT NULL,
  "currency" text NOT NULL DEFAULT 'USD',
  "release_policy" "CommissionReleasePolicy" NOT NULL DEFAULT 'ON_CLOSING',
  "notes" text,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "commission_plans_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "commission_plans_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "commission_plans_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "commission_plans_amounts_check" CHECK ("base_amount_cents" >= 0 AND "total_commission_amount_cents" >= 0)
);

CREATE TABLE IF NOT EXISTS "commission_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "commission_plan_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "participant_id" uuid,
  "recipient_type" "CommissionRecipientType" NOT NULL,
  "label" text NOT NULL,
  "calculation_type" "CommissionCalculationType" NOT NULL,
  "percentage_bps" integer,
  "fixed_amount_cents" bigint,
  "cap_amount_cents" bigint,
  "min_amount_cents" bigint,
  "priority" integer NOT NULL DEFAULT 0,
  "parent_allocation_id" uuid,
  "applies_after_deductions" boolean NOT NULL DEFAULT false,
  "release_trigger" "CommissionReleaseTrigger" NOT NULL DEFAULT 'ON_CLOSING',
  "payable_amount_cents" bigint NOT NULL,
  "paid_amount_cents" bigint NOT NULL DEFAULT 0,
  "status" "CommissionAllocationStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "commission_allocations_commission_plan_id_fkey"
    FOREIGN KEY ("commission_plan_id") REFERENCES "commission_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "commission_allocations_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "commission_allocations_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "business_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "commission_allocations_parent_allocation_id_fkey"
    FOREIGN KEY ("parent_allocation_id") REFERENCES "commission_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "commission_allocations_amounts_check" CHECK (
    ("fixed_amount_cents" IS NULL OR "fixed_amount_cents" >= 0) AND
    ("cap_amount_cents" IS NULL OR "cap_amount_cents" >= 0) AND
    ("min_amount_cents" IS NULL OR "min_amount_cents" >= 0) AND
    "payable_amount_cents" >= 0 AND
    "paid_amount_cents" >= 0
  ),
  CONSTRAINT "commission_allocations_percentage_check" CHECK ("percentage_bps" IS NULL OR ("percentage_bps" >= 0 AND "percentage_bps" <= 10000))
);

CREATE TABLE IF NOT EXISTS "business_fees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL,
  "name" text NOT NULL,
  "fee_type" "BusinessFeeType" NOT NULL,
  "amount_cents" bigint NOT NULL,
  "percentage_bps" integer,
  "calculation_base_cents" bigint,
  "currency" text NOT NULL DEFAULT 'USD',
  "payer_role" "BusinessFeePayerRole" NOT NULL DEFAULT 'OTHER',
  "included_in_contract_total" boolean NOT NULL DEFAULT false,
  "included_in_payment_plan" boolean NOT NULL DEFAULT false,
  "trigger_event" "BusinessTriggerEvent" NOT NULL DEFAULT 'MANUAL',
  "status" "BusinessFeeStatus" NOT NULL DEFAULT 'DRAFT',
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "business_fees_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "business_fees_amount_check" CHECK ("amount_cents" >= 0),
  CONSTRAINT "business_fees_percentage_check" CHECK ("percentage_bps" IS NULL OR ("percentage_bps" >= 0 AND "percentage_bps" <= 10000))
);

CREATE TABLE IF NOT EXISTS "calculation_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL,
  "snapshot_type" "CalculationSnapshotType" NOT NULL,
  "engine_version" text NOT NULL,
  "input_json" jsonb NOT NULL,
  "output_json" jsonb NOT NULL,
  "hash" text NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calculation_snapshots_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "calculation_snapshots_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "scheduled_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL,
  "event_type" "ScheduledActionType" NOT NULL,
  "related_entity_type" text,
  "related_entity_id" uuid,
  "scheduled_for" timestamp(3) NOT NULL,
  "status" "ScheduledActionStatus" NOT NULL DEFAULT 'PENDING',
  "assigned_to_user_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "scheduled_actions_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "scheduled_actions_assigned_to_user_id_fkey"
    FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "contract_types_organization_id_name_operation_type_key" ON "contract_types"("organization_id", "name", "operation_type");
CREATE INDEX IF NOT EXISTS "contract_types_organization_id_operation_type_is_active_idx" ON "contract_types"("organization_id", "operation_type", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "businesses_organization_id_code_key" ON "businesses"("organization_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "businesses_organization_id_idempotency_key_key" ON "businesses"("organization_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "businesses_organization_id_status_idx" ON "businesses"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "businesses_organization_id_operation_type_idx" ON "businesses"("organization_id", "operation_type");
CREATE INDEX IF NOT EXISTS "businesses_property_id_idx" ON "businesses"("property_id");
CREATE INDEX IF NOT EXISTS "businesses_primary_client_id_idx" ON "businesses"("primary_client_id");
CREATE INDEX IF NOT EXISTS "businesses_contract_type_id_idx" ON "businesses"("contract_type_id");
CREATE INDEX IF NOT EXISTS "businesses_created_by_user_id_idx" ON "businesses"("created_by_user_id");

CREATE INDEX IF NOT EXISTS "business_participants_organization_id_role_idx" ON "business_participants"("organization_id", "role");
CREATE INDEX IF NOT EXISTS "business_participants_business_id_role_idx" ON "business_participants"("business_id", "role");
CREATE INDEX IF NOT EXISTS "business_participants_client_id_idx" ON "business_participants"("client_id");
CREATE INDEX IF NOT EXISTS "business_participants_user_id_idx" ON "business_participants"("user_id");
CREATE INDEX IF NOT EXISTS "business_participants_real_estate_agent_id_idx" ON "business_participants"("real_estate_agent_id");

CREATE INDEX IF NOT EXISTS "business_contracts_business_id_status_idx" ON "business_contracts"("business_id", "status");
CREATE INDEX IF NOT EXISTS "business_contracts_contract_type_id_idx" ON "business_contracts"("contract_type_id");
CREATE INDEX IF NOT EXISTS "business_contract_clauses_business_contract_id_clause_type_idx" ON "business_contract_clauses"("business_contract_id", "clause_type");

CREATE INDEX IF NOT EXISTS "payment_plans_business_id_status_idx" ON "payment_plans"("business_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_schedule_lines_payment_plan_id_sequence_key" ON "payment_schedule_lines"("payment_plan_id", "sequence");
CREATE INDEX IF NOT EXISTS "payment_schedule_lines_business_id_status_idx" ON "payment_schedule_lines"("business_id", "status");
CREATE INDEX IF NOT EXISTS "payment_schedule_lines_due_date_status_idx" ON "payment_schedule_lines"("due_date", "status");

CREATE INDEX IF NOT EXISTS "commission_plans_business_id_status_idx" ON "commission_plans"("business_id", "status");
CREATE INDEX IF NOT EXISTS "commission_allocations_commission_plan_id_status_idx" ON "commission_allocations"("commission_plan_id", "status");
CREATE INDEX IF NOT EXISTS "commission_allocations_business_id_recipient_type_idx" ON "commission_allocations"("business_id", "recipient_type");
CREATE INDEX IF NOT EXISTS "commission_allocations_participant_id_idx" ON "commission_allocations"("participant_id");

CREATE INDEX IF NOT EXISTS "business_fees_business_id_fee_type_idx" ON "business_fees"("business_id", "fee_type");
CREATE INDEX IF NOT EXISTS "business_fees_business_id_status_idx" ON "business_fees"("business_id", "status");
CREATE INDEX IF NOT EXISTS "calculation_snapshots_business_id_snapshot_type_created_at_idx" ON "calculation_snapshots"("business_id", "snapshot_type", "created_at");
CREATE INDEX IF NOT EXISTS "scheduled_actions_business_id_status_idx" ON "scheduled_actions"("business_id", "status");
CREATE INDEX IF NOT EXISTS "scheduled_actions_scheduled_for_status_idx" ON "scheduled_actions"("scheduled_for", "status");
CREATE INDEX IF NOT EXISTS "scheduled_actions_assigned_to_user_id_status_idx" ON "scheduled_actions"("assigned_to_user_id", "status");

ALTER TABLE "contract_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_contract_clauses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_schedule_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_fees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculation_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_actions" ENABLE ROW LEVEL SECURITY;
