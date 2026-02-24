import type {
  CmcResponse,
  CmcCryptoMapEntry,
  CmcMarketPairsData,
  CmcQuotesEntry,
  CmcExchangeAsset,
} from "./types";

const CMC_BASE = "https://pro-api.coinmarketcap.com";

/** Resolve CMC API key — checks DB setting first, then env var. */
async function getApiKey(): Promise<string> {
  // Try DB first
  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.setting.findUnique({ where: { key: "CMC_API_KEY" } });
    if (row?.value) return row.value;
  } catch {
    // DB not available
  }
  const key = process.env.CMC_API_KEY;
  if (!key) throw new Error("CMC_API_KEY is not configured — set it in Settings or as an env var");
  return key;
}

/**
 * Generic CMC fetch with exponential-backoff retry (3 attempts).
 * Returns the parsed JSON body.
 */
async function cmcFetch<T>(
  path: string,
  params: Record<string, string | number> = {},
  maxRetries = 3
): Promise<CmcResponse<T>> {
  const url = new URL(path, CMC_BASE);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const apiKey = await getApiKey();

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          Accept: "application/json",
        },
        // Disable Next.js caching for API calls
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(
          `CMC ${res.status} ${res.statusText} — ${body.slice(0, 500)}`
        );
      }

      const json = (await res.json()) as CmcResponse<T>;

      if (json.status.error_code !== 0) {
        throw new Error(
          `CMC error ${json.status.error_code}: ${json.status.error_message}`
        );
      }

      return json;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError!;
}

/* ─── Public API functions ─── */

/**
 * GET /v1/cryptocurrency/map?symbol=XDC
 * Resolves the CoinMarketCap internal id for XDC.
 */
export async function getXdcId(): Promise<number> {
  const res = await cmcFetch<CmcCryptoMapEntry[]>(
    "/v1/cryptocurrency/map",
    { symbol: "XDC" }
  );
  const active = res.data.find(
    (e) => e.symbol === "XDC" && e.is_active === 1
  );
  if (!active) throw new Error("XDC not found in CMC cryptocurrency/map");
  return active.id;
}

/**
 * GET /v1/cryptocurrency/market-pairs/latest
 * Returns all market pairs for XDC with USD volumes.
 */
export async function fetchMarketPairs(
  xdcId: number
): Promise<CmcMarketPairsData> {
  const res = await cmcFetch<CmcMarketPairsData>(
    "/v1/cryptocurrency/market-pairs/latest",
    { id: xdcId, convert: "USD", limit: 5000 }
  );
  return res.data;
}

/**
 * GET /v1/cryptocurrency/quotes/latest
 * Returns the current XDC price in USD.
 */
export async function fetchXdcPrice(xdcId: number): Promise<number> {
  const res = await cmcFetch<Record<string, CmcQuotesEntry>>(
    "/v1/cryptocurrency/quotes/latest",
    { id: xdcId, convert: "USD" }
  );
  const entry = res.data[String(xdcId)];
  if (!entry) throw new Error("XDC quote not found in CMC response");
  return entry.quote.USD.price;
}

/**
 * GET /v1/exchange/assets?id={exchange_id}
 *
 * NOTE: This endpoint may not be available on all CMC plans.
 * If it fails, returns null so the caller can mark the venue UNKNOWN.
 *
 * TODO: The exact CMC endpoint for exchange proof-of-reserves / assets
 * may differ by plan. If /v1/exchange/assets doesn't work, try
 * /v2/exchange/assets or check CMC documentation for the correct path.
 */
export async function fetchExchangeAssets(
  exchangeId: number
): Promise<CmcExchangeAsset[] | null> {
  try {
    const res = await cmcFetch<CmcExchangeAsset[]>(
      "/v1/exchange/assets",
      { id: exchangeId }
    );
    return res.data;
  } catch {
    // Endpoint may be unavailable for this exchange or API plan
    return null;
  }
}

/**
 * Returns the credit_count from the last status object.
 * Useful for tracking API credit usage.
 */
export function extractCredits(res: CmcResponse<unknown>): number {
  return res.status.credit_count;
}
