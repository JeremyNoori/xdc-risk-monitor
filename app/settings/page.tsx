"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SettingStatus {
  configured: boolean;
  source: "database" | "env" | "none";
}

const KEY_META: Record<string, { label: string; hint: string; type: string }> =
  {
    CMC_API_KEY: {
      label: "CoinMarketCap API Key",
      hint: "Pro API key from coinmarketcap.com/api",
      type: "password",
    },
    ADMIN_TOKEN: {
      label: "Admin Token",
      hint: "Bearer token for /api/jobs/run and settings access",
      type: "password",
    },
    DATABASE_URL: {
      label: "Database URL",
      hint: "Set as environment variable on your host (Render / Vercel). Cannot be changed from UI.",
      type: "readonly",
    },
  };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, SettingStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbUnavailable, setDbUnavailable] = useState(false);

  // Form state for each editable key
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<Record<string, string>>({});

  const fetchSettings = () => {
    setLoading(true);
    fetch("/api/settings")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSettings(data.settings ?? {});
        setDbUnavailable(!!data._dbUnavailable);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (key: string) => {
    const value = formValues[key] ?? "";
    setSaving(key);
    setSaveMsg({});

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSaveMsg({ [key]: value ? "Saved" : "Cleared" });
      setFormValues((prev) => ({ ...prev, [key]: "" }));
      fetchSettings();
    } catch (e) {
      setSaveMsg({
        [key]: `Error: ${e instanceof Error ? e.message : "Failed"}`,
      });
    } finally {
      setSaving(null);
    }
  };

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
        <p>Failed to load settings</p>
        <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>{error}</p>
      </div>
    );
  }

  const keys = Object.keys(KEY_META);

  return (
    <>
      <Link href="/" className="back-link">
        ← Back to Dashboard
      </Link>

      <h2 style={{ marginBottom: "0.5rem" }}>Settings</h2>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        Configure API keys and tokens. Values saved here are stored in the
        database and override environment variables.
      </p>

      {dbUnavailable && (
        <div
          style={{
            background: "rgba(234, 179, 8, 0.12)",
            border: "1px solid rgba(234, 179, 8, 0.3)",
            borderRadius: "0.75rem",
            padding: "0.75rem 1.25rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            color: "var(--yellow)",
          }}
        >
          Database is not connected. Set DATABASE_URL as an environment variable
          on your host to enable saving settings.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {keys.map((key) => {
          const meta = KEY_META[key];
          const status = settings[key];
          const isReadonly = meta.type === "readonly";

          return (
            <div key={key} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {meta.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "0.15rem",
                    }}
                  >
                    {meta.hint}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {status?.configured ? (
                    <span
                      className="badge badge-low"
                      style={{ fontSize: "0.65rem" }}
                    >
                      {status.source === "database"
                        ? "SET (DB)"
                        : "SET (ENV)"}
                    </span>
                  ) : (
                    <span
                      className="badge badge-high"
                      style={{ fontSize: "0.65rem" }}
                    >
                      NOT SET
                    </span>
                  )}
                </div>
              </div>

              {!isReadonly && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.75rem",
                  }}
                >
                  <input
                    type={meta.type}
                    placeholder={`Enter ${meta.label}...`}
                    value={formValues[key] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    style={{
                      flex: 1,
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                    disabled={dbUnavailable}
                  />
                  <button
                    onClick={() => handleSave(key)}
                    disabled={saving === key || dbUnavailable}
                    style={{
                      background: "var(--accent-dim)",
                      color: "white",
                      border: "none",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      cursor:
                        saving === key || dbUnavailable
                          ? "not-allowed"
                          : "pointer",
                      opacity: saving === key || dbUnavailable ? 0.5 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {saving === key ? "Saving..." : "Save"}
                  </button>
                  {status?.source === "database" && (
                    <button
                      onClick={() => {
                        setFormValues((prev) => ({ ...prev, [key]: "" }));
                        handleSave(key);
                      }}
                      disabled={saving === key}
                      style={{
                        background: "transparent",
                        color: "var(--red)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        cursor: saving === key ? "not-allowed" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {saveMsg[key] && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.8rem",
                    color: saveMsg[key].startsWith("Error")
                      ? "var(--red)"
                      : "var(--green)",
                  }}
                >
                  {saveMsg[key]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Link to trigger ingestion */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
          Test Ingestion
        </div>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            marginBottom: "0.75rem",
          }}
        >
          After saving your CMC API Key and Admin Token, trigger a manual
          ingestion run to verify everything works.
        </p>
        <TriggerButton />
      </div>
    </>
  );
}

function TriggerButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const trigger = async () => {
    setRunning(true);
    setStatus(null);

    // Read admin token from the input on this page (if user just set it)
    // or prompt them
    const token = prompt("Enter your ADMIN_TOKEN to trigger a run:");
    if (!token) {
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/jobs/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(
          `Run ${data.runId} completed — status: ${data.status}, venues: ${data.venueCount}`
        );
      } else {
        setStatus(`Error: ${data.error || `HTTP ${res.status}`}`);
      }
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <button
        onClick={trigger}
        disabled={running}
        style={{
          background: "var(--accent-dim)",
          color: "white",
          border: "none",
          padding: "0.5rem 1.25rem",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          cursor: running ? "not-allowed" : "pointer",
          opacity: running ? 0.5 : 1,
        }}
      >
        {running ? "Running ingestion..." : "Trigger Ingestion Run"}
      </button>
      {status && (
        <div
          style={{
            marginTop: "0.75rem",
            fontSize: "0.85rem",
            color: status.startsWith("Error") ? "var(--red)" : "var(--green)",
          }}
        >
          {status}
        </div>
      )}
    </>
  );
}
