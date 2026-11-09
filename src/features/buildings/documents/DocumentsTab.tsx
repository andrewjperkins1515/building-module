import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, ClipboardCheck, FileText, ListPlus, Plus, Search, SearchX, Upload } from "lucide-react";
import type { DocumentCategory, DocumentRequest, DocumentStatus } from "@/types";
import { useData } from "@/store/DataProvider";
import { isOverdue } from "@/store/selectors";
import { Button } from "@/components/ui/button";
import { Badge, Input, Progress } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/overlays";
import { Avatar, EmptyState } from "@/components/shared/layout";
import { DocStatusBadge } from "@/components/shared/badges";
import { DOC_CATEGORIES, DOC_CATEGORY_LABEL, DOC_STATUSES, DOC_STATUS_LABEL } from "@/lib/labels";
import { daysUntil, fmtRelative, fmtShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useBuildingPage } from "../detail/context";
import { DocumentReviewSheet } from "./DocumentReviewSheet";
import { AddDocumentRequestDialog } from "./AddDocumentRequestDialog";
import { ApplyTemplateDialog } from "./ApplyTemplateDialog";
import { DataRoomPanel } from "./DataRoomPanel";
import { rememberFile } from "./sessionFiles";

type QuickView = "all" | "missing" | "review" | "revision" | "approved";

const QUICK: { key: QuickView; label: string; match: (d: DocumentRequest) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  // "Missing" = required items not yet received — consistent with the Overview and attention panel.
  { key: "missing", label: "Missing", match: (d) => d.required && ["not_requested", "requested", "rejected"].includes(d.status) },
  { key: "review", label: "Pending review", match: (d) => d.status === "received" || d.status === "in_review" },
  { key: "revision", label: "Needs revision", match: (d) => d.status === "needs_revision" },
  { key: "approved", label: "Approved", match: (d) => d.status === "approved" },
];

const STATUS_COLOR: Record<DocumentStatus, string> = {
  approved: "bg-success",
  in_review: "bg-warning",
  received: "bg-violet",
  needs_revision: "bg-danger",
  rejected: "bg-danger/60",
  requested: "bg-info",
  not_requested: "bg-border-strong",
};

const ALL = "__all";

export function DocumentsTab() {
  const { bundle } = useBuildingPage();
  const { state, setDocumentStatus, uploadDocumentFile } = useData();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const view = (params.get("view") as QuickView) || "all";
  const openDocId = params.get("doc");
  const setView = (v: QuickView) => {
    const p = new URLSearchParams(params);
    if (v === "all") p.delete("view");
    else p.set("view", v);
    setParams(p, { replace: true });
  };
  const openDoc = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set("doc", id);
    else p.delete("doc");
    setParams(p, { replace: !id });
  };

  // Scroll the highlighted row into view when deep-linked
  useEffect(() => {
    if (openDocId) document.getElementById(`doc-row-${openDocId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openDocId]);

  const docs = bundle.documents;
  const stats = bundle.docStats;

  const filtered = useMemo(() => {
    const qm = QUICK.find((x) => x.key === view) ?? QUICK[0];
    const t = q.trim().toLowerCase();
    return docs.filter(
      (d) =>
        qm.match(d) &&
        (category === ALL || d.category === category) &&
        (status === ALL || d.status === status) &&
        (!t || [d.name, d.requestedFrom ?? "", d.reviewer ?? "", ...d.files.map((f) => f.fileName)].join(" ").toLowerCase().includes(t)),
    );
  }, [docs, view, q, category, status]);

  const grouped = DOC_CATEGORIES.map((c) => ({ c, items: filtered.filter((d) => d.category === c) })).filter((g) => g.items.length);
  const statusCounts = DOC_STATUSES.map((s) => ({ s, n: docs.filter((d) => d.status === s).length })).filter((x) => x.n);
  const hasFilters = view !== "all" || q || category !== ALL || status !== ALL;

  const onUploadClick = (id: string) => {
    setUploadTarget(id);
    uploadRef.current?.click();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        {/* Progress header */}
        <div className="rounded-lg border border-border bg-background p-4 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="tabular text-[22px] font-semibold tracking-[-0.02em]">
                  {stats.requiredApproved} of {stats.required}
                </span>
                <span className="text-[13px] text-ink-3">required documents approved</span>
                <span className="tabular ml-auto text-[13px] font-medium text-ink-2 lg:ml-2">{stats.pct}%</span>
              </div>
              <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-muted">
                {statusCounts.map(({ s, n }) => (
                  <Tooltip key={s} content={`${DOC_STATUS_LABEL[s]}: ${n}`}>
                    <div className={cn("h-full transition-[width] duration-500", STATUS_COLOR[s])} style={{ width: `${(n / docs.length) * 100}%` }} />
                  </Tooltip>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-ink-3">
                {statusCounts.map(({ s, n }) => (
                  <button key={s} onClick={() => setStatus(status === s ? ALL : s)} className={cn("flex items-center gap-1.5 hover:text-ink", status === s && "font-medium text-ink")}>
                    <span className={cn("size-2 rounded-[2px]", STATUS_COLOR[s])} />
                    {DOC_STATUS_LABEL[s]} <span className="tabular">{n}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-2 lg:w-[300px]">
              {[
                { label: "Missing", n: stats.missing, tone: "text-danger", v: "missing" as QuickView },
                { label: "To review", n: stats.pendingReview, tone: "text-warning", v: "review" as QuickView },
                { label: "Overdue", n: stats.overdue, tone: "text-danger", v: "missing" as QuickView },
              ].map((x) => (
                <button key={x.label} onClick={() => setView(x.v)} className="rounded-md border border-border px-2.5 py-2 text-left transition-colors hover:bg-canvas">
                  <div className="text-[11px] text-ink-4">{x.label}</div>
                  <div className={cn("tabular text-[17px] font-semibold", x.n ? x.tone : "text-ink")}>{x.n}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toolbar + list */}
        <div className="rounded-lg border border-border bg-background shadow-card">
          <div className="space-y-2.5 border-b border-border p-3">
           <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="scrollbar-thin flex max-w-full gap-0.5 overflow-x-auto rounded-md border border-border bg-subtle p-0.5">
              {QUICK.map((v) => {
                const n = docs.filter(v.match).length;
                return (
                  <button
                    key={v.key}
                    onClick={() => setView(v.key)}
                    className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors", view === v.key ? "bg-background text-ink shadow-xs" : "text-ink-3 hover:text-ink")}
                  >
                    {v.label}
                    <span className="tabular text-[10.5px] text-ink-4">{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={() => setTemplateOpen(true)}>
                <ListPlus /> Checklist
              </Button>
              <Button variant="accent" onClick={() => setAddOpen(true)}>
                <Plus /> Add request
              </Button>
            </div>
           </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" className="pl-8" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {DOC_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {DOC_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {DOC_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {docs.length === 0 ? (
            <EmptyState icon={FileText} title="No document requests" description="Start a diligence checklist from the standard template or add individual requests." action={<Button variant="accent" onClick={() => setTemplateOpen(true)}><ListPlus /> Apply checklist template</Button>} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={view === "missing" ? ClipboardCheck : SearchX}
              title={view === "missing" && !q && category === ALL && status === ALL ? "Nothing missing" : "No documents match"}
              description={view === "missing" && !q ? "Every required checklist item has been received." : "Try a different filter or search term."}
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setView("all");
                      setQ("");
                      setCategory(ALL);
                      setStatus(ALL);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-canvas/70 text-left text-[11.5px] text-ink-3">
                    <th className="h-8 min-w-[300px] pl-4 font-medium">Document</th>
                    <th className="px-3 font-medium">Requested from</th>
                    <th className="px-3 font-medium">Reviewer</th>
                    <th className="px-3 font-medium">Due</th>
                    <th className="px-3 font-medium">Status</th>
                    <th className="w-[1%] pr-4" />
                  </tr>
                </thead>
                {grouped.map(({ c, items }) => {
                  const isCollapsed = collapsed.has(c);
                  const approved = items.filter((d) => d.status === "approved").length;
                  return (
                    <tbody key={c}>
                      <tr className="border-b border-border bg-canvas/40">
                        <td colSpan={6} className="h-8 pl-3">
                          <button
                            onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; })}
                            className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2"
                          >
                            {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            {DOC_CATEGORY_LABEL[c as DocumentCategory]}
                            <span className="tabular font-normal text-ink-4">
                              {approved}/{items.length} approved
                            </span>
                          </button>
                        </td>
                      </tr>
                      {!isCollapsed &&
                        items.map((d) => {
                          const overdue = isOverdue(d);
                          const n = daysUntil(d.dueDate);
                          const file = d.files[d.files.length - 1];
                          const canReview = d.status === "received" || d.status === "in_review";
                          return (
                            <tr
                              key={d.id}
                              id={`doc-row-${d.id}`}
                              onClick={() => openDoc(d.id)}
                              className={cn("group cursor-pointer border-b border-border/70 transition-colors hover:bg-canvas", openDocId === d.id && "bg-accent-soft/50")}
                            >
                              <td className="py-2.5 pl-4 pr-3">
                                <div className="flex items-start gap-2.5 pl-4">
                                  <FileText className={cn("mt-0.5 size-4 shrink-0", file ? "text-ink-3" : "text-ink-4/60")} />
                                  <div className="min-w-0 max-w-[420px]">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-medium text-ink">{d.name}</span>
                                      {d.isBaseline && <Badge tone="dark" className="px-1 text-[10px]">Baseline</Badge>}
                                      {d.required ? <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-4">Required</span> : <span className="text-[10.5px] uppercase tracking-wide text-ink-4/70">Optional</span>}
                                    </div>
                                    <div className="mt-0.5 truncate text-[11.5px] text-ink-4">
                                      {file ? (
                                        <>
                                          <span className="text-ink-3">{file.fileName}</span> · v{file.version} · {fmtRelative(file.uploadedAt)}
                                        </>
                                      ) : (
                                        "No file yet"
                                      )}
                                      {d.dealId && <> · {state.deals.find((x) => x.id === d.dealId)?.name}</>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="max-w-[160px] truncate px-3 text-ink-2">{d.requestedFrom ?? <span className="text-ink-4">—</span>}</td>
                              <td className="px-3">
                                {d.reviewer ? (
                                  <span className="flex items-center gap-1.5 text-ink-2">
                                    <Avatar name={d.reviewer} size="xs" />
                                    <span className="truncate">{d.reviewer.split(" ")[0]}</span>
                                  </span>
                                ) : (
                                  <span className="text-ink-4">Unassigned</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3">
                                {d.dueDate ? (
                                  <span className={cn("tabular", overdue ? "font-medium text-danger" : "text-ink-2")}>
                                    {fmtShortDate(d.dueDate)}
                                    {overdue && <span className="ml-1 text-[11px]">({Math.abs(n!)}d late)</span>}
                                  </span>
                                ) : (
                                  <span className="text-ink-4">—</span>
                                )}
                              </td>
                              <td className="px-3" onClick={(e) => e.stopPropagation()}>
                                <Select value={d.status} onValueChange={(v) => { setDocumentStatus(d.id, v as DocumentStatus); toast({ title: `Status set to ${DOC_STATUS_LABEL[v as DocumentStatus]}`, description: d.name }); }}>
                                  <SelectTrigger className="h-7 w-auto gap-1 border-transparent bg-transparent px-1 shadow-none hover:border-border hover:bg-background">
                                    <DocStatusBadge status={d.status} />
                                  </SelectTrigger>
                                  <SelectContent className="w-44">
                                    {DOC_STATUSES.map((s) => (
                                      <SelectItem key={s} value={s}>
                                        {DOC_STATUS_LABEL[s]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="pr-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-1">
                                  {canReview ? (
                                    <Button size="sm" variant="outline" onClick={() => openDoc(d.id)}>
                                      Review
                                    </Button>
                                  ) : (
                                    <Tooltip content={file ? "Upload new version" : "Upload file"}>
                                      <Button size="icon-sm" variant="ghost" onClick={() => onUploadClick(d.id)} aria-label="Upload file">
                                        <Upload />
                                      </Button>
                                    </Tooltip>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11.5px] text-ink-4">
            <span>
              {filtered.length} of {docs.length} requests
            </span>
            <span>Uploads are simulated: file details and review states are saved; file contents are not.</span>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-5">
        <DataRoomPanel />
        <div className="rounded-lg border border-border bg-background p-4 shadow-card">
          <div className="text-[13px] font-semibold">Completion by category</div>
          <div className="mt-3 space-y-2.5">
            {DOC_CATEGORIES.map((c) => {
              const items = docs.filter((d) => d.category === c);
              if (!items.length) return null;
              const a = items.filter((d) => d.status === "approved").length;
              return (
                <button key={c} onClick={() => setCategory(category === c ? ALL : c)} className="block w-full text-left">
                  <div className="flex justify-between text-[12px]">
                    <span className={cn("truncate", category === c ? "font-medium text-ink" : "text-ink-2")}>{DOC_CATEGORY_LABEL[c]}</span>
                    <span className="tabular text-ink-3">
                      {a}/{items.length}
                    </span>
                  </div>
                  <Progress value={(a / items.length) * 100} className="mt-1 h-1" indicatorClassName={a === items.length ? "bg-success" : undefined} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <input
        ref={uploadRef}
        type="file"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && uploadTarget) {
            const doc = docs.find((d) => d.id === uploadTarget);
            uploadDocumentFile(uploadTarget, { name: f.name, size: f.size, type: f.type });
            // The new file id is generated in the store; remember bytes under a request-scoped key for preview this session.
            rememberFile(`${uploadTarget}:v${(doc?.files.length ?? 0) + 1}`, f);
            toast({ title: "File uploaded", description: `${f.name} attached to ${doc?.name}. Status set to Received.` });
          }
          e.target.value = "";
          setUploadTarget(null);
        }}
      />

      <DocumentReviewSheet docId={openDocId} onClose={() => openDoc(null)} />
      <AddDocumentRequestDialog open={addOpen} onOpenChange={setAddOpen} />
      <ApplyTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
    </div>
  );
}
