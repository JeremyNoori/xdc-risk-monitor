import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Vercel function timeout (seconds)

/* ── Simple in-memory rate limiter ── */
let lastRunStarted = 0;
const MIN_INTERVAL_MS = 60_000; // 1 minute minimum between runs

async function verifyAdminToken(req: NextRequest): Promise<boolean> {
  // Check env var first, then DB
  let adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const row = await prisma.setting.findUnique({ where: { key: "ADMIN_TOKEN" } });
      adminToken = row?.value ?? undefined;
    } catch {
      // DB not available
    }
  }
  if (!adminToken) return false;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(" ");
  return scheme === "Bearer" && token === adminToken;
}

export async function POST(req: NextRequest) {
  // Auth check
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Rate limit check
  const now = Date.now();
  if (now - lastRunStarted < MIN_INTERVAL_MS) {
    return NextResponse.json(
      {
        error: "Rate limited — try again later",
        retryAfterMs: MIN_INTERVAL_MS - (now - lastRunStarted),
      },
      { status: 429 }
    );
  }
  lastRunStarted = now;

  // Run ingestion
  const result = await runIngestion();

  const httpStatus = result.status === "FAILED" ? 500 : 200;
  return NextResponse.json(result, { status: httpStatus });
}
