import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Briefcase, Building2, Globe, Landmark, MoreHorizontal, Pencil, Star, Trash2, UserPlus, Users } from "lucide-react";
import type { CompanyType } from "@/types";
import { useData } from "@/store/DataProvider";
import { companyDeals } from "@/store/selectors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Tooltip } from "@/components/ui/overlays";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Section } from "@/components/shared/layout";
import { SourceIndicator } from "@/components/shared/badges";
import { COMPANY_TYPES, COMPANY_TYPE_LABEL, US_STATES } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { CompanyLogo, CompanyTypeBadge, ContactPhoto, DealSummaryTable } from "@/features/crm/components";
import { EditCompanySheet } from "@/features/crm/EditCompanySheet";
import { EditContactSheet, type ContactSheetTarget } from "@/features/crm/EditContactSheet";
import { ChangeOwnerDialog } from "@/features/crm/ChangeOwnerDialog";
import { useBuildingPage } from "../context";
import { ChipList, ContactCard } from "@/features/crm/ContactCard";

const NONE = "__none";

export function OwnerTab() {
  const { bundle, openDeal } = useBuildingPage();
  const { state, updateOrganization, deleteContact } = useData();
  const toast = useToast();
  const [companyOpen, setCompanyOpen] = useState(false);
  const [contactTarget, setContactTarget] = useState<ContactSheetTarget>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [viewContactId, setViewContactId] = useState<string | null>(null);

  const owner = bundle.ownership.owner;
  const ownerRecord = bundle.ownership.records.find((o) => o.isCurrent && o.role === "property_owner");
  const b = bundle.building;

  if (!owner) {
    return (
      <div className="rounded-lg border border-border bg-background shadow-card">
        <EmptyState
          icon={Landmark}
          title="No current owner recorded"
          description="Record which company owns the real estate — and whether it's a bank, REIT, private owner or lender — to track contacts and deal history."
          action={
            <Button variant="accent" onClick={() => setChangeOpen(true)}>
              <Landmark /> Set current owner
            </Button>
          }
        />
        <ChangeOwnerDialog buildingId={b.id} open={changeOpen} onOpenChange={setChangeOpen} />
      </div>
    );
  }

  const roster = state.contacts.filter((c) => c.organizationId === owner.id);
  const primary = roster.find((c) => c.id === owner.primaryContactId) ?? roster[0];
  const shown = roster.find((c) => c.id === viewContactId) ?? primary;
  const parent = state.organizations.find((o) => o.id === owner.parentOrgId);
  const deals = companyDeals(state, owner.id);
  const active = deals.filter((d) => d.deal.status === "active");
  const past = deals.filter((d) => d.deal.status !== "active");
  const otherBuildings = state.ownerships.filter((o) => o.isCurrent && o.role === "property_owner" && o.organizationId === owner.id && o.buildingId !== b.id).length;

  return (
    <div className="space-y-5">
      {/* Owner banner */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <CompanyLogo org={owner} size={52} />
          <div className="min-w-0">
            <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-4">Current property owner</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[18px] font-semibold tracking-[-0.01em] text-ink">{owner.name}</h2>
              {ownerRecord && <SourceIndicator meta={ownerRecord.meta} />}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-3">
              {ownerRecord && <span>Owner since {fmtDate(ownerRecord.startDate)}</span>}
              {parent && (
                <span>
                  Parent: <span className="text-ink-2">{parent.name}</span>
                </span>
              )}
              <span>
                Owns {otherBuildings + 1} building{otherBuildings ? "s" : ""} in Owner Docket
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <div className="mb-1 text-[11px] font-medium text-ink-4">Company type</div>
            <Select
              value={owner.companyType ?? NONE}
              onValueChange={(v) => {
                updateOrganization(owner.id, { companyType: v === NONE ? undefined : (v as CompanyType) }, { buildingId: b.id, title: `Owner company type set to ${v === NONE ? "not set" : COMPANY_TYPE_LABEL[v as CompanyType]}` });
                toast({ title: "Company type updated", description: v === NONE ? "Not set" : COMPANY_TYPE_LABEL[v as CompanyType] });
              }}
            >
              <SelectTrigger className="w-40" aria-label="Company type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not set</SelectItem>
                {COMPANY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {COMPANY_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => setCompanyOpen(true)}>
            <Pencil /> Edit company
          </Button>
          <Button variant="outline" onClick={() => setChangeOpen(true)}>
            <ArrowLeftRight /> Change owner
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Contact */}
        <Section
          title="Contact"
          icon={Users}
          description={shown && shown.id === primary?.id ? "Primary contact" : shown ? "Roster contact" : undefined}
          actions={
            shown ? (
              <>
                {roster.length > 1 && (
                  <Select value={shown.id} onValueChange={setViewContactId}>
                    <SelectTrigger className="h-7 w-44 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roster.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.id === primary?.id ? " (primary)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="ghost" size="sm" onClick={() => setContactTarget({ mode: "edit", contactId: shown.id })}>
                  Edit
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/contacts/${shown.id}`}>Open record</Link>
                </Button>
              </>
            ) : undefined
          }
        >
          {!shown ? (
            <EmptyState compact icon={UserPlus} title="No contacts at this company" action={<Button size="sm" variant="outline" onClick={() => setContactTarget({ mode: "new", organizationId: owner.id })}><UserPlus /> Add contact</Button>} />
          ) : (
            <ContactCard contact={shown} />
          )}
        </Section>

        {/* Company information */}
        <Section title="Company information" icon={Building2} actions={<Button variant="ghost" size="sm" onClick={() => setCompanyOpen(true)}>Edit</Button>}>
          <dl className="space-y-3 text-[13px]">
            <InfoRow label="Company name">{owner.name}</InfoRow>
            <InfoRow label="Company type">
              <CompanyTypeBadge type={owner.companyType} />
            </InfoRow>
            <InfoRow label="Parent company">{parent?.name ?? <span className="text-ink-4">None</span>}</InfoRow>
            <InfoRow label="Office">
              {owner.officeAddress?.street ? (
                <span>
                  {owner.officeAddress.street}
                  {owner.officeAddress.street2 ? `, ${owner.officeAddress.street2}` : ""}
                  <br />
                  {owner.officeAddress.city}, {owner.officeAddress.state} {owner.officeAddress.zip}
                </span>
              ) : (
                <span className="text-ink-4">{owner.hqCity ? `${owner.hqCity}, ${owner.hqState}` : "Not recorded"}</span>
              )}
            </InfoRow>
            {owner.website && (
              <InfoRow label="Website">
                <span className="inline-flex items-center gap-1 text-accent">
                  <Globe className="size-3" /> {owner.website}
                </span>
              </InfoRow>
            )}
            <InfoRow label="Acuity focus">
              <ChipList items={owner.acuityFocus} />
            </InfoRow>
            <InfoRow label="Regional focus">
              <ChipList items={owner.regionalFocus} />
            </InfoRow>
            <InfoRow label="State focus">
              <ChipList items={owner.stateFocus} title={(s) => US_STATES[s]} />
            </InfoRow>
            <InfoRow label="Tags">
              <ChipList items={owner.tags} tone="accent" />
            </InfoRow>
          </dl>
        </Section>
      </div>

      <Section title="Active deals" icon={Briefcase} description={`${active.length} with ${owner.name}`} flush>
        <DealSummaryTable rows={active} emptyText="No active deals with this company" onOpenDeal={openDeal} />
      </Section>

      <Section
        title="Corporate roster"
        icon={Users}
        description={`${roster.length} ${roster.length === 1 ? "person" : "people"}`}
        flush
        actions={
          <Button variant="ghost" size="sm" onClick={() => setContactTarget({ mode: "new", organizationId: owner.id })}>
            <UserPlus /> Add contact
          </Button>
        }
      >
        {roster.length === 0 ? (
          <EmptyState compact icon={Users} title="No one on the roster yet" />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
                  <th className="h-8 pl-4 font-medium">Role</th>
                  <th className="px-3 font-medium">Name</th>
                  <th className="px-3 font-medium">Email</th>
                  <th className="px-3 font-medium">Phone</th>
                  <th className="px-3 font-medium">Notes</th>
                  <th className="w-[1%] pr-4" />
                </tr>
              </thead>
              <tbody>
                {roster.map((c) => (
                  <tr key={c.id} className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-canvas" onClick={() => setViewContactId(c.id)}>
                    <td className="py-2.5 pl-4">{c.rosterRole ? <Badge tone={c.rosterRole === "Decision maker" ? "accent" : "neutral"}>{c.rosterRole}</Badge> : <span className="text-ink-4">—</span>}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ContactPhoto name={c.name} dataUrl={c.photoDataUrl} size={28} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-medium text-ink">
                            <Link to={`/contacts/${c.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-accent hover:underline">
                              {c.name}
                            </Link>
                            {c.id === primary?.id && (
                              <Tooltip content="Primary contact">
                                <Star className="size-3 fill-star text-star" />
                              </Tooltip>
                            )}
                          </div>
                          <div className="text-[11.5px] text-ink-3">{c.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="text-accent hover:underline">
                        {c.email}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-3 text-ink-2">
                      <div>{c.phone}</div>
                      {c.mobilePhone && <div className="text-[11.5px] text-ink-4">m {c.mobilePhone}</div>}
                    </td>
                    <td className="max-w-[280px] px-3 text-[12.5px] text-ink-2">
                      <span className="line-clamp-2">{c.notes ?? <span className="text-ink-4">—</span>}</span>
                    </td>
                    <td className="pr-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => setContactTarget({ mode: "edit", contactId: c.id })}>
                            <Pencil /> Edit contact
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={c.id === primary?.id}
                            onSelect={() => {
                              updateOrganization(owner.id, { primaryContactId: c.id });
                              toast({ title: "Primary contact updated", description: c.name });
                            }}
                          >
                            <Star /> Make primary contact
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-danger data-[highlighted]:text-danger"
                            onSelect={() => {
                              const snapshot = c;
                              deleteContact(c.id);
                              toast({ title: "Contact removed", description: snapshot.name, tone: "info" });
                            }}
                          >
                            <Trash2 /> Remove from roster
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Past deals" icon={Briefcase} description={`${past.length} closed, dead or abandoned`} flush>
        <DealSummaryTable rows={past} emptyText="No past deals recorded with this company" onOpenDeal={openDeal} />
      </Section>

      <EditCompanySheet orgId={companyOpen ? owner.id : null} buildingId={b.id} onOpenChange={setCompanyOpen} />
      <EditContactSheet target={contactTarget} onOpenChange={(o) => !o && setContactTarget(null)} />
      <ChangeOwnerDialog buildingId={b.id} currentOwnerId={owner.id} open={changeOpen} onOpenChange={setChangeOpen} />
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

