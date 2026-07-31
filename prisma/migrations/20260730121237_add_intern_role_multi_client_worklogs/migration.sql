-- AlterEnum
ALTER TYPE "SystemRole" ADD VALUE 'INTERN';

-- AlterTable
ALTER TABLE "WorkLogItem" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE INDEX "WorkLogItem_clientId_idx" ON "WorkLogItem"("clientId");

-- AddForeignKey
ALTER TABLE "WorkLogItem" ADD CONSTRAINT "WorkLogItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
