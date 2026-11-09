import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, Check, CircleSlash } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { DealStatusBadge, StarRating } from "@/components/shared/badges";
import { KeyValueRow } from "@/components/shared/layout";
import { useData } from "@/store/DataProvider";
import { DEAL_ROLE_LABEL, DEAL_STAGES, DEAL_STAGE_LABEL } from "@/lib/labels";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Lightweight deal preview. The full Deals module is a later iteration. */
export function DealPreviewSheet({ dealId, onOpenChange }: { dealId: string | null; onOpenChange: (o: boolean) => void }) {
  const { state } = useData();
  const deal = state.deals.find((d) => d.id === dealId);
  const rels = state.dealBuildings.filter((r) => r.dealId === dealId);
  const org = (id?: string) => state.organizations.find((o) => o.id === id)?.name ?? "—";
  const stageIdx = deal ? DEAL_STAGES.indexOf(deal.stage) : 0;
  const dead = deal && (deal.status === "dead" || deal.status === "abandoned");

  return (
    <Sheet open={!!deal} onOpenChange={onOpenChange}>
      <SheetContent width="max-w-[480px]">
        {deal && (
          <>
            <div className="border-b border-border px-5 py-4 pr-12">
              <div className="flex items-center gap-2 text-[11.5px] text-ink-4">
                <span className="font-mono">{deal.code}</span>·<span>{deal.type === "portfolio" ? "Portfolio" : "Single asset"}</span>
              </div>
              <SheetTitle className="mt-1 text-[17px] font-semibold tracking-[-0.01em]">{deal.name}</SheetTitle>
              <SheetDescription className="mt-1 text-[13px] leading-relaxed text-ink-3">{deal.summary}</SheetDescription>
              <div className="mt-2 flex gap-1.5">
                <DealStatusBadge status={deal.status} />
                {deal.skippedLoi && <Badge tone="outline">Skipped LOI</Badge>}
              </div>
            </div>
            <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {/* Stage tracker */}
              <div>
                <div className="text-[11.5px] font-medium text-ink-4">Stage</div>
                <ol className="mt-2 flex items-start">
                  {DEAL_STAGES.map((s, i) => {
                    const skipped = s === "loi_signed" && deal.skippedLoi;
                    const done = i < stageIdx || (i === stageIdx && deal.status === "closed");
                    const current = i === stageIdx && deal.status !== "closed";
                    return (
                      <li key={s} className="relative flex flex-1 flex-col items-center text-center">
                        {i > 0 && <span className={cn("absolute right-1/2 top-3 h-px w-full", i <= stageIdx && !dead ? "bg-accent" : "bg-border")} />}
                        <span
                          className={cn(
                            "relative z-10 flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                            skipped
                              ? "border-dashed border-border-strong bg-background text-ink-4"
                              : done
                                ? "border-accent bg-accent text-white"
                                : current
                                  ? dead
                                    ? "border-danger bg-danger-soft text-danger"
                                    : "border-accent bg-background text-accent ring-4 ring-accent-soft"
                                  : "border-border bg-background text-ink-4",
                          )}
                        >
                          {skipped ? "–" : done ? <Check className="size-3.5" /> : current && dead ? <CircleSlash className="size-3.5" /> : i + 1}
                        </span>
                        <span className={cn("mt-1.5 px-1 text-[11px] leading-tight", current ? "font-medium text-ink" : "text-ink-3", skipped && "line-through")}>{DEAL_STAGE_LABEL[s]}</span>
                      </li>
                    );
                  })}
                </ol>
                {deal.deadReason && <div className="mt-3 rounded-md border border-danger-line bg-danger-soft/60 px-3 py-2 text-[12.5px] text-ink-2">{deal.deadReason}</div>}
              </div>

              <div className="divide-y divide-border/70 rounded-md border border-border px-3">
                <KeyValueRow label="Asking price" value={fmtCurrency(deal.askingPrice)} />
                <KeyValueRow label="Purchase price" value={fmtCurrency(deal.purchasePrice)} />
                <KeyValueRow label={deal.actualCloseDate ? "Closed" : "Projected close"} value={fmtDate(deal.actualCloseDate ?? deal.projectedCloseDate)} />
                <KeyValueRow label="Seller" value={org(deal.sellerOrgId)} />
                <KeyValueRow label="Broker" value={org(deal.brokerOrgId)} />
                <KeyValueRow label="Lender" value={org(deal.lenderOrgId)} />
                <KeyValueRow label="Buyer entity" value={deal.buyerEntity} />
                <KeyValueRow label="Deal lead" value={deal.leadName} />
              </div>

              <div>
                <div className="text-[11.5px] font-medium text-ink-4">Buildings in this deal · {rels.length}</div>
                <ul className="mt-2 divide-y divide-border/70 rounded-md border border-border">
                  {rels.map((r) => {
                    const b = state.buildings.find((x) => x.id === r.buildingId);
                    const cms = state.cms.find((c) => c.buildingId === r.buildingId);
                    if (!b) return null;
                    return (
                      <li key={r.id}>
                        <Link to={`/buildings/${b.id}`} onClick={() => onOpenChange(false)} className="flex items-center gap-3 px-3 py-2.5 hover:bg-canvas">
                          <Building2 className="size-4 shrink-0 text-ink-4" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-ink">{b.name}</div>
                            <div className="text-[11.5px] text-ink-3">
                              {b.address.city}, {b.address.state} · {DEAL_ROLE_LABEL[r.role]} · {b.certifiedBeds.value} beds
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="tabular text-[12.5px] font-medium">{r.priceAllocation ? fmtCurrency(r.priceAllocation, { compact: true }) : "—"}</span>
                            {cms && <StarRating value={cms.ratings.overall} size="xs" />}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {rels.some((r) => r.priceAllocation) && (
                  <div className="mt-1.5 text-right text-[11.5px] text-ink-4">
                    Allocated: {fmtCurrency(rels.reduce((a, r) => a + (r.priceAllocation ?? 0), 0), { compact: true })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border bg-canvas/60 px-5 py-3">
              <span className="text-[11.5px] text-ink-4">Full deal workspace coming in the Deals module</span>
              <Button asChild variant="outline" size="sm">
                <Link to="/deals" onClick={() => onOpenChange(false)}>
                  Open in Deals <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
