-- AlterTable
ALTER TABLE "leads" ADD COLUMN "contactRef" TEXT;

-- CreateIndex
CREATE INDEX "leads_contactRef_idx" ON "leads"("contactRef");
