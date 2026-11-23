-- AlterEnum
ALTER TYPE "InteractionType" ADD VALUE 'MENSAJE';

-- AlterTable
ALTER TABLE "interactions" ADD COLUMN     "externalRef" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "whatsapp" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "interactions_externalRef_key" ON "interactions"("externalRef");
