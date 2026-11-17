import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronDown, ChevronUp, ExternalLink, FileSearch, FolderOpen, Handshake, Info, Plus, Trash2, Users, Wrench } from "lucide-react";
import type { BuyerSellerRole, Deal, ReportStatus, VendorRole } from "@/types";
import { useData } from "@/store/DataProvider";
import { dealView } from "@/store/selectors";
import { Button } from "@/components/ui/button";
import { Badge, Input, Textarea, type BadgeTone } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { EmptyState, Section } from "@/components/shared/layout";
import { FacilityImage } from "@/components/shared/FacilityImage";
import { useToast } from "@/components/ui/toast";
import {
  ASSET_CLASS_LABEL,
  BUYER_SELLER_ROLES,
  BUYER_SELLER_ROLE_LABEL,
  DEAL_KIND_LABEL,
  REPORT_STATUSES,
  REPORT_STATUS_LABEL,
  US_STATES,
  VENDOR_ROLES,
  VENDOR_ROLE_LABEL,
} from "@/lib/labels";
import { fmtCurrency, fmtDate, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/features/crm/components";
import { PhotoView } from "@/features/crm/PhotoCarousel";
import { DealProgressCard } from "./DealProgress";
import { SearchPicker, useContactItems } from "./SearchPicker";
import { AddBuildingsDialog } from "./AddBuildingsDialog";

export function DealOverview({ deal, onEdit, onProgress }: { deal: Deal; onEdit: () => void; onProgress: () => void }) {
  return (
    <div className="space-y-5">
      <DealProgressCard deal={deal} onOpen={onProgress} />
      <DealSummary deal={deal} onEdit={onEdit} />
      <div className="grid gap-5 2xl:grid-cols-2">
        <TeamTable deal={deal} side="buyer" />
        <TeamTable deal={deal} side="seller" />
      </div>
      <div className="grid gap-5 2xl:grid-cols-2">
        <VendorsTable deal={deal} />
        <ReportsTable deal={deal} />
      </div>
      <BuildingsTable deal={deal} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="grid grid-cols-[170px_1fr] items-start gap-3 border-b border-border/70 py-2.5 last:border-0">
      <dt className="flex items-center gap-1 text-[12.5px] text-ink-3">
        {label}
        {hint}
      </dt>
      <dd className="min-w-0 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

const Calc = ({ text }: { text: string }) => (
  <Tooltip content={text}>
    <Info className="size-3 cursor-help text-ink-4" />
  </Tooltip>
);

function OrgName({ org }: { org?: { id: string; name: string; logoDataUrl?: string } }) {
  if (!org) return <span className="text-ink-4">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <CompanyLogo org={org} size={20} />
      <span>{org.name}</span>
    </span>
  );
}

function DealSummary({ deal, onEdit }: { deal: Deal; onEdit: () => void }) {
  const { state } = useData();
  const v = dealView(state, deal);
  return (
    <Section title="Deal summary" icon={Handshake} actions={<Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>}>
      <div className="grid gap-x-10 lg:grid-cols-2">
        <dl>
          <Row label="Deal name">{deal.name}</Row>
          <Row label="Deal type">{deal.dealKind ? DEAL_KIND_LABEL[deal.dealKind] : <span className="text-ink-4">Not set</span>}</Row>
          <Row label="Primary asset class">{deal.assetClass ? ASSET_CLASS_LABEL[deal.assetClass] : <span className="text-ink-4">Not set</span>}</Row>
          <Row label="Source">
            {v.source || v.sourceContact ? (
              <div className="space-y-0.5">
                <OrgName org={v.source} />
                {v.sourceContact && (
                  <div className="text-[12.5px]">
                    <Link to={`/contacts/${v.sourceContact.id}`} className="font-medium text-accent hover:underline">
                      {v.sourceContact.name}
                    </Link>
                    {v.sourceContact.email && (
                      <a href={`mailto:${v.sourceContact.email}`} className="ml-2 text-ink-3 hover:text-accent">
                        {v.sourceContact.email}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-ink-4">Not set</span>
            )}
          </Row>
          <Row label="Asking price">{deal.askingPrice ? fmtCurrency(deal.askingPrice) : <span className="text-ink-4">Not set</span>}</Row>
          <Row label="Asking price per bed" hint={<Calc text="Calculated: asking price ÷ total licensed beds" />}>
            {v.pricePerBed ? fmtCurrency(Math.round(v.pricePerBed)) : <span className="text-ink-4">—</span>}
          </Row>
          <Row label="State(s)" hint={v.overridden.states ? <Badge className="text-[10px]">Manual</Badge> : <Calc text="From the deal's buildings unless entered manually" />}>
            {v.states.length ? (
              <span className="flex flex-wrap gap-1">
                {v.states.map((s) => (
                  <Tooltip key={s} content={US_STATES[s]}>
                    <span>
                      <Badge tone="outline">{s}</Badge>
                    </span>
                  </Tooltip>
                ))}
              </span>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Total buildings" hint={v.overridden.buildings ? <Badge className="text-[10px]">Manual</Badge> : <Calc text="Count of buildings linked to this deal" />}>
            <span className="tabular">{v.totalBuildings}</span>
          </Row>
          <Row label="Total licensed beds" hint={v.overridden.beds ? <Badge className="text-[10px]">Manual</Badge> : <Calc text="Sum of licensed beds across linked buildings" />}>
            <span className="tabular">{fmtNumber(v.totalLicBeds)}</span>
          </Row>
        </dl>
        <dl>
          <Row label="Current operator">
            {v.currentOperators.length ? (
              <span className="flex flex-col gap-1">
                {v.currentOperators.map((o) => (
                  <OrgName key={o.id} org={o} />
                ))}
              </span>
            ) : (
              <span className="text-ink-4">—</span>
            )}
          </Row>
          <Row label="Seller (current owner)">
            <OrgName org={v.seller} />
          </Row>
          <Row label="New operator">
            <OrgName org={v.newOperator} />
          </Row>
          <Row label="JV partner">
            <OrgName org={v.jvPartner} />
          </Row>
          <Row label="JV %">{deal.jvPct !== undefined ? `${deal.jvPct}%` : <span className="text-ink-4">—</span>}</Row>
          <Row label="Projected closing date">
            {deal.actualCloseDate ? (
              <span>
                Closed {fmtDate(deal.actualCloseDate)} <span className="text-ink-4">(projected {fmtDate(deal.projectedCloseDate)})</span>
              </span>
            ) : (
              fmtDate(deal.projectedCloseDate)
            )}
          </Row>
          <Row label="Link to data room">
            {deal.dataRoomUrl ? (
              <a href={deal.dataRoomUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-accent hover:underline">
                <FolderOpen className="size-3.5 shrink-0" />
                <span className="truncate">{deal.dataRoomUrl.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            ) : (
              <span className="text-ink-4">Not linked</span>
            )}
          </Row>
          <Row label="Deal lead">{deal.leadName}</Row>
        </dl>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Deal contacts (buyer / seller) and vendors
// ---------------------------------------------------------------------------

function useContactCells(contactId?: string) {
  const { state } = useData();
  const c = state.contacts.find((x) => x.id === contactId);
  const org = c ? state.organizations.find((o) => o.id === c.organizationId) : undefined;
  return {
    firm: org ? <span className="block max-w-[180px] truncate">{org.name}</span> : <span className="text-ink-4">—</span>,
    email: c?.email ? (
      <a href={`mailto:${c.email}`} className="block max-w-[200px] truncate text-accent hover:underline">
        {c.email}
      </a>
    ) : (
      <span className="text-ink-4">—</span>
    ),
    phone: c ? <span className="whitespace-nowrap">{c.mobilePhone || c.phone}</span> : <span className="text-ink-4">—</span>,
    contact: c,
  };
}

function AssignedRow({ label, contactId, preferOrgIds, onChange }: { label: string; contactId?: string; preferOrgIds: (string | undefined)[]; onChange: (id?: string) => void }) {
  const items = useContactItems(preferOrgIds);
  const cells = useContactCells(contactId);
  return (
    <tr className="border-b border-border/70 last:border-0">
      <td className="whitespace-nowrap py-1.5 pl-4 pr-3 text-[12.5px] font-medium text-ink-2">{label}</td>
      <td className="px-3 text-[12.5px] text-ink-2">{cells.firm}</td>
      <td className="min-w-[170px] px-2">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <SearchPicker items={items} value={contactId} onChange={onChange} compact ariaLabel={`Assign ${label}`} />
          </div>
          {cells.contact && (
            <Tooltip content="Open contact record">
              <Link to={`/contacts/${cells.contact.id}`} className="shrink-0 rounded p-1 text-ink-4 hover:bg-subtle hover:text-accent" aria-label={`Open ${cells.contact.name}`}>
                <ExternalLink className="size-3.5" />
              </Link>
            </Tooltip>
          )}
        </div>
      </td>
      <td className="px-3 text-[12.5px]">{cells.email}</td>
      <td className="pl-3 pr-4 text-[12.5px] text-ink-2">{cells.phone}</td>
    </tr>
  );
}

function DistributionList({ value, onSave, side }: { value: string; onSave: (v: string) => void; side: "buyer" | "seller" }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const entries = v.split(/[;,\n]/).map((x) => x.trim()).filter(Boolean);
  const invalid = entries.filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] font-medium text-ink-2">{side === "buyer" ? "Buyer's" : "Seller's"} additional distribution list</div>
        <span className="text-[11.5px] text-ink-4">
          {entries.length} address{entries.length === 1 ? "" : "es"}
          {invalid.length > 0 && <span className="text-danger"> · {invalid.length} invalid</span>}
        </span>
      </div>
      <Textarea
        rows={2}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
        placeholder="name@firm.com; another@firm.com"
        className={cn("mt-1.5 font-mono text-[12px]", invalid.length > 0 && "border-danger/50")}
      />
      <p className="mt-1 text-[11px] text-ink-4">Catch-all for anyone else who should receive {side}-side deal emails. Separate addresses with semicolons.</p>
    </div>
  );
}

function TeamTable({ deal, side }: { deal: Deal; side: "buyer" | "seller" }) {
  const { updateDeal, setDealContact } = useData();
  const toast = useToast();
  const prefer = side === "buyer" ? ["org_od_holdings", "org_whitaker", "org_brennan"] : [deal.sellerOrgId, "org_hartwell"];
  const assigned = (role: BuyerSellerRole) => deal.contacts?.find((c) => c.side === side && c.role === role)?.contactId;
  const filled = BUYER_SELLER_ROLES.filter((r) => assigned(r)).length;
  return (
    <Section title={`Deal contacts (${side === "buyer" ? "Buyer" : "Seller"})`} icon={Users} description={`${filled} of ${BUYER_SELLER_ROLES.length} roles assigned`} flush>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
              <th className="h-8 pl-4 font-medium">Role</th>
              <th className="px-3 font-medium">Firm</th>
              <th className="px-3 font-medium">Name</th>
              <th className="px-3 font-medium">Email</th>
              <th className="pl-3 pr-4 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody>
            {BUYER_SELLER_ROLES.map((role) => (
              <AssignedRow
                key={role}
                label={`${side === "buyer" ? "Buyer" : "Seller"} ${BUYER_SELLER_ROLE_LABEL[role]}`}
                contactId={assigned(role)}
                preferOrgIds={prefer}
                onChange={(id) => setDealContact(deal.id, { side, role, contactId: id })}
              />
            ))}
          </tbody>
        </table>
      </div>
      <DistributionList
        side={side}
        value={(side === "buyer" ? deal.buyerDistribution : deal.sellerDistribution) ?? ""}
        onSave={(v) => {
          updateDeal(deal.id, side === "buyer" ? { buyerDistribution: v } : { sellerDistribution: v });
          toast({ title: "Distribution list saved", tone: "info" });
        }}
      />
    </Section>
  );
}

function VendorsTable({ deal }: { deal: Deal }) {
  const { setDealContact } = useData();
  const assigned = (role: VendorRole) => deal.contacts?.find((c) => c.side === "vendor" && c.role === role)?.contactId;
  const filled = VENDOR_ROLES.filter((r) => assigned(r)).length;
  return (
    <Section title="Third-party vendors" icon={Wrench} description={`${filled} of ${VENDOR_ROLES.length} engaged`} flush>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
              <th className="h-8 pl-4 font-medium">Role</th>
              <th className="px-3 font-medium">Firm</th>
              <th className="px-3 font-medium">Name</th>
              <th className="px-3 font-medium">Email</th>
              <th className="pl-3 pr-4 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody>
            {VENDOR_ROLES.map((role) => (
              <AssignedRow key={role} label={VENDOR_ROLE_LABEL[role]} contactId={assigned(role)} preferOrgIds={["org_clearline", "org_benchmark", "org_lakeside_title", "org_zoning_partners", "org_ridgeway_val", "org_veritas", "org_summit_mgmt"]} onChange={(id) => setDealContact(deal.id, { side: "vendor", role, contactId: id })} />
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

const REPORT_TONE: Record<ReportStatus, BadgeTone> = { not_ordered: "outline", ordered: "info", in_progress: "warning", draft_received: "violet", final_received: "success", waived: "neutral" };

function ReportsTable({ deal }: { deal: Deal }) {
  const { updateDealReport } = useData();
  const get = (k: VendorRole) => deal.reports?.find((r) => r.kind === k);
  const finals = (deal.reports ?? []).filter((r) => r.status === "final_received" || r.status === "waived").length;
  return (
    <Section title="Third-party reports" icon={FileSearch} description={`${finals} of ${VENDOR_ROLES.length} final or waived`} flush>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
              <th className="h-8 pl-4 font-medium">Report</th>
              <th className="px-2 font-medium">Date ordered</th>
              <th className="px-2 font-medium">Status</th>
              <th className="px-2 font-medium">Expected delivery</th>
              <th className="pl-2 pr-4 font-medium">Link to report</th>
            </tr>
          </thead>
          <tbody>
            {VENDOR_ROLES.map((kind) => {
              const r = get(kind);
              const status = r?.status ?? "not_ordered";
              return (
                <tr key={kind} className="border-b border-border/70 last:border-0">
                  <td className="whitespace-nowrap py-1.5 pl-4 pr-2 text-[12.5px] font-medium text-ink-2">{VENDOR_ROLE_LABEL[kind]}</td>
                  <td className="px-2">
                    <Input type="date" value={r?.dateOrdered ?? ""} onChange={(e) => updateDealReport(deal.id, kind, { dateOrdered: e.target.value || undefined, ...(e.target.value && status === "not_ordered" ? { status: "ordered" } : {}) })} className="h-7 w-[132px] px-1.5 text-[12px]" aria-label={`${VENDOR_ROLE_LABEL[kind]} date ordered`} />
                  </td>
                  <td className="px-2">
                    <Select value={status} onValueChange={(v) => updateDealReport(deal.id, kind, { status: v as ReportStatus })}>
                      <SelectTrigger className="h-7 w-auto gap-1 border-transparent bg-transparent px-1 shadow-none hover:border-border hover:bg-background" aria-label={`${VENDOR_ROLE_LABEL[kind]} status`}>
                        <Badge tone={REPORT_TONE[status]}>{REPORT_STATUS_LABEL[status]}</Badge>
                      </SelectTrigger>
                      <SelectContent className="w-44">
                        {REPORT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {REPORT_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2">
                    <Input type="date" value={r?.expectedDate ?? ""} onChange={(e) => updateDealReport(deal.id, kind, { expectedDate: e.target.value || undefined })} className="h-7 w-[132px] px-1.5 text-[12px]" aria-label={`${VENDOR_ROLE_LABEL[kind]} expected delivery`} />
                  </td>
                  <td className="pl-2 pr-4">
                    <ReportLink url={r?.url} onSave={(url) => updateDealReport(deal.id, kind, { url })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function ReportLink({ url, onSave }: { url?: string; onSave: (u?: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(url ?? "");
  useEffect(() => setV(url ?? ""), [url]);
  if (editing || !url)
    return (
      <Input
        value={v}
        autoFocus={editing}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if ((v || undefined) !== url) onSave(v.trim() || undefined);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder="Paste link"
        className="h-7 min-w-[150px] px-1.5 text-[12px]"
      />
    );
  return (
    <span className="flex items-center gap-1">
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex max-w-[160px] items-center gap-1 truncate text-[12.5px] text-accent hover:underline">
        <ExternalLink className="size-3 shrink-0" /> Open report
      </a>
      <button onClick={() => setEditing(true)} className="text-[11px] text-ink-4 hover:text-ink">
        edit
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

function Star({ v }: { v?: number }) {
  return v ? (
    <span className="tabular inline-flex items-center gap-0.5 whitespace-nowrap">
      {v}
      <span className="text-star">★</span>
    </span>
  ) : (
    <span className="text-ink-4">—</span>
  );
}

function BuildingsTable({ deal }: { deal: Deal }) {
  const { state, removeDealBuilding } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const v = dealView(state, deal);
  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const shown = expanded ? v.buildings : v.buildings.slice(0, 10);

  return (
    <Section
      title="Buildings"
      icon={Building2}
      description={`${v.buildings.length} building${v.buildings.length === 1 ? "" : "s"} · ${fmtNumber(v.buildings.reduce((a, x) => a + x.building.certifiedBeds.value, 0))} certified beds · CMS fields are mock data`}
      flush
      actions={
        <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
          <Plus /> Add building
        </Button>
      }
    >
      {v.buildings.length === 0 ? (
        <EmptyState compact icon={Building2} title="No buildings on this deal yet" action={<Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus /> Add building</Button>} />
      ) : (
        <>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[1500px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left align-bottom text-[11px] leading-tight text-ink-3">
                  <th className="h-10 py-2 pl-4 font-medium">Photo</th>
                  <th className="px-2 py-2 font-medium">CMS Certification Number (CCN)</th>
                  <th className="px-2 py-2 font-medium">Provider name</th>
                  <th className="px-2 py-2 font-medium">Provider address</th>
                  <th className="px-2 py-2 font-medium">City / town</th>
                  <th className="px-2 py-2 font-medium">State</th>
                  <th className="px-2 py-2 font-medium">Affiliated entity name</th>
                  <th className="max-w-[130px] px-2 py-2 font-medium">Date first approved for Medicare &amp; Medicaid</th>
                  <th className="px-2 py-2 text-right font-medium">Certified beds</th>
                  <th className="px-2 py-2 text-right font-medium">Avg. residents per day</th>
                  <th className="px-2 py-2 font-medium">Overall</th>
                  <th className="px-2 py-2 font-medium">Health inspection</th>
                  <th className="px-2 py-2 font-medium">QM</th>
                  <th className="px-2 py-2 font-medium">Long-stay QM</th>
                  <th className="px-2 py-2 font-medium">Short-stay QM</th>
                  <th className="px-2 py-2 font-medium">Staffing</th>
                  <th className="px-2 py-2 font-medium">Special focus status</th>
                  <th className="w-[1%] pr-4" />
                </tr>
              </thead>
              <tbody>
                {shown.map(({ building: b, rel }) => {
                  const cms = state.cms.find((c) => c.buildingId === b.id);
                  const ccns = b.identifiers.filter((i) => i.type === "cms_ccn");
                  const ccn = ccns.find((i) => i.isCurrent)?.value;
                  const firstApproved = ccns.map((i) => i.effectiveFrom).sort()[0];
                  const own = state.ownerships.filter((o) => o.buildingId === b.id && o.isCurrent);
                  const affiliated = state.organizations.find((o) => o.id === (own.find((x) => x.role === "parent_organization") ?? own.find((x) => x.role === "operator"))?.organizationId);
                  const sff = cms?.specialFocusFacility ? "SFF" : b.tags.some((t) => /sff/i.test(t)) ? "SFF candidate" : cms ? "Not SFF" : "N/A";
                  return (
                    <tr key={rel.id} onClick={() => navigate(`/buildings/${b.id}`)} className="group cursor-pointer border-b border-border/70 last:border-0 hover:bg-canvas">
                      <td className="py-2 pl-4">
                        <div className="h-9 w-12 overflow-hidden rounded-[5px] border border-border">
                          {b.photos[0] ? <PhotoView photo={b.photos[0]} building={b} /> : <FacilityImage seed={b.photoSeed} type={b.facilityType} label={false} className="h-full w-full" />}
                        </div>
                      </td>
                      <td className="px-2 font-mono text-[12px]">{ccn ?? <span className="font-sans text-ink-4">Not certified</span>}</td>
                      <td className="px-2">
                        <Link to={`/buildings/${b.id}`} onClick={(e) => e.stopPropagation()} className="block max-w-[220px] font-medium text-ink hover:text-accent hover:underline">
                          {b.name}
                        </Link>
                      </td>
                      <td className="max-w-[180px] truncate px-2 text-ink-2">{b.address.street}</td>
                      <td className="whitespace-nowrap px-2 text-ink-2">{b.address.city}</td>
                      <td className="px-2 text-ink-2">{b.address.state}</td>
                      <td className="max-w-[170px] truncate px-2 text-ink-2">{affiliated?.name ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 text-ink-2">{firstApproved ? fmtDate(firstApproved) : "—"}</td>
                      <td className="tabular px-2 text-right">{b.certifiedBeds.value}</td>
                      <td className="tabular px-2 text-right">{b.averageDailyCensus.value}</td>
                      <td className="px-2">
                        <Star v={cms?.ratings.overall} />
                      </td>
                      <td className="px-2">
                        <Star v={cms?.ratings.health} />
                      </td>
                      <td className="px-2">
                        <Star v={cms?.ratings.qualityMeasures} />
                      </td>
                      <td className="px-2">
                        <Star v={cms?.ratings.longStayQm ?? cms?.ratings.qualityMeasures} />
                      </td>
                      <td className="px-2">
                        <Star v={cms?.ratings.shortStayQm ?? cms?.ratings.qualityMeasures} />
                      </td>
                      <td className="px-2">
                        <Star v={cms?.ratings.staffing} />
                      </td>
                      <td className="px-2">
                        <Badge tone={sff === "SFF" ? "danger" : sff === "SFF candidate" ? "warning" : "outline"}>{sff}</Badge>
                      </td>
                      <td className="pr-4" onClick={(e) => e.stopPropagation()}>
                        <Tooltip content="Remove from deal">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100"
                            aria-label={`Remove ${b.name} from deal`}
                            onClick={() => {
                              removeDealBuilding(rel.id);
                              toast({ title: "Building removed from deal", description: b.name, tone: "info" });
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {v.buildings.length > 10 && (
            <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center justify-center gap-1 border-t border-border py-2 text-xs font-medium text-accent hover:bg-canvas">
              {expanded ? (
                <>
                  <ChevronUp className="size-3.5" /> Show first 10
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" /> Show all {v.buildings.length} buildings
                </>
              )}
            </button>
          )}
        </>
      )}
      <AddBuildingsDialog deal={deal} open={addOpen} onOpenChange={setAddOpen} />
    </Section>
  );
}
