/**
 * Executable specification for the Deal Progress checklist, approvals and milestone auto-advance.
 * These rules must hold in the production implementation (see docs/handoff/06-business-rules.md).
 */
import { describe, expect, it } from "vitest";
import type { Deal, DealChecklistItem } from "@/types";
import {
  CHECKLIST_TEMPLATE,
  PIPELINE_PHASES,
  applyAutoRules,
  applyChecklistAction,
  buildChecklist,
  canApprove,
  checklistProgress,
  currentStage,
  effectiveApprover,
  floorFor,
  itemProgress,
  itemState,
  pendingAutoAdvance,
  phaseItemDone,
  phaseTargetStage,
} from "./checklist";

const baseDeal = (over: Partial<Deal> = {}): Deal => ({
  id: "d1",
  name: "Test Deal",
  code: "OD-2026-999",
  type: "single_asset",
  stage: "high_level_review",
  status: "active",
  skippedLoi: false,
  buyerEntity: "TBD",
  leadName: "Lead",
  summary: "",
  createdAt: "2026-01-01",
  contacts: [
    { side: "buyer", role: "team_lead", contactId: "lead" },
    { side: "buyer", role: "in_house_counsel", contactId: "counsel" },
  ],
  dealApproverContactId: "lead",
  ...over,
});

const withChecklist = (over: Partial<Deal> = {}, presets = {}): Deal => {
  const d = baseDeal(over);
  return { ...d, checklist: buildChecklist(d, presets) };
};
const item = (d: Deal, key: string) => d.checklist!.find((i) => i.key === key)!;
const setItem = (d: Deal, next: DealChecklistItem): Deal => ({ ...d, checklist: d.checklist!.map((i) => (i.id === next.id ? next : i)) });
const completeAllStages = (i: DealChecklistItem) => i.stages.filter((s) => !s.completedByApproval).reduce((acc, s) => applyChecklistAction(acc, { type: "complete_stage", stageId: s.id }, "tester"), i);

describe("checklist template (Deal Progress Tab spec)", () => {
  it("has the 19 checklist items in spreadsheet order", () => {
    expect(CHECKLIST_TEMPLATE.map((t) => t.title)).toEqual([
      "Deal Sourced",
      "NDA",
      "Due Diligence Requests",
      "Capital Structuring",
      "Historical & Pro Forma Model",
      "Lease Term Sheet",
      "PSA LOI",
      "Internal Approvals",
      "Engage Title / Escrow Agent",
      "Order Third-Party Reports",
      "Investment Summary",
      "Acquisition Documents",
      "Lease & Guaranty Documents",
      "Guarantor",
      "Insurance Requirements",
      "Lease / Loan Accounting",
      "Closing and Funding Mechanics",
      "Post Closing Follow Up",
      "Hand Off to Asset Management",
    ]);
  });

  it("gives each item its own number of stages", () => {
    const n = (k: string) => CHECKLIST_TEMPLATE.find((t) => t.key === k)!.stages.length;
    expect(n("deal_sourced")).toBe(3);
    expect(n("model")).toBe(4);
    expect(n("lease_term_sheet")).toBe(6);
    expect(n("psa_loi")).toBe(6);
    expect(n("third_party")).toBe(8);
    expect(n("investment_summary")).toBe(7);
    expect(n("internal_approvals")).toBe(1);
  });

  it("attaches sub-lists to the stage in whose column they appear", () => {
    const tp = CHECKLIST_TEMPLATE.find((t) => t.key === "third_party")!;
    expect(tp.stages[0].sub).toContain("Environmental Reports");
    const model = CHECKLIST_TEMPLATE.find((t) => t.key === "model")!;
    expect(model.stages[1].sub).toEqual(["Rates", "Labor"]);
    const title = CHECKLIST_TEMPLATE.find((t) => t.key === "title_escrow")!;
    expect(title.stages[3].sub).toContain("Prorations");
  });

  it("PSA LOI needs no responsible party or document; its last stage completes on approval", () => {
    const t = CHECKLIST_TEMPLATE.find((x) => x.key === "psa_loi")!;
    expect(t.requiresResponsible).toBe(false);
    expect(t.requiresDocument).toBe(false);
    expect(t.stages.at(-1)!.completedByApproval).toBe(true);
  });
});

describe("item workflow and states", () => {
  it("moves not_started → in_progress → awaiting_document → awaiting_approval → complete", () => {
    let d = withChecklist();
    let nda = item(d, "nda");
    expect(itemState(nda)).toBe("not_started");
    nda = applyChecklistAction(nda, { type: "complete_stage", stageId: nda.stages[0].id }, "t");
    expect(itemState(nda)).toBe("in_progress");
    expect(currentStage(nda)!.title).toBe("Comments");
    nda = completeAllStages(nda);
    expect(itemState(nda)).toBe("awaiting_document");
    nda = applyChecklistAction(nda, { type: "upload_doc", doc: { name: "nda.pdf", size: 1, mimeType: "application/pdf" } }, "resp");
    expect(itemState(nda)).toBe("awaiting_approval");
    nda = applyChecklistAction(nda, { type: "approve" }, "lead");
    expect(itemState(nda)).toBe("complete");
    expect(nda.documents[0].status).toBe("approved"); // filed to Documents
    d = setItem(d, nda);
    expect(itemProgress(item(d, "nda"))).toBe(1);
  });

  it("request changes rejects submitted documents and keeps the item pending", () => {
    let i = completeAllStages(item(withChecklist(), "nda"));
    i = applyChecklistAction(i, { type: "upload_doc", doc: { name: "draft.pdf", size: 1, mimeType: "application/pdf" } }, "resp");
    i = applyChecklistAction(i, { type: "request_changes", note: "Need executed copy" }, "lead");
    expect(i.documents[0].status).toBe("rejected");
    expect(i.documents[0].reviewNote).toBe("Need executed copy");
    expect(itemState(i)).toBe("awaiting_document");
  });

  it("a stage with sub-items completes once every sub-item is done or N/A", () => {
    let cap = item(withChecklist(), "capital");
    const s0 = cap.stages[0];
    s0.subItems!.forEach((x, k) => {
      cap = applyChecklistAction(cap, { type: "set_sub", stageId: s0.id, subId: x.id, status: k % 2 ? "na" : "done" }, "t");
    });
    expect(cap.stages[0].status).toBe("done");
    expect(currentStage(cap)!.title).toBe("Solicit Capital Partner Term Sheets");
  });

  it("sub-items give partial credit inside the current stage", () => {
    let cap = item(withChecklist(), "capital");
    const before = itemProgress(cap);
    cap = applyChecklistAction(cap, { type: "set_sub", stageId: cap.stages[0].id, subId: cap.stages[0].subItems![0].id, status: "done" }, "t");
    expect(itemProgress(cap)).toBeGreaterThan(before);
    expect(cap.stages[0].status).toBe("todo");
  });

  it("skipped stages count as complete", () => {
    let i = item(withChecklist(), "nda");
    i = applyChecklistAction(i, { type: "skip_stage", stageId: i.stages[0].id, reason: "n/a" }, "t");
    expect(i.stages[0].status).toBe("skipped");
    expect(currentStage(i)!.title).toBe("Comments");
  });

  it("a waived document satisfies the document requirement", () => {
    let i = completeAllStages(item(withChecklist(), "nda"));
    i = applyChecklistAction(i, { type: "waive_doc", reason: "On file" }, "t");
    expect(itemState(i)).toBe("awaiting_approval");
    i = applyChecklistAction(i, { type: "approve" }, "lead");
    expect(itemState(i)).toBe("complete");
  });

  it("PSA LOI is completed by approval without a document", () => {
    let i = completeAllStages(item(withChecklist(), "psa_loi"));
    expect(itemState(i)).toBe("awaiting_approval");
    i = applyChecklistAction(i, { type: "approve" }, "lead");
    expect(i.stages.at(-1)!.status).toBe("done");
    expect(itemState(i)).toBe("complete");
  });

  it("reopening a stage withdraws approval", () => {
    let i = completeAllStages(item(withChecklist(), "psa_loi"));
    i = applyChecklistAction(i, { type: "approve" }, "lead");
    i = applyChecklistAction(i, { type: "reopen_stage", stageId: i.stages[0].id }, "t");
    expect(i.approval.status).toBe("pending");
    expect(itemState(i)).not.toBe("complete");
  });

  it("every action is recorded in the item history", () => {
    const i = applyChecklistAction(item(withChecklist(), "nda"), { type: "bypass", reason: "Not needed" }, "Jordan");
    expect(i.history[0]).toMatchObject({ by: "Jordan" });
    expect(i.history[0].text).toContain("Not needed");
  });
});

describe("progress roll-up", () => {
  it("is 0% for a fresh checklist and 100% when every item is complete", () => {
    expect(checklistProgress(withChecklist().checklist)).toBe(0);
    const all = Object.fromEntries(CHECKLIST_TEMPLATE.map((t) => [t.key, { complete: true }]));
    expect(checklistProgress(withChecklist({}, all).checklist)).toBe(1);
  });

  it("weights items equally and excludes bypassed items", () => {
    const d = withChecklist({}, { nda: { complete: true } });
    expect(checklistProgress(d.checklist)).toBeCloseTo(1 / 19);
    const bypassed = withChecklist({}, { nda: { complete: true }, lease_term_sheet: { bypass: "no lease" } });
    expect(checklistProgress(bypassed.checklist)).toBeCloseTo(1 / 18);
  });

  it("counts stages, the document and the approval as steps", () => {
    // NDA: 3 stages + document + approval = 5 steps
    let i = item(withChecklist(), "nda");
    i = applyChecklistAction(i, { type: "complete_stage", stageId: i.stages[0].id }, "t");
    expect(itemProgress(i)).toBeCloseTo(1 / 5);
  });
});

describe("system-driven (auto) stages", () => {
  const ctx = (dealBuildings: { dealId: string }[] = []) => ({ dealBuildings: dealBuildings as never });

  it("Deal Sourced completes from the deal record, buildings and data room link", () => {
    let d = withChecklist();
    d = { ...d, checklist: applyAutoRules(d, ctx())! };
    expect(item(d, "deal_sourced").stages.map((s) => s.status)).toEqual(["done", "todo", "todo"]);
    d = { ...d, checklist: applyAutoRules(d, ctx([{ dealId: "d1" }]))! };
    expect(item(d, "deal_sourced").stages[1].status).toBe("done");
    d = { ...d, dataRoomUrl: "https://example.com/room" };
    d = { ...d, checklist: applyAutoRules(d, ctx([{ dealId: "d1" }]))! };
    expect(item(d, "deal_sourced").stages[2]).toMatchObject({ status: "done", completedBy: "System" });
  });

  it("is idempotent (returns null when nothing changes)", () => {
    let d = withChecklist();
    d = { ...d, checklist: applyAutoRules(d, ctx())! };
    expect(applyAutoRules(d, ctx())).toBeNull();
  });

  it("third-party report stages follow vendors and report statuses", () => {
    let d = withChecklist({
      contacts: [...baseDeal().contacts!, { side: "vendor", role: "environmental", contactId: "v" }],
      reports: [
        { kind: "environmental", status: "final_received" },
        { kind: "appraisal", status: "waived" },
        { kind: "survey", status: "not_ordered" },
      ],
    });
    d = { ...d, checklist: applyAutoRules(d, ctx())! };
    const tp = item(d, "third_party");
    expect(tp.stages.find((s) => s.title === "Engage")!.status).toBe("done");
    expect(tp.stages.find((s) => s.title === "Collect Drafts")!.status).toBe("done");
    expect(tp.stages.find((s) => s.title === "Collect & Approve Final Draft")!.status).toBe("done");
  });

  it("Hand Off completes when the deal is Transitioned to Asset Management", () => {
    let d = withChecklist({ stage: "asset_management", status: "closed" });
    d = { ...d, checklist: applyAutoRules(d, ctx())! };
    expect(item(d, "handoff_am").stages[0].status).toBe("done");
  });
});

describe("approvers", () => {
  it("items use the deal approver unless they have their own", () => {
    const d = withChecklist();
    expect(effectiveApprover(item(d, "nda"), d)).toBe("lead");
    expect(effectiveApprover(item(d, "capital"), d)).toBe("counsel"); // approverRole: in-house counsel
  });

  it("only the effective approver may approve", () => {
    const d = withChecklist();
    expect(canApprove(item(d, "nda"), d, "lead")).toBe(true);
    expect(canApprove(item(d, "nda"), d, "someone-else")).toBe(false);
    expect(canApprove(item(d, "capital"), d, "lead")).toBe(false);
    const noApprover = { ...d, dealApproverContactId: undefined };
    expect(canApprove(item(noApprover, "nda"), noApprover, "lead")).toBe(false);
  });
});

describe("pipeline phases and milestone auto-advance", () => {
  const tickPhase = (d: Deal, phaseKey: string): Deal => ({
    ...d,
    phaseOverrides: { ...d.phaseOverrides, ...Object.fromEntries(PIPELINE_PHASES.find((p) => p.key === phaseKey)!.items.map((i) => [i.key, true])) },
  });

  it("phase items tick from deal data and can be overridden", () => {
    const d = withChecklist({ askingPrice: 1_000_000 });
    const price = PIPELINE_PHASES[0].items.find((i) => i.key === "identify_price")!;
    expect(phaseItemDone(d, price)).toEqual({ done: true, manual: false });
    expect(phaseItemDone({ ...d, phaseOverrides: { identify_price: false } }, price)).toEqual({ done: false, manual: true });
  });

  it("BOE Review complete moves a High-Level Review deal to LOI Signed", () => {
    const d = tickPhase(withChecklist(), "boe");
    expect(phaseTargetStage(d)!.stage).toBe("loi_signed");
    expect(pendingAutoAdvance(d)!.stage).toBe("loi_signed");
  });

  it("Full Due Diligence complete jumps to PSA Signed (skipping LOI)", () => {
    expect(pendingAutoAdvance(tickPhase(withChecklist(), "full_dd"))!.stage).toBe("psa_signed");
  });

  it("Pre-Closing → Deal Closed; Post Closing Follow Up → Transitioned to AM", () => {
    expect(pendingAutoAdvance(tickPhase(withChecklist({ stage: "psa_signed" }), "pre_closing"))!.stage).toBe("closed");
    const closed = withChecklist({ stage: "closed", status: "closed" }, { post_closing: { complete: true } });
    expect(pendingAutoAdvance(closed)!.stage).toBe("asset_management");
  });

  it("only moves forward, respects the floor, the toggle and dead deals", () => {
    const boe = tickPhase(withChecklist({ stage: "psa_signed" }), "boe");
    expect(pendingAutoAdvance(boe)).toBeNull(); // never backwards
    const floored = tickPhase(withChecklist({ milestoneFloor: "loi_signed" }), "boe");
    expect(pendingAutoAdvance(floored)).toBeNull(); // manual move back is respected
    expect(pendingAutoAdvance(tickPhase(withChecklist({ autoAdvance: false }), "boe"))).toBeNull();
    expect(pendingAutoAdvance(tickPhase(withChecklist({ status: "dead" }), "boe"))).toBeNull();
  });

  it("floorFor records the furthest milestone already supported", () => {
    const d = tickPhase(withChecklist(), "full_dd");
    expect(floorFor(d, "high_level_review")).toBe("psa_signed");
    expect(floorFor(withChecklist(), "loi_signed")).toBe("loi_signed");
  });
});
