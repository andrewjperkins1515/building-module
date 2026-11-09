import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Cloud, FileText, History, MessageSquare, PlayCircle, RotateCcw, Trash2, Upload, XCircle } from "lucide-react";
import type { DocumentStatus } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetTitle, Tooltip } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Badge, Input, Label, Switch, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocStatusBadge } from "@/components/shared/badges";
import { Avatar } from "@/components/shared/layout";
import { useData } from "@/store/DataProvider";
import { isOverdue } from "@/store/selectors";
import { DOC_CATEGORY_LABEL, DOC_STATUSES, DOC_STATUS_LABEL, TEAM_MEMBERS } from "@/lib/labels";
import { fmtBytes, fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { rememberFile, sessionFileUrl } from "./sessionFiles";

const NONE = "__none";

export function DocumentReviewSheet({ docId, onClose }: { docId: string | null; onClose: () => void }) {
  const { state, setDocumentStatus, updateDocumentRequest, uploadDocumentFile, reviewDocument, addDocumentComment, deleteDocumentRequest } = useData();
  const toast = useToast();
  const doc = state.documentRequests.find((d) => d.id === docId);
  const [comment, setComment] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setComment("");
    setReviewNote("");
  }, [docId]);

  const building = doc ? state.buildings.find((b) => b.id === doc.buildingId) : undefined;
  const dealsForBuilding = doc ? state.dealBuildings.filter((r) => r.buildingId === doc.buildingId).map((r) => state.deals.find((d) => d.id === r.dealId)!) : [];
  const file = doc?.files[doc.files.length - 1];
  const previewUrl = doc && file ? sessionFileUrl(`${doc.id}:v${file.version}`) : undefined;
  const canDecide = !!doc && !!file && ["received", "in_review", "needs_revision", "rejected"].includes(doc.status);

  const decide = (action: "approved" | "rejected" | "needs_revision") => {
    if (!doc) return;
    if (action !== "approved" && !reviewNote.trim()) {
      toast({ title: "Add a review comment", description: "Explain what needs to change before rejecting or requesting revision.", tone: "warning" });
      return;
    }
    reviewDocument(doc.id, action, reviewNote.trim());
    setReviewNote("");
    toast({
      title: action === "approved" ? "Document approved" : action === "rejected" ? "Document rejected" : "Revision requested",
      description: doc.name,
      tone: action === "approved" ? "success" : "info",
    });
  };

  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent width="max-w-[640px]">
        {doc && (
          <>
            <div className="border-b border-border px-5 py-4 pr-12">
              <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-4">
                <span>{DOC_CATEGORY_LABEL[doc.category]}</span>·<span className="truncate">{building?.name}</span>
              </div>
              <SheetTitle className="mt-1 text-[17px] font-semibold tracking-[-0.01em]">{doc.name}</SheetTitle>
              <SheetDescription className="sr-only">Document request details and review</SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <DocStatusBadge status={doc.status} />
                {doc.isBaseline && <Badge tone="dark">Baseline</Badge>}
                {doc.required ? <Badge tone="accent">Required</Badge> : <Badge>Optional</Badge>}
                {isOverdue(doc) && <Badge tone="danger">Overdue</Badge>}
              </div>
            </div>

            <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {/* Preview */}
              <div className="overflow-hidden rounded-lg border border-border">
                {file ? (
                  <>
                    <div className="flex h-56 items-center justify-center bg-subtle">
                      {previewUrl && file.mimeType.startsWith("image/") ? (
                        <img src={previewUrl} alt={file.fileName} className="h-full w-full object-contain" />
                      ) : previewUrl && file.mimeType === "application/pdf" ? (
                        <iframe src={previewUrl} title={file.fileName} className="h-full w-full" />
                      ) : (
                        <MockPage name={doc.name} building={building?.name ?? ""} />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="size-4 shrink-0 text-ink-3" />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">{file.fileName}</div>
                          <div className="text-[11.5px] text-ink-3">
                            v{file.version} · {fmtBytes(file.fileSize)}
                            {file.pageCount ? ` · ${file.pageCount} pages` : ""} · {file.source === "sharepoint" ? "SharePoint sync" : "Uploaded"} by {file.uploadedBy} {fmtRelative(file.uploadedAt)}
                          </div>
                        </div>
                      </div>
                      <Tooltip content={previewUrl ? "Available for this session only" : "Mock preview — file contents are not stored in the prototype"}>
                        <Badge tone={previewUrl ? "info" : "warning"} className="shrink-0">
                          {previewUrl ? "Session preview" : "Mock preview"}
                        </Badge>
                      </Tooltip>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                    <div className="flex size-11 items-center justify-center rounded-full border border-dashed border-border-strong bg-canvas">
                      <Upload className="size-5 text-ink-4" />
                    </div>
                    <div className="mt-3 text-[13.5px] font-medium">No file received</div>
                    <div className="mt-1 max-w-xs text-[12.5px] text-ink-3">
                      {doc.status === "not_requested" ? "Request this document from the seller or operator, or upload it directly." : `Waiting on ${doc.requestedFrom ?? "the counterparty"}.`}
                    </div>
                    <div className="mt-4 flex gap-2">
                      {doc.status === "not_requested" && (
                        <Button variant="outline" size="sm" onClick={() => { setDocumentStatus(doc.id, "requested"); toast({ title: "Marked as requested", description: doc.name }); }}>
                          Mark requested
                        </Button>
                      )}
                      <Button size="sm" onClick={() => fileRef.current?.click()}>
                        <Upload /> Upload file
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Review actions */}
              {canDecide && (
                <div className="rounded-lg border border-accent-line bg-accent-soft/40 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-ink">Review decision</div>
                    {doc.status === "received" && (
                      <Button size="sm" variant="ghost" onClick={() => { setDocumentStatus(doc.id, "in_review"); toast({ title: "Review started", tone: "info" }); }}>
                        <PlayCircle /> Start review
                      </Button>
                    )}
                  </div>
                  <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2} className="mt-2 bg-background" placeholder="Review comment (required to reject or request revision)" />
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Button variant="success" onClick={() => decide("approved")}>
                      <CheckCircle2 /> Approve
                    </Button>
                    <Button variant="outline" onClick={() => decide("needs_revision")}>
                      <RotateCcw /> Request revision
                    </Button>
                    <Button variant="danger-outline" onClick={() => decide("rejected")}>
                      <XCircle /> Reject
                    </Button>
                  </div>
                </div>
              )}
              {doc.status === "approved" && (
                <div className="flex items-center gap-2.5 rounded-lg border border-success-line bg-success-soft/60 px-3.5 py-2.5 text-[13px]">
                  <CheckCircle2 className="size-4 text-success" />
                  <span className="flex-1">
                    Approved by <span className="font-medium">{[...doc.comments].reverse().find((c) => c.action === "approved")?.author ?? doc.reviewer}</span>
                    {" · "}
                    {fmtRelative([...doc.comments].reverse().find((c) => c.action === "approved")?.createdAt ?? doc.updatedAt)}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => { setDocumentStatus(doc.id, "in_review"); toast({ title: "Reopened for review", tone: "info" }); }}>
                    Reopen
                  </Button>
                </div>
              )}

              {/* Details */}
              <div>
                <div className="mb-2 text-[13px] font-semibold">Request details</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Status</Label>
                    <Select value={doc.status} onValueChange={(v) => setDocumentStatus(doc.id, v as DocumentStatus)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {DOC_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assigned reviewer</Label>
                    <Select value={doc.reviewer ?? NONE} onValueChange={(v) => updateDocumentRequest(doc.id, { reviewer: v === NONE ? undefined : v }, v === NONE ? undefined : `Assigned reviewer: ${v}.`)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Unassigned</SelectItem>
                        {TEAM_MEMBERS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Due date</Label>
                    <Input type="date" className="mt-1" value={doc.dueDate ?? ""} onChange={(e) => updateDocumentRequest(doc.id, { dueDate: e.target.value || undefined })} />
                  </div>
                  <div>
                    <Label>Requested from</Label>
                    <Input className="mt-1" defaultValue={doc.requestedFrom ?? ""} key={doc.id + "rf"} onBlur={(e) => e.target.value !== (doc.requestedFrom ?? "") && updateDocumentRequest(doc.id, { requestedFrom: e.target.value || undefined })} placeholder="Organization or person" />
                  </div>
                  <div>
                    <Label>Associated deal</Label>
                    <Select value={doc.dealId ?? NONE} onValueChange={(v) => updateDocumentRequest(doc.id, { dealId: v === NONE ? undefined : v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Building record only</SelectItem>
                        {dealsForBuilding.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end justify-between gap-3 rounded-md border border-border px-3 py-2">
                    <div>
                      <div className="text-[12px] font-medium text-ink-2">Required</div>
                      <div className="text-[11px] text-ink-4">Counts toward completion</div>
                    </div>
                    <Switch checked={doc.required} disabled={doc.isBaseline} onCheckedChange={(c) => updateDocumentRequest(doc.id, { required: c })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea className="mt-1" rows={2} defaultValue={doc.notes ?? ""} key={doc.id + "n"} onBlur={(e) => e.target.value !== (doc.notes ?? "") && updateDocumentRequest(doc.id, { notes: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Versions */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                    <History className="size-3.5 text-ink-4" /> Versions
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload /> {doc.files.length ? "Upload new version" : "Upload file"}
                  </Button>
                </div>
                {doc.files.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-ink-4">No versions yet</div>
                ) : (
                  <ul className="divide-y divide-border/70 rounded-md border border-border">
                    {[...doc.files].reverse().map((f, i) => (
                      <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                        <span className={cn("tabular flex size-6 items-center justify-center rounded text-[11px] font-semibold", i === 0 ? "bg-navy text-white" : "bg-subtle text-ink-3")}>v{f.version}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px] text-ink">{f.fileName}</div>
                          <div className="text-[11px] text-ink-4">
                            {fmtBytes(f.fileSize)} · {f.uploadedBy} · {fmtDateTime(f.uploadedAt)}
                          </div>
                        </div>
                        {f.source === "sharepoint" && (
                          <Tooltip content="Imported from connected data room">
                            <Cloud className="size-3.5 text-info" />
                          </Tooltip>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Comments */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                  <MessageSquare className="size-3.5 text-ink-4" /> Review history & comments
                </div>
                {doc.comments.length === 0 && <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-ink-4">No comments yet</div>}
                <ol className="space-y-3">
                  {doc.comments.map((c) => (
                    <li key={c.id} className="flex gap-2.5">
                      <Avatar name={c.author === "Data room sync" ? "S P" : c.author} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                          <span className="font-medium text-ink">{c.author}</span>
                          {c.action === "approved" && <Badge tone="success">Approved</Badge>}
                          {c.action === "rejected" && <Badge tone="danger">Rejected</Badge>}
                          {c.action === "needs_revision" && <Badge tone="danger">Revision requested</Badge>}
                          <span className="text-ink-4">{fmtRelative(c.createdAt)}</span>
                        </div>
                        <div className={cn("mt-0.5 text-[12.5px] leading-relaxed", c.action === "status_change" ? "text-ink-3" : "text-ink-2")}>{c.text}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && comment.trim()) {
                        addDocumentComment(doc.id, comment.trim());
                        setComment("");
                      }
                    }}
                    placeholder="Add a comment…"
                  />
                  <Button
                    variant="outline"
                    disabled={!comment.trim()}
                    onClick={() => {
                      addDocumentComment(doc.id, comment.trim());
                      setComment("");
                    }}
                  >
                    Comment
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border bg-canvas/60 px-5 py-3">
              {doc.isBaseline ? (
                <span className="text-[11.5px] text-ink-4">Baseline placeholder · cannot be removed</span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-soft hover:text-danger"
                  onClick={() => {
                    deleteDocumentRequest(doc.id);
                    onClose();
                    toast({ title: "Request removed", description: doc.name, tone: "info" });
                  }}
                >
                  <Trash2 /> Remove request
                </Button>
              )}
              <span className="text-[11.5px] text-ink-4">Created {fmtDate(doc.createdAt)}</span>
            </div>

            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  uploadDocumentFile(doc.id, { name: f.name, size: f.size, type: f.type });
                  rememberFile(`${doc.id}:v${doc.files.length + 1}`, f);
                  toast({ title: "File uploaded", description: `${f.name} · status set to ${doc.status === "approved" ? "In Review" : "Received"}` });
                }
                e.target.value = "";
              }}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MockPage({ name, building }: { name: string; building: string }) {
  return (
    <div className="relative h-[88%] aspect-[8.5/11] rounded-sm bg-white p-4 shadow-pop">
      <div className="text-[7px] font-semibold uppercase tracking-wide text-ink-4">{building}</div>
      <div className="mt-1 text-[10px] font-semibold leading-tight text-ink">{name}</div>
      <div className="mt-3 space-y-1.5">
        {[92, 100, 84, 96, 70, 0, 100, 88, 94, 60, 0, 80, 100, 76].map((w, i) => (
          <div key={i} className="h-[3px] rounded bg-muted" style={{ width: `${w}%`, opacity: w ? 1 : 0 }} />
        ))}
      </div>
      <div className="absolute bottom-3 right-3 rounded border border-warning-line bg-warning-soft px-1 text-[7px] font-medium uppercase text-warning">Mock</div>
    </div>
  );
}
