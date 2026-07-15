CREATE INDEX "business_document_requirement_events_document_scope_idx"
  ON "business_document_requirement_events"(
    "organization_id",
    "business_id",
    "requirement_id",
    "document_id"
  );
