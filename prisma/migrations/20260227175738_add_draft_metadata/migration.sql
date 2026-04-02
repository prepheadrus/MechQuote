-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DraftProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "description" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "tags" TEXT,
    "inputText" TEXT,
    "draftItems" JSONB,
    "step" TEXT NOT NULL DEFAULT 'input',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "convertedToProposalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_DraftProposal" ("createdAt", "customerId", "customerName", "deletedAt", "draftItems", "expiresAt", "id", "inputText", "isDeleted", "step", "updatedAt") SELECT "createdAt", "customerId", "customerName", "deletedAt", "draftItems", "expiresAt", "id", "inputText", "isDeleted", "step", "updatedAt" FROM "DraftProposal";
DROP TABLE "DraftProposal";
ALTER TABLE "new_DraftProposal" RENAME TO "DraftProposal";
CREATE INDEX "DraftProposal_customerId_idx" ON "DraftProposal"("customerId");
CREATE INDEX "DraftProposal_status_idx" ON "DraftProposal"("status");
CREATE INDEX "DraftProposal_createdAt_idx" ON "DraftProposal"("createdAt");
CREATE INDEX "DraftProposal_expiresAt_idx" ON "DraftProposal"("expiresAt");
CREATE INDEX "DraftProposal_isDeleted_idx" ON "DraftProposal"("isDeleted");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
