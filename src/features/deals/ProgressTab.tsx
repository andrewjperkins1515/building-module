import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, ListChecks, Info } from "lucide-react";
import type { Deal, ProgressItem } from "@/types";
import { useData } from "@/store/DataProvider";
import { Checkbox, Progress } from "@/components/ui/primitives";
import { EmptyState } from "@/components/shared/layout";
import { countLeaves, itemProgress, overallProgress } from "@/lib/progress";
import { fmtShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProgressTab({ deal }: { deal: Deal }) {
  const { toggleDealProgress } = useData();
  const items = deal.progress ?? [];
  const pct = Math.round(overallProgress(items) * 100);
  const { done, total } = countLeaves(items);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (!items.length)
    return (
      <div className="rounded-lg border border-border bg-background shadow-card">
        <EmptyState icon={ListChecks} title="No checklist for this deal" description="Recorded market transactions don't carry a progress checklist." />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-warning-line bg-warning-soft/50 px-4 py-3 text-[13px]">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="text-ink-2">
          <span className="font-medium text-ink">Starter checklist.</span> These items are placeholders that demonstrate the roll-up: completing sub-items advances each item, and items advance the deal's overall progress. They'll be replaced with the detailed Progress breakdown.
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="tabular text-[24px] font-semibold tracking-[-0.02em]">{pct}%</span>
            <span className="text-[13px] text-ink-3">overall · {done} of {total} items complete</span>
          </div>
          <button
            className="text-xs font-medium text-accent hover:underline"
            onClick={() => setCollapsed((c) => (c.size ? new Set() : new Set(items.map((i) => i.id))))}
          >
            {collapsed.size ? "Expand all" : "Collapse all"}
          </button>
        </div>
        <Progress value={pct} className="mt-3 h-2.5" indicatorClassName={pct === 100 ? "bg-success" : undefined} />
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4 lg:grid-cols-7">
          {items.map((i) => {
            const p = Math.round(itemProgress(i) * 100);
            return (
              <button key={i.id} onClick={() => document.getElementById(`pi-${i.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="text-left">
                <div className="truncate text-[11.5px] text-ink-3">{i.title}</div>
                <Progress value={p} className="mt-1 h-1" indicatorClassName={p === 100 ? "bg-success" : undefined} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            open={!collapsed.has(item.id)}
            onToggleOpen={() => setCollapsed((c) => { const n = new Set(c); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })}
            onToggle={(id) => toggleDealProgress(deal.id, id)}
          />
        ))}
      </div>
    </div>
  );
}

function ItemCard({ item, open, onToggleOpen, onToggle }: { item: ProgressItem; open: boolean; onToggleOpen: () => void; onToggle: (id: string) => void }) {
  const p = itemProgress(item);
  const pct = Math.round(p * 100);
  const kids = item.children ?? [];
  const { done, total } = countLeaves(kids.length ? kids : [item]);
  return (
    <section id={`pi-${item.id}`} className={cn("rounded-lg border bg-background shadow-card", pct === 100 ? "border-success-line" : "border-border")}>
      <header className="flex items-center gap-3 px-4 py-3">
        <Checkbox
          checked={pct === 100 ? true : pct > 0 ? "indeterminate" : false}
          onCheckedChange={() => onToggle(item.id)}
          aria-label={`Mark all of ${item.title} ${pct === 100 ? "incomplete" : "complete"}`}
        />
        <button onClick={onToggleOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {kids.length > 0 && (open ? <ChevronDown className="size-4 shrink-0 text-ink-4" /> : <ChevronRight className="size-4 shrink-0 text-ink-4" />)}
          <span className="truncate text-[14px] font-semibold text-ink">{item.title}</span>
          {pct === 100 && <CheckCircle2 className="size-4 shrink-0 text-success" />}
        </button>
        <span className="tabular hidden text-[12px] text-ink-3 sm:block">
          {done}/{total}
        </span>
        <div className="flex w-32 items-center gap-2 sm:w-48">
          <Progress value={pct} className="h-2" indicatorClassName={pct === 100 ? "bg-success" : undefined} />
          <span className="tabular w-9 text-right text-[12px] font-medium text-ink-2">{pct}%</span>
        </div>
      </header>
      {open && kids.length > 0 && (
        <ul className="border-t border-border">
          {kids.map((k) => (
            <li key={k.id} className="flex items-center gap-3 border-b border-border/60 py-2 pl-11 pr-4 last:border-0">
              <Checkbox checked={!!k.done} onCheckedChange={() => onToggle(k.id)} aria-label={k.title} />
              <span className={cn("flex-1 text-[13px]", k.done ? "text-ink-3 line-through decoration-ink-4/50" : "text-ink")}>{k.title}</span>
              {k.done && k.completedAt && <span className="text-[11.5px] text-ink-4">Done {fmtShortDate(k.completedAt)}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
