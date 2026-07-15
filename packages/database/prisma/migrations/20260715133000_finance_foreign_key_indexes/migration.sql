CREATE INDEX "payout_profiles_client_id_idx"
  ON "payout_profiles"("client_id");
CREATE INDEX "payout_profiles_user_id_idx"
  ON "payout_profiles"("user_id");
CREATE INDEX "payout_profiles_real_estate_agent_id_idx"
  ON "payout_profiles"("real_estate_agent_id");
CREATE INDEX "payout_profiles_created_by_user_id_idx"
  ON "payout_profiles"("created_by_user_id");
CREATE INDEX "payout_profiles_updated_by_user_id_idx"
  ON "payout_profiles"("updated_by_user_id");

CREATE INDEX "payout_methods_created_by_user_id_idx"
  ON "payout_methods"("created_by_user_id");
CREATE INDEX "payout_methods_updated_by_user_id_idx"
  ON "payout_methods"("updated_by_user_id");

CREATE INDEX "disbursements_payout_method_id_idx"
  ON "disbursements"("payout_method_id");
CREATE INDEX "disbursements_approved_by_user_id_idx"
  ON "disbursements"("approved_by_user_id");
CREATE INDEX "disbursements_created_by_user_id_idx"
  ON "disbursements"("created_by_user_id");
CREATE INDEX "disbursements_updated_by_user_id_idx"
  ON "disbursements"("updated_by_user_id");

CREATE INDEX "compensation_applications_applied_by_user_id_idx"
  ON "compensation_applications"("applied_by_user_id");
CREATE INDEX "compensation_applications_reversed_by_user_id_idx"
  ON "compensation_applications"("reversed_by_user_id");
