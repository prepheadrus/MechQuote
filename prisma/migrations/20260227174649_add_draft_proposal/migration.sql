-- CreateTable
CREATE TABLE "DraftProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "customerName" TEXT,
    "inputText" TEXT,
    "draftItems" JSONB,
    "step" TEXT NOT NULL DEFAULT 'input',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "DraftProposal_createdAt_idx" ON "DraftProposal"("createdAt");

-- CreateIndex
CREATE INDEX "DraftProposal_expiresAt_idx" ON "DraftProposal"("expiresAt");

-- CreateIndex
CREATE INDEX "DraftProposal_isDeleted_idx" ON "DraftProposal"("isDeleted");
