import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownUp, Building2, LayoutGrid, Plus, Rows3, Search, SearchX, X } from "lucide-react";
import type { VerificationStatus } from "@/types";
import { useBreadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState, PageHeader } from "@/components/shared/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { Tabs, SegmentedList, SegmentedTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";
import { COMPANY_TYPES, COMPANY_TYPE_LABEL, FACILITY_TYPE_LABEL, US_STATES, VERIFICATION_LABEL, VERIFICATION_STATUSES } from "@/lib/labels";
import { fmtNumber, fmtPct } from "@/lib/format";
import {
  applyFilters,
  DEAL_ASSOCIATION_LABEL,
  EMPTY_FILTERS,
  sortRows,
  useDirectoryRows,
  type DealAssociation,
  type DirectoryFilters,
  type SortKey,
} from "./useDirectoryRows";
import { BedRangeFilter, FilterChip, MultiSelectFilter } from "./FilterControls";
import { BuildingCards, BuildingsTable } from "./BuildingsTable";
import { AddBuildingDialog } from "../add/AddBuildingDialog";

const PREFS_KEY = "owner-docket:directory-prefs";

function loadPrefs(): { view: "table" | "cards"; filters: DirectoryFilters; sort: { key: SortKey; dir: "asc" | "desc" } } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { view: p.view ?? "table", filters: { ...EMPTY_FILTERS, ...p.filters }, sort: p.sort ?? { key: "name", dir: "asc" } };
    }
  } catch {
    /* ignore */
  }
  return { view: "table", filters: EMPTY_FILTERS, sort: { key: "name", dir: "asc" } };
}

const SORT_OPTIONS: { key: SortKey; label: string; dir: "asc" | "desc" }[] = [
  { key: "name", label: "Facility name", dir: "asc" },
  { key: "updated", label: "Recently updated", dir: "desc" },
  { key: "beds", label: "Certified beds", dir: "desc" },
  { key: "rating", label: "CMS rating", dir: "desc" },
  { key: "location", label: "State / city", dir: "asc" },
  { key: "deals", label: "Deal activity", dir: "desc" },
  { key: "verification", label: "Verification status", dir: "asc" },
];

export function BuildingsDirectory() {
  useBreadcrumbs([{ label: "Buildings" }]);
  const navigate = useNavigate();
  const rows = useDirectoryRows();
  const initial = useMemo(loadPrefs, []);
  const [view, setView] = useState<"table" | "cards">(initial.view);
  const [filters, setFilters] = useState<DirectoryFilters>(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ view, filters: { ...filters, q: "" }, sort }));
    } catch {
      /* ignore */
    }
  }, [view, filters, sort]);

  const filtered = useMemo(() => sortRows(applyFilters(rows, filters), sort.key, sort.dir), [rows, filters, sort]);

  const set = <K extends keyof DirectoryFilters>(k: K, v: DirectoryFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "location" || key === "operator" ? "asc" : "desc" }));

  // Options with counts from the full dataset
  const count = (fn: (r: (typeof rows)[number]) => boolean) => rows.filter(fn).length;
  const stateOpts = [...new Set(rows.map((r) => r.building.address.state))].sort().map((s) => ({ value: s, label: `${US_STATES[s] ?? s} (${s})`, count: count((r) => r.building.address.state === s) }));
  const typeOpts = [...new Set(rows.map((r) => r.building.facilityType))].map((t) => ({ value: t, label: FACILITY_TYPE_LABEL[t], count: count((r) => r.building.facilityType === t) }));
  const operatorOpts = [...new Set(rows.map((r) => r.operator).filter(Boolean) as string[])].sort().map((o) => ({ value: o, label: o, count: count((r) => r.operator === o) }));
  const ownerTypeOpts = [
    ...COMPANY_TYPES.map((t) => ({ value: t as string, label: COMPANY_TYPE_LABEL[t], count: count((r) => r.ownerType === t) })),
    { value: "none", label: "Not set / unknown", count: count((r) => !r.ownerType) },
  ];
  const ratingOpts = [
    ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${"★".repeat(n)}${"☆".repeat(5 - n)}  ${n} star${n > 1 ? "s" : ""}`, count: count((r) => r.rating === n) })),
    { value: "none", label: "Not CMS-rated", count: count((r) => !r.rating) },
  ];
  const dealOpts = (["active", "owned", "historical", "none"] as DealAssociation[]).map((d) => ({ value: d, label: DEAL_ASSOCIATION_LABEL[d], count: count((r) => r.dealAssociation === d) }));
  const verifOpts = VERIFICATION_STATUSES.map((v) => ({ value: v, label: VERIFICATION_LABEL[v], count: count((r) => r.building.verificationStatus === v) }));

  const chips: { label: string; remove: () => void }[] = [
    ...filters.states.map((s) => ({ label: s, remove: () => set("states", filters.states.filter((x) => x !== s)) })),
    ...filters.types.map((t) => ({ label: FACILITY_TYPE_LABEL[t as keyof typeof FACILITY_TYPE_LABEL], remove: () => set("types", filters.types.filter((x) => x !== t)) })),
    ...filters.operators.map((o) => ({ label: o, remove: () => set("operators", filters.operators.filter((x) => x !== o)) })),
    ...filters.ownerTypes.map((o) => ({ label: `Owner: ${o === "none" ? "type not set" : COMPANY_TYPE_LABEL[o as keyof typeof COMPANY_TYPE_LABEL]}`, remove: () => set("ownerTypes", filters.ownerTypes.filter((x) => x !== o)) })),
    ...filters.ratings.map((o) => ({ label: o === "none" ? "Not CMS-rated" : `${o}★`, remove: () => set("ratings", filters.ratings.filter((x) => x !== o)) })),
    ...filters.deal.map((o) => ({ label: DEAL_ASSOCIATION_LABEL[o], remove: () => set("deal", filters.deal.filter((x) => x !== o)) })),
    ...filters.verification.map((o) => ({ label: VERIFICATION_LABEL[o], remove: () => set("verification", filters.verification.filter((x) => x !== o)) })),
    ...(filters.bedsMin !== undefined || filters.bedsMax !== undefined
      ? [{ label: `Beds ${filters.bedsMin ?? 0}–${filters.bedsMax ?? "∞"}`, remove: () => setFilters((f) => ({ ...f, bedsMin: undefined, bedsMax: undefined })) }]
      : []),
  ];
  const hasFilters = chips.length > 0 || filters.q.trim() !== "";

  // Summary metrics reflect the current (filtered) set.
  const metrics = useMemo(() => {
    const beds = filtered.reduce((a, r) => a + r.building.certifiedBeds.value, 0);
    const adc = filtered.reduce((a, r) => a + r.building.averageDailyCensus.value, 0);
    const rated = filtered.filter((r) => r.rating);
    const avgRating = rated.length ? rated.reduce((a, r) => a + (r.rating ?? 0), 0) / rated.length : null;
    return {
      beds,
      occ: beds ? (adc / beds) * 100 : null,
      avgRating,
      inDeals: filtered.filter((r) => r.dealAssociation === "active").length,
      needsAttention: filtered.filter((r) => (["needs_review", "unverified"] as VerificationStatus[]).includes(r.building.verificationStatus)).length,
      states: new Set(filtered.map((r) => r.building.address.state)).size,
    };
  }, [filtered]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sort.key)?.label ?? "Facility name";

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 lg:px-8">
      <PageHeader
        title="Buildings"
        subtitle="Centralized facility intelligence across your acquisition pipeline and portfolio."
        actions={
          <Button variant="accent" onClick={() => setAddOpen(true)}>
            <Plus /> Add Building
          </Button>
        }
      />

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Facilities", value: fmtNumber(filtered.length), sub: `${metrics.states} states` },
          { label: "Certified beds", value: fmtNumber(metrics.beds), sub: `Avg ${filtered.length ? Math.round(metrics.beds / filtered.length) : 0} per facility` },
          { label: "Weighted occupancy", value: fmtPct(metrics.occ), sub: "ADC ÷ certified beds" },
          { label: "Avg. CMS rating", value: metrics.avgRating ? `${metrics.avgRating.toFixed(1)} ★` : "—", sub: "CMS-certified only (mock)" },
          { label: "In active deals", value: fmtNumber(metrics.inDeals), sub: "Pipeline facilities" },
          { label: "Needs verification", value: fmtNumber(metrics.needsAttention), sub: "Unverified or flagged" },
        ].map((m) => (
          <div key={m.label} className="bg-background px-4 py-3">
            <div className="text-[11.5px] font-medium text-ink-3">{m.label}</div>
            <div className="tabular mt-0.5 text-[19px] font-semibold tracking-[-0.02em]">{m.value}</div>
            <div className="truncate text-[11px] text-ink-4">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background shadow-card">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-3 xl:flex-row xl:items-center">
          <div className="relative w-full xl:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
            <Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Search name, city, provider #, owner…" className="pl-8 pr-8" />
            {filters.q && (
              <button onClick={() => set("q", "")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink" aria-label="Clear search">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <MultiSelectFilter label="State" options={stateOpts} selected={filters.states} onChange={(v) => set("states", v)} />
            <MultiSelectFilter label="Type" options={typeOpts} selected={filters.types} onChange={(v) => set("types", v)} />
            <MultiSelectFilter label="Owner type" options={ownerTypeOpts} selected={filters.ownerTypes} onChange={(v) => set("ownerTypes", v)} />
            <MultiSelectFilter label="Operator" options={operatorOpts} selected={filters.operators} onChange={(v) => set("operators", v)} />
            <MultiSelectFilter label="CMS rating" options={ratingOpts} selected={filters.ratings} onChange={(v) => set("ratings", v)} />
            <BedRangeFilter min={filters.bedsMin} max={filters.bedsMax} onChange={(mn, mx) => setFilters((f) => ({ ...f, bedsMin: mn, bedsMax: mx }))} />
            <MultiSelectFilter label="Deals" options={dealOpts} selected={filters.deal} onChange={(v) => set("deal", v)} />
            <MultiSelectFilter label="Verification" options={verifOpts} selected={filters.verification} onChange={(v) => set("verification", v as VerificationStatus[])} />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default" className="text-[12.5px]">
                  <ArrowDownUp className="!size-3.5" /> {currentSortLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sort.key}
                  onValueChange={(k) => {
                    const o = SORT_OPTIONS.find((x) => x.key === k)!;
                    setSort({ key: o.key, dir: o.dir });
                  }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem key={o.key} value={o.key}>
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sort.dir} onValueChange={(d) => setSort((s) => ({ ...s, dir: d as "asc" | "desc" }))}>
                  <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tabs value={view} onValueChange={(v) => setView(v as "table" | "cards")}>
              <SegmentedList>
                <SegmentedTrigger value="table" aria-label="Table view">
                  <Rows3 /> <span className="hidden sm:inline">Table</span>
                </SegmentedTrigger>
                <SegmentedTrigger value="cards" aria-label="Card view">
                  <LayoutGrid /> <span className="hidden sm:inline">Cards</span>
                </SegmentedTrigger>
              </SegmentedList>
            </Tabs>
          </div>
        </div>

        {/* Result summary + chips */}
        <div className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs text-ink-3">
          <span>
            Showing <span className="tabular font-medium text-ink">{filtered.length}</span> of <span className="tabular">{rows.length}</span> facilities
          </span>
          {chips.length > 0 && <span className="h-3.5 w-px bg-border" />}
          {chips.map((c) => (
            <FilterChip key={c.label} label={c.label} onRemove={c.remove} />
          ))}
          {hasFilters && (
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="ml-1 font-medium text-accent hover:underline">
              Clear all
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No buildings yet"
              description="Add your first facility from CMS records, by provider number, or manually."
              action={
                <Button variant="accent" onClick={() => setAddOpen(true)}>
                  <Plus /> Add Building
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="No facilities match these filters"
              description="Try removing a filter or broadening your search. You can also add a new building if it isn't in the repository yet."
              action={
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Clear filters
                  </Button>
                  <Button variant="accent" onClick={() => setAddOpen(true)}>
                    <Plus /> Add Building
                  </Button>
                </div>
              }
            />
          )
        ) : view === "table" ? (
          <BuildingsTable rows={filtered} sort={sort} onSort={onSort} />
        ) : (
          <BuildingCards rows={filtered} />
        )}
      </div>

      <AddBuildingDialog open={addOpen} onOpenChange={setAddOpen} onCreated={(id) => navigate(`/buildings/${id}`)} />
    </div>
  );
}
