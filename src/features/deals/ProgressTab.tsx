import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock,
  FileCheck2,
  FileText,
  FileUp,
  History,
  Link2,
  Lock,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trash2,
  Undo2,
  UserCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import type { ChecklistStage, Deal, DealChecklistItem } from "@/types";
import { useData } from "@/store/DataProvider";
import { Button } from "@/components/ui/button";
import { Badge, Input, Label, Progress, Textarea, type BadgeTone } from "@/components/ui/primitives";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, Tooltip } from "@/components/ui/overlays";
import { EmptyState } from "@/components/shared/layout";
import { useToast } from "@/components/ui/toast";
import { BUYER_SELLER_ROLE_LABEL, VENDOR_ROLE_LABEL } from "@/lib/labels";
import { fmtBytes, fmtDateTime, fmtRelative, fmtShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AUTO_RULE_LABEL,
  ITEM_STATE_LABEL,
  PIPELINE_PHASES,
  checklistCounts,
  checklistProgress,
  currentStage,
  docSatisfied,
  itemProgress,
  itemState,
  phaseItemDone,
  stagesComplete,
  templateFor,
  type ChecklistAction,
  type ItemState,
} from "@/lib/checklist";
import { ContactPhoto } from "@/features/crm/components";
import { rememberFile } from "@/features/buildings/documents/sessionFiles";
import { StageTracker } from "./DealProgress";
import { SearchPicker, useContactItems, type PickerItem } from "./SearchPicker";

const STATE_TONE: Record<ItemState, BadgeTone> = {
  complete: "success",
  awaiting_approval: "warning",
  awaiting_document: "info",
  in_progress: "accent",
  not_started: "outline",
  bypassed: "neutral",
};

type Filter = "all" | ItemState;

export function ProgressTab({ deal }: { deal: Deal }) {
  const items = deal.checklist ?? [];
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Set<string>>(() => new Set(params.get("item") ? [`${deal.id}_${params.get("item")}`] : []));
  const pct = Math.round(checklistProgress(items) * 100);
  const counts = checklistCounts(items);
  const activeCount = items.length - counts.bypassed;

  useEffect(() => {
    const key = params.get("item");
    if (!key) return;
    const id = items.find((i) => i.key === key)?.id;
    if (id) {
      setOpen((o) => new Set(o).add(id));
      setTimeout(() => document.getElementById(`ci-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (!items.length)
    return (
      <div className="rounded-lg border border-border bg-background shadow-card">
        <EmptyState icon={CircleDashed} title="No checklist for this deal" description="Recorded market transactions don't carry a deal checklist." />
      </div>
    );

  const shown = filter === "all" ? items : items.filter((i) => itemState(i) === filter);
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-4">
      {/* Overall */}
      <div className="rounded-lg border border-border bg-background p-4 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-4">Overall deal progress</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="tabular text-[26px] font-semibold tracking-[-0.02em]">{pct}%</span>
              <span className="text-[13px] text-ink-3">
                {counts.complete} of {activeCount} checklist items complete
                {counts.bypassed > 0 && ` · ${counts.bypassed} not needed for this deal`}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "awaiting_approval", "awaiting_document", "in_progress", "not_started", "complete", "bypassed"] as Filter[]).map((f) => {
              const n = f === "all" ? items.length : counts[f];
              if (f !== "all" && !n) return null;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn("h-7 rounded-md border px-2.5 text-xs font-medium transition-colors", filter === f ? "border-navy bg-navy text-white" : "border-border bg-background text-ink-2 hover:bg-subtle")}
                >
                  {f === "all" ? "All" : ITEM_STATE_LABEL[f]} <span className={cn("tabular", filter === f ? "text-white/70" : "text-ink-4")}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
        <Progress value={pct} className="mt-3 h-2.5" indicatorClassName={pct === 100 ? "bg-success" : undefined} />
        <StageTracker deal={deal} className="mt-4" />
      </div>

      <PhasePanel deal={deal} />

      {/* Checklist */}
      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="text-[13.5px] font-semibold">Checklist</div>
          <button className="text-xs font-medium text-accent hover:underline" onClick={() => setOpen((o) => (o.size ? new Set() : new Set(shown.map((i) => i.id))))}>
            {open.size ? "Collapse all" : "Expand all"}
          </button>
        </div>
        {shown.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-ink-3">No items in this view.</div>}
        <ul className="divide-y divide-border">
          {shown.map((item, idx) => (
            <ChecklistRow key={item.id} index={items.indexOf(item) + 1} deal={deal} item={item} open={open.has(item.id)} onToggle={() => toggle(item.id)} last={idx === shown.length - 1} />
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline phases (Deal sheet: Sourced → BOE Review → Full DD → Pre-Closing)
// ---------------------------------------------------------------------------

function PhasePanel({ deal }: { deal: Deal }) {
  const { setPhaseOverride } = useData();
  return (
    <div className="rounded-lg border border-border bg-background shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="text-[13.5px] font-semibold">Pipeline phases</div>
        <div className="text-[11.5px] text-ink-4">Ticks automatically from the checklist and deal record · click to override</div>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
        {PIPELINE_PHASES.map((ph) => {
          const done = ph.items.filter((it) => phaseItemDone(deal, it).done).length;
          return (
            <div key={ph.key} className="bg-background px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[12.5px] font-semibold text-ink">{ph.title}</div>
                <span className={cn("tabular text-[11.5px]", done === ph.items.length ? "font-medium text-success" : "text-ink-4")}>
                  {done}/{ph.items.length}
                </span>
              </div>
              <div className="text-[11px] text-ink-4">Leads to {ph.milestone}</div>
              <ul className="mt-2 space-y-1">
                {ph.items.map((it) => {
                  const st = phaseItemDone(deal, it);
                  const overridden = deal.phaseOverrides?.[it.key] !== undefined;
                  return (
                    <li key={it.key} className="flex items-start gap-2">
                      <Tooltip content={<span>{it.source}{overridden ? " · manually overridden" : ""}</span>}>
                        <button
                          onClick={() => setPhaseOverride(deal.id, it.key, !st.done)}
                          className={cn("mt-px flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors", st.done ? "border-success bg-success text-white" : "border-border-strong bg-background hover:border-ink-3")}
                          aria-label={`${it.title}: ${st.done ? "done" : "not done"}`}
                        >
                          {st.done && <Check className="size-3" strokeWidth={3} />}
                        </button>
                      </Tooltip>
                      <span className={cn("flex-1 text-[12.5px] leading-snug", st.done ? "text-ink" : "text-ink-3")}>
                        {it.title}
                        {overridden && it.rule && (
                          <button onClick={() => setPhaseOverride(deal.id, it.key, undefined)} className="ml-1 text-[10.5px] text-accent hover:underline">
                            reset
                          </button>
                        )}
                        {!it.rule && <span className="ml-1 text-[10.5px] text-ink-4">manual</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checklist row
// ---------------------------------------------------------------------------

function useContact(id?: string) {
  const { state } = useData();
  return id ? state.contacts.find((c) => c.id === id) : undefined;
}

function SegmentBar({ item }: { item: DealChecklistItem }) {
  const segs: { key: string; state: "done" | "skipped" | "current" | "todo"; label: string }[] = item.stages.map((s) => ({
    key: s.id,
    state: s.status === "done" ? "done" : s.status === "skipped" ? "skipped" : s === currentStage(item) ? "current" : "todo",
    label: s.title,
  }));
  if (item.requiresDocument) segs.push({ key: "doc", state: docSatisfied(item) ? "done" : "todo", label: "Documentation" });
  segs.push({ key: "approval", state: item.approval.status === "approved" ? "done" : stagesComplete(item) ? "current" : "todo", label: "Approval" });
  return (
    <div className="flex gap-0.5">
      {segs.map((s) => (
        <Tooltip key={s.key} content={`${s.label}: ${s.state === "current" ? "in progress" : s.state}`}>
          <span
            className={cn(
              "h-2 min-w-[10px] flex-1 rounded-[2px]",
              item.bypass ? "bg-muted" : s.state === "done" ? "bg-success" : s.state === "skipped" ? "bg-success/40" : s.state === "current" ? "bg-accent/60" : "bg-muted",
              (s.key === "doc" || s.key === "approval") && "max-w-[18px]",
            )}
          />
        </Tooltip>
      ))}
    </div>
  );
}

function ChecklistRow({ deal, item, index, open, onToggle }: { deal: Deal; item: DealChecklistItem; index: number; open: boolean; onToggle: () => void; last: boolean }) {
  const st = itemState(item);
  const pct = Math.round(itemProgress(item) * 100);
  const cur = currentStage(item);
  const responsible = useContact(item.responsibleContactId);
  const approver = useContact(item.approverContactId);
  const stageIdx = cur ? item.stages.indexOf(cur) + 1 : item.stages.length;
  const subtitle = item.bypass
    ? `Not needed — ${item.bypass.reason}`
    : st === "complete"
      ? `Approved by ${item.approval.by}${item.approval.at ? ` · ${fmtShortDate(item.approval.at)}` : ""}`
      : st === "awaiting_approval"
        ? `Awaiting sign-off from ${approver?.name ?? "approver"}`
        : st === "awaiting_document"
          ? `Awaiting documentation from ${responsible?.name ?? "responsible party"}`
          : cur
            ? `Stage ${stageIdx} of ${item.stages.length}: ${cur.title}`
            : "";

  return (
    <li id={`ci-${item.id}`} className={cn(item.bypass && "bg-canvas/60")}>
      <button onClick={onToggle} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", st === "complete" ? "bg-success text-white" : item.bypass ? "bg-muted text-ink-4" : "bg-subtle text-ink-3")}>
          {st === "complete" ? <Check className="size-4" /> : item.bypass ? <Ban className="size-3.5" /> : index}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className={cn("truncate text-[13.5px] font-semibold", item.bypass ? "text-ink-3 line-through decoration-ink-4/50" : "text-ink")}>{item.title}</span>
            <Badge tone={STATE_TONE[st]} className="hidden shrink-0 sm:inline-flex">
              {ITEM_STATE_LABEL[st]}
            </Badge>
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-ink-3">{subtitle}</span>
        </span>
        <span className="hidden md:block">
          <SegmentBar item={item} />
        </span>
        <span className="hidden items-center -space-x-1.5 lg:flex">
          <Tooltip content={responsible ? `Responsible: ${responsible.name}` : item.requiresResponsible ? "No responsible party" : "No responsible party needed"}>
            <span>{responsible ? <ContactPhoto name={responsible.name} dataUrl={responsible.photoDataUrl} size={24} className="ring-2 ring-background" /> : <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-border-strong bg-background"><UserRound className="size-3 text-ink-4" /></span>}</span>
          </Tooltip>
          <Tooltip content={approver ? `Approver: ${approver.name}` : "No approver"}>
            <span>{approver ? <ContactPhoto name={approver.name} dataUrl={approver.photoDataUrl} size={24} className="ring-2 ring-background" /> : <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-border-strong bg-background"><UserCheck className="size-3 text-ink-4" /></span>}</span>
          </Tooltip>
        </span>
        <span className="flex items-center gap-2">
          <span className="tabular w-9 text-right text-[12.5px] font-medium text-ink-2">{item.bypass ? "—" : `${pct}%`}</span>
          {open ? <ChevronDown className="size-4 text-ink-4" /> : <ChevronRight className="size-4 text-ink-4" />}
        </span>
      </button>
      {open && <ChecklistDetail deal={deal} item={item} />}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

function ReasonDialog({ open, title, description, confirm, onClose, onConfirm, placeholder }: { open: boolean; title: string; description: string; confirm: string; placeholder?: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [v, setV] = useState("");
  useEffect(() => {
    if (open) setV("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader title={title} description={description} />
        <DialogBody>
          <Label>Reason *</Label>
          <Textarea autoFocus rows={3} className="mt-1" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} />
          <p className="mt-1.5 text-[11.5px] text-ink-4">Recorded in the item's history. You can undo this later.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!v.trim()}
            onClick={() => {
              onConfirm(v.trim());
              onClose();
            }}
          >
            {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Prompt = null | { kind: "skip"; stage: ChecklistStage } | { kind: "bypass" } | { kind: "waive" } | { kind: "changes" };

function ChecklistDetail({ deal, item }: { deal: Deal; item: DealChecklistItem }) {
  const { checklistAction, updateDeal } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [note, setNote] = useState("");
  const [roomUrl, setRoomUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const act = (a: ChecklistAction) => checklistAction(deal.id, item.id, a);
  const tpl = templateFor(item.key);
  const cur = currentStage(item);
  const allResolved = stagesComplete(item);
  const approved = item.approval.status === "approved";
  const lastDone = [...item.stages].reverse().find((s) => s.status !== "todo" && !s.completedByApproval);

  // Contact picker items: deal team first, labelled with their deal role.
  const all = useContactItems([]);
  const pickerItems = useMemo<PickerItem[]>(() => {
    const roleOf = new Map<string, string>();
    (deal.contacts ?? []).forEach((c) => roleOf.set(c.contactId, c.side === "vendor" ? `Vendor · ${VENDOR_ROLE_LABEL[c.role as keyof typeof VENDOR_ROLE_LABEL]}` : `${c.side === "buyer" ? "Buyer" : "Seller"} · ${BUYER_SELLER_ROLE_LABEL[c.role as keyof typeof BUYER_SELLER_ROLE_LABEL]}`));
    return all.map((i) => (roleOf.has(i.id) ? { ...i, sub: `${roleOf.get(i.id)} — ${i.sub}`, preferred: true } : { ...i, preferred: false }));
  }, [all, deal.contacts]);
  const responsible = useContact(item.responsibleContactId);
  const approver = useContact(item.approverContactId);

  return (
    <div className="border-t border-border bg-canvas/40 px-4 py-4">
      {tpl?.hint && (
        <div className="mb-3 flex items-start gap-2 text-[12.5px] text-ink-3">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" /> {tpl.hint}
        </div>
      )}
      {item.bypass && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-[13px]">
          <span className="text-ink-2">
            <Ban className="mr-1.5 inline size-3.5 text-ink-4" />
            Not needed for this deal — {item.bypass.reason} <span className="text-ink-4">({item.bypass.by}, {fmtShortDate(item.bypass.at)})</span>
          </span>
          <Button size="sm" variant="outline" onClick={() => { act({ type: "restore" }); toast({ title: "Item restored to the checklist" }); }}>
            <RotateCcw /> Restore
          </Button>
        </div>
      )}

      <div className={cn("grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]", item.bypass && "pointer-events-none opacity-50")}>
        {/* Stages */}
        <div className="rounded-lg border border-border bg-background">
          <div className="border-b border-border px-4 py-2.5 text-[12.5px] font-semibold text-ink-2">Stages</div>
          <ol className="relative px-4 py-2">
            {item.stages.map((s, i) => {
              const isCur = s === cur;
              const done = s.status === "done";
              const skipped = s.status === "skipped";
              return (
                <li key={s.id} className="relative flex gap-3 pb-3 last:pb-1">
                  {i < item.stages.length - 1 && <span className={cn("absolute left-[11px] top-7 h-[calc(100%-22px)] w-px", done || skipped ? "bg-success/50" : "bg-border")} />}
                  <span
                    className={cn(
                      "relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border text-[10.5px] font-semibold",
                      done ? "border-success bg-success text-white" : skipped ? "border-dashed border-success/60 bg-background text-success" : isCur ? "border-accent bg-background text-accent ring-4 ring-accent-soft" : "border-border bg-background text-ink-4",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : skipped ? <SkipForward className="size-3" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn("text-[13px]", isCur ? "font-semibold text-ink" : done || skipped ? "text-ink-2" : "text-ink-3")}>{s.title}</span>
                      {s.auto && <Badge tone="info" className="text-[10px]"><Sparkles /> Auto</Badge>}
                      {s.completedByApproval && <Badge tone="outline" className="text-[10px]"><Lock /> On approval</Badge>}
                      {s.subItems && <span className="text-[11px] text-ink-4">{s.subItems.filter((x) => x.status !== "todo").length}/{s.subItems.length}</span>}
                    </div>
                    {done && <div className="text-[11.5px] text-ink-4">Completed by {s.completedBy} · {fmtRelative(s.completedAt)}</div>}
                    {skipped && <div className="text-[11.5px] text-ink-4">Skipped by {s.completedBy} — {s.skipReason}</div>}
                    {isCur && s.auto && <div className="mt-0.5 text-[11.5px] text-info">{AUTO_RULE_LABEL[s.auto]}</div>}
                    {isCur && s.auto === "has_dataroom" && (
                      <div className="mt-2 flex max-w-md gap-2">
                        <Input value={roomUrl} onChange={(e) => setRoomUrl(e.target.value)} placeholder="Paste the data room link (SharePoint, Box…)" className="h-8" />
                        <Button
                          size="sm"
                          disabled={!roomUrl.trim()}
                          onClick={() => {
                            updateDeal(deal.id, { dataRoomUrl: roomUrl.trim() }, "Data room linked");
                            toast({ title: "Data room linked", description: "Dataroom Setup completes automatically." });
                            setRoomUrl("");
                          }}
                        >
                          <Link2 /> Link
                        </Button>
                      </div>
                    )}
                    {isCur && (s.auto === "has_buildings" || s.auto === "vendors_engaged" || s.auto === "reports_drafts" || s.auto === "reports_finals") && (
                      <button onClick={() => navigate(`/deals/${deal.id}`)} className="mt-1 text-[11.5px] font-medium text-accent hover:underline">
                        Go to deal Overview →
                      </button>
                    )}
                    {s.subItems && (isCur || done || skipped || s.subItems.some((x) => x.status !== "todo")) && (
                      <ul className={cn("mt-2 grid gap-x-4 gap-y-0.5", s.subItems.length > 6 && "sm:grid-cols-2")}>
                        {s.subItems.map((x) => (
                          <li key={x.id} className="flex items-center gap-2 py-0.5">
                            <button
                              onClick={() => act({ type: "set_sub", stageId: s.id, subId: x.id, status: x.status === "done" ? "todo" : "done" })}
                              className={cn("flex size-4 shrink-0 items-center justify-center rounded-[4px] border", x.status === "done" ? "border-success bg-success text-white" : x.status === "na" ? "border-border bg-muted" : "border-border-strong bg-background hover:border-ink-3")}
                              aria-label={`${x.title}: ${x.status}`}
                            >
                              {x.status === "done" && <Check className="size-3" strokeWidth={3} />}
                            </button>
                            <span className={cn("flex-1 text-[12.5px]", x.status === "na" ? "text-ink-4 line-through" : x.status === "done" ? "text-ink-2" : "text-ink")}>{x.title}</span>
                            <button
                              onClick={() => act({ type: "set_sub", stageId: s.id, subId: x.id, status: x.status === "na" ? "todo" : "na" })}
                              className={cn("rounded px-1 text-[10.5px] font-medium", x.status === "na" ? "bg-muted text-ink-2" : "text-ink-4 hover:bg-subtle hover:text-ink-2")}
                              title="Not applicable for this deal"
                            >
                              N/A
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {isCur && !s.completedByApproval && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="accent" onClick={() => act({ type: "complete_stage", stageId: s.id })}>
                          <Check /> {s.auto ? "Mark complete manually" : "Complete stage"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPrompt({ kind: "skip", stage: s })}>
                          <SkipForward /> Skip stage
                        </Button>
                      </div>
                    )}
                    {s === lastDone && !approved && (
                      <button onClick={() => act({ type: "reopen_stage", stageId: s.id })} className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-ink-4 hover:text-ink">
                        <Undo2 className="size-3" /> Undo
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Sign-off */}
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-background">
            <div className="border-b border-border px-4 py-2.5 text-[12.5px] font-semibold text-ink-2">Sign-off</div>
            <div className="space-y-3 p-4">
              <PartyRow
                icon={<UserRound className="size-3.5" />}
                label="Responsible party"
                hint={item.requiresResponsible ? "Obtains the documentation" : "Not required for this item"}
                items={pickerItems}
                value={item.responsibleContactId}
                disabled={!item.requiresResponsible}
                onChange={(id) => act({ type: "set_party", field: "responsibleContactId", contactId: id, name: all.find((c) => c.id === id)?.label })}
              />
              <PartyRow
                icon={<UserCheck className="size-3.5" />}
                label="Approver"
                hint="Signs off that the documentation is sufficient"
                items={pickerItems}
                value={item.approverContactId}
                onChange={(id) => act({ type: "set_party", field: "approverContactId", contactId: id, name: all.find((c) => c.id === id)?.label })}
              />

              {/* Documents */}
              <div className="rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
                    <FileText className="size-3.5 text-ink-4" /> Document
                  </span>
                  {!item.requiresDocument ? (
                    <Badge tone="outline">Not required</Badge>
                  ) : item.documentWaived ? (
                    <Badge tone="neutral">Waived</Badge>
                  ) : docSatisfied(item) ? (
                    <Badge tone="success">Filed</Badge>
                  ) : item.documents.some((d) => d.status === "submitted") ? (
                    <Badge tone="warning">Submitted</Badge>
                  ) : (
                    <Badge tone="info">Needed</Badge>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  {item.documentWaived && (
                    <div className="text-[12px] text-ink-3">
                      Waived by {item.documentWaived.by} — {item.documentWaived.reason}{" "}
                      <button className="font-medium text-accent hover:underline" onClick={() => act({ type: "unwaive_doc" })}>
                        Restore
                      </button>
                    </div>
                  )}
                  {item.documents.length === 0 && !item.documentWaived && <div className="text-[12px] text-ink-4">{item.requiresDocument ? `No documentation submitted yet${responsible ? ` — ${responsible.name} is responsible` : ""}.` : "This item is completed by the approver's sign-off."}</div>}
                  {item.documents.map((d) => (
                    <div key={d.id} className="flex items-start gap-2 rounded-md bg-canvas px-2.5 py-2">
                      <FileText className="mt-0.5 size-3.5 shrink-0 text-ink-4" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] text-ink">{d.name}</div>
                        <div className="text-[11px] text-ink-4">
                          {fmtBytes(d.size)} · {d.uploadedBy} · {fmtRelative(d.uploadedAt)}
                          {d.reviewNote && d.status === "rejected" && <span className="text-danger"> · {d.reviewNote}</span>}
                        </div>
                      </div>
                      <Badge tone={d.status === "approved" ? "success" : d.status === "rejected" ? "danger" : "warning"} className="shrink-0">
                        {d.status === "approved" ? "Filed" : d.status === "rejected" ? "Changes requested" : "Awaiting approval"}
                      </Badge>
                      {d.status !== "approved" && (
                        <button onClick={() => act({ type: "remove_doc", docId: d.id })} className="text-ink-4 hover:text-danger" aria-label={`Remove ${d.name}`}>
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {item.requiresDocument && !approved && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                        <FileUp /> Upload documentation
                      </Button>
                      {!item.documentWaived && (
                        <Button size="sm" variant="ghost" onClick={() => setPrompt({ kind: "waive" })}>
                          Waive document
                        </Button>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      const id = `cdoc_${Date.now().toString(36)}`;
                      rememberFile(id, f);
                      act({ type: "upload_doc", doc: { id, name: f.name, size: f.size, mimeType: f.type || "application/octet-stream" } });
                      toast({ title: "Documentation submitted", description: `${f.name} is awaiting ${approver?.name ?? "approver"}'s sign-off.` });
                    }}
                  />
                </div>
              </div>

              {/* Approval */}
              <div className="rounded-md border border-border p-3">
                {approved ? (
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[12.5px]">
                      <div className="flex items-center gap-1.5 font-medium text-success">
                        <CheckCircle2 className="size-4" /> Approved
                      </div>
                      <div className="text-ink-3">
                        {item.approval.by} · {fmtDateTime(item.approval.at)}
                        {item.approval.note && <div className="mt-0.5 text-ink-2">“{item.approval.note}”</div>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => act({ type: "revoke_approval" })}>
                      <RotateCcw /> Revoke
                    </Button>
                  </div>
                ) : !allResolved ? (
                  <div className="flex items-center gap-2 text-[12.5px] text-ink-3">
                    <Clock className="size-3.5" /> Approval opens once every stage is complete or skipped.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[12.5px] font-medium text-ink">Approver sign-off{approver ? ` — ${approver.name}` : ""}</div>
                    {item.requiresDocument && !docSatisfied(item) && !item.documents.some((d) => d.status === "submitted") && !item.documentWaived && (
                      <div className="text-[12px] text-info">Waiting on documentation — upload it or waive the requirement.</div>
                    )}
                    <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Comment (required to request changes)" />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        disabled={item.requiresDocument && !item.documentWaived && !item.documents.some((d) => d.status === "submitted" || d.status === "approved")}
                        onClick={() => {
                          act({ type: "approve", note: note.trim() || undefined });
                          setNote("");
                          toast({ title: `${item.title} approved`, description: item.documents.some((d) => d.status === "submitted") ? "Documentation filed to the deal's Documents tab." : undefined });
                        }}
                      >
                        <FileCheck2 /> Approve{item.documents.some((d) => d.status === "submitted") ? " & file" : ""}
                      </Button>
                      {item.documents.some((d) => d.status === "submitted") && (
                        <Button
                          size="sm"
                          variant="danger-outline"
                          onClick={() => (note.trim() ? (act({ type: "request_changes", note: note.trim() }), setNote(""), toast({ title: "Changes requested", tone: "info" })) : setPrompt({ kind: "changes" }))}
                        >
                          <XCircle /> Request changes
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-4 py-2.5">
            <button onClick={() => setShowHistory((h) => !h)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2 hover:text-ink">
              <History className="size-3.5" /> History ({item.history.length})
            </button>
            {!item.bypass && (
              <Button size="sm" variant="ghost" onClick={() => setPrompt({ kind: "bypass" })}>
                <Ban /> Not needed for this deal
              </Button>
            )}
          </div>
          {showHistory && (
            <ol className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3 scrollbar-thin">
              {item.history.length === 0 && <li className="text-[12px] text-ink-4">No activity yet.</li>}
              {item.history.map((h) => (
                <li key={h.id} className="text-[12px]">
                  <span className={cn(h.tone === "success" ? "text-success" : h.tone === "danger" ? "text-danger" : h.tone === "warning" ? "text-warning" : "text-ink-2")}>{h.text}</span>
                  <div className="text-[11px] text-ink-4">
                    {h.by} · {fmtDateTime(h.at)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <ReasonDialog
        open={prompt?.kind === "skip"}
        title={`Skip “${prompt?.kind === "skip" ? prompt.stage.title : ""}”?`}
        description="The checklist item moves on to its next stage. Skipped stages count as complete."
        confirm="Skip stage"
        placeholder="e.g. Seller provided executed NDA directly; no comment round needed."
        onClose={() => setPrompt(null)}
        onConfirm={(r) => prompt?.kind === "skip" && (act({ type: "skip_stage", stageId: prompt.stage.id, reason: r }), toast({ title: "Stage skipped", tone: "info" }))}
      />
      <ReasonDialog
        open={prompt?.kind === "bypass"}
        title={`Mark “${item.title}” not needed?`}
        description="The item is excluded from this deal's progress so the deal isn't held up. You can restore it later."
        confirm="Mark not needed"
        placeholder="e.g. Existing operator remains — no new lease required."
        onClose={() => setPrompt(null)}
        onConfirm={(r) => (act({ type: "bypass", reason: r }), toast({ title: "Marked not needed for this deal", tone: "info" }))}
      />
      <ReasonDialog
        open={prompt?.kind === "waive"}
        title="Waive the document requirement?"
        description="The approver can sign off without documentation on file."
        confirm="Waive document"
        placeholder="e.g. Covered by the executed PSA already on file."
        onClose={() => setPrompt(null)}
        onConfirm={(r) => act({ type: "waive_doc", reason: r })}
      />
      <ReasonDialog
        open={prompt?.kind === "changes"}
        title="Request changes"
        description="The submitted documentation goes back to the responsible party."
        confirm="Request changes"
        placeholder="What needs to change?"
        onClose={() => setPrompt(null)}
        onConfirm={(r) => (act({ type: "request_changes", note: r }), toast({ title: "Changes requested", tone: "info" }))}
      />
    </div>
  );
}

function PartyRow({ icon, label, hint, items, value, onChange, disabled }: { icon: ReactNode; label: string; hint: string; items: PickerItem[]; value?: string; onChange: (id?: string) => void; disabled?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
        {icon} {label}
      </div>
      <div className="mb-1 text-[11px] text-ink-4">{hint}</div>
      {disabled ? <div className="rounded-md border border-dashed border-border px-2.5 py-1.5 text-[12.5px] text-ink-4">Not required</div> : <SearchPicker items={items} value={value} onChange={onChange} emptyLabel="Assign a contact" />}
    </div>
  );
}
