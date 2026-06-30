-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelUrl" TEXT,
    "preprocessorUrl" TEXT,
    "trainingUrl" TEXT,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chatsId" INTEGER NOT NULL,
    "datasetUrl" TEXT NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EDAURLS" (
    "id" SERIAL NOT NULL,
    "datasetId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "EDAURLS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetColumn" (
    "id" SERIAL NOT NULL,
    "chatsId" INTEGER NOT NULL,
    "columnName" TEXT NOT NULL,
    "columnType" TEXT NOT NULL,

    CONSTRAINT "DatasetColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" SERIAL NOT NULL,
    "datasetId" INTEGER NOT NULL,
    "predictionUrl" TEXT,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_datasetId_key" ON "Prediction"("datasetId");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_chatsId_fkey" FOREIGN KEY ("chatsId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EDAURLS" ADD CONSTRAINT "EDAURLS_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetColumn" ADD CONSTRAINT "DatasetColumn_chatsId_fkey" FOREIGN KEY ("chatsId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
