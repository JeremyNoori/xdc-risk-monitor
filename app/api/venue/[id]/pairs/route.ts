import { NextRequest, NextResponse } from "next/server";
import { MOCK_PAIRS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function fetchFromDb(exchangeId: number) {
  const { prisma } = await import("@/lib/prisma");

  const latestRun = await prisma.run.findFirst({
    where: { status: { in: ["SUCCESS", "PARTIAL"] } },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  if (!latestRun) return null;

  const pairs = await prisma.pairSnapshot.findMany({
    where: { runId: latestRun.id, exchangeId },
    orderBy: { volume24hUsd: "desc" },
  });

  return {
    exchangeId,
    runId: latestRun.id,
    pairs: pairs.map((p) => ({
      marketPair: p.marketPair,
      volume24hUsd: Number(p.volume24hUsd),
    })),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const exchangeId = parseInt(params.id, 10);
  if (isNaN(exchangeId)) {
    return NextResponse.json({ error: "Invalid exchange id" }, { status: 400 });
  }

  // Try real DB first
  if (process.env.DATABASE_URL) {
    try {
      const data = await fetchFromDb(exchangeId);
      if (data) return NextResponse.json(data);
    } catch {
      // fall through to mock
    }
  }

  // Fallback: demo data
  const mockPairs = MOCK_PAIRS[exchangeId] ?? [
    { marketPair: "XDC/USDT", volume24hUsd: 0 },
  ];

  return NextResponse.json({
    exchangeId,
    runId: "demo_run_001",
    pairs: mockPairs,
    _demo: true,
  });
}
