"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fmtUsd, fmtNum, fmtPct, fmtDate, tierClass } from "@/lib/format";

interface HistoryPoint {
  date: string;
  rank: number;
  volume24hUsd: number;
  reserveXdc: number | null;
  reserveUsd: number | null;
  coverageRatio: number | null;
  riskTier: string;
}

interface PairRow {
  marketPair: string;
  volume24hUsd: number;
}

export default function VenueDetailPage() {
  const params = useParams<{ id: string }>();
  const exchangeId = params.id;

  const [days, setDays] = useState(7);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [pairs, setPairs] = useState<PairRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive latest snapshot from history
  const latest = history.length > 0 ? history[history.length - 1] : null;

  // Derive exchange name from pairs endpoint or the latest API response
  const [exchangeName, setExchangeName] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/venue/${exchangeId}/history?days=${days}`).then((r) =>
        r.json()
      ),
      fetch(`/api/venue/${exchangeId}/pairs`).then((r) => r.json()),
    ])
      .then(([histData, pairsData]) => {
        setHistory(histData.history ?? []);
        setPairs(pairsData.pairs ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [exchangeId, days]);

  // Get exchange name from the latest /api/latest data
  useEffect(() => {
    fetch("/api/latest")
      .then((r) => r.json())
      .then((d) => {
        const v = d?.venues?.find(
          (v: { exchangeId: number }) => v.exchangeId === Number(exchangeId)
        );
        if (v) setExchangeName(v.exchangeName);
      })
      .catch(() => {});
  }, [exchangeId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-box">
        <p>Failed to load venue data</p>
        <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>{error}</p>
      </div>
    );
  }

  // Chart data: format dates for X axis, convert coverage to pct
  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    coveragePct:
      h.coverageRatio !== null ? Number((h.coverageRatio * 100).toFixed(2)) : null,
    volume: h.volume24hUsd,
    reserveUsd: h.reserveUsd,
  }));

  return (
    <>
      <Link href="/" className="back-link">
        ← Back to Dashboard
      </Link>

      <h2 style={{ marginBottom: "1.5rem" }}>
        {exchangeName || `Exchange #${exchangeId}`}
      </h2>

      {/* Stat cards */}
      {latest && (
        <div className="stat-cards">
          <div className="card">
            <div className="status-label">24h Volume</div>
            <div className="status-value">{fmtUsd(latest.volume24hUsd)}</div>
          </div>
          <div className="card">
            <div className="status-label">XDC Reserves</div>
            <div className="status-value">{fmtNum(latest.reserveXdc)}</div>
          </div>
          <div className="card">
            <div className="status-label">Reserves (USD)</div>
            <div className="status-value">{fmtUsd(latest.reserveUsd)}</div>
          </div>
          <div className="card">
            <div className="status-label">Coverage</div>
            <div className="status-value">{fmtPct(latest.coverageRatio)}</div>
          </div>
          <div className="card">
            <div className="status-label">Risk Tier</div>
            <div className="status-value">
              <span className={tierClass(latest.riskTier)}>
                {latest.riskTier}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Coverage chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>Coverage % Over Time</h3>
          <div className="chart-toggle">
            <button
              className={days === 7 ? "active" : ""}
              onClick={() => setDays(7)}
            >
              7 days
            </button>
            <button
              className={days === 30 ? "active" : ""}
              onClick={() => setDays(30)}
            >
              30 days
            </button>
          </div>
        </div>

        {chartData.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>
            No history data available yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" stroke="#8888a0" fontSize={12} />
              <YAxis
                stroke="#8888a0"
                fontSize={12}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "#12121a",
                  border: "1px solid #1e1e2e",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
                labelStyle={{ color: "#8888a0" }}
                formatter={(value: number) => [`${value}%`, "Coverage"]}
              />
              <Line
                type="monotone"
                dataKey="coveragePct"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#3b82f6" }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pair breakdown */}
      <div className="chart-container">
        <h3 style={{ marginBottom: "1rem" }}>Trading Pairs (by 24h Volume)</h3>
        {pairs.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "1rem 0" }}>
            No pair data available
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Market Pair</th>
                  <th className="numeric">24h Volume (USD)</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((p, i) => (
                  <tr key={p.marketPair}>
                    <td>{i + 1}</td>
                    <td>{p.marketPair}</td>
                    <td className="numeric">{fmtUsd(p.volume24hUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
