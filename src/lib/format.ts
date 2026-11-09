const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function parse(d: string) {
  // Treat bare YYYY-MM-DD as a local date to avoid off-by-one rendering.
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d);
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return dateFmt.format(parse(d));
}

export function fmtShortDate(d?: string | null) {
  if (!d) return "—";
  return shortDateFmt.format(parse(d));
}

export function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return dateTimeFmt.format(parse(d));
}

export function fmtRelative(d?: string | null) {
  if (!d) return "—";
  const diff = Date.now() - parse(d).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  let s: string;
  if (abs < min) return "just now";
  if (abs < hr) s = `${Math.round(abs / min)}m`;
  else if (abs < day) s = `${Math.round(abs / hr)}h`;
  else if (abs < 30 * day) s = `${Math.round(abs / day)}d`;
  else return fmtDate(d);
  return future ? `in ${s}` : `${s} ago`;
}

export function daysUntil(d?: string | null) {
  if (!d) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((parse(d).getTime() - today.getTime()) / 86_400_000);
}

export function fmtNumber(n?: number | null, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtCurrency(n?: number | null, opts: { compact?: boolean } = {}) {
  if (n === null || n === undefined) return "—";
  if (opts.compact) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 100_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  }
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function fmtPct(n?: number | null, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
