-- Migration: add_admin
-- Adds: UserStatus enum + User.status + User.lastLoginAt
--       AdminAccount + AdminSession + AdminAuditLog + AdminRole enum

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN_READONLY');

-- ── User: new columns ─────────────────────────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN "status"      "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- ── Admin tables ──────────────────────────────────────────────────────────────

CREATE TABLE "admin_accounts" (
    "id"           TEXT         NOT NULL,
    "username"     TEXT         NOT NULL,
    "passwordHash" TEXT         NOT NULL,
    "role"         "AdminRole"  NOT NULL DEFAULT 'SUPER_ADMIN',
    "isActive"     BOOLEAN      NOT NULL DEFAULT true,
    "lastLoginAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_accounts_username_key" ON "admin_accounts"("username");

CREATE TABLE "admin_sessions" (
    "id"          TEXT         NOT NULL,
    "adminId"     TEXT         NOT NULL,
    "tokenHash"   TEXT         NOT NULL,
    "ipAddress"   TEXT,
    "userAgent"   TEXT,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_sessions_tokenHash_key" ON "admin_sessions"("tokenHash");
CREATE INDEX "admin_sessions_adminId_idx" ON "admin_sessions"("adminId");

ALTER TABLE "admin_sessions"
  ADD CONSTRAINT "admin_sessions_adminId_fkey"
  FOREIGN KEY ("adminId")
  REFERENCES "admin_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "admin_audit_logs" (
    "id"         TEXT         NOT NULL,
    "adminId"    TEXT         NOT NULL,
    "action"     TEXT         NOT NULL,
    "targetType" TEXT,
    "targetId"   TEXT,
    "details"    JSONB,
    "ip"         TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_adminId_createdAt_idx" ON "admin_audit_logs"("adminId", "createdAt");
CREATE INDEX "admin_audit_logs_targetType_targetId_idx" ON "admin_audit_logs"("targetType", "targetId");

ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_adminId_fkey"
  FOREIGN KEY ("adminId")
  REFERENCES "admin_accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
