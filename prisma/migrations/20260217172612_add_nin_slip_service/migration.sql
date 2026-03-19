/*
  Warnings:

  - You are about to drop the column `address` on the `nin_reports` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `nin_reports` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `nin_reports` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `nin_reports` table. All the data in the column will be lost.
  - You are about to drop the column `lga` on the `nin_reports` table. All the data in the column will be lost.
  - You are about to drop the column `mobileNumber` on the `nin_reports` table. All the data in the column will be lost.
  - You are about to drop the column `signature` on the `nin_reports` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `nin_reports` table. All the data in the column will be lost.
  - You are about to drop the column `ninAgentPrice` on the `verification_settings` table. All the data in the column will be lost.
  - You are about to drop the column `ninApiKey` on the `verification_settings` table. All the data in the column will be lost.
  - You are about to drop the column `ninApiPrice` on the `verification_settings` table. All the data in the column will be lost.
  - You are about to drop the column `ninUserPrice` on the `verification_settings` table. All the data in the column will be lost.
  - You are about to drop the column `ninVendorPrice` on the `verification_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "nin_reports" DROP COLUMN "address",
DROP COLUMN "email",
DROP COLUMN "image",
DROP COLUMN "lastName",
DROP COLUMN "lga",
DROP COLUMN "mobileNumber",
DROP COLUMN "signature",
DROP COLUMN "state",
ADD COLUMN     "base64Photo" TEXT,
ADD COLUMN     "residenceAddress" TEXT,
ADD COLUMN     "residenceLga" TEXT,
ADD COLUMN     "residenceState" TEXT,
ADD COLUMN     "surname" TEXT,
ALTER COLUMN "slipType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "verification_settings" DROP COLUMN "ninAgentPrice",
DROP COLUMN "ninApiKey",
DROP COLUMN "ninApiPrice",
DROP COLUMN "ninUserPrice",
DROP COLUMN "ninVendorPrice",
ADD COLUMN     "ninActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ninPremiumAgentPrice" DOUBLE PRECISION NOT NULL DEFAULT 190,
ADD COLUMN     "ninPremiumApiPrice" DOUBLE PRECISION NOT NULL DEFAULT 150,
ADD COLUMN     "ninPremiumUserPrice" DOUBLE PRECISION NOT NULL DEFAULT 200,
ADD COLUMN     "ninPremiumVendorPrice" DOUBLE PRECISION NOT NULL DEFAULT 180,
ADD COLUMN     "ninRegularAgentPrice" DOUBLE PRECISION NOT NULL DEFAULT 140,
ADD COLUMN     "ninRegularApiPrice" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "ninRegularUserPrice" DOUBLE PRECISION NOT NULL DEFAULT 150,
ADD COLUMN     "ninRegularVendorPrice" DOUBLE PRECISION NOT NULL DEFAULT 130,
ADD COLUMN     "ninStandardAgentPrice" DOUBLE PRECISION NOT NULL DEFAULT 190,
ADD COLUMN     "ninStandardApiPrice" DOUBLE PRECISION NOT NULL DEFAULT 150,
ADD COLUMN     "ninStandardUserPrice" DOUBLE PRECISION NOT NULL DEFAULT 200,
ADD COLUMN     "ninStandardVendorPrice" DOUBLE PRECISION NOT NULL DEFAULT 180;
