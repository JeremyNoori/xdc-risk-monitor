/* ────────────────────────────────────────────────────────
   CoinMarketCap API response types (subset we use)
   ──────────────────────────────────────────────────────── */

/** Wrapper that all CMC responses share */
export interface CmcResponse<T> {
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
  };
  data: T;
}

/* /v1/cryptocurrency/map */
export interface CmcCryptoMapEntry {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  is_active: number;
  rank: number;
  first_historical_data: string;
  last_historical_data: string;
  platform: unknown;
}

/* /v1/cryptocurrency/market-pairs/latest */
export interface CmcMarketPair {
  exchange: {
    id: number;
    name: string;
    slug: string;
  };
  market_id: number;
  market_pair: string;
  category: string;
  fee_type: string;
  market_pair_base: {
    currency_id: number;
    currency_symbol: string;
    currency_type: string;
    exchange_symbol: string;
  };
  market_pair_quote: {
    currency_id: number;
    currency_symbol: string;
    currency_type: string;
    exchange_symbol: string;
  };
  quote: {
    exchange_reported: {
      price: number;
      volume_24h_base: number;
      volume_24h_quote: number;
      last_updated: string;
    };
    USD: {
      price: number;
      volume_24h: number;
      depth_negative_two: number | null;
      depth_positive_two: number | null;
      effective_liquidity: number | null;
      last_updated: string;
    };
  };
}

export interface CmcMarketPairsData {
  id: number;
  name: string;
  symbol: string;
  num_market_pairs: number;
  market_pairs: CmcMarketPair[];
}

/* /v1/cryptocurrency/quotes/latest */
export interface CmcQuoteUsd {
  price: number;
  volume_24h: number;
  percent_change_24h: number;
  market_cap: number;
  last_updated: string;
}

export interface CmcQuotesEntry {
  id: number;
  name: string;
  symbol: string;
  quote: {
    USD: CmcQuoteUsd;
  };
}

/* /v1/exchange/assets  (Proof-of-Reserves / exchange assets) */
export interface CmcExchangeAsset {
  wallet_address: string;
  balance: number;
  platform: {
    crypto_id: number;
    symbol: string;
    name: string;
  };
  currency: {
    crypto_id: number;
    symbol: string;
    name: string;
    price_usd: number;
  };
  updated_at: string;
}

/* Aggregated internal types */
export interface AggregatedVenue {
  exchangeId: number;
  exchangeName: string;
  volume24hUsd: number;
  pairs: { marketPair: string; volume24hUsd: number }[];
}

export interface VenueRisk {
  exchangeId: number;
  exchangeName: string;
  rank: number;
  volume24hUsd: number;
  reserveXdc: number | null;
  reserveUsd: number | null;
  coverageRatio: number | null;
  riskTier: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
  pairs: { marketPair: string; volume24hUsd: number }[];
}
