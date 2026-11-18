/**
 * Deal Progress checklist — template (from the "Deal Progress Tab" spec), state derivation,
 * actions, system-driven ("auto") stage completion and progress roll-up.
 *
 * Roll-up:
 *  - Each checklist item has N stages, plus an approval step, plus a document step (when required).
 *  - Item progress = completed steps ÷ total steps. Skipped stages and a waived document count as complete.
 *  - A stage with sub-items completes once every sub-item is done or marked N/A.
 *  - Deal progress = average progress of all items that are not bypassed ("not needed for this deal").
 */
import type { AppState, ChecklistAutoRule, ChecklistDoc, ChecklistStage, Deal, DealChecklistItem } from "@/types";
import { CURRENT_USER } from "@/lib/labels";
import { nowIso, uid } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

interface StageDef {
  title: string;
  auto?: ChecklistAutoRule;
  sub?: string[];
  completedByApproval?: boolean;
}
export interface ItemDef {
  key: string;
  title: string;
  stages: StageDef[];
  requiresResponsible?: boolean;
  requiresDocument?: boolean;
  /** Default responsible / approver role on the deal team. */
  responsibleRole?: Role;
  approverRole?: Role;
  hint?: string;
}
type Role = "buyer:team_lead" | "buyer:support_1" | "buyer:support_2" | "buyer:in_house_counsel" | "buyer:transaction_counsel" | "buyer:financing_counsel" | "seller:team_lead" | "vendor:title";

const single = (title: string, sub: string[]): StageDef[] => [{ title, sub }];

export const CHECKLIST_TEMPLATE: ItemDef[] = [
  {
    key: "deal_sourced",
    title: "Deal Sourced",
    stages: [
      { title: "Owner Docket Setup", auto: "deal_created" },
      { title: "Datatape Setup", auto: "has_buildings" },
      { title: "Dataroom Setup", auto: "has_dataroom" },
    ],
    responsibleRole: "buyer:support_1",
    hint: "Completes as the deal record, its buildings (data tape) and the data room link are set up in Owner Docket.",
  },
  { key: "nda", title: "NDA", stages: [{ title: "Draft" }, { title: "Comments" }, { title: "Execution" }], responsibleRole: "buyer:transaction_counsel" },
  { key: "dd_requests", title: "Due Diligence Requests", stages: [{ title: "Seller Provides" }, { title: "Buyer Reviews" }, { title: "Buyer Signs Off" }], responsibleRole: "seller:team_lead" },
  {
    key: "capital",
    title: "Capital Structuring",
    stages: [{ title: "Senior Lender", sub: ["Mezzanine Lender", "Preferred Equity", "Common Equity", "Seller Debt", "Earnout"] }, { title: "Solicit Capital Partner Term Sheets" }, { title: "Finalize Capital Terms" }],
    responsibleRole: "buyer:team_lead",
    approverRole: "buyer:in_house_counsel",
  },
  {
    key: "model",
    title: "Historical & Pro Forma Model",
    stages: [{ title: "Back of Envelope Model" }, { title: "Collect Due Diligence and Third-Party Input", sub: ["Rates", "Labor"] }, { title: "Refine Model" }, { title: "Finalize Model" }],
    responsibleRole: "buyer:support_1",
  },
  {
    key: "lease_term_sheet",
    title: "Lease Term Sheet",
    stages: [{ title: "Identify Operator" }, { title: "Negotiate Terms" }, { title: "Draft LOI" }, { title: "Comments" }, { title: "Finalize" }, { title: "Execute" }],
    responsibleRole: "buyer:team_lead",
    approverRole: "buyer:in_house_counsel",
  },
  {
    key: "psa_loi",
    title: "PSA LOI",
    stages: [{ title: "Negotiate Terms" }, { title: "Draft" }, { title: "Comments" }, { title: "Finalize" }, { title: "Execute" }, { title: "Completed (Moved to File System)", completedByApproval: true }],
    requiresResponsible: false,
    requiresDocument: false,
    hint: "The approver's sign-off marks it done and moves it to the file system.",
  },
  { key: "internal_approvals", title: "Internal Approvals", stages: single("Internal Approvals", ["Investment Lead / CIO Approval", "Investment Committee", "Accounting", "Tax", "Legal"]), responsibleRole: "buyer:team_lead", approverRole: "buyer:in_house_counsel" },
  {
    key: "title_escrow",
    title: "Engage Title / Escrow Agent",
    stages: [{ title: "Escrow Instruction Letter" }, { title: "Deposit" }, { title: "Closing Conditions" }, { title: "Closing Statement Draft", sub: ["Invoices", "Transfer Taxes", "Mortgage Taxes", "Recording Fees", "Prorations"] }],
    responsibleRole: "vendor:title",
  },
  {
    key: "third_party",
    title: "Order Third-Party Reports",
    stages: [
      { title: "Solicit Proposals", sub: ["Title Policies", "Land Surveys", "Zoning Reports", "Property Condition Reports", "Environmental Reports", "Appraisals", "Rate Consultant", "Transaction Counsel", "Licensure / Regulatory Counsel", "Engage with Capital", "Internal Site Visits"] },
      { title: "Engage", auto: "vendors_engaged" },
      { title: "Schedule Site Visits" },
      { title: "Collect Drafts", auto: "reports_drafts" },
      { title: "Comment" },
      { title: "Finalize" },
      { title: "Collect & Approve Final Draft", auto: "reports_finals" },
      { title: "Collect Final Invoices" },
    ],
    responsibleRole: "buyer:support_2",
    hint: "Engage, Collect Drafts and Collect & Approve Final Draft complete from the deal's Third-party vendors and reports.",
  },
  {
    key: "investment_summary",
    title: "Investment Summary",
    stages: [
      {
        title: "Build Template",
        sub: ["Recommendation", "Returns Summary", "Subject Portfolio", "Backstory", "Structure", "Thesis / Assumptions", "Risks / Mitigants", "Clinical", "Photos", "Operator — About", "Operator — Key Personnel", "Operator — Global Map", "Operator — Global Performance", "Operator — Global Clinical"],
      },
      { title: "Draft" },
      { title: "Review" },
      { title: "Draft 2" },
      { title: "Review 2" },
      { title: "Finalize" },
      { title: "Publish" },
    ],
    responsibleRole: "buyer:support_1",
  },
  {
    key: "acquisition_docs",
    title: "Acquisition Documents",
    stages: [{ title: "Draft", sub: ["APA / MIPA", "Deposit", "Purchase Price", "Security Package (Indemnity)", "Allocations", "Timing", "Schedules"] }, { title: "Redline" }, { title: "Comments" }, { title: "Issues List" }, { title: "Finalize" }, { title: "Execute" }],
    responsibleRole: "buyer:transaction_counsel",
  },
  {
    key: "lease_guaranty",
    title: "Lease & Guaranty Documents",
    stages: [{ title: "Draft", sub: ["Term", "Rent", "CapEx Requirements", "Escalators", "Purchase Option", "Contingent Payments", "Guaranty", "Schedules"] }, { title: "Redline" }, { title: "Comments" }, { title: "Issues List" }, { title: "Finalize" }, { title: "Execute" }],
    responsibleRole: "buyer:transaction_counsel",
  },
  { key: "guarantor", title: "Guarantor", stages: single("Guarantor", ["PSA Guarantor", "Lease / Loan Guarantor Review"]), responsibleRole: "buyer:financing_counsel" },
  { key: "insurance", title: "Insurance Requirements", stages: single("Insurance Requirements", ["GL / PL", "Property", "Cyber Insurance", "Workers' Comp"]), responsibleRole: "buyer:support_2" },
  { key: "accounting", title: "Lease / Loan Accounting", stages: single("Lease / Loan Accounting", ["Lease Classification", "First Month's Rent Invoices"]), responsibleRole: "buyer:support_1" },
  {
    key: "closing_funding",
    title: "Closing and Funding Mechanics",
    stages: single("Closing and Funding Mechanics", [
      "Invoices to Title",
      "Review Draft Closing Statements",
      "Confirm Prorations",
      "Confirm Payoffs",
      "Confirm Fees",
      "Confirm Funding Sources & Amounts",
      "Collect and Verify Wiring Instructions",
      "Final Sign-Off Closing Statements — Buyer / Seller / Operator / Financing",
      "Build Funding Package",
      "Verify Escrow Instructions Letter",
      "Submit Funding Package",
      "Closing Conditions Satisfied",
      "Authorize Funding",
      "Authorize Closing",
    ]),
    responsibleRole: "buyer:team_lead",
    approverRole: "buyer:in_house_counsel",
  },
  { key: "post_closing", title: "Post Closing Follow Up", stages: single("Post Closing Follow Up", ["Operator Portal", "Invoicing", "Collect Any Other Post-Closing Items (Deal Specific)"]), responsibleRole: "buyer:support_2" },
  {
    key: "handoff_am",
    title: "Hand Off to Asset Management",
    stages: [{ title: "Transitioned to Asset Management", auto: "transitioned_to_am" }],
    requiresDocument: false,
    responsibleRole: "buyer:team_lead",
    hint: "Completes when the deal is moved to Transitioned to Asset Management.",
  },
];

export const templateFor = (key: string) => CHECKLIST_TEMPLATE.find((t) => t.key === key);

function roleContact(deal: Deal, role?: Role) {
  if (!role) return undefined;
  const [side, r] = role.split(":");
  return deal.contacts?.find((c) => c.side === side && c.role === r)?.contactId;
}

/** Progress preset per item: stages completed, sub-items done, sign-off state, bypass. */
export interface ItemPreset {
  stages?: number;
  subs?: number | "all";
  submitted?: boolean;
  complete?: boolean;
  bypass?: string;
}

export function buildChecklist(deal: Deal, presets: Record<string, ItemPreset> = {}, at = nowIso()): DealChecklistItem[] {
  const lead = roleContact(deal, "buyer:team_lead");
  return CHECKLIST_TEMPLATE.map((t) => {
    const p = presets[t.key] ?? {};
    const doneStages = p.complete ? t.stages.length : Math.min(p.stages ?? 0, t.stages.length);
    const responsible = roleContact(deal, t.responsibleRole) ?? lead;
    const approver = roleContact(deal, t.approverRole ?? "buyer:team_lead") ?? lead;
    const approverName = "Deal team";
    const stages: ChecklistStage[] = t.stages.map((s, si) => {
      const stageDone = si < doneStages && !(s.completedByApproval && !p.complete);
      const subsDone = stageDone ? Infinity : si === doneStages ? (p.subs === "all" ? Infinity : (p.subs ?? 0)) : 0;
      return {
        id: `${deal.id}_${t.key}_s${si}`,
        title: s.title,
        status: stageDone ? "done" : "todo",
        auto: s.auto,
        completedByApproval: s.completedByApproval,
        completedAt: stageDone ? at : undefined,
        completedBy: stageDone ? (s.auto ? "System" : approverName) : undefined,
        subItems: s.sub?.map((title, k) => ({ id: `${deal.id}_${t.key}_s${si}_${k}`, title, status: k < subsDone ? "done" : "todo" })),
      };
    });
    const requiresDocument = t.requiresDocument ?? true;
    const docs: ChecklistDoc[] =
      requiresDocument && (p.complete || p.submitted)
        ? [{ id: `${deal.id}_${t.key}_doc`, name: `${deal.code}_${t.title.replace(/[^A-Za-z0-9]+/g, "_")}.pdf`, size: 240_000 + t.key.length * 37_000, mimeType: "application/pdf", uploadedAt: at, uploadedBy: "Deal team", status: p.complete ? "approved" : "submitted", reviewedBy: p.complete ? "Deal team" : undefined, reviewedAt: p.complete ? at : undefined }]
        : [];
    return {
      id: `${deal.id}_${t.key}`,
      key: t.key,
      title: t.title,
      stages,
      responsibleContactId: (t.requiresResponsible ?? true) ? responsible : undefined,
      approverContactId: approver,
      requiresResponsible: t.requiresResponsible ?? true,
      requiresDocument,
      approval: p.complete ? { status: "approved", by: "Deal team", at } : { status: "pending" },
      documents: docs,
      bypass: p.bypass ? { reason: p.bypass, by: "Deal team", at } : undefined,
      history: [],
    };
  });
}

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

export type ItemState = "bypassed" | "complete" | "awaiting_approval" | "awaiting_document" | "in_progress" | "not_started";

export const ITEM_STATE_LABEL: Record<ItemState, string> = {
  bypassed: "Not needed",
  complete: "Complete",
  awaiting_approval: "Awaiting approval",
  awaiting_document: "Awaiting documentation",
  in_progress: "In progress",
  not_started: "Not started",
};

const stageResolved = (s: ChecklistStage) => s.status !== "todo";
/** Stages that must be done before sign-off (stages completed by the approval itself are excluded). */
const workStages = (i: DealChecklistItem) => i.stages.filter((s) => !s.completedByApproval);

export function docSatisfied(i: DealChecklistItem) {
  return !i.requiresDocument || !!i.documentWaived || i.documents.some((d) => d.status === "approved");
}
export function docSubmitted(i: DealChecklistItem) {
  return i.documents.some((d) => d.status === "submitted");
}
export function stagesComplete(i: DealChecklistItem) {
  return workStages(i).every(stageResolved);
}
export function currentStage(i: DealChecklistItem) {
  return i.stages.find((s) => s.status === "todo" && !s.completedByApproval);
}

export function itemState(i: DealChecklistItem): ItemState {
  if (i.bypass) return "bypassed";
  if (i.approval.status === "approved" && stagesComplete(i) && docSatisfied(i)) return "complete";
  if (stagesComplete(i)) return !i.requiresDocument || i.documentWaived || docSubmitted(i) || docSatisfied(i) ? "awaiting_approval" : "awaiting_document";
  if (i.stages.some((s) => s.status !== "todo") || i.stages.some((s) => s.subItems?.some((x) => x.status !== "todo"))) return "in_progress";
  return "not_started";
}

export function itemSteps(i: DealChecklistItem) {
  const stages = i.stages.length;
  const total = stages + 1 + (i.requiresDocument ? 1 : 0);
  let done = i.stages.filter(stageResolved).length + (i.approval.status === "approved" ? 1 : 0);
  if (i.requiresDocument && docSatisfied(i)) done += 1;
  // Partial credit for sub-items inside the current stage.
  const cur = currentStage(i);
  if (cur?.subItems?.length) done += cur.subItems.filter((x) => x.status !== "todo").length / cur.subItems.length;
  return { done, total };
}

export function itemProgress(i: DealChecklistItem) {
  if (i.bypass) return 1;
  const { done, total } = itemSteps(i);
  return total ? Math.min(1, done / total) : 0;
}

export function checklistProgress(items?: DealChecklistItem[]) {
  const active = (items ?? []).filter((i) => !i.bypass);
  if (!active.length) return 0;
  return active.reduce((a, i) => a + itemProgress(i), 0) / active.length;
}

export function checklistCounts(items?: DealChecklistItem[]) {
  const c: Record<ItemState, number> = { bypassed: 0, complete: 0, awaiting_approval: 0, awaiting_document: 0, in_progress: 0, not_started: 0 };
  (items ?? []).forEach((i) => (c[itemState(i)] += 1));
  return c;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type ChecklistAction =
  | { type: "complete_stage"; stageId: string }
  | { type: "reopen_stage"; stageId: string }
  | { type: "skip_stage"; stageId: string; reason: string }
  | { type: "set_sub"; stageId: string; subId: string; status: "todo" | "done" | "na" }
  | { type: "set_party"; field: "responsibleContactId" | "approverContactId"; contactId?: string; name?: string }
  | { type: "upload_doc"; doc: Pick<ChecklistDoc, "name" | "size" | "mimeType"> & { id?: string } }
  | { type: "remove_doc"; docId: string }
  | { type: "approve"; note?: string }
  | { type: "request_changes"; note: string }
  | { type: "revoke_approval" }
  | { type: "waive_doc"; reason: string }
  | { type: "unwaive_doc" }
  | { type: "bypass"; reason: string }
  | { type: "restore" };

function evt(text: string, by: string, tone?: "default" | "success" | "warning" | "danger") {
  return { id: uid("ev"), at: nowIso(), by, text, tone };
}

/** Complete a stage when all its sub-items are resolved. */
function settleSubs(s: ChecklistStage, by: string): ChecklistStage {
  if (s.status === "todo" && s.subItems?.length && s.subItems.every((x) => x.status !== "todo")) return { ...s, status: "done", completedAt: nowIso(), completedBy: by };
  return s;
}

export function applyChecklistAction(item: DealChecklistItem, a: ChecklistAction, by = CURRENT_USER.name): DealChecklistItem {
  const stage = "stageId" in a ? item.stages.find((s) => s.id === a.stageId) : undefined;
  const mapStage = (fn: (s: ChecklistStage) => ChecklistStage) => item.stages.map((s) => (s.id === stage?.id ? fn(s) : s));
  switch (a.type) {
    case "complete_stage":
      return { ...item, stages: mapStage((s) => ({ ...s, status: "done", completedAt: nowIso(), completedBy: by, skipReason: undefined })), history: [evt(`Completed stage “${stage?.title}”`, by, "success"), ...item.history] };
    case "reopen_stage":
      return {
        ...item,
        stages: mapStage((s) => ({ ...s, status: "todo", completedAt: undefined, completedBy: undefined, skipReason: undefined })),
        approval: { status: "pending" },
        history: [evt(`Reopened stage “${stage?.title}”`, by, "warning"), ...item.history],
      };
    case "skip_stage":
      return { ...item, stages: mapStage((s) => ({ ...s, status: "skipped", completedAt: nowIso(), completedBy: by, skipReason: a.reason })), history: [evt(`Skipped stage “${stage?.title}” — ${a.reason}`, by, "warning"), ...item.history] };
    case "set_sub": {
      const sub = stage?.subItems?.find((x) => x.id === a.subId);
      const stages = mapStage((s) => settleSubs({ ...s, subItems: s.subItems?.map((x) => (x.id === a.subId ? { ...x, status: a.status } : x)) }, by));
      const moved = stages.find((s) => s.id === stage?.id)?.status === "done" && stage?.status === "todo";
      const label = a.status === "done" ? "done" : a.status === "na" ? "N/A" : "to do";
      return {
        ...item,
        stages,
        history: [...(moved ? [evt(`Stage “${stage?.title}” complete — all items resolved`, by, "success")] : []), evt(`“${sub?.title}” marked ${label}`, by), ...item.history],
      };
    }
    case "set_party":
      return { ...item, [a.field]: a.contactId, history: [evt(`${a.field === "approverContactId" ? "Approver" : "Responsible party"} set to ${a.name ?? "nobody"}`, by), ...item.history] };
    case "upload_doc":
      return {
        ...item,
        documents: [...item.documents, { id: a.doc.id ?? uid("cdoc"), name: a.doc.name, size: a.doc.size, mimeType: a.doc.mimeType, uploadedAt: nowIso(), uploadedBy: by, status: "submitted" }],
        history: [evt(`Submitted ${a.doc.name} for approval`, by), ...item.history],
      };
    case "remove_doc":
      return { ...item, documents: item.documents.filter((d) => d.id !== a.docId), history: [evt("Removed a submitted document", by), ...item.history] };
    case "approve": {
      const at = nowIso();
      return {
        ...item,
        approval: { status: "approved", by, at, note: a.note },
        documents: item.documents.map((d) => (d.status === "submitted" ? { ...d, status: "approved", reviewedBy: by, reviewedAt: at, reviewNote: a.note } : d)),
        stages: item.stages.map((s) => (s.completedByApproval && s.status === "todo" ? { ...s, status: "done", completedAt: at, completedBy: by } : s)),
        history: [evt(`Approved${item.documents.some((d) => d.status === "submitted") ? " — documentation filed to Documents" : ""}${a.note ? `: ${a.note}` : ""}`, by, "success"), ...item.history],
      };
    }
    case "request_changes": {
      const at = nowIso();
      return {
        ...item,
        approval: { status: "pending" },
        documents: item.documents.map((d) => (d.status === "submitted" ? { ...d, status: "rejected", reviewedBy: by, reviewedAt: at, reviewNote: a.note } : d)),
        history: [evt(`Changes requested: ${a.note}`, by, "danger"), ...item.history],
      };
    }
    case "revoke_approval":
      return { ...item, approval: { status: "pending" }, stages: item.stages.map((s) => (s.completedByApproval ? { ...s, status: "todo", completedAt: undefined, completedBy: undefined } : s)), history: [evt("Approval revoked", by, "warning"), ...item.history] };
    case "waive_doc":
      return { ...item, documentWaived: { reason: a.reason, by, at: nowIso() }, history: [evt(`Document requirement waived — ${a.reason}`, by, "warning"), ...item.history] };
    case "unwaive_doc":
      return { ...item, documentWaived: undefined, history: [evt("Document requirement restored", by), ...item.history] };
    case "bypass":
      return { ...item, bypass: { reason: a.reason, by, at: nowIso() }, history: [evt(`Marked not needed for this deal — ${a.reason}`, by, "warning"), ...item.history] };
    case "restore":
      return { ...item, bypass: undefined, history: [evt("Restored to the deal checklist", by), ...item.history] };
  }
}

// ---------------------------------------------------------------------------
// System-driven stage completion
// ---------------------------------------------------------------------------

export const AUTO_RULE_LABEL: Record<ChecklistAutoRule, string> = {
  deal_created: "Completes automatically — the deal record exists in Owner Docket",
  has_buildings: "Completes automatically when buildings (the data tape) are linked to the deal",
  has_dataroom: "Completes automatically when a data room link is added to the deal",
  vendors_engaged: "Completes automatically when a third-party vendor is assigned on the deal",
  reports_drafts: "Completes automatically when a third-party report draft is received",
  reports_finals: "Completes automatically when every ordered third-party report is final or waived",
  transitioned_to_am: "Completes automatically when the deal is Transitioned to Asset Management",
};

export function autoRuleMet(rule: ChecklistAutoRule, deal: Deal, s: Pick<AppState, "dealBuildings">): boolean {
  const reports = deal.reports ?? [];
  switch (rule) {
    case "deal_created":
      return true;
    case "has_buildings":
      return s.dealBuildings.some((r) => r.dealId === deal.id);
    case "has_dataroom":
      return !!deal.dataRoomUrl?.trim();
    case "vendors_engaged":
      return (deal.contacts ?? []).some((c) => c.side === "vendor");
    case "reports_drafts":
      return reports.some((r) => r.status === "draft_received" || r.status === "final_received");
    case "reports_finals": {
      const ordered = reports.filter((r) => r.status !== "not_ordered");
      return ordered.length > 0 && ordered.every((r) => r.status === "final_received" || r.status === "waived");
    }
    case "transitioned_to_am":
      return deal.stage === "asset_management";
  }
}

/** Marks auto stages done when their system condition is met. Returns null if nothing changed. */
export function applyAutoRules(deal: Deal, s: Pick<AppState, "dealBuildings">): DealChecklistItem[] | null {
  if (!deal.checklist?.length) return null;
  let changed = false;
  const at = nowIso();
  const next = deal.checklist.map((item) => {
    let itemChanged = false;
    const events: ReturnType<typeof evt>[] = [];
    const stages = item.stages.map((st) => {
      if (st.auto && st.status === "todo" && autoRuleMet(st.auto, deal, s)) {
        itemChanged = true;
        events.push(evt(`Stage “${st.title}” completed automatically`, "System", "success"));
        return { ...st, status: "done" as const, completedAt: at, completedBy: "System" };
      }
      return st;
    });
    if (!itemChanged) return item;
    changed = true;
    return { ...item, stages, history: [...events, ...item.history] };
  });
  return changed ? next : null;
}

// ---------------------------------------------------------------------------
// Pipeline phases (from the "Deal" sheet): Sourced → BOE Review → Full DD → Pre-Closing
// ---------------------------------------------------------------------------

const stageDone = (deal: Deal, key: string, title: string) => {
  const st = deal.checklist?.find((i) => i.key === key)?.stages.find((x) => x.title === title);
  return !!st && st.status !== "todo";
};
/** A sub-item counts as done when ticked, or when its whole stage was completed or skipped. */
const subDone = (deal: Deal, key: string, title: string) =>
  !!deal.checklist?.find((i) => i.key === key)?.stages.some((st) => st.subItems?.some((x) => x.title === title && (x.status !== "todo" || st.status !== "todo")));

export interface PhaseItemDef {
  key: string;
  title: string;
  source: string;
  rule?: (deal: Deal) => boolean;
}
export const PIPELINE_PHASES: { key: string; title: string; milestone: string; items: PhaseItemDef[] }[] = [
  {
    key: "sourced",
    title: "Sourced",
    milestone: "High-Level Review",
    items: [
      { key: "identify_price", title: "Identify Price", source: "Asking price entered on the deal", rule: (d) => !!d.askingPrice },
      { key: "target_close", title: "Set Target Closing Date", source: "Projected closing date entered", rule: (d) => !!d.projectedCloseDate },
    ],
  },
  {
    key: "boe",
    title: "BOE Review",
    milestone: "LOI Signed",
    items: [
      { key: "engage_legal", title: "Engage Legal", source: "Buyer transaction counsel assigned", rule: (d) => !!d.contacts?.some((c) => c.side === "buyer" && c.role === "transaction_counsel") },
      { key: "loi_issued", title: "LOI Issued", source: "PSA LOI → Draft complete", rule: (d) => stageDone(d, "psa_loi", "Draft") },
      { key: "critical_dates", title: "Critical Dates Set", source: "Marked manually" },
      { key: "source_funding", title: "Source Funding", source: "Capital Structuring → Senior Lender complete", rule: (d) => stageDone(d, "capital", "Senior Lender") },
    ],
  },
  {
    key: "full_dd",
    title: "Full Due Diligence",
    milestone: "PSA Signed",
    items: [
      { key: "produce_psa", title: "Produce PSA and Other Key Docs", source: "Acquisition Documents → Draft complete", rule: (d) => stageDone(d, "acquisition_docs", "Draft") },
      { key: "order_third", title: "Order Third Parties", source: "Order Third-Party Reports → Engage complete", rule: (d) => stageDone(d, "third_party", "Engage") },
      { key: "funding_ts", title: "Funding Term Sheet Signed", source: "Capital Structuring → Finalize Capital Terms complete", rule: (d) => stageDone(d, "capital", "Finalize Capital Terms") },
    ],
  },
  {
    key: "pre_closing",
    title: "Pre-Closing",
    milestone: "Deal Closed",
    items: [
      { key: "key_docs_final", title: "Key Docs in Final Form", source: "Acquisition Documents → Finalize complete", rule: (d) => stageDone(d, "acquisition_docs", "Finalize") },
      { key: "third_party_drafts", title: "Received 3rd-Party Drafts / Finals", source: "Order Third-Party Reports → Collect Drafts complete", rule: (d) => stageDone(d, "third_party", "Collect Drafts") },
      { key: "funding_auth", title: "Funding Closing Authorization", source: "Closing and Funding Mechanics → Authorize Funding", rule: (d) => subDone(d, "closing_funding", "Authorize Funding") },
    ],
  },
];

export function phaseItemDone(deal: Deal, it: PhaseItemDef) {
  const o = deal.phaseOverrides?.[it.key];
  if (o !== undefined) return { done: o, manual: true };
  return { done: it.rule ? it.rule(deal) : false, manual: !it.rule };
}
