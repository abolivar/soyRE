ALTER TABLE "documents"
  ADD COLUMN "lineage_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "version" integer NOT NULL DEFAULT 1,
  ADD COLUMN "is_current" boolean NOT NULL DEFAULT true,
  ADD COLUMN "replaces_document_id" uuid,
  ADD COLUMN "replaced_at" timestamp(3),
  ADD COLUMN "replaced_by_user_id" uuid,
  ADD COLUMN "replacement_reason" text;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_version_positive_check"
    CHECK ("version" > 0),
  ADD CONSTRAINT "documents_version_predecessor_check"
    CHECK (
      ("version" = 1 AND "replaces_document_id" IS NULL)
      OR ("version" > 1 AND "replaces_document_id" IS NOT NULL)
    ),
  ADD CONSTRAINT "documents_current_replacement_check"
    CHECK (
      ("is_current" = true AND "replaced_at" IS NULL AND "replaced_by_user_id" IS NULL AND "replacement_reason" IS NULL)
      OR (
        "is_current" = false
        AND "replaced_at" IS NOT NULL
        AND "replaced_by_user_id" IS NOT NULL
        AND length(btrim("replacement_reason")) >= 3
      )
    );

CREATE UNIQUE INDEX "documents_requirement_id_key"
  ON "documents"("organization_id", "business_id", "requirement_id", "id");

CREATE UNIQUE INDEX "documents_version_scope_id_key"
  ON "documents"(
    "organization_id",
    "business_id",
    "requirement_id",
    "lineage_id",
    "id"
  );

CREATE UNIQUE INDEX "documents_replaces_once_key"
  ON "documents"(
    "organization_id",
    "business_id",
    "requirement_id",
    "lineage_id",
    "replaces_document_id"
  );

CREATE UNIQUE INDEX "documents_current_lineage_key"
  ON "documents"("lineage_id")
  WHERE "is_current" = true;

CREATE INDEX "documents_requirement_lineage_version_idx"
  ON "documents"(
    "organization_id",
    "business_id",
    "requirement_id",
    "lineage_id",
    "version"
  );

CREATE INDEX "documents_replaced_by_user_id_idx"
  ON "documents"("replaced_by_user_id");

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_replaces_scoped_fkey"
  FOREIGN KEY (
    "organization_id",
    "business_id",
    "requirement_id",
    "lineage_id",
    "replaces_document_id"
  ) REFERENCES "documents"(
    "organization_id",
    "business_id",
    "requirement_id",
    "lineage_id",
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "documents_replaced_by_user_id_fkey"
  FOREIGN KEY ("replaced_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "business_document_requirements_event_scope_key"
  ON "business_document_requirements"(
    "organization_id",
    "business_id",
    "checklist_id",
    "id"
  );

CREATE TABLE "business_document_requirement_events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "checklist_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "document_id" uuid,
  "from_status" "DocumentRequirementStatus",
  "to_status" "DocumentRequirementStatus" NOT NULL,
  "reason" text,
  "actor_user_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_document_requirement_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_document_requirement_events_changed_status_check"
    CHECK ("from_status" IS NULL OR "from_status" <> "to_status"),
  CONSTRAINT "business_document_requirement_events_reason_check"
    CHECK ("reason" IS NULL OR length(btrim("reason")) >= 3),
  CONSTRAINT "business_document_requirement_events_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "business_document_requirement_events_requirement_fkey"
    FOREIGN KEY (
      "organization_id",
      "business_id",
      "checklist_id",
      "requirement_id"
    ) REFERENCES "business_document_requirements"(
      "organization_id",
      "business_id",
      "checklist_id",
      "id"
    ) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "business_document_requirement_events_document_fkey"
    FOREIGN KEY (
      "organization_id",
      "business_id",
      "requirement_id",
      "document_id"
    ) REFERENCES "documents"(
      "organization_id",
      "business_id",
      "requirement_id",
      "id"
    ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "business_document_requirement_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "business_document_requirement_events_timeline_idx"
  ON "business_document_requirement_events"(
    "organization_id",
    "business_id",
    "checklist_id",
    "requirement_id",
    "created_at"
  );

CREATE INDEX "business_document_requirement_events_document_id_idx"
  ON "business_document_requirement_events"("document_id");

CREATE INDEX "business_document_requirement_events_actor_user_id_idx"
  ON "business_document_requirement_events"("actor_user_id");

ALTER TABLE "business_document_requirement_events" ENABLE ROW LEVEL SECURITY;
