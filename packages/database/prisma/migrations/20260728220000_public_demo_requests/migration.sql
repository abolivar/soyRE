DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'DemoRequestStatus'
  ) THEN
    CREATE TYPE "DemoRequestStatus" AS ENUM (
      'NEW',
      'CONTACTED',
      'QUALIFIED',
      'CLOSED',
      'SPAM'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'DemoRequestTeamSize'
  ) THEN
    CREATE TYPE "DemoRequestTeamSize" AS ENUM (
      'SOLO',
      'TWO_TO_FIVE',
      'SIX_TO_TEN',
      'ELEVEN_TO_TWENTY',
      'TWENTY_ONE_PLUS'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'DemoNotificationStatus'
  ) THEN
    CREATE TYPE "DemoNotificationStatus" AS ENUM (
      'PENDING',
      'SENT',
      'FAILED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "demo_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW',
  "name" text NOT NULL,
  "email" text NOT NULL,
  "company" text NOT NULL,
  "country" text NOT NULL,
  "team_size" "DemoRequestTeamSize" NOT NULL,
  "challenge" text,
  "consent_given" boolean NOT NULL,
  "consent_policy_version" text NOT NULL,
  "consented_at" timestamp(3) NOT NULL,
  "page_url" text,
  "referrer" text,
  "utm_source" text,
  "utm_medium" text,
  "utm_campaign" text,
  "utm_term" text,
  "utm_content" text,
  "notification_status" "DemoNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "notification_attempts" integer NOT NULL DEFAULT 0,
  "notification_last_attempt_at" timestamp(3),
  "notification_last_error" text,
  "notified_at" timestamp(3),
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demo_requests_consent_given_check" CHECK ("consent_given" = true)
);

CREATE INDEX IF NOT EXISTS "demo_requests_status_created_at_idx"
  ON "demo_requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "demo_requests_email_created_at_idx"
  ON "demo_requests"("email", "created_at");
CREATE INDEX IF NOT EXISTS "demo_requests_notification_status_created_at_idx"
  ON "demo_requests"("notification_status", "created_at");

ALTER TABLE "demo_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "demo_requests" FROM anon, authenticated;

COMMENT ON TABLE "demo_requests" IS
  'Platform-level public demo requests. No organization ownership and no direct Data API access; writes occur through the validated Nest API.';
