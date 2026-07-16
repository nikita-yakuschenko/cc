-- AlterTable
ALTER TABLE "ShortLink" ADD COLUMN     "createdFromIpHash" TEXT,
ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ShortLink_createdFromIpHash_idx" ON "ShortLink"("createdFromIpHash");

-- CreateIndex
CREATE INDEX "ShortLink_isAnonymous_idx" ON "ShortLink"("isAnonymous");
