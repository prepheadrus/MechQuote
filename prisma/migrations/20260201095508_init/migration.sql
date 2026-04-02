-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "companyTitle" TEXT,
    "companySlogan" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "kapakAdi" TEXT,
    "altBaslik" TEXT,
    "adres" TEXT,
    "telefon" TEXT,
    "web" TEXT,
    "vergiDairesi" TEXT,
    "vergiNumarasi" TEXT,
    "bankAccounts" TEXT,
    "bankaHesaplari" TEXT,
    "defaultTermsAndConditions" TEXT,
    "defaultTerms" TEXT,
    "defaultVatRate" REAL NOT NULL DEFAULT 0.20,
    "monthlyTargetAmount" REAL,
    "currency" TEXT DEFAULT 'TRY'
);

-- CreateTable
CREATE TABLE "Customer" (
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
    "lastProposalDate" DATETIME
);

-- CreateTable
CREATE TABLE "Product" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT
);

-- CreateTable
CREATE TABLE "Personnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aktif',
    "dailyRate" REAL
);

-- CreateTable
CREATE TABLE "Proposal" (
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
    CONSTRAINT "Proposal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalItem" (
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
    CONSTRAINT "ProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "assignedAmount" REAL NOT NULL,
    "notes" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Ödenmedi',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentHistory" TEXT,
    CONSTRAINT "JobAssignment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobAssignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerInteraction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "recipeItems" TEXT NOT NULL,
    CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "items" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InstallationType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY'
);

-- CreateTable
CREATE TABLE "LaborCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "unit" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Invoice" (
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
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
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
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseHistory" (
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
    CONSTRAINT "PurchaseHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_quoteNumber_key" ON "Proposal"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_productId_key" ON "Recipe"("productId");
