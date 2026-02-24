import { prisma } from "@/lib/prisma";
import {
  getXdcId,
  fetchMarketPairs,
  fetchXdcPrice,
  fetchExchangeAssets,
} from "@/lib/cmc";
import type {
  AggregatedVenue,
  VenueRisk,
  CmcMarketPairsData,
} from "@/lib/cmc";
import { Prisma, RiskTier, RunStatus } from "@prisma/client";

const TOP_N = 20;

/* ──────────────────────────────────────────────
   Pure computation helpers
   ────────────────────────────────────────────── */

/** Aggregate market pairs by exchange and sum volume. */
export function computeTopVenues(
  data: CmcMarketPairsData,
  topN = TOP_N
): AggregatedVenue[] {
  const byExchange = new Map<number, AggregatedVenue>();

  for (const mp of data.market_pairs) {
    const vol = mp.quote?.USD?.volume_24h ?? 0;
    const existing = byExchange.get(mp.exchange.id);
    if (existing) {
      existing.volume24hUsd += vol;
      existing.pairs.push({ marketPair: mp.market_pair, volume24hUsd: vol });
    } else {
      byExchange.set(mp.exchange.id, {
        exchangeId: mp.exchange.id,
        exchangeName: mp.exchange.name,
        volume24hUsd: vol,
        pairs: [{ marketPair: mp.market_pair, volume24hUsd: vol }],
      });
    }
  }

  return Array.from(byExchange.values())
    .sort((a, b) => b.volume24hUsd - a.volume24hUsd)
    .slice(0, topN);
}

/** Determine risk tier from coverage ratio. */
export function computeRiskTier(
  coverageRatio: number | null
): RiskTier {
  if (coverageRatio === null) return RiskTier.UNKNOWN;
  if (coverageRatio < 0.5) return RiskTier.HIGH;
  if (coverageRatio < 1.0) return RiskTier.MODERATE;
  return RiskTier.LOW;
}

/* ──────────────────────────────────────────────
   Main ingestion orchestrator
   ────────────────────────────────────────────── */

export interface IngestResult {
  runId: string;
  status: RunStatus;
  venueCount: number;
  errorMessage?: string;
}

export async function runIngestion(): Promise<IngestResult> {
  const run = await prisma.run.create({
    data: { status: RunStatus.SUCCESS },
  });

  let creditsUsed = 0;
  let partialFailure = false;

  try {
    // 1. Resolve XDC id
    const xdcId = await getXdcId();

    // 2. Fetch market pairs + XDC price in parallel
    const [marketPairsData, xdcPrice] = await Promise.all([
      fetchMarketPairs(xdcId),
      fetchXdcPrice(xdcId),
    ]);

    // 3. Compute top venues
    const topVenues = computeTopVenues(marketPairsData);

    // 4. For each venue, fetch reserves and compute risk
    const venueRisks: VenueRisk[] = [];

    for (let i = 0; i < topVenues.length; i++) {
      const venue = topVenues[i];
      let reserveXdc: number | null = null;
      let reserveUsd: number | null = null;
      let coverageRatio: number | null = null;
      let riskTier: RiskTier = RiskTier.UNKNOWN;

      try {
        const assets = await fetchExchangeAssets(venue.exchangeId);
        if (assets) {
          // Look for XDC in assets list
          const xdcAsset = assets.find(
            (a) =>
              a.currency?.symbol === "XDC" ||
              a.platform?.symbol === "XDC"
          );
          if (xdcAsset) {
            reserveXdc = xdcAsset.balance;
            reserveUsd = reserveXdc * xdcPrice;
            if (venue.volume24hUsd > 0) {
              coverageRatio = reserveUsd / venue.volume24hUsd;
            }
            riskTier = computeRiskTier(coverageRatio);
          }
          // else: XDC not found in assets → UNKNOWN
        }
        // else: endpoint failed → UNKNOWN
      } catch {
        // Non-fatal: mark UNKNOWN and continue
        partialFailure = true;
      }

      venueRisks.push({
        exchangeId: venue.exchangeId,
        exchangeName: venue.exchangeName,
        rank: i + 1,
        volume24hUsd: venue.volume24hUsd,
        reserveXdc,
        reserveUsd,
        coverageRatio,
        riskTier,
        pairs: venue.pairs,
      });
    }

    // 5. Persist everything in a single transaction
    await prisma.$transaction(async (tx) => {
      // Venue snapshots
      await tx.venueSnapshot.createMany({
        data: venueRisks.map((v) => ({
          runId: run.id,
          exchangeId: v.exchangeId,
          exchangeName: v.exchangeName,
          rank: v.rank,
          volume24hUsd: new Prisma.Decimal(v.volume24hUsd.toFixed(8)),
        })),
      });

      // Reserve snapshots
      await tx.reserveSnapshot.createMany({
        data: venueRisks.map((v) => ({
          runId: run.id,
          exchangeId: v.exchangeId,
          exchangeName: v.exchangeName,
          reserveXdc:
            v.reserveXdc !== null
              ? new Prisma.Decimal(v.reserveXdc.toFixed(8))
              : null,
          reserveUsd:
            v.reserveUsd !== null
              ? new Prisma.Decimal(v.reserveUsd.toFixed(8))
              : null,
          coverageRatio:
            v.coverageRatio !== null
              ? new Prisma.Decimal(v.coverageRatio.toFixed(8))
              : null,
          riskTier: v.riskTier,
        })),
      });

      // Pair snapshots
      const pairRows = venueRisks.flatMap((v) =>
        v.pairs.map((p) => ({
          runId: run.id,
          exchangeId: v.exchangeId,
          marketPair: p.marketPair,
          volume24hUsd: new Prisma.Decimal(p.volume24hUsd.toFixed(8)),
        }))
      );
      if (pairRows.length > 0) {
        await tx.pairSnapshot.createMany({ data: pairRows });
      }

      // Update run record
      await tx.run.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          status: partialFailure ? RunStatus.PARTIAL : RunStatus.SUCCESS,
          cmcCreditsUsed: creditsUsed > 0 ? creditsUsed : null,
        },
      });
    });

    return {
      runId: run.id,
      status: partialFailure ? RunStatus.PARTIAL : RunStatus.SUCCESS,
      venueCount: venueRisks.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.run.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: RunStatus.FAILED,
        errorMessage: msg.slice(0, 2000),
      },
    });
    return {
      runId: run.id,
      status: RunStatus.FAILED,
      venueCount: 0,
      errorMessage: msg,
    };
  }
}
