import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronsUpDown, Plus, Search, SearchX, Star, Users, X } from "lucide-react";
import type { Contact, ContactType, Sector } from "@/types";
import { useBreadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState, PageHeader } from "@/components/shared/layout";
import { Button } from "@/components/ui/button";
import { Badge, Input } from "@/components/ui/primitives";
import { useData } from "@/store/DataProvider";
import { companyDeals } from "@/store/selectors";
import { CONTACT_TYPES, CONTACT_TYPE_LABEL, SECTORS, SECTOR_LABEL } from "@/lib/labels";
import { fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FilterChip, MultiSelectFilter } from "@/features/buildings/directory/FilterControls";
import { CompanyLogo, CompanyTypeBadge, ContactPhoto } from "@/features/crm/components";
import { ContactTypeBadge, SectorBadges } from "@/features/crm/contactBadges";
import { EditContactSheet, type ContactSheetTarget } from "@/features/crm/EditContactSheet";

interface Filters {
  q: string;
  types: ContactType[];
  sectors: Sector[];
  companies: string[];
  tags: string[];
}
const EMPTY: Filters = { q: "", types: [], sectors: [], companies: [], tags: [] };
type SortKey = "name" | "company" | "type" | "deals";
const PREFS_KEY = "owner-docket:contacts-prefs";

function loadPrefs(): { filters: Filters; sort: { key: SortKey; dir: "asc" | "desc" } } {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
    if (p) return { filters: { ...EMPTY, ...p.filters, q: "" }, sort: p.sort ?? { key: "name", dir: "asc" } };
  } catch {
    /* ignore */
  }
  return { filters: EMPTY, sort: { key: "name", dir: "asc" } };
}

export function ContactsDirectory() {
  useBreadcrumbs([{ label: "Contacts" }]);
  const { state } = useData();
  const navigate = useNavigate();
  const initial = useMemo(loadPrefs, []);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [sheet, setSheet] = useState<ContactSheetTarget>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ filters, sort }));
    } catch {
      /* ignore */
    }
  }, [filters, sort]);

  const rows = useMemo(() => {
    const dealCache = new Map<string, ReturnType<typeof companyDeals>>();
    return state.contacts.map((c) => {
      const org = state.organizations.find((o) => o.id === c.organizationId);
      if (!dealCache.has(c.organizationId)) dealCache.set(c.organizationId, companyDeals(state, c.organizationId));
      const deals = dealCache.get(c.organizationId)!;
      return { c, org, active: deals.filter((d) => d.deal.status === "active").length, total: deals.length, primary: org?.primaryContactId === c.id };
    });
  }, [state]);

  const filtered = useMemo(() => {
    const t = filters.q.trim().toLowerCase();
    const out = rows.filter(({ c, org }) => {
      if (t && ![c.name, c.title, c.email, c.mobilePhone ?? "", c.phone, org?.name ?? "", ...(c.tags ?? [])].join(" ").toLowerCase().includes(t)) return false;
      if (filters.types.length && !filters.types.includes(c.contactType)) return false;
      if (filters.sectors.length && !filters.sectors.some((s) => c.sectors.includes(s))) return false;
      if (filters.companies.length && !filters.companies.includes(c.organizationId)) return false;
      if (filters.tags.length && !filters.tags.some((g) => c.tags?.includes(g))) return false;
      return true;
    });
    const m = sort.dir === "asc" ? 1 : -1;
    const val = (r: (typeof rows)[number]): string | number =>
      sort.key === "name" ? r.c.name.toLowerCase() : sort.key === "company" ? (r.org?.name ?? "~").toLowerCase() : sort.key === "type" ? CONTACT_TYPE_LABEL[r.c.contactType] : r.active * 100 + r.total;
    return [...out].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * m);
  }, [rows, filters, sort]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const count = (fn: (c: Contact) => boolean) => state.contacts.filter(fn).length;
  const typeOpts = CONTACT_TYPES.map((t) => ({ value: t, label: CONTACT_TYPE_LABEL[t], count: count((c) => c.contactType === t) }));
  const sectorOpts = SECTORS.map((s) => ({ value: s, label: SECTOR_LABEL[s], count: count((c) => c.sectors.includes(s)) }));
  const companyOpts = [...new Set(state.contacts.map((c) => c.organizationId))]
    .map((id) => state.organizations.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => !!o)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((o) => ({ value: o.id, label: o.name, count: count((c) => c.organizationId === o.id) }));
  const tagOpts = [...new Set(state.contacts.flatMap((c) => c.tags ?? []))].sort().map((g) => ({ value: g, label: g, count: count((c) => !!c.tags?.includes(g)) }));

  const chips = [
    ...filters.types.map((v) => ({ label: CONTACT_TYPE_LABEL[v], remove: () => set("types", filters.types.filter((x) => x !== v)) })),
    ...filters.sectors.map((v) => ({ label: SECTOR_LABEL[v], remove: () => set("sectors", filters.sectors.filter((x) => x !== v)) })),
    ...filters.companies.map((v) => ({ label: state.organizations.find((o) => o.id === v)?.name ?? v, remove: () => set("companies", filters.companies.filter((x) => x !== v)) })),
    ...filters.tags.map((v) => ({ label: `#${v}`, remove: () => set("tags", filters.tags.filter((x) => x !== v)) })),
  ];

  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "deals" ? "desc" : "asc" }));
  const SortHead = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn("h-9 whitespace-nowrap px-3 text-left text-[11.5px] font-medium text-ink-3", className)}>
      <button onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 hover:text-ink", sort.key === k && "text-ink")}>
        {children}
        {sort.key === k ? sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-40" />}
      </button>
    </th>
  );

  const metrics = [
    { label: "Contacts", value: state.contacts.length, sub: `${new Set(state.contacts.map((c) => c.organizationId)).size} companies` },
    { label: "Investors / capital", value: count((c) => c.contactType === "investor"), sub: "Owners, lenders, investors" },
    { label: "Operators", value: count((c) => c.contactType === "operator"), sub: "Facility operators" },
    { label: "Brokers & lawyers", value: count((c) => c.contactType === "broker" || c.contactType === "lawyer"), sub: "Transaction advisors" },
    { label: "Vendors", value: count((c) => c.contactType === "vendor_dd" || c.contactType === "vendor_operating"), sub: "Diligence & operating" },
    { label: "In active deals", value: rows.filter((r) => r.active > 0).length, sub: "Via their company" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 lg:px-8">
      <PageHeader
        title="Contacts"
        subtitle="People across owners, operators, capital providers, brokers, lawyers and vendors."
        actions={
          <Button variant="accent" onClick={() => setSheet({ mode: "new" })}>
            <Plus /> Add Contact
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-background px-4 py-3">
            <div className="text-[11.5px] font-medium text-ink-3">{m.label}</div>
            <div className="tabular mt-0.5 text-[19px] font-semibold tracking-[-0.02em]">{fmtNumber(m.value)}</div>
            <div className="truncate text-[11px] text-ink-4">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
            <Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Search name, company, email, tag…" className="pl-8 pr-8" />
            {filters.q && (
              <button onClick={() => set("q", "")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink" aria-label="Clear search">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <MultiSelectFilter label="Contact type" options={typeOpts} selected={filters.types} onChange={(v) => set("types", v)} />
            <MultiSelectFilter label="Sector" options={sectorOpts} selected={filters.sectors} onChange={(v) => set("sectors", v)} />
            <MultiSelectFilter label="Company" options={companyOpts} selected={filters.companies} onChange={(v) => set("companies", v)} />
            <MultiSelectFilter label="Tags" options={tagOpts} selected={filters.tags} onChange={(v) => set("tags", v)} />
          </div>
        </div>
        <div className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs text-ink-3">
          <span>
            Showing <span className="tabular font-medium text-ink">{filtered.length}</span> of <span className="tabular">{state.contacts.length}</span> contacts
          </span>
          {chips.length > 0 && <span className="h-3.5 w-px bg-border" />}
          {chips.map((c) => (
            <FilterChip key={c.label} label={c.label} onRemove={c.remove} />
          ))}
          {(chips.length > 0 || filters.q) && (
            <button onClick={() => setFilters(EMPTY)} className="ml-1 font-medium text-accent hover:underline">
              Clear all
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          state.contacts.length === 0 ? (
            <EmptyState icon={Users} title="No contacts yet" description="Add the people you work with across owners, operators, lenders and advisors." action={<Button variant="accent" onClick={() => setSheet({ mode: "new" })}><Plus /> Add Contact</Button>} />
          ) : (
            <EmptyState icon={SearchX} title="No contacts match" description="Try removing a filter or searching by company." action={<Button variant="outline" onClick={() => setFilters(EMPTY)}>Clear filters</Button>} />
          )
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-canvas/70">
                  <SortHead k="name" className="pl-4">Name</SortHead>
                  <SortHead k="company">Company</SortHead>
                  <SortHead k="type">Contact type</SortHead>
                  <th className="h-9 px-3 text-left text-[11.5px] font-medium text-ink-3">Sector</th>
                  <th className="h-9 px-3 text-left text-[11.5px] font-medium text-ink-3">Email / phone</th>
                  <SortHead k="deals" className="pr-4">Deals</SortHead>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ c, org, active, total, primary }) => (
                  <tr key={c.id} onClick={() => navigate(`/contacts/${c.id}`)} className="group cursor-pointer border-b border-border/80 last:border-0 hover:bg-canvas">
                    <td className="py-2.5 pl-4 pr-3">
                      <div className="flex items-center gap-2.5">
                        <ContactPhoto name={c.name} dataUrl={c.photoDataUrl} size={32} />
                        <div className="min-w-0">
                          <Link to={`/contacts/${c.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 font-medium text-ink decoration-ink-4/50 underline-offset-2 group-hover:underline">
                            {c.name}
                            {primary && <Star className="size-3 fill-star text-star" aria-label="Primary contact for company" />}
                          </Link>
                          <div className="truncate text-[11.5px] text-ink-3">{c.title || "—"}</div>
                          {(c.tags?.length ?? 0) > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {c.tags!.slice(0, 2).map((g) => (
                                <Badge key={g} className="text-[10.5px]">
                                  {g}
                                </Badge>
                              ))}
                              {c.tags!.length > 2 && <span className="text-[11px] text-ink-4">+{c.tags!.length - 2}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      {org ? (
                        <div className="flex items-center gap-2">
                          <CompanyLogo org={org} size={24} />
                          <div className="min-w-0">
                            <div className="max-w-[170px] truncate text-ink-2">{org.name}</div>
                            {org.companyType && <CompanyTypeBadge type={org.companyType} className="mt-0.5 text-[10.5px]" />}
                          </div>
                        </div>
                      ) : (
                        <span className="text-ink-4">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3">
                      <ContactTypeBadge type={c.contactType} />
                    </td>
                    <td className="px-3">
                      <SectorBadges sectors={c.sectors} className="flex-nowrap" />
                    </td>
                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                      <a href={`mailto:${c.email}`} className="block max-w-[180px] truncate text-accent hover:underline">
                        {c.email}
                      </a>
                      <div className="text-[11.5px] text-ink-3">{c.mobilePhone ? `m ${c.mobilePhone}` : c.phone}</div>
                    </td>
                    <td className="tabular whitespace-nowrap px-3 pr-4">
                      {total ? (
                        <span>
                          <span className={cn("font-medium", active ? "text-accent" : "text-ink-2")}>{active} active</span>
                          <span className="text-ink-4"> · {total - active} past</span>
                        </span>
                      ) : (
                        <span className="text-ink-4">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditContactSheet target={sheet} onOpenChange={(o) => !o && setSheet(null)} onSaved={(id, isNew) => isNew && navigate(`/contacts/${id}`)} />
    </div>
  );
}
