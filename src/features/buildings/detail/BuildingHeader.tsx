import { useState } from "react";
import { BadgeCheck, Briefcase, Copy, History, MapPin, MoreHorizontal, NotebookPen, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Textarea } from "@/components/ui/primitives";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from "@/components/ui/overlays";
import { FacilityImage } from "@/components/shared/FacilityImage";
import { PhotoView } from "@/features/crm/PhotoCarousel";
import { CompanyTypeBadge, TagEditor } from "@/features/crm/components";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { Landmark, Tag } from "lucide-react";
import { MapPreview } from "@/components/shared/MapPreview";
import { SourceIndicator, StarRating, VerificationBadge } from "@/components/shared/badges";
import { useData } from "@/store/DataProvider";
import { currentCcn, occupancy } from "@/store/selectors";
import { FACILITY_TYPE_LABEL, IDENTIFIER_LABEL } from "@/lib/labels";
import { fmtDate, fmtNumber, fmtPct, fmtRelative } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { cn, todayIso } from "@/lib/utils";
import { useBuildingPage } from "./context";

export function BuildingHeader() {
  const { bundle, openEdit, openAddToDeal, goTab, openDeal } = useBuildingPage();
  const { updateBuilding, refreshCms, addNote } = useData();
  const toast = useToast();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const { building: b, cms } = bundle;
  const ccn = currentCcn(b);
  const priorCcns = b.identifiers.filter((i) => i.type === "cms_ccn" && !i.isCurrent);
  const occ = occupancy(b);
  const activeDeals = bundle.deals.filter((d) => d.deal.status === "active");

  const markVerified = () => {
    const v = { verification: "verified" as const, verifiedBy: "Jordan Ellis", asOf: todayIso() };
    updateBuilding(b.id, {
      verificationStatus: "verified",
      lastVerifiedAt: todayIso(),
      certifiedBeds: { ...b.certifiedBeds, meta: { ...b.certifiedBeds.meta, ...v } },
      licensedBeds: { ...b.licensedBeds, meta: { ...b.licensedBeds.meta, ...v } },
      averageDailyCensus: { ...b.averageDailyCensus, meta: { ...b.averageDailyCensus.meta, ...v } },
      yearBuilt: { ...b.yearBuilt, meta: { ...b.yearBuilt.meta, ...v } },
      squareFeet: { ...b.squareFeet, meta: { ...b.squareFeet.meta, ...v } },
    });
    toast({ title: "Building marked as verified", description: "All key fields were stamped as verified by you." });
  };

  const metrics: { label: string; value: React.ReactNode; sub?: React.ReactNode; meta?: Parameters<typeof SourceIndicator>[0]["meta"]; onClick?: () => void }[] = [
    { label: "Certified beds", value: fmtNumber(b.certifiedBeds.value), meta: b.certifiedBeds.meta, sub: b.facilityType === "skilled_nursing" ? "Medicare/Medicaid" : "Units" },
    { label: "Licensed beds", value: fmtNumber(b.licensedBeds.value), meta: b.licensedBeds.meta, sub: b.licensedBeds.value !== b.certifiedBeds.value ? `${b.licensedBeds.value - b.certifiedBeds.value > 0 ? "+" : ""}${b.licensedBeds.value - b.certifiedBeds.value} vs certified` : "Matches certified" },
    { label: "Avg. daily census", value: fmtNumber(b.averageDailyCensus.value), meta: b.averageDailyCensus.meta, sub: "Trailing 3 months" },
    { label: "Occupancy", value: fmtPct(occ), sub: occ !== null ? (occ >= 85 ? "Above 85% target" : "Below 85% target") : undefined },
    { label: "CMS overall", value: cms ? <StarRating value={cms.ratings.overall} size="md" /> : <span className="text-[15px] font-medium text-ink-4">N/A</span>, sub: cms ? `${cms.ratings.overall} of 5 · mock` : "Not CMS-certified", onClick: cms ? () => goTab("cms") : undefined },
    { label: "Health inspection", value: cms ? <StarRating value={cms.ratings.health} size="md" /> : <span className="text-[15px] font-medium text-ink-4">N/A</span>, sub: cms ? `${cms.surveys.filter((s) => s.type === "standard")[0]?.deficiencyCount ?? 0} deficiencies last survey` : "State licensure only", onClick: cms ? () => goTab("cms") : undefined },
    { label: "Staffing", value: cms ? <StarRating value={cms.ratings.staffing} size="md" /> : <span className="text-[15px] font-medium text-ink-4">N/A</span>, sub: cms ? `${cms.staffing.totalNurseHprd.toFixed(2)} nurse HPRD` : "—", onClick: cms ? () => goTab("cms") : undefined },
  ];

  return (
    <div>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* Identity */}
        <div className="flex flex-col gap-4 sm:flex-row">
          {b.photos[0] ? (
            <button onClick={() => goTab("overview")} className="relative h-36 w-full shrink-0 overflow-hidden rounded-lg border border-border sm:h-[148px] sm:w-[220px]" aria-label="View photos">
              <PhotoView photo={b.photos[0]} building={b} large={!b.photos[0].dataUrl && b.photos[0].subject === "exterior"} />
              {b.photos.length > 1 && <span className="absolute bottom-1.5 right-1.5 rounded bg-black/55 px-1.5 py-px text-[10.5px] font-medium text-white">1 / {b.photos.length}</span>}
            </button>
          ) : (
            <FacilityImage seed={b.photoSeed} type={b.facilityType} className="h-36 w-full shrink-0 rounded-lg border border-border sm:h-[148px] sm:w-[220px]" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="outline">{FACILITY_TYPE_LABEL[b.facilityType]}</Badge>
              <VerificationBadge status={b.verificationStatus} />
              {activeDeals.map((d) => (
                <Badge key={d.deal.id} tone="accent" className="cursor-pointer" onClick={() => openDeal(d.deal.id)}>
                  <Briefcase /> {d.deal.name}
                </Badge>
              ))}
              {b.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex h-5 items-center gap-1 rounded-[5px] border border-dashed border-border-strong px-1.5 text-[11.5px] text-ink-3 hover:text-ink">
                    <Tag className="size-3" /> {b.tags.length ? "Edit tags" : "Add tags"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="mb-2 text-[12px] font-medium text-ink-2">Building tags</div>
                  <TagEditor
                    tags={b.tags}
                    onChange={(tags) => updateBuilding(b.id, { tags })}
                    suggestions={["Watchlist", "Off-market", "Turnaround", "REO", "Portfolio anchor", "Survey risk"]}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{b.name}</h1>
            </div>
            {b.alternateNames.length > 0 && <div className="mt-0.5 text-xs text-ink-4">Also known as {b.alternateNames.join(", ")}</div>}
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-2">
              <MapPin className="size-3.5 shrink-0 text-ink-4" />
              {b.address.street ? `${b.address.street}, ` : ""}
              {b.address.city}, {b.address.state} {b.address.zip}
              {b.address.county && <span className="text-ink-4">· {b.address.county} County</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-3">
              <span className="flex items-center gap-1.5">
                CMS provider #
                {ccn ? (
                  <button
                    className="inline-flex items-center gap-1 font-mono font-medium text-ink hover:text-accent"
                    onClick={() => {
                      navigator.clipboard?.writeText(ccn);
                      toast({ title: "Provider number copied", tone: "info" });
                    }}
                  >
                    {ccn} <Copy className="size-3 opacity-50" />
                  </button>
                ) : (
                  <span className="text-ink-4">None</span>
                )}
                {priorCcns.length > 0 && (
                  <Tooltip
                    content={
                      <div className="space-y-1">
                        <div className="font-medium">Prior provider numbers</div>
                        {priorCcns.map((p) => (
                          <div key={p.id} className="text-white/80">
                            <span className="font-mono">{p.value}</span> · {fmtDate(p.effectiveFrom)} – {fmtDate(p.effectiveTo)}
                          </div>
                        ))}
                      </div>
                    }
                  >
                    <span className="inline-flex cursor-help items-center gap-0.5 rounded bg-subtle px-1 py-px text-[11px] text-ink-3">
                      <History className="size-3" /> {priorCcns.length} prior
                    </span>
                  </Tooltip>
                )}
              </span>
              {b.identifiers
                .filter((i) => i.type === "state_license" && i.isCurrent)
                .map((i) => (
                  <span key={i.id}>
                    {IDENTIFIER_LABEL[i.type]} <span className="font-mono text-ink-2">{i.value}</span>
                  </span>
                ))}
              {bundle.ownership.owner && (
                <button onClick={() => goTab("owner")} className="inline-flex items-center gap-1.5 hover:text-ink">
                  <Landmark className="size-3" /> Owner <span className="font-medium text-ink-2">{bundle.ownership.owner.name}</span>
                  <CompanyTypeBadge type={bundle.ownership.owner.companyType} />
                </button>
              )}
              <span>
                Updated <span className="text-ink-2">{fmtRelative(b.updatedAt)}</span>
              </span>
              <span>
                Last verified <span className="text-ink-2">{b.lastVerifiedAt ? fmtDate(b.lastVerifiedAt) : "Never"}</span>
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={openEdit}>
                <Pencil /> Edit Building
              </Button>
              <Button variant="accent" onClick={openAddToDeal}>
                <Briefcase /> Add to Deal
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onSelect={markVerified} disabled={b.verificationStatus === "verified"}>
                    <BadgeCheck /> Mark as verified
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!cms}
                    onSelect={() => {
                      refreshCms(b.id);
                      toast({ title: "CMS data refreshed", description: "Simulated refresh against the mock dataset.", tone: "info" });
                    }}
                  >
                    <RefreshCw /> Refresh CMS data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setNoteOpen(true)}>
                    <NotebookPen /> Add note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="hidden overflow-hidden rounded-lg border border-border bg-background shadow-card xl:block">
          <MapPreview x={b.address.mapX} y={b.address.mapY} seed={b.photoSeed} className="h-[112px] rounded-none border-0 border-b" />
          <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
            <div className="min-w-0 text-xs">
              <div className="font-medium text-ink">
                {b.address.city}, {b.address.state}
              </div>
              <div className="truncate text-ink-3">
                {b.address.county ? `${b.address.county} County · ` : ""}
                {b.address.zip}
              </div>
            </div>
            <Tooltip content="Map integration is planned; this is a schematic placeholder.">
              <span className="cursor-help text-[11px] text-ink-4 underline decoration-dotted underline-offset-2">Placeholder</span>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card sm:grid-cols-4 lg:grid-cols-7">
        {metrics.map((m) => {
          const Comp = m.onClick ? "button" : "div";
          return (
            <Comp
              key={m.label}
              onClick={m.onClick}
              className={cn("min-w-0 bg-background px-3.5 py-3 text-left", m.onClick && "transition-colors hover:bg-canvas")}
            >
              <div className="flex items-center gap-1 text-[11.5px] font-medium text-ink-3">
                <span className="truncate">{m.label}</span>
                {m.meta && <SourceIndicator meta={m.meta} />}
              </div>
              <div className="tabular mt-1 flex h-7 items-center text-[20px] font-semibold tracking-[-0.02em] text-ink">{m.value}</div>
              {m.sub && <div className="mt-0.5 truncate text-[11px] text-ink-4">{m.sub}</div>}
            </Comp>
          );
        })}
      </div>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader icon={<NotebookPen />} title="Add note" description={`Notes appear in the activity timeline for ${b.name}.`} />
          <DialogBody>
            <Textarea autoFocus rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Operator confirmed census of 108 on today's call…" />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!note.trim()}
              onClick={() => {
                addNote(b.id, note.trim());
                setNote("");
                setNoteOpen(false);
                toast({ title: "Note added" });
              }}
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
