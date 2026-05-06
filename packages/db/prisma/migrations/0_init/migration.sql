-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('STARTER', 'PRO', 'ULTRA');

-- CreateEnum
CREATE TYPE "ScheduledTaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "tier" "Tier" NOT NULL DEFAULT 'STARTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "polarCustomerId" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "monthlyCredit" INTEGER NOT NULL DEFAULT 1000,
    "creditUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chatsRemaining" INTEGER NOT NULL DEFAULT 300,
    "voiceMinutesRemaining" INTEGER NOT NULL DEFAULT 300,
    "resetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLog" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "description" TEXT,
    "modelPreference" TEXT,
    "memoryScope" TEXT NOT NULL DEFAULT 'global',
    "projectId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "modelUsed" TEXT,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memoryItems" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "type" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT 'semantic',
    "source" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 50,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "decayScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryFeedback" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wasHelpful" BOOLEAN NOT NULL,
    "notes" TEXT,
    "queryText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modelId" TEXT NOT NULL DEFAULT 'gpt-4o',
    "systemPrompt" TEXT,
    "tools" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "triggerAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledTaskStatus" NOT NULL DEFAULT 'PENDING',
    "taskType" TEXT NOT NULL DEFAULT 'PROACTIVE_FOLLOWUP',
    "intent" TEXT NOT NULL,
    "contextSummary" TEXT,
    "topic" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "channelPref" TEXT NOT NULL DEFAULT 'auto',
    "metadata" JSONB,
    "executedAt" TIMESTAMP(3),
    "resultMessage" TEXT,
    "deliveryStatus" TEXT,
    "errorMessage" TEXT,
    "externalJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "aaguid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "deviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "taskId" TEXT,
    "metadata" JSONB,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_clerkId_key" ON "user"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_userId_key" ON "BillingAccount"("userId");

-- CreateIndex
CREATE INDEX "BillingAccount_userId_idx" ON "BillingAccount"("userId");

-- CreateIndex
CREATE INDEX "CreditLog_billingAccountId_idx" ON "CreditLog"("billingAccountId");

-- CreateIndex
CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");

-- CreateIndex
CREATE INDEX "Chat_createdAt_idx" ON "Chat"("createdAt");

-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE INDEX "Message_userId_idx" ON "Message"("userId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Memory_userId_idx" ON "Memory"("userId");

-- CreateIndex
CREATE INDEX "Memory_userId_sector_idx" ON "Memory"("userId", "sector");

-- CreateIndex
CREATE INDEX "Memory_userId_isActive_idx" ON "Memory"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Memory_chatId_idx" ON "Memory"("chatId");

-- CreateIndex
CREATE INDEX "Memory_type_idx" ON "Memory"("type");

-- CreateIndex
CREATE INDEX "MemoryFeedback_memoryId_idx" ON "MemoryFeedback"("memoryId");

-- CreateIndex
CREATE INDEX "MemoryFeedback_userId_idx" ON "MemoryFeedback"("userId");

-- CreateIndex
CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");

-- CreateIndex
CREATE INDEX "scheduled_task_userId_idx" ON "scheduled_task"("userId");

-- CreateIndex
CREATE INDEX "scheduled_task_userId_status_idx" ON "scheduled_task"("userId", "status");

-- CreateIndex
CREATE INDEX "scheduled_task_triggerAt_idx" ON "scheduled_task"("triggerAt");

-- CreateIndex
CREATE INDEX "scheduled_task_status_triggerAt_idx" ON "scheduled_task"("status", "triggerAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credentialID_key" ON "passkey"("credentialID");

-- CreateIndex
CREATE INDEX "passkey_userId_idx" ON "passkey"("userId");

-- CreateIndex
CREATE INDEX "push_subscription_userId_idx" ON "push_subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_log_userId_idx" ON "notification_log"("userId");

-- CreateIndex
CREATE INDEX "notification_log_userId_status_idx" ON "notification_log"("userId", "status");

-- CreateIndex
CREATE INDEX "notification_log_createdAt_idx" ON "notification_log"("createdAt");

-- AddForeignKey
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryFeedback" ADD CONSTRAINT "MemoryFeedback_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_task" ADD CONSTRAINT "scheduled_task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
┌─────────────────────────────────────────────────────────┐
│  Update available 6.19.2 -> 7.3.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

