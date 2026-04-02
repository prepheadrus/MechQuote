/*
  Warnings:

  - You are about to drop the `ProjectTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `budget` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `adres` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `altBaslik` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `bankaHesaplari` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `defaultTerms` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `kapakAdi` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `telefon` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `vergiDairesi` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `vergiNumarasi` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `web` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "dueDate" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProjectTransaction";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ProductAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT,
    "aliasName" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "referenceId" TEXT,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProjectStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectStatusHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Expense',
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectExpense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierQuote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierQuoteItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierQuoteId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    CONSTRAINT "SupplierQuoteItem_supplierQuoteId_fkey" FOREIGN KEY ("supplierQuoteId") REFERENCES "SupplierQuote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "userId" TEXT,
    "username" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PersonnelTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personnelId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,
    "referenceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonnelTransaction_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonnelTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AICache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileHash" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "apiKeyUsed" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "APIKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "dailyLimit" INTEGER NOT NULL DEFAULT 1000,
    "todayCount" INTEGER NOT NULL DEFAULT 0,
    "resetDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InstallationType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY'
);
INSERT INTO "new_InstallationType" ("currency", "description", "id", "name", "parentId", "price") SELECT "currency", "description", "id", "name", "parentId", "price" FROM "InstallationType";
DROP TABLE "InstallationType";
ALTER TABLE "new_InstallationType" RENAME TO "InstallationType";
CREATE TABLE "new_InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "taxRate" REAL,
    "taxAmount" REAL,
    "discountAmount" REAL,
    "unit" TEXT,
    "listPrice" REAL,
    "discountRate" REAL,
    "linkedProductId" TEXT,
    "projectId" TEXT,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_linkedProductId_fkey" FOREIGN KEY ("linkedProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceItem" ("discountAmount", "discountRate", "id", "invoiceId", "linkedProductId", "listPrice", "name", "projectId", "quantity", "taxAmount", "taxRate", "totalPrice", "unit", "unitPrice") SELECT "discountAmount", "discountRate", "id", "invoiceId", "linkedProductId", "listPrice", "name", "projectId", "quantity", "taxAmount", "taxRate", "totalPrice", "unit", "unitPrice" FROM "InvoiceItem";
DROP TABLE "InvoiceItem";
ALTER TABLE "new_InvoiceItem" RENAME TO "InvoiceItem";
CREATE TABLE "new_JobAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT,
    "projectId" TEXT,
    "personnelId" TEXT NOT NULL,
    "assignedAmount" REAL NOT NULL,
    "notes" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Ödenmedi',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentHistory" TEXT,
    CONSTRAINT "JobAssignment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobAssignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobAssignment" ("assignedAmount", "assignedAt", "id", "notes", "paymentHistory", "paymentStatus", "personnelId", "proposalId") SELECT "assignedAmount", "assignedAt", "id", "notes", "paymentHistory", "paymentStatus", "personnelId", "proposalId" FROM "JobAssignment";
DROP TABLE "JobAssignment";
ALTER TABLE "new_JobAssignment" RENAME TO "JobAssignment";
CREATE TABLE "new_Personnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aktif',
    "dailyRate" REAL,
    "balance" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Personnel" ("dailyRate", "email", "id", "name", "phone", "role", "status") SELECT "dailyRate", "email", "id", "name", "phone", "role", "status" FROM "Personnel";
DROP TABLE "Personnel";
ALTER TABLE "new_Personnel" RENAME TO "Personnel";
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "category" TEXT,
    "description" TEXT,
    "unit" TEXT,
    "listPrice" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "vatRate" REAL NOT NULL DEFAULT 0.20,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "priceIncludesVat" BOOLEAN NOT NULL DEFAULT false,
    "discountRate" REAL DEFAULT 0,
    "installationTypeId" TEXT,
    "supplierId" TEXT,
    "technicalSpecifications" TEXT,
    "brochureUrl" TEXT,
    "stockQuantity" REAL NOT NULL DEFAULT 0,
    "reservedQuantity" REAL NOT NULL DEFAULT 0,
    "minStockLevel" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("basePrice", "brand", "brochureUrl", "category", "code", "createdAt", "currency", "description", "discountRate", "id", "installationTypeId", "listPrice", "model", "name", "priceIncludesVat", "supplierId", "technicalSpecifications", "unit", "updatedAt", "vatRate") SELECT "basePrice", "brand", "brochureUrl", "category", "code", "createdAt", "currency", "description", "discountRate", "id", "installationTypeId", "listPrice", "model", "name", "priceIncludesVat", "supplierId", "technicalSpecifications", "unit", "updatedAt", "vatRate" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SOZLESME_ASAMASI',
    "address" TEXT,
    "customerId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "contractAmount" REAL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "estimatedMaterialCost" REAL DEFAULT 0,
    "estimatedLaborCost" REAL DEFAULT 0,
    "linkedProposalId" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_linkedProposalId_fkey" FOREIGN KEY ("linkedProposalId") REFERENCES "Proposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("address", "contractAmount", "createdAt", "customerId", "description", "endDate", "id", "name", "startDate", "status", "updatedAt") SELECT "address", "contractAmount", "createdAt", "customerId", "description", "endDate", "id", "name", "startDate", "status", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE TABLE "new_ProposalItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "quantity" REAL NOT NULL,
    "unit" TEXT,
    "listPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "discountRate" REAL NOT NULL DEFAULT 0,
    "profitMargin" REAL NOT NULL DEFAULT 0,
    "groupName" TEXT,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "vatRate" REAL NOT NULL DEFAULT 0.20,
    "priceIncludesVat" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProposalItem" ("basePrice", "brand", "currency", "discountRate", "groupName", "id", "listPrice", "model", "name", "orderIndex", "priceIncludesVat", "productId", "profitMargin", "proposalId", "quantity", "unit", "vatRate") SELECT "basePrice", "brand", "currency", "discountRate", "groupName", "id", "listPrice", "model", "name", "orderIndex", "priceIncludesVat", "productId", "profitMargin", "proposalId", "quantity", "unit", "vatRate" FROM "ProposalItem";
DROP TABLE "ProposalItem";
ALTER TABLE "new_ProposalItem" RENAME TO "ProposalItem";
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
    "bankAccounts" TEXT,
    "defaultTermsAndConditions" TEXT,
    "defaultVatRate" REAL NOT NULL DEFAULT 0.20,
    "monthlyTargetAmount" REAL,
    "currency" TEXT DEFAULT 'TRY',
    "defaultExchangeRateUSD" REAL NOT NULL DEFAULT 32.50,
    "defaultExchangeRateEUR" REAL NOT NULL DEFAULT 35.00
);
INSERT INTO "new_Settings" ("address", "bankAccounts", "companyName", "companySlogan", "companyTitle", "currency", "defaultTermsAndConditions", "defaultVatRate", "email", "id", "logo", "monthlyTargetAmount", "phoneNumber", "website") SELECT "address", "bankAccounts", "companyName", "companySlogan", "companyTitle", "currency", "defaultTermsAndConditions", "defaultVatRate", "email", "id", "logo", "monthlyTargetAmount", "phoneNumber", "website" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "balance" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Supplier" ("address", "contactName", "email", "id", "name", "phone") SELECT "address", "contactName", "email", "id", "name", "phone" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProductAlias_supplierId_aliasName_key" ON "ProductAlias"("supplierId", "aliasName");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyTarget_year_month_key" ON "MonthlyTarget"("year", "month");

-- CreateIndex
CREATE INDEX "AuditLog_action_entityType_idx" ON "AuditLog"("action", "entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AICache_fileHash_key" ON "AICache"("fileHash");

-- CreateIndex
CREATE INDEX "AICache_fileHash_idx" ON "AICache"("fileHash");

-- CreateIndex
CREATE INDEX "AICache_expiresAt_idx" ON "AICache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "APIKey_keyHash_key" ON "APIKey"("keyHash");

-- CreateIndex
CREATE INDEX "APIKey_provider_idx" ON "APIKey"("provider");

-- CreateIndex
CREATE INDEX "APIKey_isActive_idx" ON "APIKey"("isActive");

-- CreateIndex
CREATE INDEX "Invoice_type_status_idx" ON "Invoice"("type", "status");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "Proposal_createdAt_idx" ON "Proposal"("createdAt");
