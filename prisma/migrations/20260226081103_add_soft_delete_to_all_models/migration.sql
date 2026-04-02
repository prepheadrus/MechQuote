-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AICache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileHash" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "apiKeyUsed" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_AICache" ("apiKeyUsed", "confidence", "createdAt", "expiresAt", "fileHash", "fileType", "id", "provider", "result") SELECT "apiKeyUsed", "confidence", "createdAt", "expiresAt", "fileHash", "fileType", "id", "provider", "result" FROM "AICache";
DROP TABLE "AICache";
ALTER TABLE "new_AICache" RENAME TO "AICache";
CREATE UNIQUE INDEX "AICache_fileHash_key" ON "AICache"("fileHash");
CREATE INDEX "AICache_fileHash_idx" ON "AICache"("fileHash");
CREATE INDEX "AICache_expiresAt_idx" ON "AICache"("expiresAt");
CREATE INDEX "AICache_isDeleted_idx" ON "AICache"("isDeleted");
CREATE TABLE "new_APIKey" (
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
    "updatedAt" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_APIKey" ("createdAt", "dailyLimit", "id", "isActive", "keyHash", "lastUsedAt", "name", "provider", "resetDate", "todayCount", "updatedAt", "usageCount") SELECT "createdAt", "dailyLimit", "id", "isActive", "keyHash", "lastUsedAt", "name", "provider", "resetDate", "todayCount", "updatedAt", "usageCount" FROM "APIKey";
DROP TABLE "APIKey";
ALTER TABLE "new_APIKey" RENAME TO "APIKey";
CREATE UNIQUE INDEX "APIKey_keyHash_key" ON "APIKey"("keyHash");
CREATE INDEX "APIKey_provider_idx" ON "APIKey"("provider");
CREATE INDEX "APIKey_isActive_idx" ON "APIKey"("isActive");
CREATE INDEX "APIKey_isDeleted_idx" ON "APIKey"("isDeleted");
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "userId" TEXT,
    "username" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "details", "entityId", "entityType", "id", "userId", "username") SELECT "action", "createdAt", "details", "entityId", "entityType", "id", "userId", "username" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_action_entityType_idx" ON "AuditLog"("action", "entityType");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_isDeleted_idx" ON "AuditLog"("isDeleted");
CREATE TABLE "new_CustomerInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "CustomerInteraction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomerInteraction" ("authorName", "content", "createdAt", "customerId", "id", "type") SELECT "authorName", "content", "createdAt", "customerId", "id", "type" FROM "CustomerInteraction";
DROP TABLE "CustomerInteraction";
ALTER TABLE "new_CustomerInteraction" RENAME TO "CustomerInteraction";
CREATE INDEX "CustomerInteraction_isDeleted_idx" ON "CustomerInteraction"("isDeleted");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "CustomerTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomerTransaction" ("amount", "category", "createdAt", "createdBy", "customerId", "date", "description", "id", "referenceId", "referenceType", "type") SELECT "amount", "category", "createdAt", "createdBy", "customerId", "date", "description", "id", "referenceId", "referenceType", "type" FROM "CustomerTransaction";
DROP TABLE "CustomerTransaction";
ALTER TABLE "new_CustomerTransaction" RENAME TO "CustomerTransaction";
CREATE INDEX "CustomerTransaction_isDeleted_idx" ON "CustomerTransaction"("isDeleted");
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Feedback_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Feedback" ("confidence", "createdAt", "id", "invoiceItemId", "invoiceItemName", "method", "originalMatchId", "originalMatchName", "productId", "productName", "sessionId", "type", "userId") SELECT "confidence", "createdAt", "id", "invoiceItemId", "invoiceItemName", "method", "originalMatchId", "originalMatchName", "productId", "productName", "sessionId", "type", "userId" FROM "Feedback";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
CREATE INDEX "Feedback_invoiceItemName_idx" ON "Feedback"("invoiceItemName");
CREATE INDEX "Feedback_productId_idx" ON "Feedback"("productId");
CREATE INDEX "Feedback_type_idx" ON "Feedback"("type");
CREATE INDEX "Feedback_invoiceItemName_productId_idx" ON "Feedback"("invoiceItemName", "productId");
CREATE INDEX "Feedback_isDeleted_idx" ON "Feedback"("isDeleted");
CREATE TABLE "new_InstallationType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_InstallationType" ("currency", "description", "id", "name", "parentId", "price") SELECT "currency", "description", "id", "name", "parentId", "price" FROM "InstallationType";
DROP TABLE "InstallationType";
ALTER TABLE "new_InstallationType" RENAME TO "InstallationType";
CREATE INDEX "InstallationType_isDeleted_idx" ON "InstallationType"("isDeleted");
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
    "dueDate" DATETIME,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "totalAmount" REAL NOT NULL,
    "subTotal" REAL,
    "totalDiscountAmount" REAL,
    "totalTaxAmount" REAL,
    "taxInclusiveTotal" REAL,
    "pdfFileBlob" BLOB,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "projectId" TEXT,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("createdAt", "currency", "customerId", "dueDate", "ettsn", "id", "invoiceDate", "invoiceNumber", "pdfFileBlob", "projectId", "receiverName", "senderName", "senderTaxId", "status", "subTotal", "taxInclusiveTotal", "totalAmount", "totalDiscountAmount", "totalTaxAmount", "type") SELECT "createdAt", "currency", "customerId", "dueDate", "ettsn", "id", "invoiceDate", "invoiceNumber", "pdfFileBlob", "projectId", "receiverName", "senderName", "senderTaxId", "status", "subTotal", "taxInclusiveTotal", "totalAmount", "totalDiscountAmount", "totalTaxAmount", "type" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE INDEX "Invoice_type_idx" ON "Invoice"("type");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX "Invoice_senderName_idx" ON "Invoice"("senderName");
CREATE INDEX "Invoice_senderTaxId_idx" ON "Invoice"("senderTaxId");
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_ettsn_idx" ON "Invoice"("ettsn");
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");
CREATE INDEX "Invoice_type_status_idx" ON "Invoice"("type", "status");
CREATE INDEX "Invoice_customerId_type_idx" ON "Invoice"("customerId", "type");
CREATE INDEX "Invoice_invoiceNumber_type_idx" ON "Invoice"("invoiceNumber", "type");
CREATE INDEX "Invoice_isDeleted_idx" ON "Invoice"("isDeleted");
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_linkedProductId_fkey" FOREIGN KEY ("linkedProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceItem" ("discountAmount", "discountRate", "id", "invoiceId", "linkedProductId", "listPrice", "name", "projectId", "quantity", "taxAmount", "taxRate", "totalPrice", "unit", "unitPrice") SELECT "discountAmount", "discountRate", "id", "invoiceId", "linkedProductId", "listPrice", "name", "projectId", "quantity", "taxAmount", "taxRate", "totalPrice", "unit", "unitPrice" FROM "InvoiceItem";
DROP TABLE "InvoiceItem";
ALTER TABLE "new_InvoiceItem" RENAME TO "InvoiceItem";
CREATE INDEX "InvoiceItem_isDeleted_idx" ON "InvoiceItem"("isDeleted");
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "JobAssignment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobAssignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobAssignment" ("assignedAmount", "assignedAt", "id", "notes", "paymentHistory", "paymentStatus", "personnelId", "projectId", "proposalId") SELECT "assignedAmount", "assignedAt", "id", "notes", "paymentHistory", "paymentStatus", "personnelId", "projectId", "proposalId" FROM "JobAssignment";
DROP TABLE "JobAssignment";
ALTER TABLE "new_JobAssignment" RENAME TO "JobAssignment";
CREATE INDEX "JobAssignment_isDeleted_idx" ON "JobAssignment"("isDeleted");
CREATE TABLE "new_LaborCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_LaborCost" ("cost", "id", "role", "unit") SELECT "cost", "id", "role", "unit" FROM "LaborCost";
DROP TABLE "LaborCost";
ALTER TABLE "new_LaborCost" RENAME TO "LaborCost";
CREATE INDEX "LaborCost_isDeleted_idx" ON "LaborCost"("isDeleted");
CREATE TABLE "new_MonthlyTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_MonthlyTarget" ("currency", "id", "month", "targetAmount", "updatedAt", "year") SELECT "currency", "id", "month", "targetAmount", "updatedAt", "year" FROM "MonthlyTarget";
DROP TABLE "MonthlyTarget";
ALTER TABLE "new_MonthlyTarget" RENAME TO "MonthlyTarget";
CREATE INDEX "MonthlyTarget_isDeleted_idx" ON "MonthlyTarget"("isDeleted");
CREATE UNIQUE INDEX "MonthlyTarget_year_month_key" ON "MonthlyTarget"("year", "month");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "method" TEXT NOT NULL DEFAULT 'Bank Transfer',
    "invoiceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "date", "id", "invoiceId", "method", "note", "updatedAt") SELECT "amount", "createdAt", "date", "id", "invoiceId", "method", "note", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_isDeleted_idx" ON "Payment"("isDeleted");
CREATE TABLE "new_Personnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aktif',
    "dailyRate" REAL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "balance" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Personnel" ("balance", "dailyRate", "email", "id", "name", "phone", "role", "status") SELECT "balance", "dailyRate", "email", "id", "name", "phone", "role", "status" FROM "Personnel";
DROP TABLE "Personnel";
ALTER TABLE "new_Personnel" RENAME TO "Personnel";
CREATE INDEX "Personnel_isDeleted_idx" ON "Personnel"("isDeleted");
CREATE TABLE "new_PersonnelTransaction" (
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "PersonnelTransaction_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonnelTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PersonnelTransaction" ("amount", "category", "createdAt", "date", "description", "id", "personnelId", "projectId", "referenceId", "type") SELECT "amount", "category", "createdAt", "date", "description", "id", "personnelId", "projectId", "referenceId", "type" FROM "PersonnelTransaction";
DROP TABLE "PersonnelTransaction";
ALTER TABLE "new_PersonnelTransaction" RENAME TO "PersonnelTransaction";
CREATE INDEX "PersonnelTransaction_isDeleted_idx" ON "PersonnelTransaction"("isDeleted");
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
    "updatedAt" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_Product" ("basePrice", "brand", "brochureUrl", "category", "code", "createdAt", "currency", "description", "discountRate", "id", "installationTypeId", "listPrice", "minStockLevel", "model", "name", "priceIncludesVat", "reservedQuantity", "stockQuantity", "supplierId", "technicalSpecifications", "unit", "updatedAt", "vatRate") SELECT "basePrice", "brand", "brochureUrl", "category", "code", "createdAt", "currency", "description", "discountRate", "id", "installationTypeId", "listPrice", "minStockLevel", "model", "name", "priceIncludesVat", "reservedQuantity", "stockQuantity", "supplierId", "technicalSpecifications", "unit", "updatedAt", "vatRate" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_code_idx" ON "Product"("code");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_brand_idx" ON "Product"("brand");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX "Product_name_category_idx" ON "Product"("name", "category");
CREATE INDEX "Product_brand_model_idx" ON "Product"("brand", "model");
CREATE INDEX "Product_isDeleted_idx" ON "Product"("isDeleted");
CREATE TABLE "new_ProductAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT,
    "aliasName" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "ProductAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductAlias" ("aliasName", "createdAt", "id", "productId", "supplierId") SELECT "aliasName", "createdAt", "id", "productId", "supplierId" FROM "ProductAlias";
DROP TABLE "ProductAlias";
ALTER TABLE "new_ProductAlias" RENAME TO "ProductAlias";
CREATE INDEX "ProductAlias_isDeleted_idx" ON "ProductAlias"("isDeleted");
CREATE UNIQUE INDEX "ProductAlias_supplierId_aliasName_key" ON "ProductAlias"("supplierId", "aliasName");
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_linkedProposalId_fkey" FOREIGN KEY ("linkedProposalId") REFERENCES "Proposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("address", "contractAmount", "createdAt", "currency", "customerId", "description", "endDate", "estimatedLaborCost", "estimatedMaterialCost", "id", "linkedProposalId", "name", "notes", "startDate", "status", "tags", "updatedAt") SELECT "address", "contractAmount", "createdAt", "currency", "customerId", "description", "endDate", "estimatedLaborCost", "estimatedMaterialCost", "id", "linkedProposalId", "name", "notes", "startDate", "status", "tags", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_name_idx" ON "Project"("name");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");
CREATE INDEX "Project_customerId_status_idx" ON "Project"("customerId", "status");
CREATE INDEX "Project_status_createdAt_idx" ON "Project"("status", "createdAt");
CREATE INDEX "Project_name_customerId_idx" ON "Project"("name", "customerId");
CREATE INDEX "Project_isDeleted_idx" ON "Project"("isDeleted");
CREATE TABLE "new_ProjectExpense" (
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectExpense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectExpense" ("amount", "category", "createdAt", "date", "description", "id", "projectId", "supplierId", "type", "updatedAt") SELECT "amount", "category", "createdAt", "date", "description", "id", "projectId", "supplierId", "type", "updatedAt" FROM "ProjectExpense";
DROP TABLE "ProjectExpense";
ALTER TABLE "new_ProjectExpense" RENAME TO "ProjectExpense";
CREATE INDEX "ProjectExpense_isDeleted_idx" ON "ProjectExpense"("isDeleted");
CREATE TABLE "new_ProjectStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "ProjectStatusHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProjectStatusHistory" ("createdAt", "date", "id", "note", "projectId", "status") SELECT "createdAt", "date", "id", "note", "projectId", "status" FROM "ProjectStatusHistory";
DROP TABLE "ProjectStatusHistory";
ALTER TABLE "new_ProjectStatusHistory" RENAME TO "ProjectStatusHistory";
CREATE INDEX "ProjectStatusHistory_isDeleted_idx" ON "ProjectStatusHistory"("isDeleted");
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "projectId" TEXT,
    CONSTRAINT "Proposal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Proposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Proposal" ("createdAt", "customerId", "customerName", "exchangeRateEUR", "exchangeRateUSD", "id", "projectId", "projectName", "quoteNumber", "rootProposalId", "status", "tags", "termsAndConditions", "totalAmount", "version", "versionNote") SELECT "createdAt", "customerId", "customerName", "exchangeRateEUR", "exchangeRateUSD", "id", "projectId", "projectName", "quoteNumber", "rootProposalId", "status", "tags", "termsAndConditions", "totalAmount", "version", "versionNote" FROM "Proposal";
DROP TABLE "Proposal";
ALTER TABLE "new_Proposal" RENAME TO "Proposal";
CREATE UNIQUE INDEX "Proposal_quoteNumber_key" ON "Proposal"("quoteNumber");
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");
CREATE INDEX "Proposal_createdAt_idx" ON "Proposal"("createdAt");
CREATE INDEX "Proposal_customerId_idx" ON "Proposal"("customerId");
CREATE INDEX "Proposal_customerId_status_idx" ON "Proposal"("customerId", "status");
CREATE INDEX "Proposal_projectId_status_idx" ON "Proposal"("projectId", "status");
CREATE INDEX "Proposal_isDeleted_idx" ON "Proposal"("isDeleted");
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
    "groupDescription" TEXT,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "vatRate" REAL NOT NULL DEFAULT 0.20,
    "priceIncludesVat" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "ProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProposalItem" ("basePrice", "brand", "currency", "discountRate", "groupDescription", "groupName", "id", "listPrice", "model", "name", "orderIndex", "priceIncludesVat", "productId", "profitMargin", "proposalId", "quantity", "unit", "vatRate") SELECT "basePrice", "brand", "currency", "discountRate", "groupDescription", "groupName", "id", "listPrice", "model", "name", "orderIndex", "priceIncludesVat", "productId", "profitMargin", "proposalId", "quantity", "unit", "vatRate" FROM "ProposalItem";
DROP TABLE "ProposalItem";
ALTER TABLE "new_ProposalItem" RENAME TO "ProposalItem";
CREATE INDEX "ProposalItem_isDeleted_idx" ON "ProposalItem"("isDeleted");
CREATE TABLE "new_PurchaseHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "date" DATETIME NOT NULL,
    "listPrice" REAL NOT NULL,
    "discountRate" REAL NOT NULL,
    "netPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "invoiceId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "PurchaseHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseHistory" ("currency", "date", "discountRate", "id", "invoiceId", "listPrice", "netPrice", "productId", "supplierId", "supplierName") SELECT "currency", "date", "discountRate", "id", "invoiceId", "listPrice", "netPrice", "productId", "supplierId", "supplierName" FROM "PurchaseHistory";
DROP TABLE "PurchaseHistory";
ALTER TABLE "new_PurchaseHistory" RENAME TO "PurchaseHistory";
CREATE INDEX "PurchaseHistory_isDeleted_idx" ON "PurchaseHistory"("isDeleted");
CREATE TABLE "new_Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Recipe" ("id", "productId") SELECT "id", "productId" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
CREATE UNIQUE INDEX "Recipe_productId_key" ON "Recipe"("productId");
CREATE INDEX "Recipe_isDeleted_idx" ON "Recipe"("isDeleted");
CREATE TABLE "new_RecipeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT,
    "cost" REAL NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RecipeItem" ("cost", "id", "itemId", "name", "orderIndex", "quantity", "recipeId", "type", "unit") SELECT "cost", "id", "itemId", "name", "orderIndex", "quantity", "recipeId", "type", "unit" FROM "RecipeItem";
DROP TABLE "RecipeItem";
ALTER TABLE "new_RecipeItem" RENAME TO "RecipeItem";
CREATE INDEX "RecipeItem_isDeleted_idx" ON "RecipeItem"("isDeleted");
CREATE TABLE "new_StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "referenceId" TEXT,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StockMovement" ("createdAt", "date", "description", "id", "productId", "projectId", "quantity", "referenceId", "type") SELECT "createdAt", "date", "description", "id", "productId", "projectId", "quantity", "referenceId", "type" FROM "StockMovement";
DROP TABLE "StockMovement";
ALTER TABLE "new_StockMovement" RENAME TO "StockMovement";
CREATE INDEX "StockMovement_isDeleted_idx" ON "StockMovement"("isDeleted");
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "balance" REAL NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_Supplier" ("address", "balance", "contactName", "email", "id", "name", "phone") SELECT "address", "balance", "contactName", "email", "id", "name", "phone" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
CREATE INDEX "Supplier_isDeleted_idx" ON "Supplier"("isDeleted");
CREATE TABLE "new_SupplierQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "SupplierQuote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SupplierQuote" ("date", "id", "proposalId", "supplierId", "supplierName") SELECT "date", "id", "proposalId", "supplierId", "supplierName" FROM "SupplierQuote";
DROP TABLE "SupplierQuote";
ALTER TABLE "new_SupplierQuote" RENAME TO "SupplierQuote";
CREATE INDEX "SupplierQuote_isDeleted_idx" ON "SupplierQuote"("isDeleted");
CREATE TABLE "new_SupplierQuoteItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierQuoteId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "SupplierQuoteItem_supplierQuoteId_fkey" FOREIGN KEY ("supplierQuoteId") REFERENCES "SupplierQuote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SupplierQuoteItem" ("currency", "id", "name", "price", "productId", "supplierQuoteId") SELECT "currency", "id", "name", "price", "productId", "supplierQuoteId" FROM "SupplierQuoteItem";
DROP TABLE "SupplierQuoteItem";
ALTER TABLE "new_SupplierQuoteItem" RENAME TO "SupplierQuoteItem";
CREATE INDEX "SupplierQuoteItem_isDeleted_idx" ON "SupplierQuoteItem"("isDeleted");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "SupplierTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SupplierTransaction" ("amount", "category", "createdAt", "date", "description", "id", "referenceId", "referenceType", "supplierId", "type") SELECT "amount", "category", "createdAt", "date", "description", "id", "referenceId", "referenceType", "supplierId", "type" FROM "SupplierTransaction";
DROP TABLE "SupplierTransaction";
ALTER TABLE "new_SupplierTransaction" RENAME TO "SupplierTransaction";
CREATE INDEX "SupplierTransaction_isDeleted_idx" ON "SupplierTransaction"("isDeleted");
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "items" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);
INSERT INTO "new_Template" ("createdAt", "description", "id", "items", "name") SELECT "createdAt", "description", "id", "items", "name" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
CREATE INDEX "Template_isDeleted_idx" ON "Template"("isDeleted");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
