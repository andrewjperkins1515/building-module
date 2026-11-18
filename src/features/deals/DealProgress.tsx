import { ArrowRight, Check, CircleSlash } from "lucide-react";
import type { Deal } from "@/types";
import { Progress } from "@/components/ui/primitives";
import { DEAL_STAGES, DEAL_STAGE_LABEL } from "@/lib/labels";
import { checklistCounts, checklistProgress } from "@/lib/checklist";
import { cn } from "@/lib/utils";

export function progressPct(deal: Deal) {
  return Math.round(checklistProgress(deal.checklist) * 100);
}

/** Compact stage tracker (High-Level Review → LOI → PSA → Closed). */
export function StageTracker({ deal, className }: { deal: Deal; className?: string }) {
  const idx = DEAL_STAGES.indexOf(deal.stage);
  const dead = deal.status === "dead" || deal.status === "abandoned";
  return (
    <ol className={cn("flex items-start", className)}>
      {DEAL_STAGES.map((s, i) => {
        const skipped = s === "loi_signed" && deal.skippedLoi;
        const done = i < idx || (i === idx && deal.status === "closed");
        const current = i === idx && deal.status !== "closed";
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={cn("absolute right-1/2 top-[11px] h-0.5 w-full", i <= idx && !dead ? "bg-accent" : "bg-border")} />}
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
            <span className={cn("mt-1.5 px-1 text-[11.5px] leading-tight", current ? "font-semibold text-ink" : "text-ink-3", skipped && "line-through")}>{DEAL_STAGE_LABEL[s]}</span>
            {skipped && <span className="text-[10px] text-ink-4">Skipped</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Deal progress bar card — links to the Progress tab. */
export function DealProgressCard({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const pct = progressPct(deal);
  const counts = checklistCounts(deal.checklist);
  const total = (deal.checklist?.length ?? 0) - counts.bypassed;
  const done = counts.complete;
  return (
    <button onClick={onOpen} className="group block w-full rounded-lg border border-border bg-background p-4 text-left shadow-card transition-colors hover:border-border-strong">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-4">Deal progress</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="tabular text-[24px] font-semibold tracking-[-0.02em] text-ink">{pct}%</span>
            <span className="text-[12.5px] text-ink-3">
              {total ? `${done} of ${total} checklist items complete${counts.awaiting_approval ? ` · ${counts.awaiting_approval} awaiting approval` : ""}` : "No checklist"}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent">
          View progress <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <Progress value={pct} className="mt-3 h-2.5" indicatorClassName={pct === 100 ? "bg-success" : undefined} />
      <StageTracker deal={deal} className="mt-4" />
    </button>
  );
}
