-- CreateTable
CREATE TABLE "Feedback" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Feedback_invoiceItemName_idx" ON "Feedback"("invoiceItemName");

-- CreateIndex
CREATE INDEX "Feedback_productId_idx" ON "Feedback"("productId");

-- CreateIndex
CREATE INDEX "Feedback_type_idx" ON "Feedback"("type");

-- CreateIndex
CREATE INDEX "Feedback_invoiceItemName_productId_idx" ON "Feedback"("invoiceItemName", "productId");
