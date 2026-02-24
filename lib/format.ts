/** Format number as USD with commas and 2 decimals */
export function fmtUsd(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format number with commas (for XDC amounts) */
export function fmtNum(n: number | null, decimals = 2): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format coverage ratio as percentage */
export function fmtPct(ratio: number | null): string {
  if (ratio === null || ratio === undefined) return "—";
  return (ratio * 100).toFixed(2) + "%";
}

/** Format ISO date to readable string */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Risk tier badge CSS class */
export function tierClass(tier: string): string {
  switch (tier) {
    case "LOW":
      return "badge badge-low";
    case "MODERATE":
      return "badge badge-moderate";
    case "HIGH":
      return "badge badge-high";
    default:
      return "badge badge-unknown";
  }
}
