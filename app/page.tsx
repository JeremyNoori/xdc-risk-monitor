"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fmtUsd, fmtNum, fmtPct, fmtDate, tierClass } from "@/lib/format";

interface Venue {
  rank: number;
  exchangeId: number;
  exchangeName: string;
  volume24hUsd: number;
  reserveXdc: number | null;
  reserveUsd: number | null;
  coverageRatio: number | null;
  riskTier: string;
  lastChecked: string;
}

interface RunInfo {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
}

interface LatestData {
  run: RunInfo;
  venues: Venue[];
  _demo?: boolean;
}

export default function DashboardPage() {
  const [data, setData] = useState<LatestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [minVolume, setMinVolume] = useState<string>("");
  const [unknownOnly, setUnknownOnly] = useState(false);

  useEffect(() => {
    fetch("/api/latest")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredVenues = useMemo(() => {
    if (!data) return [];
    let list = data.venues;

    if (unknownOnly) {
      list = list.filter((v) => v.riskTier === "UNKNOWN");
    } else if (tierFilter !== "ALL") {
      list = list.filter((v) => v.riskTier === tierFilter);
    }

    const minVol = parseFloat(minVolume);
    if (!isNaN(minVol) && minVol > 0) {
      list = list.filter((v) => v.volume24hUsd >= minVol);
    }

    return list;
  }, [data, tierFilter, minVolume, unknownOnly]);

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
        <p>Failed to load data</p>
        <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { run, venues } = data;

  // Summary counts
  const highCount = venues.filter((v) => v.riskTier === "HIGH").length;
  const modCount = venues.filter((v) => v.riskTier === "MODERATE").length;
  const lowCount = venues.filter((v) => v.riskTier === "LOW").length;
  const unknownCount = venues.filter((v) => v.riskTier === "UNKNOWN").length;

  return (
    <>
      {/* Demo banner */}
      {(data as LatestData & { _demo?: boolean })._demo && (
        <div
          style={{
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "0.75rem",
            padding: "0.75rem 1.25rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            color: "var(--accent)",
          }}
        >
          Showing demo data — connect a database and run ingestion to see live results.
        </div>
      )}

      {/* Status bar */}
      <div className="status-bar">
        <div className="card">
          <div className="status-label">Last Run</div>
          <div className="status-value">
            {run.finishedAt ? fmtDate(run.finishedAt) : "In progress..."}
          </div>
        </div>
        <div className="card">
          <div className="status-label">Status</div>
          <div className="status-value">{run.status}</div>
        </div>
        <div className="card">
          <div className="status-label">Risk Summary</div>
          <div className="status-value" style={{ fontSize: "0.875rem" }}>
            <span style={{ color: "var(--red)" }}>{highCount} High</span>
            {" · "}
            <span style={{ color: "var(--yellow)" }}>{modCount} Moderate</span>
            {" · "}
            <span style={{ color: "var(--green)" }}>{lowCount} Low</span>
            {" · "}
            <span style={{ color: "var(--text-muted)" }}>
              {unknownCount} Unknown
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value);
            setUnknownOnly(false);
          }}
        >
          <option value="ALL">All Tiers</option>
          <option value="HIGH">High Risk</option>
          <option value="MODERATE">Moderate Risk</option>
          <option value="LOW">Low Risk</option>
          <option value="UNKNOWN">Unknown</option>
        </select>

        <input
          type="number"
          placeholder="Min Volume (USD)"
          value={minVolume}
          onChange={(e) => setMinVolume(e.target.value)}
          style={{ width: 180 }}
        />

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={unknownOnly}
            onChange={(e) => {
              setUnknownOnly(e.target.checked);
              if (e.target.checked) setTierFilter("ALL");
            }}
          />
          Show UNKNOWN only
        </label>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Exchange</th>
              <th className="numeric">24h Volume (USD)</th>
              <th className="numeric">XDC Reserves</th>
              <th className="numeric">Reserves (USD)</th>
              <th className="numeric">Coverage %</th>
              <th>Risk Tier</th>
              <th>Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {filteredVenues.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
                  No venues match the current filters
                </td>
              </tr>
            ) : (
              filteredVenues.map((v) => (
                <tr key={v.exchangeId}>
                  <td>{v.rank}</td>
                  <td>
                    <Link href={`/venue/${v.exchangeId}`}>
                      {v.exchangeName}
                    </Link>
                  </td>
                  <td className="numeric">{fmtUsd(v.volume24hUsd)}</td>
                  <td className="numeric">{fmtNum(v.reserveXdc)}</td>
                  <td className="numeric">{fmtUsd(v.reserveUsd)}</td>
                  <td className="numeric">{fmtPct(v.coverageRatio)}</td>
                  <td>
                    <span className={tierClass(v.riskTier)}>{v.riskTier}</span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    {fmtDate(v.lastChecked)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
