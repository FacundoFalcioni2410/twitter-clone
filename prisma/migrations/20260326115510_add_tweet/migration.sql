-- CreateTable
CREATE TABLE "Tweet" (
    "id" TEXT NOT NULL,
    "content" VARCHAR(280) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Tweet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tweet_authorId_idx" ON "Tweet"("authorId");

-- CreateIndex
CREATE INDEX "Tweet_createdAt_idx" ON "Tweet"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Tweet" ADD CONSTRAINT "Tweet_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
