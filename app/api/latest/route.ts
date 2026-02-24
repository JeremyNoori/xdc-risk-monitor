import { NextResponse } from "next/server";
import { MOCK_RUN, MOCK_VENUES } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function fetchFromDb() {
  const { prisma } = await import("@/lib/prisma");

  const run = await prisma.run.findFirst({
    where: { status: { in: ["SUCCESS", "PARTIAL"] } },
    orderBy: { startedAt: "desc" },
  });

  if (!run) return null;

  const [venues, reserves] = await Promise.all([
    prisma.venueSnapshot.findMany({
      where: { runId: run.id },
      orderBy: { rank: "asc" },
    }),
    prisma.reserveSnapshot.findMany({
      where: { runId: run.id },
      orderBy: { exchangeId: "asc" },
    }),
  ]);

  const reserveMap = new Map(reserves.map((r) => [r.exchangeId, r]));

  const rows = venues.map((v) => {
    const r = reserveMap.get(v.exchangeId);
    return {
      rank: v.rank,
      exchangeId: v.exchangeId,
      exchangeName: v.exchangeName,
      volume24hUsd: Number(v.volume24hUsd),
      reserveXdc: r?.reserveXdc ? Number(r.reserveXdc) : null,
      reserveUsd: r?.reserveUsd ? Number(r.reserveUsd) : null,
      coverageRatio: r?.coverageRatio ? Number(r.coverageRatio) : null,
      riskTier: r?.riskTier ?? "UNKNOWN",
      lastChecked: v.createdAt.toISOString(),
    };
  });

  return {
    run: {
      id: run.id,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      status: run.status,
    },
    venues: rows,
  };
}

export async function GET() {
  // Try real DB first
  if (process.env.DATABASE_URL) {
    try {
      const data = await fetchFromDb();
      if (data) return NextResponse.json(data);
    } catch {
      // DB unreachable — fall through to mock
    }
  }

  // Fallback: demo data
  return NextResponse.json({
    run: MOCK_RUN,
    venues: MOCK_VENUES,
    _demo: true,
  });
}
