import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, CalendarClock, Columns3, Plus, Rows3, Search, SearchX, X } from "lucide-react";
import type { Deal, DealStage, DealStatus } from "@/types";
import { useBreadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState, PageHeader } from "@/components/shared/layout";
import { Button } from "@/components/ui/button";
import { Badge, Input, Progress, Switch } from "@/components/ui/primitives";
import { Tabs, SegmentedList, SegmentedTrigger } from "@/components/ui/tabs";
import { DealStageBadge, DealStatusBadge } from "@/components/shared/badges";
import { useData } from "@/store/DataProvider";
import { dealView } from "@/store/selectors";
import { ASSET_CLASSES, ASSET_CLASS_LABEL, DEAL_KINDS, DEAL_KIND_LABEL, DEAL_STAGES, DEAL_STAGE_LABEL, DEAL_STATUS_LABEL } from "@/lib/labels";
import { daysUntil, fmtCurrency, fmtDate, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FilterChip, MultiSelectFilter } from "@/features/buildings/directory/FilterControls";
import { progressPct } from "./DealProgress";
import { NewDealDialog } from "./NewDealDialog";

export const isMarketComp = (d: Deal) => d.code.startsWith("MKT");

interface Filters {
  q: string;
  statuses: DealStatus[];
  kinds: string[];
  assets: string[];
  states: string[];
  leads: string[];
  comps: boolean;
}
const EMPTY: Filters = { q: "", statuses: ["active", "closed"], kinds: [], assets: [], states: [], leads: [], comps: false };
const PREFS = "owner-docket:deals-prefs";

export function DealsDirectory() {
  useBreadcrumbs([{ label: "Deals" }]);
  const { state } = useData();
  const navigate = useNavigate();
  const initial = useMemo(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS) ?? "null");
      if (p) return { view: (p.view as "board" | "table") ?? "board", filters: { ...EMPTY, ...p.filters, q: "" } as Filters };
    } catch {
      /* ignore */
    }
    return { view: "board" as const, filters: EMPTY };
  }, []);
  const [view, setView] = useState<"board" | "table">(initial.view);
  const [f, setF] = useState<Filters>(initial.filters);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS, JSON.stringify({ view, filters: f }));
    } catch {
      /* ignore */
    }
  }, [view, f]);

  const rows = useMemo(() => state.deals.map((deal) => ({ deal, v: dealView(state, deal), pct: progressPct(deal) })), [state]);
  const base = rows.filter((r) => f.comps || !isMarketComp(r.deal));
  const filtered = base.filter(({ deal, v }) => {
    const t = f.q.trim().toLowerCase();
    if (t && ![deal.name, deal.code, deal.leadName, v.seller?.name ?? "", ...v.buildings.map((x) => x.building.name)].join(" ").toLowerCase().includes(t)) return false;
    if (f.statuses.length && !f.statuses.includes(deal.status)) return false;
    if (f.kinds.length && !f.kinds.includes(deal.dealKind ?? "")) return false;
    if (f.assets.length && !f.assets.includes(deal.assetClass ?? "")) return false;
    if (f.states.length && !f.states.some((s) => v.states.includes(s))) return false;
    if (f.leads.length && !f.leads.includes(deal.leadName)) return false;
    return true;
  });
  const set = <K extends keyof Filters>(k: K, val: Filters[K]) => setF((x) => ({ ...x, [k]: val }));
  const cnt = (fn: (d: Deal) => boolean) => base.filter((r) => fn(r.deal)).length;

  const statusOpts = (["active", "closed", "dead", "abandoned"] as DealStatus[]).map((s) => ({ value: s, label: DEAL_STATUS_LABEL[s], count: cnt((d) => d.status === s) }));
  const kindOpts = DEAL_KINDS.map((k) => ({ value: k as string, label: DEAL_KIND_LABEL[k], count: cnt((d) => d.dealKind === k) })).filter((o) => o.count);
  const assetOpts = ASSET_CLASSES.map((k) => ({ value: k as string, label: ASSET_CLASS_LABEL[k], count: cnt((d) => d.assetClass === k) })).filter((o) => o.count);
  const stateOpts = [...new Set(base.flatMap((r) => r.v.states))].sort().map((s) => ({ value: s, label: s, count: base.filter((r) => r.v.states.includes(s)).length }));
  const leadOpts = [...new Set(base.map((r) => r.deal.leadName))].sort().map((l) => ({ value: l, label: l, count: cnt((d) => d.leadName === l) }));

  const chips = [
    ...f.statuses.map((s) => ({ label: DEAL_STATUS_LABEL[s], remove: () => set("statuses", f.statuses.filter((x) => x !== s)) })),
    ...f.kinds.map((s) => ({ label: DEAL_KIND_LABEL[s as keyof typeof DEAL_KIND_LABEL], remove: () => set("kinds", f.kinds.filter((x) => x !== s)) })),
    ...f.assets.map((s) => ({ label: ASSET_CLASS_LABEL[s as keyof typeof ASSET_CLASS_LABEL], remove: () => set("assets", f.assets.filter((x) => x !== s)) })),
    ...f.states.map((s) => ({ label: s, remove: () => set("states", f.states.filter((x) => x !== s)) })),
    ...f.leads.map((s) => ({ label: `Lead: ${s}`, remove: () => set("leads", f.leads.filter((x) => x !== s)) })),
  ];

  const active = base.filter((r) => r.deal.status === "active");
  const closingSoon = active.filter((r) => {
    const n = daysUntil(r.deal.projectedCloseDate);
    return n !== null && n >= 0 && n <= 60;
  });
  const metrics = [
    { label: "Active deals", value: fmtNumber(active.length), sub: `${active.filter((r) => r.deal.stage === "psa_signed").length} under PSA` },
    { label: "Pipeline asking value", value: fmtCurrency(active.reduce((a, r) => a + (r.deal.askingPrice ?? 0), 0), { compact: true }), sub: "Active deals" },
    { label: "Buildings / beds", value: `${active.reduce((a, r) => a + r.v.totalBuildings, 0)} / ${fmtNumber(active.reduce((a, r) => a + r.v.totalLicBeds, 0))}`, sub: "Licensed beds in pipeline" },
    { label: "Closing in 60 days", value: fmtNumber(closingSoon.length), sub: closingSoon.map((r) => r.deal.name).join(", ") || "None scheduled" },
    { label: "Avg. progress", value: active.length ? `${Math.round(active.reduce((a, r) => a + r.pct, 0) / active.length)}%` : "—", sub: "Active deals' checklists" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 lg:px-8">
      <PageHeader
        title="Deals"
        subtitle="Acquisition pipeline from high-level review through LOI, PSA and close."
        actions={
          <Button variant="accent" onClick={() => setNewOpen(true)}>
            <Plus /> New Deal
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-background px-4 py-3">
            <div className="text-[11.5px] font-medium text-ink-3">{m.label}</div>
            <div className="tabular mt-0.5 text-[19px] font-semibold tracking-[-0.02em]">{m.value}</div>
            <div className="truncate text-[11px] text-ink-4">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-3 xl:flex-row xl:items-center">
          <div className="relative w-full xl:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
            <Input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Search deal, code, seller, building…" className="pl-8 pr-8" />
            {f.q && (
              <button onClick={() => set("q", "")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink" aria-label="Clear search">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <MultiSelectFilter label="Status" options={statusOpts} selected={f.statuses} onChange={(v) => set("statuses", v)} />
            <MultiSelectFilter label="Deal type" options={kindOpts} selected={f.kinds} onChange={(v) => set("kinds", v)} />
            <MultiSelectFilter label="Asset class" options={assetOpts} selected={f.assets} onChange={(v) => set("assets", v)} />
            <MultiSelectFilter label="State" options={stateOpts} selected={f.states} onChange={(v) => set("states", v)} />
            <MultiSelectFilter label="Lead" options={leadOpts} selected={f.leads} onChange={(v) => set("leads", v)} />
            <label className="ml-1 flex items-center gap-2 text-[12.5px] text-ink-3">
              <Switch checked={f.comps} onCheckedChange={(c) => set("comps", c)} /> Market comps
            </label>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as "board" | "table")}>
            <SegmentedList>
              <SegmentedTrigger value="board" aria-label="Board view">
                <Columns3 /> <span className="hidden sm:inline">Board</span>
              </SegmentedTrigger>
              <SegmentedTrigger value="table" aria-label="Table view">
                <Rows3 /> <span className="hidden sm:inline">Table</span>
              </SegmentedTrigger>
            </SegmentedList>
          </Tabs>
        </div>
        <div className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs text-ink-3">
          <span>
            Showing <span className="tabular font-medium text-ink">{filtered.length}</span> of <span className="tabular">{base.length}</span> deals
          </span>
          {chips.length > 0 && <span className="h-3.5 w-px bg-border" />}
          {chips.map((c) => (
            <FilterChip key={c.label} label={c.label} onRemove={c.remove} />
          ))}
          {(chips.length > 0 || f.q) && (
            <button onClick={() => setF({ ...EMPTY, statuses: [] })} className="ml-1 font-medium text-accent hover:underline">
              Clear all
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="No deals match" description="Adjust the filters, or start a new deal." action={<Button variant="accent" onClick={() => setNewOpen(true)}><Plus /> New Deal</Button>} />
        ) : view === "board" ? (
          <div className="scrollbar-thin grid auto-cols-[minmax(270px,1fr)] grid-flow-col gap-3 overflow-x-auto p-3">
            {DEAL_STAGES.map((stage: DealStage) => {
              const col = filtered.filter((r) => r.deal.stage === stage);
              return (
                <div key={stage} className="flex min-w-0 flex-col rounded-lg bg-canvas">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-[12.5px] font-semibold text-ink-2">{DEAL_STAGE_LABEL[stage]}</span>
                    <span className="tabular text-[11.5px] text-ink-4">
                      {col.length} · {fmtCurrency(col.reduce((a, r) => a + (r.deal.askingPrice ?? r.deal.purchasePrice ?? 0), 0), { compact: true })}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                    {col.length === 0 && <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[12px] text-ink-4">No deals</div>}
                    {col.map(({ deal, v, pct }) => (
                      <Link key={deal.id} to={`/deals/${deal.id}`} className={cn("block rounded-md border border-border bg-background p-3 shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-card", deal.status !== "active" && deal.status !== "closed" && "opacity-70")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-ink">{deal.name}</div>
                            <div className="text-[11px] text-ink-4">{deal.code}</div>
                          </div>
                          {deal.status !== "active" && <DealStatusBadge status={deal.status} />}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-ink-3">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="size-3" /> {v.totalBuildings} · {fmtNumber(v.totalLicBeds)} beds
                          </span>
                          {v.states.length > 0 && <span>{v.states.join(", ")}</span>}
                        </div>
                        <div className="mt-2 flex items-baseline justify-between text-[12px]">
                          <span className="tabular font-medium text-ink">{fmtCurrency(deal.askingPrice ?? deal.purchasePrice, { compact: true })}</span>
                          {v.pricePerBed && <span className="tabular text-ink-4">{fmtCurrency(Math.round(v.pricePerBed / 1000) * 1000, { compact: true })}/bed</span>}
                        </div>
                        {(deal.progress?.length ?? 0) > 0 && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <Progress value={pct} className="h-1.5" indicatorClassName={pct === 100 ? "bg-success" : undefined} />
                            <span className="tabular w-8 text-right text-[11px] text-ink-3">{pct}%</span>
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between text-[11px] text-ink-4">
                          <span>{deal.leadName}</span>
                          {deal.actualCloseDate ? (
                            <span>Closed {fmtDate(deal.actualCloseDate)}</span>
                          ) : deal.projectedCloseDate ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="size-3" /> {fmtDate(deal.projectedCloseDate)}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[1100px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-canvas/70 text-left text-[11.5px] text-ink-3">
                  <th className="h-9 pl-4 font-medium">Deal</th>
                  <th className="px-3 font-medium">Stage</th>
                  <th className="px-3 font-medium">Type / asset class</th>
                  <th className="px-3 font-medium">Seller</th>
                  <th className="px-3 font-medium">State(s)</th>
                  <th className="px-3 text-right font-medium">Bldgs / beds</th>
                  <th className="px-3 text-right font-medium">Asking</th>
                  <th className="px-3 text-right font-medium">$ / bed</th>
                  <th className="px-3 font-medium">Close</th>
                  <th className="pl-3 pr-4 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ deal, v, pct }) => (
                  <tr key={deal.id} onClick={() => navigate(`/deals/${deal.id}`)} className="group cursor-pointer border-b border-border/70 last:border-0 hover:bg-canvas">
                    <td className="py-2.5 pl-4">
                      <Link to={`/deals/${deal.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-ink group-hover:underline">
                        {deal.name}
                      </Link>
                      <div className="text-[11.5px] text-ink-4">
                        {deal.code} · {deal.leadName}
                      </div>
                    </td>
                    <td className="px-3">
                      <div className="flex flex-col items-start gap-1">
                        <DealStageBadge stage={deal.stage} status={deal.status} />
                        {deal.status !== "active" && <DealStatusBadge status={deal.status} />}
                      </div>
                    </td>
                    <td className="px-3 text-ink-2">
                      {deal.dealKind ? DEAL_KIND_LABEL[deal.dealKind] : "—"}
                      <div className="text-[11.5px] text-ink-4">{deal.assetClass ? ASSET_CLASS_LABEL[deal.assetClass] : ""}</div>
                    </td>
                    <td className="max-w-[180px] truncate px-3 text-ink-2">{v.seller?.name ?? "—"}</td>
                    <td className="px-3 text-ink-2">{v.states.join(", ") || "—"}</td>
                    <td className="tabular px-3 text-right">
                      {v.totalBuildings} / {fmtNumber(v.totalLicBeds)}
                    </td>
                    <td className="tabular px-3 text-right">{fmtCurrency(deal.askingPrice ?? deal.purchasePrice, { compact: true })}</td>
                    <td className="tabular px-3 text-right">{v.pricePerBed ? fmtCurrency(Math.round(v.pricePerBed / 1000) * 1000, { compact: true }) : "—"}</td>
                    <td className="whitespace-nowrap px-3 text-ink-2">{fmtDate(deal.actualCloseDate ?? deal.projectedCloseDate)}</td>
                    <td className="pl-3 pr-4">
                      {(deal.progress?.length ?? 0) > 0 ? (
                        <div className="flex w-32 items-center gap-2">
                          <Progress value={pct} className="h-1.5" indicatorClassName={pct === 100 ? "bg-success" : undefined} />
                          <span className="tabular w-8 text-right text-[11.5px] text-ink-3">{pct}%</span>
                        </div>
                      ) : (
                        <Badge tone="outline">Market comp</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <NewDealDialog open={newOpen} onOpenChange={setNewOpen} onCreated={(id) => navigate(`/deals/${id}`)} />
    </div>
  );
}
