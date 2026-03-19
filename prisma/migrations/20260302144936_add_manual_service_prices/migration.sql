-- CreateTable
CREATE TABLE "manual_service_prices" (
    "id" SERIAL NOT NULL,
    "serviceType" TEXT NOT NULL,
    "subType" TEXT,
    "userPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agentPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vendorPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manual_service_prices_serviceType_subType_key" ON "manual_service_prices"("serviceType", "subType");
