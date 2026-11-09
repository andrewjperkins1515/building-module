import { BarChart3, Banknote, HardHat, Info, PieChart } from "lucide-react";
import { EmptyState, KeyValueRow, Section } from "@/components/shared/layout";
import { MockDataTag } from "@/components/shared/badges";
import { Badge } from "@/components/ui/primitives";
import { useData } from "@/store/DataProvider";
import { SOURCE_LABEL } from "@/lib/labels";
import { daysUntil, fmtCurrency, fmtDate, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBuildingPage } from "../context";

const PAYER_COLORS: Record<string, string> = {
  medicare: "#2c4c9c",
  managedCare: "#5f7fc6",
  medicaid: "#93a8d6",
  privatePay: "#2f7a55",
  other: "#c7ced8",
};
const PAYER_LABEL: Record<string, string> = { medicare: "Medicare", managedCare: "Managed care", medicaid: "Medicaid", privatePay: "Private pay", other: "Other" };

export function FinancialsTab() {
  const { bundle } = useBuildingPage();
  const { state } = useData();
  const f = bundle.financials;

  if (!f) {
    return (
      <div className="rounded-lg border border-border bg-background shadow-card">
        <EmptyState icon={BarChart3} title="No financial information yet" description="Upload a trailing 12-month P&L or census report in Documents to populate operating history." />
      </div>
    );
  }

  const ttm = f.periods[f.periods.length - 1];
  const prior = f.periods[f.periods.length - 2];
  const delta = (a: number, b: number) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
  const rows: { label: string; key: keyof (typeof f.periods)[number]; strong?: boolean; pct?: boolean; negative?: boolean }[] = [
    { label: "Total revenue", key: "revenue", strong: true },
    { label: "Operating expenses", key: "operatingExpenses", negative: true },
    { label: "EBITDAR", key: "ebitdar", strong: true },
    { label: "Rent / lease expense", key: "rent", negative: true },
    { label: "EBITDA", key: "ebitda", strong: true },
    { label: "NOI (normalized, 5% mgmt fee)", key: "noi", strong: true },
    { label: "Occupancy", key: "occupancyPct", pct: true },
  ];
  const lender = state.organizations.find((o) => o.id === f.debt?.lenderOrgId);
  const maturityDays = daysUntil(f.debt?.maturityDate);
  const mix = Object.entries(f.payerMix).filter(([, v]) => v > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-background px-4 py-3 text-[13px] shadow-card">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-4" />
        <div className="text-ink-3">
          <span className="font-medium text-ink">Illustrative financial information.</span> Figures are fictional and shown for prototype demonstration only. Each period is labeled with its source; property-level NOI is normalized with a 5% management fee.
          <MockDataTag label="Illustrative" className="ml-2 align-middle" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card lg:grid-cols-4">
        {[
          { label: `Revenue · ${ttm.label}`, value: fmtCurrency(ttm.revenue, { compact: true }), d: delta(ttm.revenue, prior.revenue) },
          { label: "EBITDAR", value: fmtCurrency(ttm.ebitdar, { compact: true }), d: delta(ttm.ebitdar, prior.ebitdar), sub: `${fmtPct((ttm.ebitdar / ttm.revenue) * 100)} margin` },
          { label: "NOI (normalized)", value: fmtCurrency(ttm.noi, { compact: true }), d: delta(ttm.noi, prior.noi) },
          { label: "Occupancy", value: fmtPct(ttm.occupancyPct), d: ttm.occupancyPct - prior.occupancyPct, pts: true },
        ].map((m) => (
          <div key={m.label} className="bg-background px-4 py-3">
            <div className="truncate text-[11.5px] font-medium text-ink-3">{m.label}</div>
            <div className="tabular mt-1 text-[20px] font-semibold tracking-[-0.02em]">{m.value}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11.5px]">
              <span className={cn("tabular font-medium", m.d >= 0 ? "text-success" : "text-danger")}>
                {m.d >= 0 ? "▲" : "▼"} {Math.abs(m.d).toFixed(1)}
                {m.pts ? " pts" : "%"}
              </span>
              <span className="text-ink-4">vs {prior.label}</span>
              {m.sub && <span className="text-ink-4">· {m.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      <Section title="Operating history" icon={BarChart3} description="Facility-level P&L by reporting period" flush>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11.5px] text-ink-3">
                <th className="h-10 pl-4 text-left font-medium">Line item</th>
                {f.periods.map((p) => (
                  <th key={p.label} className="px-4 text-right font-medium">
                    <div className="text-ink-2">{p.label}</div>
                    <div className="text-[10.5px] font-normal text-ink-4">{SOURCE_LABEL[p.source]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className={cn("border-b border-border/60 last:border-0", r.strong && "bg-canvas/50")}>
                  <td className={cn("h-9 pl-4", r.strong ? "font-medium text-ink" : "pl-7 text-ink-2")}>{r.label}</td>
                  {f.periods.map((p) => {
                    const v = p[r.key] as number;
                    return (
                      <td key={p.label} className={cn("tabular px-4 text-right", r.strong ? "font-medium" : "text-ink-2")}>
                        {r.pct ? fmtPct(v) : r.negative && v ? `(${fmtCurrency(v)})` : fmtCurrency(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Payer mix" icon={PieChart} description={`Revenue share · as of ${fmtDate(f.payerMixAsOf)}`}>
          <div className="flex h-3 overflow-hidden rounded-full">
            {mix.map(([k, v]) => (
              <div key={k} style={{ width: `${v}%`, background: PAYER_COLORS[k] }} title={`${PAYER_LABEL[k]} ${v}%`} />
            ))}
          </div>
          <div className="mt-3 space-y-1">
            {mix.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-ink-2">
                  <span className="size-2.5 rounded-[3px]" style={{ background: PAYER_COLORS[k] }} />
                  {PAYER_LABEL[k]}
                </span>
                <span className="tabular font-medium">{v}%</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border pt-2 text-[11.5px] text-ink-4">Skilled mix (Medicare + managed care): {f.payerMix.medicare + f.payerMix.managedCare}%</div>
        </Section>

        <Section title="Debt" icon={Banknote} description="Existing mortgage financing">
          {f.debt ? (
            <div className="divide-y divide-border/70">
              <KeyValueRow label="Lender" value={lender?.name ?? "—"} />
              <KeyValueRow label="Loan type" value={f.debt.loanType} />
              <KeyValueRow label="Original amount" value={fmtCurrency(f.debt.originalAmount)} />
              <KeyValueRow label="Current balance" value={fmtCurrency(f.debt.balance)} />
              <KeyValueRow label="Rate" value={f.debt.rate} />
              <KeyValueRow label="Originated" value={fmtDate(f.debt.originationDate)} />
              <KeyValueRow
                label="Maturity"
                value={
                  <span className="flex items-center gap-1.5">
                    {fmtDate(f.debt.maturityDate)}
                    {maturityDays !== null && maturityDays < 365 && <Badge tone="warning">{maturityDays}d</Badge>}
                  </span>
                }
              />
            </div>
          ) : (
            <EmptyState compact icon={Banknote} title="No debt recorded" description="Unencumbered, or debt details not yet provided." />
          )}
        </Section>

        <Section title="Capital expenditures" icon={HardHat} description="Annual capex (operator reported)">
          <div className="space-y-2">
            {f.capex.map((c) => {
              const max = Math.max(...f.capex.map((x) => x.amount));
              return (
                <div key={c.year} className="grid grid-cols-[40px_1fr_64px] items-center gap-2 text-[12.5px]">
                  <span className="tabular text-ink-3">{c.year}</span>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-accent/70" style={{ width: `${(c.amount / max) * 100}%` }} />
                  </div>
                  <span className="tabular text-right font-medium">{fmtCurrency(c.amount, { compact: true })}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 border-t border-border pt-2 text-[11.5px] text-ink-4">
            5-yr avg: {fmtCurrency(f.capex.reduce((a, c) => a + c.amount, 0) / f.capex.length, { compact: true })} · {fmtCurrency(f.capex.reduce((a, c) => a + c.amount, 0) / f.capex.length / bundle.building.certifiedBeds.value)} per bed
          </div>
        </Section>
      </div>
    </div>
  );
}
