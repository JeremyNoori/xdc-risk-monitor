/** Demo data used when the database is not yet connected. */

const now = new Date().toISOString();

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

function daysAgo(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
}

export const MOCK_VENUES = [
  { rank: 1, exchangeId: 270, exchangeName: "Binance", volume24hUsd: 4_821_340.52, reserveXdc: 312_000_000, reserveUsd: 18_720_000, coverageRatio: 3.88, riskTier: "LOW" },
  { rank: 2, exchangeId: 521, exchangeName: "Bybit", volume24hUsd: 2_115_720.18, reserveXdc: 85_000_000, reserveUsd: 5_100_000, coverageRatio: 2.41, riskTier: "LOW" },
  { rank: 3, exchangeId: 294, exchangeName: "OKX", volume24hUsd: 1_740_210.90, reserveXdc: 42_000_000, reserveUsd: 2_520_000, coverageRatio: 1.45, riskTier: "LOW" },
  { rank: 4, exchangeId: 311, exchangeName: "KuCoin", volume24hUsd: 987_650.44, reserveXdc: 18_500_000, reserveUsd: 1_110_000, coverageRatio: 1.12, riskTier: "LOW" },
  { rank: 5, exchangeId: 415, exchangeName: "Gate.io", volume24hUsd: 654_320.11, reserveXdc: 9_200_000, reserveUsd: 552_000, coverageRatio: 0.84, riskTier: "MODERATE" },
  { rank: 6, exchangeId: 524, exchangeName: "MEXC", volume24hUsd: 543_210.87, reserveXdc: 7_100_000, reserveUsd: 426_000, coverageRatio: 0.78, riskTier: "MODERATE" },
  { rank: 7, exchangeId: 102, exchangeName: "Bitfinex", volume24hUsd: 421_890.33, reserveXdc: 5_800_000, reserveUsd: 348_000, coverageRatio: 0.82, riskTier: "MODERATE" },
  { rank: 8, exchangeId: 37,  exchangeName: "Bitget", volume24hUsd: 389_440.21, reserveXdc: 3_200_000, reserveUsd: 192_000, coverageRatio: 0.49, riskTier: "HIGH" },
  { rank: 9, exchangeId: 433, exchangeName: "Bitrue", volume24hUsd: 312_780.55, reserveXdc: null, reserveUsd: null, coverageRatio: null, riskTier: "UNKNOWN" },
  { rank: 10, exchangeId: 949, exchangeName: "CoinDCX", volume24hUsd: 278_440.67, reserveXdc: 2_100_000, reserveUsd: 126_000, coverageRatio: 0.45, riskTier: "HIGH" },
  { rank: 11, exchangeId: 350, exchangeName: "Bitvavo", volume24hUsd: 210_320.44, reserveXdc: null, reserveUsd: null, coverageRatio: null, riskTier: "UNKNOWN" },
  { rank: 12, exchangeId: 943, exchangeName: "WazirX", volume24hUsd: 189_200.30, reserveXdc: 1_500_000, reserveUsd: 90_000, coverageRatio: 0.48, riskTier: "HIGH" },
  { rank: 13, exchangeId: 154, exchangeName: "Digifinex", volume24hUsd: 165_870.12, reserveXdc: 3_500_000, reserveUsd: 210_000, coverageRatio: 1.27, riskTier: "LOW" },
  { rank: 14, exchangeId: 477, exchangeName: "Probit", volume24hUsd: 142_330.89, reserveXdc: null, reserveUsd: null, coverageRatio: null, riskTier: "UNKNOWN" },
  { rank: 15, exchangeId: 544, exchangeName: "XT.COM", volume24hUsd: 118_990.43, reserveXdc: 1_800_000, reserveUsd: 108_000, coverageRatio: 0.91, riskTier: "MODERATE" },
  { rank: 16, exchangeId: 628, exchangeName: "BingX", volume24hUsd: 98_450.22, reserveXdc: 800_000, reserveUsd: 48_000, coverageRatio: 0.49, riskTier: "HIGH" },
  { rank: 17, exchangeId: 310, exchangeName: "CoinEx", volume24hUsd: 76_340.18, reserveXdc: 1_200_000, reserveUsd: 72_000, coverageRatio: 0.94, riskTier: "MODERATE" },
  { rank: 18, exchangeId: 520, exchangeName: "Toobit", volume24hUsd: 54_210.90, reserveXdc: null, reserveUsd: null, coverageRatio: null, riskTier: "UNKNOWN" },
  { rank: 19, exchangeId: 89,  exchangeName: "Coinstore", volume24hUsd: 41_780.55, reserveXdc: 300_000, reserveUsd: 18_000, coverageRatio: 0.43, riskTier: "HIGH" },
  { rank: 20, exchangeId: 849, exchangeName: "LBank", volume24hUsd: 32_100.78, reserveXdc: 600_000, reserveUsd: 36_000, coverageRatio: 1.12, riskTier: "LOW" },
].map((v) => ({ ...v, lastChecked: now }));

export const MOCK_RUN = {
  id: "demo_run_001",
  startedAt: hoursAgo(2),
  finishedAt: hoursAgo(2),
  status: "SUCCESS",
};

/** Generate history points for a given exchange over N days. */
export function generateMockHistory(exchangeId: number, days: number) {
  const venue = MOCK_VENUES.find((v) => v.exchangeId === exchangeId);
  if (!venue) return [];

  const points = [];
  for (let d = days; d >= 0; d--) {
    const jitter = 0.85 + Math.random() * 0.3; // 0.85 – 1.15
    const volJitter = 0.7 + Math.random() * 0.6;
    points.push({
      date: daysAgo(d),
      rank: venue.rank,
      volume24hUsd: venue.volume24hUsd * volJitter,
      reserveXdc: venue.reserveXdc ? venue.reserveXdc * jitter : null,
      reserveUsd: venue.reserveUsd ? venue.reserveUsd * jitter : null,
      coverageRatio: venue.coverageRatio ? venue.coverageRatio * (jitter / volJitter) : null,
      riskTier: venue.riskTier,
    });
  }
  return points;
}

export const MOCK_PAIRS: Record<number, { marketPair: string; volume24hUsd: number }[]> = {
  270: [
    { marketPair: "XDC/USDT", volume24hUsd: 3_842_100.20 },
    { marketPair: "XDC/BTC", volume24hUsd: 612_340.10 },
    { marketPair: "XDC/BUSD", volume24hUsd: 366_900.22 },
  ],
  521: [
    { marketPair: "XDC/USDT", volume24hUsd: 1_890_440.18 },
    { marketPair: "XDC/USDC", volume24hUsd: 225_280.00 },
  ],
  294: [
    { marketPair: "XDC/USDT", volume24hUsd: 1_421_000.50 },
    { marketPair: "XDC/BTC", volume24hUsd: 319_210.40 },
  ],
};
