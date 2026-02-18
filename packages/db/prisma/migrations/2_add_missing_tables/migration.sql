-- Migration: 2_add_missing_tables
-- Adds all models/changes present in schema.prisma but missing from prior migrations.

-- ============================================
-- ENUM: Add FREE to Tier + update default
-- ============================================

ALTER TYPE "Tier" ADD VALUE IF NOT EXISTS 'FREE';

-- Change default on user.tier from STARTER to FREE
ALTER TABLE "user" ALTER COLUMN "tier" SET DEFAULT 'FREE';

-- ============================================
-- ENUM: New enums
-- ============================================

-- ImportSource
DO $$ BEGIN
  CREATE TYPE "ImportSource" AS ENUM ('CHATGPT', 'CLAUDE', 'GEMINI', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ImportStatus
DO $$ BEGIN
  CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'UPLOADING', 'PARSING', 'PREVIEWING', 'IMPORTING', 'COMPLETED', 'FAILED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ImportEntityType
DO $$ BEGIN
  CREATE TYPE "ImportEntityType" AS ENUM ('CONVERSATION', 'MESSAGE', 'ATTACHMENT', 'MEMORY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ReminderType
DO $$ BEGIN
  CREATE TYPE "ReminderType" AS ENUM ('EXPLICIT', 'IMPLICIT', 'FOLLOWUP', 'SCHEDULED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ReminderStatus
DO $$ BEGIN
  CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SCHEDULED', 'DELIVERED', 'ACKNOWLEDGED', 'SNOOZED', 'DISMISSED', 'EXPIRED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CouncilStatus
DO $$ BEGIN
  CREATE TYPE "CouncilStatus" AS ENUM ('PENDING', 'QUERYING', 'STREAMING', 'SYNTHESIZING', 'COMPLETED', 'FAILED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PersonaType
DO $$ BEGIN
  CREATE TYPE "PersonaType" AS ENUM ('SCHOLAR', 'CREATIVE', 'PRACTICAL', 'DEVILS_ADVOCATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ResponseStatus
DO $$ BEGIN
  CREATE TYPE "ResponseStatus" AS ENUM ('PENDING', 'STREAMING', 'COMPLETED', 'FAILED', 'TIMEOUT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ALTER TABLE Chat: add shareToken, sharedAt
-- ============================================

ALTER TABLE "Chat"
  ADD COLUMN IF NOT EXISTS "shareToken" TEXT,
  ADD COLUMN IF NOT EXISTS "sharedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Chat_shareToken_key" ON "Chat"("shareToken");

-- Additional Chat indexes
CREATE INDEX IF NOT EXISTS "Chat_shareToken_idx" ON "Chat"("shareToken");
CREATE INDEX IF NOT EXISTS "Chat_userId_createdAt_idx" ON "Chat"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Chat_userId_isArchived_idx" ON "Chat"("userId", "isArchived");

-- ============================================
-- Additional indexes on existing tables
-- ============================================

-- CreditLog
CREATE INDEX IF NOT EXISTS "CreditLog_billingAccountId_createdAt_idx" ON "CreditLog"("billingAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditLog_billingAccountId_reason_createdAt_idx" ON "CreditLog"("billingAccountId", "reason", "createdAt");

-- Message
CREATE INDEX IF NOT EXISTS "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_userId_createdAt_idx" ON "Message"("userId", "createdAt");

-- Memory
CREATE INDEX IF NOT EXISTS "Memory_userId_createdAt_idx" ON "Memory"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Memory_userId_isActive_lastAccessedAt_idx" ON "Memory"("userId", "isActive", "lastAccessedAt");

-- scheduled_task
CREATE INDEX IF NOT EXISTS "scheduled_task_status_updatedAt_idx" ON "scheduled_task"("status", "updatedAt");

-- notification_log
CREATE INDEX IF NOT EXISTS "notification_log_userId_status_createdAt_idx" ON "notification_log"("userId", "status", "createdAt");

-- session
CREATE INDEX IF NOT EXISTS "session_expiresAt_idx" ON "session"("expiresAt");

-- ============================================
-- CREATE TABLE import_job
-- ============================================

CREATE TABLE IF NOT EXISTS "import_job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "importedItems" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_job_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "import_job_userId_idx" ON "import_job"("userId");
CREATE INDEX IF NOT EXISTS "import_job_userId_status_idx" ON "import_job"("userId", "status");
CREATE INDEX IF NOT EXISTS "import_job_createdAt_idx" ON "import_job"("createdAt");

ALTER TABLE "import_job"
  ADD CONSTRAINT "import_job_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE import_entity
-- ============================================

CREATE TABLE IF NOT EXISTS "import_entity" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "ImportEntityType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "imported" BOOLEAN NOT NULL DEFAULT false,
    "chatId" TEXT,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_entity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "import_entity_jobId_externalId_key" ON "import_entity"("jobId", "externalId");
CREATE INDEX IF NOT EXISTS "import_entity_jobId_idx" ON "import_entity"("jobId");
CREATE INDEX IF NOT EXISTS "import_entity_jobId_selected_idx" ON "import_entity"("jobId", "selected");

ALTER TABLE "import_entity"
  ADD CONSTRAINT "import_entity_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "import_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE pac_reminder
-- ============================================

CREATE TABLE IF NOT EXISTS "pac_reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "content" TEXT NOT NULL,
    "triggerAt" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "sourceText" TEXT,
    "chatId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "deliveredAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "responseType" TEXT,
    "snoozeCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pac_reminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pac_reminder_userId_idx" ON "pac_reminder"("userId");
CREATE INDEX IF NOT EXISTS "pac_reminder_userId_status_idx" ON "pac_reminder"("userId", "status");
CREATE INDEX IF NOT EXISTS "pac_reminder_triggerAt_idx" ON "pac_reminder"("triggerAt");
CREATE INDEX IF NOT EXISTS "pac_reminder_status_triggerAt_idx" ON "pac_reminder"("status", "triggerAt");
CREATE INDEX IF NOT EXISTS "pac_reminder_userId_createdAt_idx" ON "pac_reminder"("userId", "createdAt");

ALTER TABLE "pac_reminder"
  ADD CONSTRAINT "pac_reminder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE pac_escalation
-- ============================================

CREATE TABLE IF NOT EXISTS "pac_escalation" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "channel" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pac_escalation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pac_escalation_reminderId_idx" ON "pac_escalation"("reminderId");
CREATE INDEX IF NOT EXISTS "pac_escalation_scheduledAt_idx" ON "pac_escalation"("scheduledAt");

ALTER TABLE "pac_escalation"
  ADD CONSTRAINT "pac_escalation_reminderId_fkey"
  FOREIGN KEY ("reminderId") REFERENCES "pac_reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE pac_settings
-- ============================================

CREATE TABLE IF NOT EXISTS "pac_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "explicitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "implicitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "minPriority" INTEGER NOT NULL DEFAULT 30,
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "digestTime" TEXT NOT NULL DEFAULT '09:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pac_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pac_settings_userId_key" ON "pac_settings"("userId");

ALTER TABLE "pac_settings"
  ADD CONSTRAINT "pac_settings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE council_session
-- ============================================

CREATE TABLE IF NOT EXISTS "council_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT,
    "query" TEXT NOT NULL,
    "status" "CouncilStatus" NOT NULL DEFAULT 'PENDING',
    "selectedPersona" TEXT,
    "synthesis" TEXT,
    "totalLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "council_session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "council_session_userId_idx" ON "council_session"("userId");
CREATE INDEX IF NOT EXISTS "council_session_userId_createdAt_idx" ON "council_session"("userId", "createdAt");

ALTER TABLE "council_session"
  ADD CONSTRAINT "council_session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE council_response
-- ============================================

CREATE TABLE IF NOT EXISTS "council_response" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "persona" "PersonaType" NOT NULL,
    "modelId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "status" "ResponseStatus" NOT NULL DEFAULT 'PENDING',
    "errorMsg" TEXT,
    "rating" INTEGER,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "council_response_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "council_response_sessionId_idx" ON "council_response"("sessionId");
CREATE INDEX IF NOT EXISTS "council_response_sessionId_persona_idx" ON "council_response"("sessionId", "persona");
CREATE INDEX IF NOT EXISTS "council_response_sessionId_selected_idx" ON "council_response"("sessionId", "selected");

ALTER TABLE "council_response"
  ADD CONSTRAINT "council_response_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "council_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE gamification_profile
-- ============================================

CREATE TABLE IF NOT EXISTS "gamification_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streakFreezes" INTEGER NOT NULL DEFAULT 1,
    "freezesUsed" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "referredBy" TEXT,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "proDaysEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gamification_profile_userId_key" ON "gamification_profile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "gamification_profile_referralCode_key" ON "gamification_profile"("referralCode");
CREATE INDEX IF NOT EXISTS "gamification_profile_referralCode_idx" ON "gamification_profile"("referralCode");

ALTER TABLE "gamification_profile"
  ADD CONSTRAINT "gamification_profile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE achievement
-- ============================================

CREATE TABLE IF NOT EXISTS "achievement" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "achievement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "achievement_profileId_code_key" ON "achievement"("profileId", "code");
CREATE INDEX IF NOT EXISTS "achievement_profileId_idx" ON "achievement"("profileId");

ALTER TABLE "achievement"
  ADD CONSTRAINT "achievement_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "gamification_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE xp_log
-- ============================================

CREATE TABLE IF NOT EXISTS "xp_log" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "xp_log_profileId_idx" ON "xp_log"("profileId");
CREATE INDEX IF NOT EXISTS "xp_log_profileId_createdAt_idx" ON "xp_log"("profileId", "createdAt");

ALTER TABLE "xp_log"
  ADD CONSTRAINT "xp_log_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "gamification_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE TABLE audit_log
-- ============================================

CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "ip" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_log_userId_idx" ON "audit_log"("userId");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log"("action");
CREATE INDEX IF NOT EXISTS "audit_log_createdAt_idx" ON "audit_log"("createdAt");
