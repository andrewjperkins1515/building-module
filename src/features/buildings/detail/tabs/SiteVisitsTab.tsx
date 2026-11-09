import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Camera, CheckCircle2, ClipboardCheck, Plus } from "lucide-react";
import type { SiteVisit } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge, Checkbox } from "@/components/ui/primitives";
import { Avatar, EmptyState } from "@/components/shared/layout";
import { ConditionMeter } from "@/components/shared/badges";
import { useData } from "@/store/DataProvider";
import { SITE_VISIT_TYPE_LABEL, SYSTEM_LABEL } from "@/lib/labels";
import { daysUntil, fmtDate, fmtShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBuildingPage } from "../context";
import { PhotoTile } from "../components/PhotoTile";
import { AddSiteVisitDialog } from "../dialogs/AddSiteVisitDialog";

export function SiteVisitsTab() {
  const { bundle } = useBuildingPage();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") {
      setOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const visits = bundle.siteVisits;
  const openObs = visits.flatMap((v) => v.observations).filter((o) => o.status === "open").length;
  const openTasks = visits.flatMap((v) => v.followUps).filter((t) => !t.done).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-3">
          <span>
            <span className="tabular font-semibold text-ink">{visits.length}</span> visits
          </span>
          <span>
            <span className={cn("tabular font-semibold", openObs ? "text-warning" : "text-ink")}>{openObs}</span> open observations
          </span>
          <span>
            <span className="tabular font-semibold text-ink">{openTasks}</span> open follow-ups
          </span>
        </div>
        <Button variant="accent" onClick={() => setOpen(true)}>
          <Plus /> Add site visit
        </Button>
      </div>

      {visits.length === 0 ? (
        <div className="rounded-lg border border-border bg-background shadow-card">
          <EmptyState
            icon={ClipboardCheck}
            title="No site visits recorded"
            description="Document tours and diligence inspections: participants, observations, system condition ratings, follow-up tasks and photos."
            action={
              <Button variant="accent" onClick={() => setOpen(true)}>
                <Plus /> Add site visit
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map((v) => (
            <VisitCard key={v.id} visit={v} />
          ))}
        </div>
      )}
      <AddSiteVisitDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function VisitCard({ visit: v }: { visit: SiteVisit }) {
  const { bundle, openDeal } = useBuildingPage();
  const { toggleFollowUp, toggleObservation } = useData();
  const deal = bundle.deals.find((d) => d.deal.id === v.dealId)?.deal;
  const ratings = Object.entries(v.conditionRatings);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-background shadow-card">
      <header className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-canvas leading-none">
            <span className="text-[10px] font-medium uppercase text-ink-4">{fmtShortDate(v.date).split(" ")[0]}</span>
            <span className="tabular text-[15px] font-semibold">{fmtShortDate(v.date).split(" ")[1]}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-ink">{SITE_VISIT_TYPE_LABEL[v.type]}</span>
              {deal && (
                <Badge tone="accent" className="cursor-pointer" onClick={() => openDeal(deal.id)}>
                  {deal.name}
                </Badge>
              )}
            </div>
            <div className="text-[12px] text-ink-3">
              {fmtDate(v.date)} · Recorded by {v.createdBy}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {v.participants.slice(0, 5).map((p, i) => (
              <Avatar key={`${p}-${i}`} name={p.replace(/\s*\(.*\)/, "")} size="sm" className="ring-2 ring-background" />
            ))}
          </div>
          <span className="text-[12px] text-ink-3">{v.participants.length} participants</span>
        </div>
      </header>
      <div className="grid gap-0 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4 p-4">
          <div>
            <div className="text-[11.5px] font-medium text-ink-4">Summary</div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{v.summary}</p>
            <div className="mt-2 text-[12px] text-ink-3">{v.participants.join(" · ")}</div>
          </div>

          {v.observations.length > 0 && (
            <div>
              <div className="text-[11.5px] font-medium text-ink-4">Observations</div>
              <ul className="mt-1.5 space-y-1.5">
                {v.observations.map((o) => (
                  <li key={o.id} className="flex items-start gap-2.5 rounded-md border border-border px-3 py-2">
                    <AlertTriangle className={cn("mt-0.5 size-3.5 shrink-0", o.status === "resolved" ? "text-ink-4" : o.severity === "high" ? "text-danger" : o.severity === "medium" ? "text-warning" : "text-ink-3")} />
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-[13px]", o.status === "resolved" ? "text-ink-3 line-through decoration-ink-4/50" : "text-ink")}>{o.text}</div>
                      <div className="mt-0.5 text-[11.5px] text-ink-4">
                        {o.severity[0].toUpperCase() + o.severity.slice(1)} severity{o.system ? ` · ${SYSTEM_LABEL[o.system]}` : ""}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleObservation(v.id, o.id)}>
                      {o.status === "open" ? "Resolve" : "Reopen"}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {v.followUps.length > 0 && (
            <div>
              <div className="text-[11.5px] font-medium text-ink-4">Follow-up tasks</div>
              <ul className="mt-1.5 divide-y divide-border/70 rounded-md border border-border">
                {v.followUps.map((t) => {
                  const n = daysUntil(t.dueDate);
                  return (
                    <li key={t.id} className="flex items-center gap-2.5 px-3 py-2">
                      <Checkbox checked={t.done} onCheckedChange={() => toggleFollowUp(v.id, t.id)} aria-label={`Mark ${t.title} done`} />
                      <span className={cn("flex-1 text-[13px]", t.done ? "text-ink-4 line-through" : "text-ink")}>{t.title}</span>
                      <span className="hidden text-[11.5px] text-ink-3 sm:inline">{t.assignee}</span>
                      {t.dueDate && (
                        <span className={cn("tabular w-16 text-right text-[11.5px]", !t.done && n !== null && n < 0 ? "font-medium text-danger" : "text-ink-4")}>{fmtShortDate(t.dueDate)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4 border-t border-border bg-canvas/40 p-4 lg:border-l lg:border-t-0">
          <div>
            <div className="text-[11.5px] font-medium text-ink-4">Condition ratings</div>
            {ratings.length === 0 ? (
              <div className="mt-1 text-xs text-ink-4">Not rated</div>
            ) : (
              <div className="mt-1.5 space-y-1.5">
                {ratings.map(([sys, r]) => (
                  <div key={sys} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-ink-2">{SYSTEM_LABEL[sys as keyof typeof SYSTEM_LABEL]}</span>
                    <span className="flex items-center gap-2">
                      <ConditionMeter rating={r!} />
                      <span className="w-10 text-right text-[11.5px] text-ink-3">{r![0].toUpperCase() + r!.slice(1)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between text-[11.5px] font-medium text-ink-4">
              <span>Photos</span>
              <span>{v.photos.length}</span>
            </div>
            {v.photos.length === 0 ? (
              <div className="mt-1.5 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-xs text-ink-4">
                <Camera className="size-3.5" /> No photos attached
              </div>
            ) : (
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {v.photos.map((p, i) => (
                  <PhotoTile key={p.id} photo={p} seed={i + bundle.building.photoSeed} className="aspect-[4/3]" />
                ))}
              </div>
            )}
            {v.photos.length > 0 && <div className="mt-1.5 text-[11px] text-ink-4">Placeholder thumbnails — images are not stored in the prototype.</div>}
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <CheckCircle2 className="size-3.5" />
            {v.followUps.filter((t) => t.done).length} of {v.followUps.length} follow-ups complete
          </div>
        </aside>
      </div>
    </article>
  );
}
