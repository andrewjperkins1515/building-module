import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Briefcase, Building2, Mail, MoreHorizontal, Pencil, Phone, Star, Tag, Trash2, UserPlus, Users } from "lucide-react";
import { useBreadcrumbs } from "@/components/layout/breadcrumbs";
import { useData } from "@/store/DataProvider";
import { companyDeals, contactBuildings } from "@/store/selectors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { EmptyState, KeyValueRow, Section } from "@/components/shared/layout";
import { FacilityImage } from "@/components/shared/FacilityImage";
import { useToast } from "@/components/ui/toast";
import { NotFound } from "@/pages/NotFound";
import { FACILITY_TYPE_LABEL, ORG_TYPE_LABEL, US_STATES } from "@/lib/labels";
import { CompanyLogo, CompanyTypeBadge, ContactPhoto, DealSummaryTable, TagEditor } from "@/features/crm/components";
import { ContactTypeBadge, SectorBadges } from "@/features/crm/contactBadges";
import { ChipList, ContactCard } from "@/features/crm/ContactCard";
import { EditContactSheet, type ContactSheetTarget } from "@/features/crm/EditContactSheet";
import { EditCompanySheet } from "@/features/crm/EditCompanySheet";
import { DealPreviewSheet } from "@/features/buildings/detail/dialogs/DealPreviewSheet";

export function ContactDetail() {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { state, updateContact, updateOrganization, deleteContact } = useData();
  const [sheet, setSheet] = useState<ContactSheetTarget>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [dealId, setDealId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const c = state.contacts.find((x) => x.id === contactId);
  useBreadcrumbs(c ? [{ label: "Contacts", to: "/contacts" }, { label: c.name }] : [{ label: "Contacts", to: "/contacts" }, { label: "Not found" }]);
  if (!c) return <NotFound title="Contact not found" description="This contact may have been removed, or the link is incorrect." />;

  const org = state.organizations.find((o) => o.id === c.organizationId);
  const parent = state.organizations.find((o) => o.id === org?.parentOrgId);
  const isPrimary = org?.primaryContactId === c.id;
  const deals = org ? companyDeals(state, org.id) : [];
  const active = deals.filter((d) => d.deal.status === "active");
  const past = deals.filter((d) => d.deal.status !== "active");
  const colleagues = state.contacts.filter((x) => x.organizationId === c.organizationId && x.id !== c.id).sort((a, b) => Number(b.id === org?.primaryContactId) - Number(a.id === org?.primaryContactId) || a.name.localeCompare(b.name));
  const buildings = contactBuildings(state, c.id);

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5 shadow-card md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <ContactPhoto name={c.name} dataUrl={c.photoDataUrl} size={76} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{c.name}</h1>
              {isPrimary && (
                <Badge tone="warning">
                  <Star className="fill-star text-star" /> Primary contact
                </Badge>
              )}
            </div>
            <div className="mt-0.5 text-[13.5px] text-ink-2">
              {c.title || "No title"}
              {org && (
                <>
                  {" "}at <span className="font-medium text-ink">{org.name}</span>
                </>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <ContactTypeBadge type={c.contactType} />
              <SectorBadges sectors={c.sectors} full />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {(c.tags ?? []).map((g) => (
                <Badge key={g} tone="accent">
                  {g}
                </Badge>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex h-5 items-center gap-1 rounded-[5px] border border-dashed border-border-strong px-1.5 text-[11.5px] text-ink-3 hover:text-ink">
                    <Tag className="size-3" /> {c.tags?.length ? "Edit tags" : "Add tags"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="mb-2 text-[12px] font-medium text-ink-2">Contact tags</div>
                  <TagEditor tags={c.tags ?? []} onChange={(tags) => updateContact(c.id, { tags })} suggestions={["Decision maker", "Warm relationship", "Gatekeeper", "Do not contact", "Conference contact"]} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {c.email && (
            <Button asChild variant="outline">
              <a href={`mailto:${c.email}`}>
                <Mail /> Email
              </a>
            </Button>
          )}
          {(c.mobilePhone || c.phone) && (
            <Button asChild variant="outline">
              <a href={`tel:${(c.mobilePhone || c.phone).replace(/[^0-9+]/g, "")}`}>
                <Phone /> Call
              </a>
            </Button>
          )}
          <Button onClick={() => setSheet({ mode: "edit", contactId: c.id })}>
            <Pencil /> Edit contact
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem
                disabled={!org || isPrimary}
                onSelect={() => {
                  updateOrganization(org!.id, { primaryContactId: c.id });
                  toast({ title: "Primary contact updated", description: `${c.name} is now primary for ${org!.name}` });
                }}
              >
                <Star /> Make primary for company
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSheet({ mode: "new", organizationId: c.organizationId })}>
                <UserPlus /> Add colleague
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger data-[highlighted]:text-danger" onSelect={() => setConfirmDelete(true)}>
                <Trash2 /> Delete contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Section title="Contact details" icon={Users} actions={<Button variant="ghost" size="sm" onClick={() => setSheet({ mode: "edit", contactId: c.id })}>Edit</Button>}>
            <ContactCard contact={c} hideIdentity />
          </Section>

          <Section title="Active deals" icon={Briefcase} description={org ? `Through ${org.name}` : undefined} flush>
            <DealSummaryTable rows={active} emptyText="No active deals with this contact's company" onOpenDeal={setDealId} />
          </Section>

          <Section title="Past deals" icon={Briefcase} description={`${past.length} closed, dead or abandoned`} flush>
            <DealSummaryTable rows={past} emptyText="No past deals recorded" onOpenDeal={setDealId} />
          </Section>

          <Section title="Related buildings" icon={Building2} description={`${buildings.length} building${buildings.length === 1 ? "" : "s"}`} flush>
            {buildings.length === 0 ? (
              <EmptyState compact icon={Building2} title="Not linked to any buildings" description="Buildings appear here when this person or their company owns, operates or advises on a facility." />
            ) : (
              <ul className="divide-y divide-border/70">
                {buildings.map(({ building: b, relation }) => (
                  <li key={b.id}>
                    <Link to={`/buildings/${b.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas">
                      <FacilityImage seed={b.photoSeed} type={b.facilityType} label={false} className="h-9 w-12 shrink-0 rounded-[5px] border border-border" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{b.name}</div>
                        <div className="text-[11.5px] text-ink-3">
                          {b.address.city}, {b.address.state} · {FACILITY_TYPE_LABEL[b.facilityType]} · {b.certifiedBeds.value} beds
                        </div>
                      </div>
                      <span className="hidden max-w-[220px] truncate text-[12px] text-ink-3 sm:block">{relation}</span>
                      <ArrowRight className="size-3.5 text-ink-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="min-w-0 space-y-5">
          <Section title="Company" icon={Building2} actions={org ? <Button variant="ghost" size="sm" onClick={() => setCompanyOpen(true)}>Edit</Button> : undefined}>
            {!org ? (
              <EmptyState compact icon={Building2} title="No company linked" />
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <CompanyLogo org={org} size={44} />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-ink">{org.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-3">
                      {ORG_TYPE_LABEL[org.type]}
                      <CompanyTypeBadge type={org.companyType} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 divide-y divide-border/70">
                  <KeyValueRow label="Parent company" value={parent?.name ?? "—"} />
                  <KeyValueRow
                    label="Office"
                    value={
                      org.officeAddress?.street ? (
                        <span className="font-normal">
                          {org.officeAddress.city}, {org.officeAddress.state}
                        </span>
                      ) : org.hqCity ? (
                        `${org.hqCity}, ${org.hqState}`
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
                <div className="mt-3 space-y-2.5 text-[12.5px]">
                  <div>
                    <div className="mb-1 text-[11.5px] text-ink-4">Acuity focus</div>
                    <ChipList items={org.acuityFocus} />
                  </div>
                  <div>
                    <div className="mb-1 text-[11.5px] text-ink-4">Regional focus</div>
                    <ChipList items={org.regionalFocus} />
                  </div>
                  <div>
                    <div className="mb-1 text-[11.5px] text-ink-4">State focus</div>
                    <ChipList items={org.stateFocus} title={(s) => US_STATES[s]} />
                  </div>
                </div>
              </div>
            )}
          </Section>

          <Section
            title="Associated people"
            icon={Users}
            description={org ? `${colleagues.length} other${colleagues.length === 1 ? "" : "s"} at ${org.name}` : undefined}
            flush
            actions={
              org ? (
                <Button variant="ghost" size="sm" onClick={() => setSheet({ mode: "new", organizationId: org.id })}>
                  <UserPlus /> Add
                </Button>
              ) : undefined
            }
          >
            {colleagues.length === 0 ? (
              <EmptyState compact icon={Users} title="No one else at this company yet" />
            ) : (
              <ul className="divide-y divide-border/70">
                {colleagues.map((p) => (
                  <li key={p.id}>
                    <Link to={`/contacts/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas">
                      <ContactPhoto name={p.name} dataUrl={p.photoDataUrl} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 truncate text-[13px] font-medium text-ink">
                          {p.name}
                          {p.id === org?.primaryContactId && <Star className="size-3 shrink-0 fill-star text-star" />}
                        </div>
                        <div className="truncate text-[11.5px] text-ink-3">
                          {p.title}
                          {p.rosterRole ? ` · ${p.rosterRole}` : ""}
                        </div>
                      </div>
                      <ArrowRight className="size-3.5 shrink-0 text-ink-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <EditContactSheet target={sheet} onOpenChange={(o) => !o && setSheet(null)} onSaved={(id, isNew) => isNew && navigate(`/contacts/${id}`)} />
      <EditCompanySheet orgId={companyOpen && org ? org.id : null} onOpenChange={setCompanyOpen} />
      <DealPreviewSheet dealId={dealId} onOpenChange={(o) => !o && setDealId(null)} />
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader icon={<Trash2 />} title={`Delete ${c.name}?`} description="This removes the contact record and its links to buildings. Deals and the company are not affected." />
          <DialogBody className="text-[13px] text-ink-3">This can't be undone in the prototype except by resetting demo data.</DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteContact(c.id);
                toast({ title: "Contact deleted", description: c.name, tone: "info" });
                navigate("/contacts");
              }}
            >
              Delete contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
