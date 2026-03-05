-- ── Migration: add_audit_log ──────────────────────────────────────────────────
-- Creates the audit_logs table and enforces immutability on both
-- auth_events and audit_logs via PostgreSQL triggers.
--
-- Immutability strategy: any UPDATE or DELETE on these tables raises an
-- exception immediately. The only allowed operation is INSERT.
-- This satisfies LGPD Art. 46, PCI DSS Req. 10.3, and SOC 2 CC7.2.

-- ── 1. audit_logs table ───────────────────────────────────────────────────────

CREATE TABLE "audit_logs" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "action"     TEXT NOT NULL,
    "resource"   TEXT NOT NULL,
    "resourceId" TEXT,
    "requestId"  TEXT,
    "ip"         TEXT,
    "userAgent"  TEXT,
    "before"     JSONB,
    "after"      JSONB,
    "metadata"   JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_userId_createdAt_idx"    ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");
CREATE INDEX "audit_logs_action_createdAt_idx"    ON "audit_logs"("action", "createdAt");
CREATE INDEX "audit_logs_requestId_idx"           ON "audit_logs"("requestId");

-- ── 2. Immutability trigger function ─────────────────────────────────────────
-- A single function used by both trigger definitions below.

CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Audit records are immutable. Table: %, Operation: %, Record ID: %',
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(OLD.id, '?');
    RETURN NULL;  -- unreachable; satisfies plpgsql return requirement
END;
$$;

-- ── 3. Apply trigger to audit_logs ────────────────────────────────────────────

CREATE TRIGGER "audit_logs_immutable"
    BEFORE UPDATE OR DELETE
    ON "audit_logs"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- ── 4. Apply trigger to auth_events (existing table) ─────────────────────────
-- auth_events was created without immutability — add it retroactively.

CREATE TRIGGER "auth_events_immutable"
    BEFORE UPDATE OR DELETE
    ON "auth_events"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- ── 5. Comment audit tables for documentation ─────────────────────────────────

COMMENT ON TABLE "audit_logs" IS
    'Append-only business-operation audit trail. '
    'Immutability enforced by trigger audit_logs_immutable. '
    'Retention: 365 days (see retentionService.ts).';

COMMENT ON TABLE "auth_events" IS
    'Append-only authentication event log. '
    'Immutability enforced by trigger auth_events_immutable. '
    'Retention: 365 days (see retentionService.ts).';
