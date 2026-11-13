import { AlertTriangle, ArrowRight, Briefcase, Camera, CheckCircle2, ClipboardCheck, FileText, Hammer, Info, Landmark, Plus, ShieldAlert, Users } from "lucide-react";
import type { AttentionItem } from "@/store/selectors";
import { useData } from "@/store/DataProvider";
import { Button } from "@/components/ui/button";
import { Badge, Progress } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import { Avatar, EmptyState, Field, FieldGrid, Section } from "@/components/shared/layout";
import { ConditionBadge, ConditionMeter, DealStageBadge, DealStatusBadge, SourceIndicator } from "@/components/shared/badges";
import { MapPreview } from "@/components/shared/MapPreview";
import { CORE_SYSTEMS, DEAL_ROLE_LABEL, FACILITY_TYPE_LABEL, IDENTIFIER_LABEL, OWNERSHIP_ROLE_LABEL, SITE_VISIT_TYPE_LABEL, SYSTEM_LABEL } from "@/lib/labels";
import { daysUntil, fmtCurrency, fmtDate, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBuildingPage } from "../context";
import { PhotoTile } from "../components/PhotoTile";
import { PhotoCarousel } from "@/features/crm/PhotoCarousel";
import { CompanyTypeBadge } from "@/features/crm/components";

export function OverviewTab() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <FacilityInformation />
        <PhotosSection />
        <OwnershipOperations />
        <RelatedDeals />
        <div className="grid gap-5 2xl:grid-cols-2">
          <BuildingCondition />
          <RecentSiteVisits />
        </div>
      </div>
      <div className="min-w-0 space-y-5">
        <AttentionRequired />
        <DocumentsSummary />
        <LocationCard />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function FacilityInformation() {
  const { bundle, openEdit } = useBuildingPage();
  const b = bundle.building;
  const ids = b.identifiers.filter((i) => i.isCurrent);
  return (
    <Section
      title="Facility information"
      description="Permanent building attributes, independent of any deal"
      actions={
        <Button variant="ghost" size="sm" onClick={openEdit}>
          Edit
        </Button>
      }
    >
      <FieldGrid cols={3}>
        <Field label="Facility name">{b.name}</Field>
        <Field label="Alternate names">{b.alternateNames.length ? b.alternateNames.join(", ") : <span className="text-ink-4">None recorded</span>}</Field>
        <Field label="Facility type">{FACILITY_TYPE_LABEL[b.facilityType]}</Field>
        <Field label="Address" className="sm:col-span-2">
          {b.address.street ? `${b.address.street}, ` : ""}
          {b.address.city}, {b.address.state} {b.address.zip}
        </Field>
        <Field label="County">{b.address.county || "—"}</Field>
        {ids.map((i) => (
          <Field key={i.id} label={i.type === "cms_ccn" ? "CMS provider number" : IDENTIFIER_LABEL[i.type]}>
            <span className="font-mono text-[12.5px]">{i.value}</span>
            {i.type === "cms_ccn" && <span className="ml-1.5 text-[11.5px] text-ink-4">since {fmtDate(i.effectiveFrom)}</span>}
          </Field>
        ))}
        <Field label="Construction year" aside={<SourceIndicator meta={b.yearBuilt.meta} />}>
          {b.yearBuilt.value ?? <span className="text-ink-4">Unknown</span>}
        </Field>
        <Field label="Square footage" aside={<SourceIndicator meta={b.squareFeet.meta} />}>
          {b.squareFeet.value ? `${fmtNumber(b.squareFeet.value)} sf` : <span className="text-ink-4">Unknown</span>}
        </Field>
        <Field label="Bed counts" aside={<SourceIndicator meta={b.licensedBeds.meta} />}>
          {b.certifiedBeds.value} certified · {b.licensedBeds.value} licensed
        </Field>
        <Field label="Room mix">
          {b.privateRooms !== null ? `${b.privateRooms} private · ${b.semiPrivateRooms} semi-private` : <span className="text-ink-4">Not recorded</span>}
        </Field>
        <Field label="Stories / site">
          {b.stories ? `${b.stories} ${b.stories > 1 ? "stories" : "story"}` : "—"}
          {b.acreage ? ` · ${b.acreage} acres` : ""}
        </Field>
        <Field label="Last verified">{b.lastVerifiedAt ? fmtDate(b.lastVerifiedAt) : <span className="text-warning">Never verified</span>}</Field>
      </FieldGrid>
      <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-[11.5px] text-ink-4">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" /> Verified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-warning" /> Needs review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-border-strong" /> Unverified
        </span>
        <span className="hidden sm:inline">· Hover a dot for source & date</span>
      </div>
    </Section>
  );
}

function PhotosSection() {
  const { bundle } = useBuildingPage();
  return <PhotoCarousel building={bundle.building} />;
}

// ---------------------------------------------------------------------------

function OwnershipOperations() {
  const { bundle, goTab } = useBuildingPage();
  const { state } = useData();
  const { ownership, relationships } = bundle;
  const keyContacts = relationships
    .filter((r) => (r.role === "key_contact" || r.role === "administrator") && r.contactId)
    .map((r) => ({ r, c: state.contacts.find((c) => c.id === r.contactId)! }))
    .filter((x) => x.c);
  const history = ownership.records.filter((o) => !o.isCurrent).sort((a, b) => b.startDate.localeCompare(a.startDate));

  const roles = [
    { label: "Property owner", org: ownership.owner, record: ownership.records.find((o) => o.isCurrent && o.role === "property_owner") },
    { label: "Operator", org: ownership.operator, record: ownership.records.find((o) => o.isCurrent && o.role === "operator") },
    { label: "Parent organization", org: ownership.parent, record: ownership.records.find((o) => o.isCurrent && o.role === "parent_organization") },
    { label: "Management company", org: ownership.management, record: ownership.records.find((o) => o.isCurrent && o.role === "management_company") },
  ];

  return (
    <Section
      title="Ownership & operations"
      icon={Landmark}
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={() => goTab("owner")}>
            Owner profile <ArrowRight />
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => goTab("relationships")}>
            All relationships
          </Button>
        </>
      }
    >
      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((r) => (
          <div key={r.label} className="bg-background p-3">
            <div className="flex items-center gap-1 text-[11.5px] font-medium text-ink-4">
              {r.label}
              {r.record && <SourceIndicator meta={r.record.meta} />}
            </div>
            {r.org ? (
              <>
                <div className="mt-1 text-[13px] font-medium leading-snug text-ink">{r.org.name}</div>
                {r.label === "Property owner" && <CompanyTypeBadge type={r.org.companyType} className="mt-1" />}
                <div className="mt-0.5 text-[11.5px] text-ink-3">
                  {r.org.hqCity}, {r.org.hqState}
                  {r.record && ` · since ${new Date(r.record.startDate).getFullYear()}`}
                </div>
              </>
            ) : (
              <div className="mt-1 text-[13px] text-ink-4">{r.label === "Parent organization" || r.label === "Management company" ? "None / self-managed" : "Unknown"}</div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
            <Users className="size-3.5" /> Key contacts
          </div>
          {keyContacts.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-ink-4">No key contacts linked yet.</div>
          ) : (
            <div className="space-y-2">
              {keyContacts.map(({ r, c }) => (
                <div key={r.id} className="flex items-center gap-2.5">
                  <Avatar name={c.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">{c.name}</div>
                    <div className="truncate text-[11.5px] text-ink-3">
                      {c.title} · {state.organizations.find((o) => o.id === c.organizationId)?.name}
                    </div>
                  </div>
                  <a href={`mailto:${c.email}`} className="hidden text-[11.5px] text-accent hover:underline sm:block">
                    {c.email}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 text-[12px] font-medium text-ink-3">Ownership history</div>
          {history.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-ink-4">No prior ownership changes recorded.</div>
          ) : (
            <ol className="relative space-y-3 border-l border-border pl-4">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full border-2 border-background bg-border-strong" />
                  <div className="text-[13px] text-ink">{state.organizations.find((o) => o.id === h.organizationId)?.name}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {OWNERSHIP_ROLE_LABEL[h.role]} · {fmtDate(h.startDate)} – {fmtDate(h.endDate)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------

function RelatedDeals() {
  const { bundle, openDeal, openAddToDeal } = useBuildingPage();
  return (
    <Section
      title="Related deals"
      icon={Briefcase}
      description={`${bundle.deals.filter((d) => d.deal.status === "active").length} active · ${bundle.deals.length} total`}
      flush
      actions={
        <Button variant="ghost" size="sm" onClick={openAddToDeal}>
          <Plus /> Add to deal
        </Button>
      }
    >
      {bundle.deals.length === 0 ? (
        <EmptyState
          compact
          icon={Briefcase}
          title="Not part of any deal"
          description="This building is tracked in the repository but has no active or historical transactions."
          action={
            <Button size="sm" variant="outline" onClick={openAddToDeal}>
              <Plus /> Add to deal
            </Button>
          }
        />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
                <th className="h-8 pl-4 pr-3 font-medium">Deal</th>
                <th className="px-3 font-medium">Stage</th>
                <th className="px-3 font-medium">Building role</th>
                <th className="px-3 text-right font-medium">Price allocation</th>
                <th className="px-3 font-medium">Projected close</th>
                <th className="pl-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bundle.deals.map(({ deal, rel }) => {
                const inactive = deal.status === "dead" || deal.status === "abandoned";
                const n = daysUntil(deal.actualCloseDate ?? deal.projectedCloseDate);
                return (
                  <tr key={rel.id} onClick={() => openDeal(deal.id)} className={cn("cursor-pointer border-b border-border/70 last:border-0 hover:bg-canvas", inactive && "text-ink-3")}>
                    <td className="py-2.5 pl-4 pr-3">
                      <div className={cn("font-medium", inactive ? "text-ink-3" : "text-ink")}>{deal.name}</div>
                      <div className="text-[11.5px] text-ink-4">
                        {deal.code} · {deal.type === "portfolio" ? "Portfolio" : "Single asset"}
                        {deal.skippedLoi && " · Skipped LOI"}
                      </div>
                    </td>
                    <td className="px-3">
                      <DealStageBadge stage={deal.stage} status={deal.status} />
                    </td>
                    <td className="px-3 text-ink-2">{DEAL_ROLE_LABEL[rel.role]}</td>
                    <td className="tabular px-3 text-right">
                      {rel.priceAllocation ? (
                        <Tooltip content={rel.allocationBasis}>
                          <span className="cursor-help">{fmtCurrency(rel.priceAllocation, { compact: true })}</span>
                        </Tooltip>
                      ) : (
                        <span className="text-ink-4">—</span>
                      )}
                    </td>
                    <td className="px-3">
                      {deal.actualCloseDate ? (
                        <span>Closed {fmtDate(deal.actualCloseDate)}</span>
                      ) : deal.projectedCloseDate ? (
                        <span>
                          {fmtDate(deal.projectedCloseDate)}
                          {deal.status === "active" && n !== null && n >= 0 && <span className="ml-1 text-[11.5px] text-ink-4">({n}d)</span>}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="pl-3 pr-4">
                      <DealStatusBadge status={deal.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

function BuildingCondition() {
  const { bundle, goTab } = useBuildingPage();
  const c = bundle.condition;
  if (!c) {
    return (
      <Section title="Building condition" icon={Hammer}>
        <EmptyState compact icon={Hammer} title="No condition assessment" description="Record a site visit or upload a property condition assessment to populate building systems." action={<Button size="sm" variant="outline" onClick={() => goTab("site-visits")}>Record site visit</Button>} />
      </Section>
    );
  }
  const deferred = c.deferredMaintenance.reduce((a, d) => a + d.estimatedCost, 0);
  const immediate = c.deferredMaintenance.filter((d) => d.priority === "immediate").reduce((a, d) => a + d.estimatedCost, 0);
  const lastReno = [...c.renovations].sort((a, b) => b.year - a.year)[0];
  return (
    <Section
      title="Building condition"
      icon={Hammer}
      description={`${c.assessedBy} · ${fmtDate(c.assessmentDate)}`}
      actions={
        <Button variant="ghost" size="sm" onClick={() => goTab("property")}>
          Details <ArrowRight />
        </Button>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] text-ink-3">Overall condition</span>
        <ConditionBadge rating={c.overall} />
      </div>
      <div className="divide-y divide-border/70">
        {CORE_SYSTEMS.map((sys) => {
          const s = c.systems.find((x) => x.system === sys);
          if (!s) return null;
          return (
            <div key={sys} className="flex items-center justify-between gap-3 py-2">
              <Tooltip content={s.notes}>
                <span className="cursor-help text-[13px] text-ink-2">{SYSTEM_LABEL[sys]}</span>
              </Tooltip>
              <div className="flex items-center gap-3">
                <span className="hidden text-[11.5px] text-ink-4 sm:inline">{s.remainingUsefulLifeYrs !== undefined ? `${s.remainingUsefulLifeYrs} yr RUL` : ""}</span>
                <ConditionMeter rating={s.rating} />
                <span className="w-12 text-right text-[12px] font-medium text-ink-2">{s.rating[0].toUpperCase() + s.rating.slice(1)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
        <div>
          <div className="text-ink-4">Deferred maintenance</div>
          <div className="tabular mt-0.5 text-[14px] font-semibold text-ink">{fmtCurrency(deferred, { compact: true })}</div>
          {immediate > 0 && <div className="text-[11px] text-danger">{fmtCurrency(immediate, { compact: true })} immediate</div>}
        </div>
        <div>
          <div className="text-ink-4">Last renovation</div>
          <div className="mt-0.5 text-[13px] font-medium text-ink">{lastReno ? lastReno.year : "—"}</div>
          {lastReno && <div className="truncate text-[11px] text-ink-3">{lastReno.description}</div>}
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------

function RecentSiteVisits() {
  const { bundle, goTab } = useBuildingPage();
  const v = bundle.siteVisits[0];
  return (
    <Section
      title="Recent site visits"
      icon={ClipboardCheck}
      description={bundle.siteVisits.length ? `${bundle.siteVisits.length} visit${bundle.siteVisits.length > 1 ? "s" : ""} on record` : undefined}
      actions={
        <Button variant="ghost" size="sm" onClick={() => goTab("site-visits", v ? {} : { new: "1" })}>
          {v ? (
            <>
              All visits <ArrowRight />
            </>
          ) : (
            <>
              <Plus /> Record visit
            </>
          )}
        </Button>
      }
    >
      {!v ? (
        <EmptyState compact icon={Camera} title="No site visits yet" description="Capture participants, observations, condition ratings and photos from the next walkthrough." action={<Button size="sm" variant="outline" onClick={() => goTab("site-visits", { new: "1" })}><Plus /> Record site visit</Button>} />
      ) : (
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-medium text-ink">{fmtDate(v.date)}</div>
            <Badge tone="outline">{SITE_VISIT_TYPE_LABEL[v.type]}</Badge>
          </div>
          <div className="mt-1.5 flex -space-x-1.5">
            {v.participants.slice(0, 5).map((p, i) => (
              <Avatar key={`${p}-${i}`} name={p.replace(/\s*\(.*\)/, "")} size="sm" className="ring-2 ring-background" />
            ))}
            <span className="pl-3 text-[11.5px] leading-6 text-ink-3">{v.participants.length} participants</span>
          </div>
          <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink-2">{v.summary}</p>
          {v.photos.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {v.photos.slice(0, 4).map((p, i) => (
                <PhotoTile key={p.id} photo={p} seed={i + bundle.building.photoSeed} className="aspect-[4/3]" compact />
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 border-t border-border pt-2.5 text-[11.5px]">
            <span className={cn("flex items-center gap-1", v.observations.some((o) => o.status === "open") ? "text-warning" : "text-ink-3")}>
              <AlertTriangle className="size-3.5" />
              {v.observations.filter((o) => o.status === "open").length} open observations
            </span>
            <span className="flex items-center gap-1 text-ink-3">
              <CheckCircle2 className="size-3.5" />
              {v.followUps.filter((t) => t.done).length}/{v.followUps.length} follow-ups done
            </span>
          </div>
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

const KIND_ICON: Record<AttentionItem["kind"], typeof FileText> = {
  missing_doc: FileText,
  pending_review: ClipboardCheck,
  revision: FileText,
  unverified: Info,
  follow_up: CheckCircle2,
  observation: AlertTriangle,
  regulatory: ShieldAlert,
};

function AttentionRequired() {
  const { bundle, goTab, openEdit } = useBuildingPage();
  const items = bundle.attention;
  const high = items.filter((i) => i.severity === "high").length;
  const shown = items.slice(0, 7);
  return (
    <Section
      title="Attention required"
      icon={AlertTriangle}
      flush
      description={items.length ? `${items.length} items${high ? ` · ${high} high priority` : ""}` : "Nothing outstanding"}
      className={cn(high > 0 && "border-warning-line")}
    >
      {items.length === 0 ? (
        <EmptyState compact icon={CheckCircle2} title="All clear" description="No missing documents, unverified fields or open follow-ups." />
      ) : (
        <ul className="divide-y divide-border/70">
          {shown.map((it) => {
            const Icon = KIND_ICON[it.kind];
            return (
              <li key={it.id}>
                <button
                  onClick={() => (it.kind === "unverified" ? openEdit() : goTab(it.tab as never, it.targetId && it.tab === "documents" ? { doc: it.targetId } : {}))}
                  className="group flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-canvas"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                      it.severity === "high" ? "bg-danger-soft text-danger" : it.severity === "medium" ? "bg-warning-soft text-warning" : "bg-subtle text-ink-3",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[12.5px] font-medium leading-snug text-ink">{it.title}</span>
                    {it.detail && <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">{it.detail}</span>}
                  </span>
                  <ArrowRight className="mt-1 size-3.5 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </li>
            );
          })}
          {items.length > shown.length && (
            <li className="px-4 py-2 text-center">
              <button className="text-xs font-medium text-accent hover:underline" onClick={() => goTab("documents")}>
                +{items.length - shown.length} more — open Documents
              </button>
            </li>
          )}
        </ul>
      )}
    </Section>
  );
}

function DocumentsSummary() {
  const { bundle, goTab } = useBuildingPage();
  const s = bundle.docStats;
  const missingDocs = bundle.documents.filter((d) => d.required && ["not_requested", "requested", "rejected"].includes(d.status));
  return (
    <Section
      title="Documents"
      icon={FileText}
      actions={
        <Button variant="ghost" size="sm" onClick={() => goTab("documents")}>
          Open <ArrowRight />
        </Button>
      }
    >
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] text-ink-2">
          <span className="tabular text-[20px] font-semibold tracking-[-0.02em] text-ink">{s.requiredApproved}</span>
          <span className="text-ink-3"> of {s.required} required approved</span>
        </div>
        <span className="tabular text-[12px] font-medium text-ink-3">{s.pct}%</span>
      </div>
      <Progress value={s.pct} className="mt-2 h-2" indicatorClassName={s.pct === 100 ? "bg-success" : undefined} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: "Available", value: s.approved + s.pendingReview + s.needsRevision, tone: "text-ink", filter: undefined },
          { label: "Missing", value: s.missing, tone: s.missing ? "text-danger" : "text-ink", filter: "missing" },
          { label: "Pending review", value: s.pendingReview, tone: s.pendingReview ? "text-warning" : "text-ink", filter: "review" },
          { label: "Required total", value: s.required, tone: "text-ink", filter: undefined },
        ].map((x) => (
          <button
            key={x.label}
            onClick={() => goTab("documents", x.filter ? { view: x.filter } : {})}
            className="rounded-md border border-border px-2.5 py-2 text-left transition-colors hover:bg-canvas"
          >
            <div className="text-[11px] text-ink-4">{x.label}</div>
            <div className={cn("tabular text-[15px] font-semibold", x.tone)}>{x.value}</div>
          </button>
        ))}
      </div>
      {missingDocs.length > 0 && (
        <div className="mt-3">
          <div className="text-[11.5px] font-medium text-ink-4">Missing required</div>
          <ul className="mt-1 space-y-1">
            {missingDocs.slice(0, 4).map((d) => (
              <li key={d.id}>
                <button onClick={() => goTab("documents", { doc: d.id })} className="flex w-full items-center gap-2 text-left text-[12.5px] text-ink-2 hover:text-accent">
                  <span className="size-1 shrink-0 rounded-full bg-danger" />
                  <span className="truncate">{d.name}</span>
                  {d.isBaseline && <Badge tone="dark" className="ml-auto px-1 text-[10px]">Baseline</Badge>}
                </button>
              </li>
            ))}
            {missingDocs.length > 4 && <li className="text-[11.5px] text-ink-4">+{missingDocs.length - 4} more</li>}
          </ul>
        </div>
      )}
    </Section>
  );
}

function LocationCard() {
  const { bundle } = useBuildingPage();
  const b = bundle.building;
  return (
    <Section title="Location" flush className="xl:hidden">
      <MapPreview x={b.address.mapX} y={b.address.mapY} seed={b.photoSeed} className="h-40 rounded-none border-0" />
      <div className="px-4 py-3 text-[13px]">
        {b.address.street}
        <br />
        {b.address.city}, {b.address.state} {b.address.zip}
      </div>
    </Section>
  );
}
