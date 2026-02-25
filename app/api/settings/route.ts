import { NextRequest, NextResponse } from "next/server";
import {
  getAllSettings,
  saveSetting,
  deleteSetting,
  SETTING_KEYS,
  type SettingKey,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Check admin auth — accepts bearer token or query param for simple access. */
async function isAuthorized(req: NextRequest): Promise<boolean> {
  // First check env var
  let adminToken = process.env.ADMIN_TOKEN;

  // If not in env, try DB
  if (!adminToken) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const row = await prisma.setting.findUnique({
        where: { key: "ADMIN_TOKEN" },
      });
      adminToken = row?.value ?? undefined;
    } catch {
      // DB not available
    }
  }

  // If no admin token is configured anywhere, allow access (first-time setup)
  if (!adminToken) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme === "Bearer" && token === adminToken) return true;
  }

  // Also accept token as query param for browser access
  const queryToken = req.nextUrl.searchParams.get("token");
  if (queryToken === adminToken) return true;

  return false;
}

export async function GET(_req: NextRequest) {
  try {
    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch {
    // DB not available — return env-only status
    const settings: Record<
      string,
      { configured: boolean; source: string }
    > = {};
    for (const key of SETTING_KEYS) {
      settings[key] = {
        configured: !!process.env[key],
        source: process.env[key] ? "env" : "none",
      };
    }
    settings["DATABASE_URL"] = {
      configured: !!process.env.DATABASE_URL,
      source: process.env.DATABASE_URL ? "env" : "none",
    };
    return NextResponse.json({ settings, _dbUnavailable: true });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL must be set as an environment variable first" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { key, value } = body as { key: string; value: string };

  if (!SETTING_KEYS.includes(key as SettingKey)) {
    return NextResponse.json(
      { error: `Invalid key. Allowed: ${SETTING_KEYS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    if (value) {
      await saveSetting(key as SettingKey, value);
    } else {
      await deleteSetting(key as SettingKey);
    }
    return NextResponse.json({ ok: true, key, saved: !!value });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 500 }
    );
  }
}
