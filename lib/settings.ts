/**
 * Read app settings from the database, falling back to env vars.
 * Keys stored in the Setting table override env vars.
 */

import { prisma } from "@/lib/prisma";

export const SETTING_KEYS = [
  "CMC_API_KEY",
  "ADMIN_TOKEN",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/** Get a single setting value. DB takes priority, then env var. */
export async function getSetting(key: SettingKey): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (row?.value) return row.value;
  } catch {
    // DB not available — fall through to env
  }
  return process.env[key] ?? null;
}

/** Get all settings as a map. Values are masked for safe display. */
export async function getAllSettings(): Promise<
  Record<string, { configured: boolean; source: "database" | "env" | "none" }>
> {
  const result: Record<
    string,
    { configured: boolean; source: "database" | "env" | "none" }
  > = {};

  let dbSettings: Map<string, string> = new Map();
  try {
    const rows = await prisma.setting.findMany();
    dbSettings = new Map(rows.map((r) => [r.key, r.value]));
  } catch {
    // DB not available
  }

  for (const key of SETTING_KEYS) {
    const dbVal = dbSettings.get(key);
    if (dbVal) {
      result[key] = { configured: true, source: "database" };
    } else if (process.env[key]) {
      result[key] = { configured: true, source: "env" };
    } else {
      result[key] = { configured: false, source: "none" };
    }
  }

  // DATABASE_URL is always env-only (can't store in DB — chicken-and-egg)
  result["DATABASE_URL"] = {
    configured: !!process.env.DATABASE_URL,
    source: process.env.DATABASE_URL ? "env" : "none",
  };

  return result;
}

/** Save a setting to the database. */
export async function saveSetting(
  key: SettingKey,
  value: string
): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/** Delete a setting from the database (reverts to env var). */
export async function deleteSetting(key: SettingKey): Promise<void> {
  await prisma.setting.deleteMany({ where: { key } });
}
