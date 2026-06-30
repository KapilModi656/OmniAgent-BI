-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_fkey";

-- DropForeignKey
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_chatsId_fkey";

-- DropForeignKey
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_userId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetColumn" DROP CONSTRAINT "DatasetColumn_chatsId_fkey";

-- DropForeignKey
ALTER TABLE "EDAURLS" DROP CONSTRAINT "EDAURLS_datasetId_fkey";

-- DropForeignKey
ALTER TABLE "Prediction" DROP CONSTRAINT "Prediction_datasetId_fkey";

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_chatsId_fkey" FOREIGN KEY ("chatsId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EDAURLS" ADD CONSTRAINT "EDAURLS_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetColumn" ADD CONSTRAINT "DatasetColumn_chatsId_fkey" FOREIGN KEY ("chatsId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
