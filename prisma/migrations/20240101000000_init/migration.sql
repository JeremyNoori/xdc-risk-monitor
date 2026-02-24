-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('HIGH', 'MODERATE', 'LOW', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "RunStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "cmcCreditsUsed" INTEGER,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueSnapshot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "exchangeId" INTEGER NOT NULL,
    "exchangeName" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "volume24hUsd" DECIMAL(30,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReserveSnapshot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "exchangeId" INTEGER NOT NULL,
    "exchangeName" TEXT NOT NULL,
    "reserveXdc" DECIMAL(30,8),
    "reserveUsd" DECIMAL(30,8),
    "coverageRatio" DECIMAL(20,8),
    "riskTier" "RiskTier" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReserveSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PairSnapshot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "exchangeId" INTEGER NOT NULL,
    "marketPair" TEXT NOT NULL,
    "volume24hUsd" DECIMAL(30,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PairSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Run_startedAt_idx" ON "Run"("startedAt");

-- CreateIndex
CREATE INDEX "VenueSnapshot_exchangeId_createdAt_idx" ON "VenueSnapshot"("exchangeId", "createdAt");

-- CreateIndex
CREATE INDEX "VenueSnapshot_runId_idx" ON "VenueSnapshot"("runId");

-- CreateIndex
CREATE INDEX "ReserveSnapshot_exchangeId_createdAt_idx" ON "ReserveSnapshot"("exchangeId", "createdAt");

-- CreateIndex
CREATE INDEX "ReserveSnapshot_runId_idx" ON "ReserveSnapshot"("runId");

-- CreateIndex
CREATE INDEX "PairSnapshot_exchangeId_createdAt_idx" ON "PairSnapshot"("exchangeId", "createdAt");

-- CreateIndex
CREATE INDEX "PairSnapshot_runId_idx" ON "PairSnapshot"("runId");

-- AddForeignKey
ALTER TABLE "VenueSnapshot" ADD CONSTRAINT "VenueSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReserveSnapshot" ADD CONSTRAINT "ReserveSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairSnapshot" ADD CONSTRAINT "PairSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
