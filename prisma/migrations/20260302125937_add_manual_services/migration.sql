-- AlterTable
ALTER TABLE "ApiProvider" ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "cac_registrations" ADD COLUMN     "altBusinessName" TEXT,
ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "natureOfBusiness" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "residentialAddress" TEXT,
ADD COLUMN     "shareCapital" TEXT;

-- AlterTable
ALTER TABLE "cac_settings" ADD COLUMN     "charge2" DOUBLE PRECISION NOT NULL DEFAULT 15000,
ALTER COLUMN "charge" SET DEFAULT 5000;

-- CreateTable
CREATE TABLE "manual_service_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "serviceType" TEXT NOT NULL,
    "subType" TEXT,
    "details" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "adminNote" TEXT,
    "proofUrl" TEXT,
    "adminId" INTEGER,
    "transRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "manual_service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_service_settings" (
    "id" SERIAL NOT NULL,
    "bvnModificationPrice" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "bvnRetrievalPrice" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "vninNibssPrice" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "bvnAndroidPrice" DOUBLE PRECISION NOT NULL DEFAULT 3000,
    "ninModificationPrice" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "ninValidationPrice" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "bvnModificationActive" BOOLEAN NOT NULL DEFAULT true,
    "bvnRetrievalActive" BOOLEAN NOT NULL DEFAULT true,
    "vninNibssActive" BOOLEAN NOT NULL DEFAULT true,
    "bvnAndroidActive" BOOLEAN NOT NULL DEFAULT true,
    "ninModificationActive" BOOLEAN NOT NULL DEFAULT true,
    "ninValidationActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_service_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manual_service_requests_transRef_key" ON "manual_service_requests"("transRef");

-- AddForeignKey
ALTER TABLE "manual_service_requests" ADD CONSTRAINT "manual_service_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
