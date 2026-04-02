-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rootProposalId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "quoteNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "exchangeRateUSD" REAL NOT NULL DEFAULT 0,
    "exchangeRateEUR" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionNote" TEXT,
    "termsAndConditions" TEXT,
    "tags" TEXT,
    CONSTRAINT "Proposal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Proposal" ("createdAt", "customerId", "customerName", "exchangeRateEUR", "exchangeRateUSD", "id", "projectName", "quoteNumber", "rootProposalId", "status", "tags", "termsAndConditions", "totalAmount", "version", "versionNote") SELECT "createdAt", "customerId", "customerName", "exchangeRateEUR", "exchangeRateUSD", "id", "projectName", "quoteNumber", "rootProposalId", "status", "tags", "termsAndConditions", "totalAmount", "version", "versionNote" FROM "Proposal";
DROP TABLE "Proposal";
ALTER TABLE "new_Proposal" RENAME TO "Proposal";
CREATE UNIQUE INDEX "Proposal_quoteNumber_key" ON "Proposal"("quoteNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
