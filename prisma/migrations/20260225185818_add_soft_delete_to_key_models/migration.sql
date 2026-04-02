/*
  Warnings:

  - You are about to alter the column `address` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `tags` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `paymentHistory` on the `JobAssignment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `bankAccounts` on the `Settings` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `items` on the `Template` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- AlterTable
ALTER TABLE "ProposalItem" ADD COLUMN "groupDescription" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "taxId" TEXT,
    "taxOffice" TEXT,
    "status" TEXT DEFAULT 'Aktif',
    "tags" JSONB,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "totalSpending" REAL DEFAULT 0,
    "approvedProposalsCount" INTEGER DEFAULT 0,
    "totalProposalsCount" INTEGER DEFAULT 0,
    "lastProposalDate" DATETIME,
    "balance" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Customer" ("address", "approvedProposalsCount", "balance", "createdAt", "email", "id", "lastProposalDate", "name", "notes", "phone", "status", "tags", "taxId", "taxOffice", "totalProposalsCount", "totalSpending") SELECT "address", "approvedProposalsCount", "balance", "createdAt", "email", "id", "lastProposalDate", "name", "notes", "phone", "status", "tags", "taxId", "taxOffice", "totalProposalsCount", "totalSpending" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_taxId_idx" ON "Customer"("taxId");
CREATE INDEX "Customer_status_idx" ON "Customer"("status");
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");
CREATE INDEX "Customer_name_status_idx" ON "Customer"("name", "status");
CREATE INDEX "Customer_taxId_name_idx" ON "Customer"("taxId", "name");
CREATE INDEX "Customer_isDeleted_idx" ON "Customer"("isDeleted");
CREATE TABLE "new_Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceItemId" TEXT NOT NULL,
    "invoiceItemName" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "originalMatchId" TEXT,
    "originalMatchName" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "confidence" REAL,
    "method" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Feedback" ("confidence", "createdAt", "id", "invoiceItemId", "invoiceItemName", "method", "originalMatchId", "originalMatchName", "productId", "productName", "sessionId", "type", "userId") SELECT "confidence", "createdAt", "id", "invoiceItemId", "invoiceItemName", "method", "originalMatchId", "originalMatchName", "productId", "productName", "sessionId", "type", "userId" FROM "Feedback";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
CREATE INDEX "Feedback_invoiceItemName_idx" ON "Feedback"("invoiceItemName");
CREATE INDEX "Feedback_productId_idx" ON "Feedback"("productId");
CREATE INDEX "Feedback_type_idx" ON "Feedback"("type");
CREATE INDEX "Feedback_invoiceItemName_productId_idx" ON "Feedback"("invoiceItemName", "productId");
CREATE TABLE "new_JobAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT,
    "projectId" TEXT,
    "personnelId" TEXT NOT NULL,
    "assignedAmount" REAL NOT NULL,
    "notes" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Ödenmedi',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentHistory" JSONB,
    CONSTRAINT "JobAssignment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobAssignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobAssignment" ("assignedAmount", "assignedAt", "id", "notes", "paymentHistory", "paymentStatus", "personnelId", "projectId", "proposalId") SELECT "assignedAmount", "assignedAt", "id", "notes", "paymentHistory", "paymentStatus", "personnelId", "projectId", "proposalId" FROM "JobAssignment";
DROP TABLE "JobAssignment";
ALTER TABLE "new_JobAssignment" RENAME TO "JobAssignment";
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "companyTitle" TEXT,
    "companySlogan" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "taxOffice" TEXT,
    "taxNumber" TEXT,
    "bankAccounts" JSONB,
    "defaultTermsAndConditions" TEXT,
    "defaultVatRate" REAL NOT NULL DEFAULT 0.20,
    "monthlyTargetAmount" REAL,
    "currency" TEXT DEFAULT 'TRY',
    "defaultExchangeRateUSD" REAL NOT NULL DEFAULT 32.50,
    "defaultExchangeRateEUR" REAL NOT NULL DEFAULT 35.00,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_Settings" ("address", "bankAccounts", "companyName", "companySlogan", "companyTitle", "currency", "defaultExchangeRateEUR", "defaultExchangeRateUSD", "defaultTermsAndConditions", "defaultVatRate", "email", "id", "logo", "monthlyTargetAmount", "phoneNumber", "taxNumber", "taxOffice", "website") SELECT "address", "bankAccounts", "companyName", "companySlogan", "companyTitle", "currency", "defaultExchangeRateEUR", "defaultExchangeRateUSD", "defaultTermsAndConditions", "defaultVatRate", "email", "id", "logo", "monthlyTargetAmount", "phoneNumber", "taxNumber", "taxOffice", "website" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE INDEX "Settings_isDeleted_idx" ON "Settings"("isDeleted");
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "items" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Template" ("createdAt", "description", "id", "items", "name") SELECT "createdAt", "description", "id", "items", "name" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
