DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentRequirementSource') THEN
    CREATE TYPE "DocumentRequirementSource" AS ENUM ('TEMPLATE', 'CUSTOM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentRequirementStatus') THEN
    CREATE TYPE "DocumentRequirementStatus" AS ENUM (
      'REQUIRED',
      'UPLOADED',
      'UNDER_REVIEW',
      'APPROVED',
      'OBSERVED',
      'REJECTED',
      'EXPIRED',
      'NOT_APPLICABLE',
      'REPLACED'
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "businesses_organization_id_id_key"
  ON "businesses"("organization_id", "id");

CREATE TABLE IF NOT EXISTS "document_checklist_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "family_key" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "version" integer NOT NULL DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT false,
  "operation_types" "BusinessOperationType"[] NOT NULL DEFAULT ARRAY[]::"BusinessOperationType"[],
  "countries" text[] NOT NULL DEFAULT '{}',
  "property_types" text[] NOT NULL DEFAULT '{}',
  "contract_type_ids" uuid[] NOT NULL DEFAULT '{}',
  "business_statuses" "BusinessStatus"[] NOT NULL DEFAULT ARRAY[]::"BusinessStatus"[],
  "previous_version_id" uuid,
  "created_by_user_id" uuid,
  "published_at" timestamp(3),
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "document_checklist_templates_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_checklist_templates_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "document_checklist_templates_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_checklist_templates_organization_id_family_key_ver_key"
  ON "document_checklist_templates"("organization_id", "family_key", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "document_checklist_templates_organization_id_id_key"
  ON "document_checklist_templates"("organization_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "document_checklist_templates_one_active_family_key"
  ON "document_checklist_templates"("organization_id", "family_key") WHERE "is_active" = true;
CREATE INDEX IF NOT EXISTS "document_checklist_templates_organization_id_is_active_idx"
  ON "document_checklist_templates"("organization_id", "is_active");
CREATE INDEX IF NOT EXISTS "document_checklist_templates_previous_version_id_idx"
  ON "document_checklist_templates"("previous_version_id");
CREATE INDEX IF NOT EXISTS "document_checklist_templates_created_by_user_id_idx"
  ON "document_checklist_templates"("created_by_user_id");

ALTER TABLE "document_checklist_templates"
  ADD CONSTRAINT "document_checklist_templates_organization_id_previous_vers_fkey"
  FOREIGN KEY ("organization_id", "previous_version_id")
  REFERENCES "document_checklist_templates"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "document_checklist_template_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "required" boolean NOT NULL DEFAULT true,
  "requires_review" boolean NOT NULL DEFAULT false,
  "allows_multiple_files" boolean NOT NULL DEFAULT false,
  "blocks_transition" boolean NOT NULL DEFAULT false,
  "required_at_status" "BusinessStatus",
  "due_days_after_instantiation" integer,
  "expires_after_days" integer,
  "participant_role" "BusinessParticipantRole",
  "read_roles" "MembershipRole"[] NOT NULL DEFAULT ARRAY[]::"MembershipRole"[],
  "upload_roles" "MembershipRole"[] NOT NULL DEFAULT ARRAY[]::"MembershipRole"[],
  "review_roles" "MembershipRole"[] NOT NULL DEFAULT ARRAY[]::"MembershipRole"[],
  "sort_order" integer NOT NULL DEFAULT 0,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "document_checklist_template_items_organization_id_template_fkey"
    FOREIGN KEY ("organization_id", "template_id")
    REFERENCES "document_checklist_templates"("organization_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_checklist_template_items_due_days_check"
    CHECK ("due_days_after_instantiation" IS NULL OR "due_days_after_instantiation" >= 0),
  CONSTRAINT "document_checklist_template_items_expiry_days_check"
    CHECK ("expires_after_days" IS NULL OR "expires_after_days" >= 0),
  CONSTRAINT "document_checklist_template_items_sort_order_check" CHECK ("sort_order" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_checklist_template_items_template_id_key_key"
  ON "document_checklist_template_items"("template_id", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "document_checklist_template_items_organization_id_id_key"
  ON "document_checklist_template_items"("organization_id", "id");
CREATE INDEX IF NOT EXISTS "document_checklist_template_items_organization_id_template__idx"
  ON "document_checklist_template_items"("organization_id", "template_id", "sort_order");

CREATE TABLE IF NOT EXISTS "business_document_checklists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "template_family_key" text NOT NULL,
  "template_name" text NOT NULL,
  "template_version" integer NOT NULL,
  "applicability_snapshot" jsonb NOT NULL,
  "created_by_user_id" uuid,
  "instantiated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "business_document_checklists_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "business_document_checklists_organization_id_business_id_fkey"
    FOREIGN KEY ("organization_id", "business_id")
    REFERENCES "businesses"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "business_document_checklists_organization_id_template_id_fkey"
    FOREIGN KEY ("organization_id", "template_id")
    REFERENCES "document_checklist_templates"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "business_document_checklists_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "business_document_checklists_template_version_check" CHECK ("template_version" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_document_checklists_organization_id_business_id_te_key"
  ON "business_document_checklists"("organization_id", "business_id", "template_family_key");
CREATE UNIQUE INDEX IF NOT EXISTS "business_document_checklists_organization_id_id_key"
  ON "business_document_checklists"("organization_id", "id");
CREATE INDEX IF NOT EXISTS "business_document_checklists_organization_id_business_id_idx"
  ON "business_document_checklists"("organization_id", "business_id");
CREATE INDEX IF NOT EXISTS "business_document_checklists_organization_id_template_id_idx"
  ON "business_document_checklists"("organization_id", "template_id");
CREATE INDEX IF NOT EXISTS "business_document_checklists_created_by_user_id_idx"
  ON "business_document_checklists"("created_by_user_id");

CREATE TABLE IF NOT EXISTS "business_document_requirements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "checklist_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "template_item_id" uuid,
  "source" "DocumentRequirementSource" NOT NULL DEFAULT 'TEMPLATE',
  "key" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "status" "DocumentRequirementStatus" NOT NULL DEFAULT 'REQUIRED',
  "required" boolean NOT NULL DEFAULT true,
  "requires_review" boolean NOT NULL DEFAULT false,
  "allows_multiple_files" boolean NOT NULL DEFAULT false,
  "blocks_transition" boolean NOT NULL DEFAULT false,
  "required_at_status" "BusinessStatus",
  "required_by" date,
  "expires_at" date,
  "participant_role" "BusinessParticipantRole",
  "read_roles" "MembershipRole"[] NOT NULL DEFAULT ARRAY[]::"MembershipRole"[],
  "upload_roles" "MembershipRole"[] NOT NULL DEFAULT ARRAY[]::"MembershipRole"[],
  "review_roles" "MembershipRole"[] NOT NULL DEFAULT ARRAY[]::"MembershipRole"[],
  "sort_order" integer NOT NULL DEFAULT 0,
  "item_snapshot" jsonb NOT NULL,
  "custom_reason" text,
  "created_by_user_id" uuid,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "business_document_requirements_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "business_document_requirements_organization_id_checklist_i_fkey"
    FOREIGN KEY ("organization_id", "checklist_id")
    REFERENCES "business_document_checklists"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "business_document_requirements_organization_id_business_id_fkey"
    FOREIGN KEY ("organization_id", "business_id")
    REFERENCES "businesses"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "business_document_requirements_organization_id_template_it_fkey"
    FOREIGN KEY ("organization_id", "template_item_id")
    REFERENCES "document_checklist_template_items"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "business_document_requirements_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "business_document_requirements_dates_check"
    CHECK ("required_by" IS NULL OR "expires_at" IS NULL OR "expires_at" >= "required_by"),
  CONSTRAINT "business_document_requirements_sort_order_check" CHECK ("sort_order" >= 0),
  CONSTRAINT "business_document_requirements_custom_reason_check"
    CHECK ("source" <> 'CUSTOM' OR ("custom_reason" IS NOT NULL AND length(trim("custom_reason")) > 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_document_requirements_checklist_id_key_key"
  ON "business_document_requirements"("checklist_id", "key");
CREATE INDEX IF NOT EXISTS "business_document_requirements_organization_id_business_id__idx"
  ON "business_document_requirements"("organization_id", "business_id", "status");
CREATE INDEX IF NOT EXISTS "business_document_requirements_organization_id_checklist_id_idx"
  ON "business_document_requirements"("organization_id", "checklist_id", "sort_order");
CREATE INDEX IF NOT EXISTS "business_document_requirements_organization_id_template_ite_idx"
  ON "business_document_requirements"("organization_id", "template_item_id");
CREATE INDEX IF NOT EXISTS "business_document_requirements_created_by_user_id_idx"
  ON "business_document_requirements"("created_by_user_id");

ALTER TABLE "document_checklist_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_checklist_template_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_document_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_document_requirements" ENABLE ROW LEVEL SECURITY;
