-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attachments_interactionId_idx" ON "attachments"("interactionId");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
