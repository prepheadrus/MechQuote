/*
  Warnings:

  - You are about to drop the column `recipeItems` on the `Recipe` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT,
    "cost" REAL NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "address" TEXT,
    "customerId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "contractAmount" REAL DEFAULT 0,
    "budget" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Expense',
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "method" TEXT NOT NULL DEFAULT 'Bank Transfer',
    "invoiceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "customerId" TEXT,
    "senderName" TEXT,
    "receiverName" TEXT,
    "senderTaxId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "ettsn" TEXT,
    "invoiceDate" DATETIME NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "totalAmount" REAL NOT NULL,
    "subTotal" REAL,
    "totalDiscountAmount" REAL,
    "totalTaxAmount" REAL,
    "taxInclusiveTotal" REAL,
    "pdfFileBlob" BLOB,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("createdAt", "currency", "customerId", "ettsn", "id", "invoiceDate", "invoiceNumber", "pdfFileBlob", "receiverName", "senderName", "senderTaxId", "status", "subTotal", "taxInclusiveTotal", "totalAmount", "totalDiscountAmount", "totalTaxAmount", "type") SELECT "createdAt", "currency", "customerId", "ettsn", "id", "invoiceDate", "invoiceNumber", "pdfFileBlob", "receiverName", "senderName", "senderTaxId", "status", "subTotal", "taxInclusiveTotal", "totalAmount", "totalDiscountAmount", "totalTaxAmount", "type" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
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
    CONSTRAINT "InvoiceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceItem" ("discountAmount", "discountRate", "id", "invoiceId", "linkedProductId", "listPrice", "name", "quantity", "taxAmount", "taxRate", "totalPrice", "unit", "unitPrice") SELECT "discountAmount", "discountRate", "id", "invoiceId", "linkedProductId", "listPrice", "name", "quantity", "taxAmount", "taxRate", "totalPrice", "unit", "unitPrice" FROM "InvoiceItem";
DROP TABLE "InvoiceItem";
ALTER TABLE "new_InvoiceItem" RENAME TO "InvoiceItem";
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
    "projectId" TEXT,
    CONSTRAINT "Proposal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Proposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Proposal" ("createdAt", "customerId", "customerName", "exchangeRateEUR", "exchangeRateUSD", "id", "projectName", "quoteNumber", "rootProposalId", "status", "tags", "termsAndConditions", "totalAmount", "version", "versionNote") SELECT "createdAt", "customerId", "customerName", "exchangeRateEUR", "exchangeRateUSD", "id", "projectName", "quoteNumber", "rootProposalId", "status", "tags", "termsAndConditions", "totalAmount", "version", "versionNote" FROM "Proposal";
DROP TABLE "Proposal";
ALTER TABLE "new_Proposal" RENAME TO "Proposal";
CREATE UNIQUE INDEX "Proposal_quoteNumber_key" ON "Proposal"("quoteNumber");
CREATE TABLE "new_Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Recipe" ("id", "productId") SELECT "id", "productId" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
CREATE UNIQUE INDEX "Recipe_productId_key" ON "Recipe"("productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
