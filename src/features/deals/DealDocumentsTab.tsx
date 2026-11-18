import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, FolderOpen, Search } from "lucide-react";
import type { ChecklistDoc, Deal } from "@/types";
import { Badge, Input } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import { EmptyState } from "@/components/shared/layout";
import { fmtBytes, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { sessionFileUrl } from "@/features/buildings/documents/sessionFiles";

type View = "filed" | "pending" | "all";

/** Documentation gathered through the deal checklist. Approved documents are "filed" here. */
export function DealDocumentsTab({ deal }: { deal: Deal }) {
  const [view, setView] = useState<View>("filed");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () =>
      (deal.checklist ?? []).flatMap((item) => item.documents.map((doc) => ({ item, doc }))).sort((a, b) => (b.doc.reviewedAt ?? b.doc.uploadedAt).localeCompare(a.doc.reviewedAt ?? a.doc.uploadedAt)),
    [deal.checklist],
  );
  const counts = { filed: rows.filter((r) => r.doc.status === "approved").length, pending: rows.filter((r) => r.doc.status !== "approved").length, all: rows.length };
  const shown = rows.filter((r) => (view === "all" ? true : view === "filed" ? r.doc.status === "approved" : r.doc.status !== "approved")).filter((r) => !q.trim() || `${r.doc.name} ${r.item.title}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <FolderOpen className="mt-0.5 size-4 text-ink-4" />
          <div className="text-[13px] text-ink-3">
            <span className="font-medium text-ink">Deal file.</span> Documentation is submitted on each Progress checklist item and filed here once the approver signs off.
            {deal.dataRoomUrl && (
              <>
                {" "}
                Source files live in the{" "}
                <a href={deal.dataRoomUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  data room
                </a>
                .
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-px rounded-md border border-border bg-subtle p-0.5">
          {(["filed", "pending", "all"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("h-7 rounded-[5px] px-2.5 text-xs font-medium", view === v ? "bg-background text-ink shadow-xs" : "text-ink-3 hover:text-ink")}>
              {v === "filed" ? "Filed" : v === "pending" ? "Awaiting approval" : "All"} <span className="tabular text-ink-4">{counts[v]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background shadow-card">
        <div className="border-b border-border p-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents or checklist items" className="pl-8" />
          </div>
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={FileText} title={view === "filed" ? "Nothing filed yet" : "No documents"} description="Upload documentation on a Progress checklist item; it's filed here when approved." />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
                  <th className="h-9 pl-4 font-medium">Document</th>
                  <th className="px-3 font-medium">Checklist item</th>
                  <th className="px-3 font-medium">Status</th>
                  <th className="px-3 font-medium">Submitted</th>
                  <th className="pl-3 pr-4 font-medium">Approved</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ item, doc }) => (
                  <DocRow key={doc.id} doc={doc} itemTitle={item.title} to={`/deals/${deal.id}/progress?item=${item.key}`} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DocRow({ doc, itemTitle, to }: { doc: ChecklistDoc; itemTitle: string; to: string }) {
  const url = sessionFileUrl(doc.id);
  return (
    <tr className="border-b border-border/70 last:border-0">
      <td className="py-2.5 pl-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4 shrink-0 text-ink-4" />
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
              {doc.name}
            </a>
          ) : (
            <Tooltip content="File contents aren't stored in the prototype">
              <span className="font-medium text-ink">{doc.name}</span>
            </Tooltip>
          )}
        </div>
        <div className="pl-6 text-[11.5px] text-ink-4">{fmtBytes(doc.size)}</div>
      </td>
      <td className="px-3">
        <Link to={to} className="text-ink-2 hover:text-accent hover:underline">
          {itemTitle}
        </Link>
      </td>
      <td className="px-3">
        <Badge tone={doc.status === "approved" ? "success" : doc.status === "rejected" ? "danger" : "warning"}>{doc.status === "approved" ? "Approved & filed" : doc.status === "rejected" ? "Changes requested" : "Awaiting approval"}</Badge>
      </td>
      <td className="whitespace-nowrap px-3 text-ink-2">
        {doc.uploadedBy}
        <div className="text-[11.5px] text-ink-4">{fmtDate(doc.uploadedAt)}</div>
      </td>
      <td className="whitespace-nowrap pl-3 pr-4 text-ink-2">
        {doc.reviewedBy && doc.status === "approved" ? (
          <>
            {doc.reviewedBy}
            <div className="text-[11.5px] text-ink-4">{fmtDate(doc.reviewedAt)}</div>
          </>
        ) : (
          <span className="text-ink-4">—</span>
        )}
      </td>
    </tr>
  );
}
