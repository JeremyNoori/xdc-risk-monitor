import { NextRequest, NextResponse } from "next/server";
import { generateMockHistory } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function fetchFromDb(exchangeId: number, days: number) {
  const { prisma } = await import("@/lib/prisma");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [volumes, reserves] = await Promise.all([
    prisma.venueSnapshot.findMany({
      where: { exchangeId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { volume24hUsd: true, createdAt: true, rank: true },
    }),
    prisma.reserveSnapshot.findMany({
      where: { exchangeId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: {
        reserveXdc: true,
        reserveUsd: true,
        coverageRatio: true,
        riskTier: true,
        createdAt: true,
      },
    }),
  ]);

  if (volumes.length === 0) return null;

  // Index reserves by their ISO timestamp so we can join without relying on
  // array position (the two queries may return different numbers of rows).
  const reserveByTime = new Map(
    reserves.map((r) => [r.createdAt.toISOString(), r])
  );

  return volumes.map((v) => {
    const r = reserveByTime.get(v.createdAt.toISOString());
    return {
      date: v.createdAt.toISOString(),
      rank: v.rank,
      volume24hUsd: Number(v.volume24hUsd),
      reserveXdc: r?.reserveXdc ? Number(r.reserveXdc) : null,
      reserveUsd: r?.reserveUsd ? Number(r.reserveUsd) : null,
      coverageRatio: r?.coverageRatio ? Number(r.coverageRatio) : null,
      riskTier: r?.riskTier ?? "UNKNOWN",
    };
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const exchangeId = parseInt(params.id, 10);
  if (isNaN(exchangeId)) {
    return NextResponse.json({ error: "Invalid exchange id" }, { status: 400 });
  }

  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam ? Math.min(parseInt(daysParam, 10) || 7, 90) : 7;

  // Try real DB first
  if (process.env.DATABASE_URL) {
    try {
      const history = await fetchFromDb(exchangeId, days);
      if (history) {
        return NextResponse.json({ exchangeId, days, history });
      }
    } catch {
      // fall through to mock
    }
  }

  // Fallback: demo data
  return NextResponse.json({
    exchangeId,
    days,
    history: generateMockHistory(exchangeId, days),
    _demo: true,
  });
}
