-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomerTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "category" TEXT,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "CustomerTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CustomerTransaction" ("amount", "category", "createdAt", "createdBy", "customerId", "date", "deletedAt", "description", "id", "isDeleted", "referenceId", "referenceType", "type") SELECT "amount", "category", "createdAt", "createdBy", "customerId", "date", "deletedAt", "description", "id", "isDeleted", "referenceId", "referenceType", "type" FROM "CustomerTransaction";
DROP TABLE "CustomerTransaction";
ALTER TABLE "new_CustomerTransaction" RENAME TO "CustomerTransaction";
CREATE INDEX "CustomerTransaction_isDeleted_idx" ON "CustomerTransaction"("isDeleted");
CREATE INDEX "CustomerTransaction_projectId_idx" ON "CustomerTransaction"("projectId");
CREATE TABLE "new_ProjectExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Expense',
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT,
    "customerId" TEXT,
    "personnelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectExpense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectExpense_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectExpense_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectExpense" ("amount", "category", "createdAt", "date", "deletedAt", "description", "id", "isDeleted", "projectId", "supplierId", "type", "updatedAt") SELECT "amount", "category", "createdAt", "date", "deletedAt", "description", "id", "isDeleted", "projectId", "supplierId", "type", "updatedAt" FROM "ProjectExpense";
DROP TABLE "ProjectExpense";
ALTER TABLE "new_ProjectExpense" RENAME TO "ProjectExpense";
CREATE INDEX "ProjectExpense_isDeleted_idx" ON "ProjectExpense"("isDeleted");
CREATE INDEX "ProjectExpense_customerId_idx" ON "ProjectExpense"("customerId");
CREATE INDEX "ProjectExpense_personnelId_idx" ON "ProjectExpense"("personnelId");
CREATE TABLE "new_SupplierTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "SupplierTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SupplierTransaction" ("amount", "category", "createdAt", "date", "deletedAt", "description", "id", "isDeleted", "referenceId", "referenceType", "supplierId", "type") SELECT "amount", "category", "createdAt", "date", "deletedAt", "description", "id", "isDeleted", "referenceId", "referenceType", "supplierId", "type" FROM "SupplierTransaction";
DROP TABLE "SupplierTransaction";
ALTER TABLE "new_SupplierTransaction" RENAME TO "SupplierTransaction";
CREATE INDEX "SupplierTransaction_isDeleted_idx" ON "SupplierTransaction"("isDeleted");
CREATE INDEX "SupplierTransaction_projectId_idx" ON "SupplierTransaction"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
