-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "state" TEXT,
    "type" INTEGER NOT NULL DEFAULT 1,
    "apiKey" TEXT,
    "referral" TEXT,
    "referralCode" TEXT NOT NULL,
    "referredBy" TEXT,
    "pin" TEXT,
    "pinStatus" INTEGER NOT NULL DEFAULT 0,
    "wallet" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "refWallet" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "regStatus" INTEGER NOT NULL DEFAULT 0,
    "verCode" INTEGER,
    "airtimeLimit" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "accountLimit" DOUBLE PRECISION NOT NULL DEFAULT 500000,
    "transactionPin" TEXT,
    "pinEnabled" BOOLEAN NOT NULL DEFAULT false,
    "kycStatus" BOOLEAN NOT NULL DEFAULT false,
    "nin" TEXT,
    "bvn" TEXT,
    "bankName" TEXT,
    "bankNo" TEXT,
    "rolexBank" TEXT,
    "sterlingBank" TEXT,
    "fidelityBank" TEXT,
    "gtBank" TEXT,
    "accountReference" TEXT,
    "palmpayAccount" TEXT,
    "psb9Account" TEXT,
    "banklyAccount" TEXT,
    "safehavenAccount" TEXT,
    "providusAccount" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastVisit" TIMESTAMP(3),
    "visitCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" INTEGER NOT NULL,
    "pinToken" TEXT,
    "pinStatus" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLogin" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualAccount" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT,
    "bankName" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirtualAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" INTEGER NOT NULL,
    "oldBalance" DOUBLE PRECISION NOT NULL,
    "newBalance" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "type" TEXT NOT NULL DEFAULT 'utility',
    "pinId" INTEGER,
    "pinContent" TEXT,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiProvider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "apiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "apiToken" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "agentPrice" DOUBLE PRECISION,
    "vendorPrice" DOUBLE PRECISION,
    "apiPrice" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "apiProviderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pin" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "serialNumber" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "soldTo" INTEGER,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirtimeToCash" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "network" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receiveAmount" DOUBLE PRECISION NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "adminNote" TEXT,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirtimeToCash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "adminNote" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookConfig" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payload" TEXT,
    "statusCode" INTEGER,
    "response" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkJob" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "successful" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultUrl" TEXT,
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "network" TEXT,
    "service" TEXT,
    "meterNo" TEXT,
    "smartCardMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_stat_cache" (
    "id" SERIAL NOT NULL,
    "userWalletTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agentWalletTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vendorWalletTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralWalletTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSubscribers" INTEGER NOT NULL DEFAULT 0,
    "totalAgents" INTEGER NOT NULL DEFAULT 0,
    "totalVendors" INTEGER NOT NULL DEFAULT 0,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "dailyVisits" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_stat_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_actions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "adminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_plans" (
    "id" SERIAL NOT NULL,
    "network" TEXT NOT NULL,
    "dataName" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "userPrice" DOUBLE PRECISION NOT NULL,
    "agentPrice" DOUBLE PRECISION NOT NULL,
    "vendorPrice" DOUBLE PRECISION NOT NULL,
    "apiPrice" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiProviderId" INTEGER,

    CONSTRAINT "data_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cable_plans" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "userPrice" DOUBLE PRECISION NOT NULL,
    "agentPrice" DOUBLE PRECISION NOT NULL,
    "vendorPrice" DOUBLE PRECISION NOT NULL,
    "apiPrice" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiProviderId" INTEGER,

    CONSTRAINT "cable_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electricity_providers" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electricity_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airtime_pin_stocks" (
    "id" SERIAL NOT NULL,
    "network" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "pin" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "airtime_pin_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_pin_stocks" (
    "id" SERIAL NOT NULL,
    "network" TEXT NOT NULL,
    "dataName" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_pin_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_status_updates" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "oldStatus" INTEGER NOT NULL,
    "newStatus" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "reason" TEXT,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_status_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateways" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "secretKey" TEXT,
    "businessId" TEXT,
    "contractCode" TEXT,
    "apiSecret" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_gateways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_configurations" (
    "id" SERIAL NOT NULL,
    "network" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "smeDataEnabled" BOOLEAN NOT NULL DEFAULT true,
    "giftingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "corporateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "couponEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vtuEnabled" BOOLEAN NOT NULL DEFAULT true,
    "shareSellEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "network_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklisted_numbers" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT,
    "adminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklisted_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_wallets" (
    "id" SERIAL NOT NULL,
    "apiProviderId" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowBalanceAlert" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airtime_to_cash_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "network" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "convertedAmount" DOUBLE PRECISION NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "proof" TEXT,
    "adminId" INTEGER,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "airtime_to_cash_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airtime_to_cash_rates" (
    "id" SERIAL NOT NULL,
    "network" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airtime_to_cash_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alpha_topup_rates" (
    "id" SERIAL NOT NULL,
    "userRate" DOUBLE PRECISION NOT NULL,
    "agentRate" DOUBLE PRECISION NOT NULL,
    "vendorRate" DOUBLE PRECISION NOT NULL,
    "buyingRate" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alpha_topup_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alpha_topup_orders" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "proof" TEXT,
    "adminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "alpha_topup_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_pins" (
    "id" SERIAL NOT NULL,
    "examType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "userPrice" DOUBLE PRECISION NOT NULL,
    "agentPrice" DOUBLE PRECISION NOT NULL,
    "vendorPrice" DOUBLE PRECISION NOT NULL,
    "apiPrice" DOUBLE PRECISION NOT NULL,
    "apiProviderId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cac_registrations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "documents" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "charge" DOUBLE PRECISION NOT NULL,
    "adminId" INTEGER,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "cac_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cac_settings" (
    "id" SERIAL NOT NULL,
    "charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cac_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "adminId" INTEGER,
    "reply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smile_plans" (
    "id" SERIAL NOT NULL,
    "planName" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "dataSize" TEXT NOT NULL,
    "userPrice" DOUBLE PRECISION NOT NULL,
    "agentPrice" DOUBLE PRECISION NOT NULL,
    "vendorPrice" DOUBLE PRECISION NOT NULL,
    "apiPrice" DOUBLE PRECISION NOT NULL,
    "apiProviderId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smile_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_configs" (
    "id" SERIAL NOT NULL,
    "airtimeToCashNumbers" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_settings" (
    "id" SERIAL NOT NULL,
    "apiKey" TEXT,
    "ninApiKey" TEXT,
    "appId" TEXT,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://api.prembly.com/identitypass/verification',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "bvnUserPrice" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "bvnAgentPrice" DOUBLE PRECISION NOT NULL DEFAULT 450,
    "bvnVendorPrice" DOUBLE PRECISION NOT NULL DEFAULT 400,
    "bvnApiPrice" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "ninUserPrice" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "ninAgentPrice" DOUBLE PRECISION NOT NULL DEFAULT 450,
    "ninVendorPrice" DOUBLE PRECISION NOT NULL DEFAULT 400,
    "ninApiPrice" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bvn_reports" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "bvnNumber" TEXT NOT NULL,
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TEXT,
    "gender" TEXT,
    "maritalStatus" TEXT,
    "phoneNumber" TEXT,
    "nin" TEXT,
    "enrollmentBank" TEXT,
    "enrollmentBranch" TEXT,
    "stateOfOrigin" TEXT,
    "lgaOfOrigin" TEXT,
    "stateOfResidence" TEXT,
    "lgaOfResidence" TEXT,
    "residentialAddress" TEXT,
    "base64Image" TEXT,
    "rawResponse" TEXT,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bvn_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nin_reports" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "ninNumber" TEXT NOT NULL,
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TEXT,
    "gender" TEXT,
    "trackingId" TEXT,
    "mobileNumber" TEXT,
    "email" TEXT,
    "address" TEXT,
    "state" TEXT,
    "lga" TEXT,
    "image" TEXT,
    "signature" TEXT,
    "rawResponse" TEXT,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "slipType" TEXT NOT NULL DEFAULT 'regular',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nin_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserLogin_token_key" ON "UserLogin"("token");

-- CreateIndex
CREATE INDEX "UserLogin_userId_idx" ON "UserLogin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ApiProvider_name_key" ON "ApiProvider"("name");

-- CreateIndex
CREATE INDEX "Service_type_provider_idx" ON "Service"("type", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_reference_key" ON "ServiceRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookConfig_userId_key" ON "WebhookConfig"("userId");

-- CreateIndex
CREATE INDEX "WebhookLog_userId_createdAt_idx" ON "WebhookLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_userId_createdAt_idx" ON "ApiLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_createdAt_idx" ON "ApiLog"("createdAt");

-- CreateIndex
CREATE INDEX "BulkJob_userId_status_idx" ON "BulkJob"("userId", "status");

-- CreateIndex
CREATE INDEX "BulkJob_createdAt_idx" ON "BulkJob"("createdAt");

-- CreateIndex
CREATE INDEX "Beneficiary_userId_idx" ON "Beneficiary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "electricity_providers_provider_key" ON "electricity_providers"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "airtime_pin_stocks_pin_key" ON "airtime_pin_stocks"("pin");

-- CreateIndex
CREATE UNIQUE INDEX "data_pin_stocks_pin_key" ON "data_pin_stocks"("pin");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateways_provider_key" ON "payment_gateways"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "network_configurations_network_key" ON "network_configurations"("network");

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_numbers_phone_key" ON "blacklisted_numbers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "airtime_to_cash_rates_network_key" ON "airtime_to_cash_rates"("network");

-- CreateIndex
CREATE UNIQUE INDEX "bvn_reports_transactionRef_key" ON "bvn_reports"("transactionRef");

-- CreateIndex
CREATE UNIQUE INDEX "nin_reports_transactionRef_key" ON "nin_reports"("transactionRef");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogin" ADD CONSTRAINT "UserLogin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualAccount" ADD CONSTRAINT "VirtualAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_apiProviderId_fkey" FOREIGN KEY ("apiProviderId") REFERENCES "ApiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pin" ADD CONSTRAINT "Pin_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pin" ADD CONSTRAINT "Pin_soldTo_fkey" FOREIGN KEY ("soldTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirtimeToCash" ADD CONSTRAINT "AirtimeToCash_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookConfig" ADD CONSTRAINT "WebhookConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkJob" ADD CONSTRAINT "BulkJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_actions" ADD CONSTRAINT "user_actions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_actions" ADD CONSTRAINT "user_actions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_plans" ADD CONSTRAINT "data_plans_apiProviderId_fkey" FOREIGN KEY ("apiProviderId") REFERENCES "ApiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cable_plans" ADD CONSTRAINT "cable_plans_apiProviderId_fkey" FOREIGN KEY ("apiProviderId") REFERENCES "ApiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airtime_pin_stocks" ADD CONSTRAINT "airtime_pin_stocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_pin_stocks" ADD CONSTRAINT "data_pin_stocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_status_updates" ADD CONSTRAINT "transaction_status_updates_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_status_updates" ADD CONSTRAINT "transaction_status_updates_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklisted_numbers" ADD CONSTRAINT "blacklisted_numbers_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_wallets" ADD CONSTRAINT "api_wallets_apiProviderId_fkey" FOREIGN KEY ("apiProviderId") REFERENCES "ApiProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airtime_to_cash_requests" ADD CONSTRAINT "airtime_to_cash_requests_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airtime_to_cash_requests" ADD CONSTRAINT "airtime_to_cash_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alpha_topup_orders" ADD CONSTRAINT "alpha_topup_orders_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alpha_topup_orders" ADD CONSTRAINT "alpha_topup_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_pins" ADD CONSTRAINT "exam_pins_apiProviderId_fkey" FOREIGN KEY ("apiProviderId") REFERENCES "ApiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cac_registrations" ADD CONSTRAINT "cac_registrations_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cac_registrations" ADD CONSTRAINT "cac_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smile_plans" ADD CONSTRAINT "smile_plans_apiProviderId_fkey" FOREIGN KEY ("apiProviderId") REFERENCES "ApiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bvn_reports" ADD CONSTRAINT "bvn_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nin_reports" ADD CONSTRAINT "nin_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
