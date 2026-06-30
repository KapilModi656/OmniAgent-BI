/*
  Warnings:

  - You are about to drop the column `modelUrl` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `preprocessorUrl` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the `EDAURLS` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EDAURLS" DROP CONSTRAINT "EDAURLS_datasetId_fkey";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "modelUrl",
DROP COLUMN "preprocessorUrl",
ADD COLUMN     "pipelineUrl" TEXT;

-- DropTable
DROP TABLE "EDAURLS";

-- CreateTable
CREATE TABLE "EdaUrls" (
    "id" SERIAL NOT NULL,
    "datasetId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "EdaUrls_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EdaUrls" ADD CONSTRAINT "EdaUrls_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
