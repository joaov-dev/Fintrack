-- ── Auth Security Tables ────────────────────────────────────────────────────────

-- Login attempts for account lockout by email
CREATE TABLE "login_attempts" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "ip"        TEXT,
    "success"   BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_attempts_email_createdAt_idx" ON "login_attempts"("email", "createdAt");
CREATE INDEX "login_attempts_ip_createdAt_idx"    ON "login_attempts"("ip", "createdAt");

-- MFA token anti-replay: store used JWT IDs (jti) until they expire
CREATE TABLE "used_mfa_tokens" (
    "jti"       TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "used_mfa_tokens_pkey" PRIMARY KEY ("jti")
);

CREATE INDEX "used_mfa_tokens_expiresAt_idx" ON "used_mfa_tokens"("expiresAt");

-- TOTP code anti-replay: each 6-digit TOTP code is single-use per user
CREATE TABLE "used_totp_codes" (
    "id"     TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code"   TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "used_totp_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "used_totp_codes_userId_code_key" ON "used_totp_codes"("userId", "code");
CREATE INDEX        "used_totp_codes_usedAt_idx"      ON "used_totp_codes"("usedAt");

-- Authentication event audit log
CREATE TABLE "auth_events" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT,
    "email"     TEXT,
    "event"     TEXT NOT NULL,
    "ip"        TEXT,
    "userAgent" TEXT,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_events_userId_createdAt_idx" ON "auth_events"("userId", "createdAt");
CREATE INDEX "auth_events_email_createdAt_idx"  ON "auth_events"("email",  "createdAt");
CREATE INDEX "auth_events_event_createdAt_idx"  ON "auth_events"("event",  "createdAt");
