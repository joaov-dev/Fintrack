-- ── Migration: add_lgpd ──────────────────────────────────────────────────────
-- Adds LGPD/GDPR data governance tables:
--   consent_records  — immutable audit trail of every consent action
--   deleted_accounts — soft-delete tombstones for erasure requests
--   breach_records   — LGPD Art. 48 breach tracking (72h ANPD notification)
--
-- Enums: ConsentType, BreachSeverity, BreachStatus

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE "ConsentType" AS ENUM (
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'MARKETING_EMAIL',
    'ANALYTICS'
);

CREATE TYPE "BreachSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "BreachStatus" AS ENUM (
    'DETECTED',
    'INVESTIGATING',
    'CONTAINED',
    'NOTIFIED_ANPD',
    'NOTIFIED_USERS',
    'CLOSED'
);

-- ── consent_records ───────────────────────────────────────────────────────────
-- Every consent action is an immutable insert. Current state = latest record
-- for (userId, consentType).

CREATE TABLE "consent_records" (
    "id"          TEXT          NOT NULL,
    "userId"      TEXT          NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "version"     TEXT          NOT NULL,
    "granted"     BOOLEAN       NOT NULL,
    "ip"          TEXT,
    "userAgent"   TEXT,
    "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "consent_records_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "consent_records_userId_consentType_createdAt_idx"
    ON "consent_records"("userId", "consentType", "createdAt");

-- consent_records are append-only (same immutability guarantee as audit_logs)
CREATE TRIGGER "consent_records_immutable"
    BEFORE UPDATE OR DELETE
    ON "consent_records"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- ── deleted_accounts ──────────────────────────────────────────────────────────

CREATE TABLE "deleted_accounts" (
    "id"          TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "email"       TEXT         NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "deleted_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deleted_accounts_userId_key"  ON "deleted_accounts"("userId");
CREATE UNIQUE INDEX "deleted_accounts_email_key"   ON "deleted_accounts"("email");
CREATE INDEX        "deleted_accounts_scheduledAt" ON "deleted_accounts"("scheduledAt");

-- ── breach_records ────────────────────────────────────────────────────────────

CREATE TABLE "breach_records" (
    "id"              TEXT             NOT NULL,
    "title"           TEXT             NOT NULL,
    "description"     TEXT             NOT NULL,
    "severity"        "BreachSeverity" NOT NULL,
    "affectedCount"   INTEGER,
    "dataTypes"       TEXT[]           NOT NULL DEFAULT '{}',
    "detectedAt"      TIMESTAMP(3)     NOT NULL,
    "containedAt"     TIMESTAMP(3),
    "anpdNotifiedAt"  TIMESTAMP(3),
    "usersNotifiedAt" TIMESTAMP(3),
    "status"          "BreachStatus"   NOT NULL DEFAULT 'DETECTED',
    "notes"           TEXT,
    "createdBy"       TEXT             NOT NULL,
    "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "breach_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "breach_records_status_detectedAt_idx"
    ON "breach_records"("status", "detectedAt");

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE "consent_records" IS
    'Append-only LGPD consent audit trail. '
    'Current consent = most recent row per (userId, consentType). '
    'Immutability enforced by trigger consent_records_immutable.';

COMMENT ON TABLE "deleted_accounts" IS
    'Erasure request tombstones (LGPD Art. 18 VI). '
    'Soft-delete: user data purged after scheduledAt (30-day cooling-off). '
    'Email kept as suppression list.';

COMMENT ON TABLE "breach_records" IS
    'LGPD Art. 48 breach tracking. '
    '72-hour ANPD notification SLA tracked via anpdNotifiedAt field.';
