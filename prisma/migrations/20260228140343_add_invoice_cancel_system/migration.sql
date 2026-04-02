-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "cancelType" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "cancelledModules" JSONB;
ALTER TABLE "Invoice" ADD COLUMN "deleteReason" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "deletedBy" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN "cancelReason" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "InvoiceItem" ADD COLUMN "invoiceDate" DATETIME;
ALTER TABLE "InvoiceItem" ADD COLUMN "netPrice" REAL;
ALTER TABLE "InvoiceItem" ADD COLUMN "supplierName" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_deletedAt_idx" ON "Invoice"("deletedAt");

-- CreateIndex
CREATE INDEX "InvoiceItem_deletedAt_idx" ON "InvoiceItem"("deletedAt");

-- CreateIndex
CREATE INDEX "InvoiceItem_cancelledAt_idx" ON "InvoiceItem"("cancelledAt");
