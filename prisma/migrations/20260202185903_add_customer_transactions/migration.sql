-- CreateTable
CREATE TABLE "CustomerTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "CustomerTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "taxOffice" TEXT,
    "status" TEXT DEFAULT 'Aktif',
    "tags" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSpending" REAL DEFAULT 0,
    "approvedProposalsCount" INTEGER DEFAULT 0,
    "totalProposalsCount" INTEGER DEFAULT 0,
    "lastProposalDate" DATETIME,
    "balance" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Customer" ("address", "approvedProposalsCount", "createdAt", "email", "id", "lastProposalDate", "name", "notes", "phone", "status", "tags", "taxId", "taxOffice", "totalProposalsCount", "totalSpending") SELECT "address", "approvedProposalsCount", "createdAt", "email", "id", "lastProposalDate", "name", "notes", "phone", "status", "tags", "taxId", "taxOffice", "totalProposalsCount", "totalSpending" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
