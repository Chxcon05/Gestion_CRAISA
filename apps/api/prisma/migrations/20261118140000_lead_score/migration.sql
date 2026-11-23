-- AlterTable
ALTER TABLE "leads" ADD COLUMN "score" INTEGER;

-- CreateIndex
CREATE INDEX "leads_score_idx" ON "leads"("score");
