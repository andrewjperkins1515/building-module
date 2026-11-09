import { useMemo, useState } from "react";
import { BadgeCheck, Briefcase, Building2, ClipboardCheck, Cloud, FilePlus2, FileText, FileUp, NotebookPen, Pencil, RefreshCw, Send, type LucideIcon } from "lucide-react";
import type { ActivityType } from "@/types";
import { useData } from "@/store/DataProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/primitives";
import { Avatar, EmptyState } from "@/components/shared/layout";
import { ACTIVITY_LABEL, CURRENT_USER } from "@/lib/labels";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useBuildingPage } from "../context";

const ICONS: Record<ActivityType, LucideIcon> = {
  building_created: Building2,
  building_updated: Pencil,
  cms_refreshed: RefreshCw,
  document_uploaded: FileUp,
  document_reviewed: FileText,
  document_requested: FilePlus2,
  deal_associated: Briefcase,
  site_visit: ClipboardCheck,
  verification_changed: BadgeCheck,
  note: NotebookPen,
  data_room_sync: Cloud,
};

const FILTERS: { key: string; label: string; types: ActivityType[] }[] = [
  { key: "all", label: "All", types: [] },
  { key: "documents", label: "Documents", types: ["document_uploaded", "document_reviewed", "document_requested", "data_room_sync"] },
  { key: "deals", label: "Deals", types: ["deal_associated"] },
  { key: "visits", label: "Site visits", types: ["site_visit"] },
  { key: "data", label: "Data & verification", types: ["building_created", "building_updated", "cms_refreshed", "verification_changed"] },
  { key: "notes", label: "Notes", types: ["note"] },
];

export function ActivityTab() {
  const { bundle } = useBuildingPage();
  const { state, addNote } = useData();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [note, setNote] = useState("");

  const items = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    return f.types.length ? bundle.activities.filter((a) => f.types.includes(a.type)) : bundle.activities;
  }, [bundle.activities, filter]);

  // Group by day
  const groups = useMemo(() => {
    const m = new Map<string, typeof items>();
    items.forEach((a) => {
      const d = new Date(a.timestamp);
      const key = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      m.set(key, [...(m.get(key) ?? []), a]);
    });
    return [...m.entries()];
  }, [items]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 rounded-lg border border-border bg-background shadow-card">
        <div className="border-b border-border p-4">
          <div className="flex gap-3">
            <Avatar name={CURRENT_USER.name} size="md" />
            <div className="flex-1">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to this building’s timeline…" rows={2} />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  disabled={!note.trim()}
                  onClick={() => {
                    addNote(bundle.building.id, note.trim());
                    setNote("");
                    toast({ title: "Note added" });
                  }}
                >
                  <Send /> Post note
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-border px-4 py-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "h-7 shrink-0 rounded-md px-2.5 text-xs font-medium transition-colors",
                filter === f.key ? "bg-navy text-white" : "text-ink-3 hover:bg-subtle hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {items.length === 0 ? (
          <EmptyState icon={NotebookPen} title="No activity in this category" description="Activity is recorded automatically as the team works on this building." />
        ) : (
          <div className="px-4 py-3">
            {groups.map(([day, acts]) => (
              <div key={day} className="mb-2">
                <div className="sticky top-14 z-10 -mx-4 bg-background/95 px-4 py-1.5 text-[11.5px] font-medium text-ink-4 backdrop-blur">{day}</div>
                <ol className="relative ml-3.5 border-l border-border">
                  {acts.map((a) => {
                    const Icon = ICONS[a.type];
                    const deal = a.dealId ? state.deals.find((d) => d.id === a.dealId) : undefined;
                    return (
                      <li key={a.id} className="relative pb-4 pl-6 last:pb-2">
                        <span
                          className={cn(
                            "absolute -left-[13px] top-0 flex size-[26px] items-center justify-center rounded-full border border-border bg-background",
                            a.type === "document_reviewed" && /approved/.test(a.title) && "border-success-line bg-success-soft text-success",
                            a.type === "document_reviewed" && /(rejected|revision)/.test(a.title) && "border-danger-line bg-danger-soft text-danger",
                            a.type === "note" && "border-accent-line bg-accent-soft text-accent",
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <div className="text-[13px] text-ink">
                            <span className="font-medium">{a.title}</span>
                          </div>
                          <time className="text-[11.5px] text-ink-4" title={fmtDateTime(a.timestamp)}>
                            {fmtRelative(a.timestamp)}
                          </time>
                        </div>
                        {a.description && (
                          <div className={cn("mt-1 text-[12.5px] leading-relaxed text-ink-2", a.type === "note" && "rounded-md border border-border bg-canvas px-3 py-2")}>{a.description}</div>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-4">
                          <span>{a.actor}</span>
                          <span>·</span>
                          <span>{ACTIVITY_LABEL[a.type]}</span>
                          {deal && (
                            <>
                              <span>·</span>
                              <span className="text-ink-3">{deal.name}</span>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
      <aside className="space-y-3">
        <div className="rounded-lg border border-border bg-background p-4 shadow-card">
          <div className="text-[13px] font-semibold">Activity summary</div>
          <div className="mt-3 space-y-1.5">
            {FILTERS.slice(1).map((f) => (
              <div key={f.key} className="flex items-center justify-between text-[13px]">
                <span className="text-ink-3">{f.label}</span>
                <span className="tabular font-medium">{bundle.activities.filter((a) => f.types.includes(a.type)).length}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border pt-3 text-xs text-ink-4">Created {fmtDateTime(bundle.building.createdAt)} by {bundle.building.createdBy}</div>
        </div>
      </aside>
    </div>
  );
}
