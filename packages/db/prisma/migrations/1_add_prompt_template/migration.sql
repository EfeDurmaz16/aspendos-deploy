-- CreateTable
CREATE TABLE "prompt_template" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompt_template_userId_idx" ON "prompt_template"("userId");

-- CreateIndex
CREATE INDEX "prompt_template_userId_category_idx" ON "prompt_template"("userId", "category");

-- CreateIndex
CREATE INDEX "prompt_template_isPublic_usageCount_idx" ON "prompt_template"("isPublic", "usageCount");

-- AddForeignKey
ALTER TABLE "prompt_template"
ADD CONSTRAINT "prompt_template_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "user"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
