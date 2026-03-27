-- AlterTable
ALTER TABLE "Tweet" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "replyCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Tweet_parentId_idx" ON "Tweet"("parentId");

-- AddForeignKey
ALTER TABLE "Tweet" ADD CONSTRAINT "Tweet_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tweet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
