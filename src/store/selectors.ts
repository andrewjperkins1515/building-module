import { useMemo } from "react";
import type { AppState, Building, Deal, DealBuildingRelationship, DocumentRequest, Organization } from "@/types";
import { daysUntil } from "@/lib/format";
import { useData } from "./DataProvider";

export interface DocStats {
  total: number;
  required: number;
  requiredApproved: number;
  approved: number;
  pendingReview: number; // received + in_review
  missing: number; // required and not yet received (not_requested / requested / rejected)
  needsRevision: number;
  overdue: number;
  pct: number;
}

export function docStats(docs: DocumentRequest[]): DocStats {
  const required = docs.filter((d) => d.required);
  const requiredApproved = required.filter((d) => d.status === "approved").length;
  return {
    total: docs.length,
    required: required.length,
    requiredApproved,
    approved: docs.filter((d) => d.status === "approved").length,
    pendingReview: docs.filter((d) => d.status === "received" || d.status === "in_review").length,
    missing: required.filter((d) => ["not_requested", "requested", "rejected"].includes(d.status)).length,
    needsRevision: docs.filter((d) => d.status === "needs_revision").length,
    overdue: docs.filter((d) => isOverdue(d)).length,
    pct: required.length ? Math.round((requiredApproved / required.length) * 100) : 0,
  };
}

export function isOverdue(d: DocumentRequest) {
  if (!d.dueDate) return false;
  if (!["requested", "needs_revision"].includes(d.status)) return false;
  const n = daysUntil(d.dueDate);
  return n !== null && n < 0;
}

export function orgById(state: AppState, id?: string): Organization | undefined {
  return id ? state.organizations.find((o) => o.id === id) : undefined;
}

export function currentOwnership(state: AppState, buildingId: string) {
  const own = state.ownerships.filter((o) => o.buildingId === buildingId);
  const cur = (role: string) => own.find((o) => o.isCurrent && o.role === role);
  return {
    owner: orgById(state, cur("property_owner")?.organizationId),
    operator: orgById(state, cur("operator")?.organizationId),
    parent: orgById(state, cur("parent_organization")?.organizationId),
    management: orgById(state, cur("management_company")?.organizationId),
    records: own,
  };
}

export interface DealLink {
  deal: Deal;
  rel: DealBuildingRelationship;
}

export function dealLinks(state: AppState, buildingId: string): DealLink[] {
  return state.dealBuildings
    .filter((r) => r.buildingId === buildingId)
    .map((rel) => ({ rel, deal: state.deals.find((d) => d.id === rel.dealId)! }))
    .filter((x) => x.deal)
    .sort((a, b) => {
      const rank = (d: Deal) => (d.status === "active" ? 0 : d.status === "closed" ? 1 : 2);
      return rank(a.deal) - rank(b.deal) || b.rel.addedAt.localeCompare(a.rel.addedAt);
    });
}

export function currentCcn(b: Building) {
  return b.identifiers.find((i) => i.type === "cms_ccn" && i.isCurrent)?.value;
}

export function occupancy(b: Building) {
  return b.certifiedBeds.value ? (b.averageDailyCensus.value / b.certifiedBeds.value) * 100 : null;
}

export type AttentionKind = "missing_doc" | "pending_review" | "revision" | "unverified" | "follow_up" | "observation" | "regulatory";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: "high" | "medium" | "low";
  title: string;
  detail?: string;
  tab: string;
  targetId?: string;
}

export function attentionItems(state: AppState, buildingId: string): AttentionItem[] {
  const b = state.buildings.find((x) => x.id === buildingId);
  if (!b) return [];
  const items: AttentionItem[] = [];
  const docs = state.documentRequests.filter((d) => d.buildingId === buildingId);

  docs
    .filter((d) => d.required && ["not_requested", "requested", "rejected"].includes(d.status))
    .forEach((d) => {
      const overdue = isOverdue(d);
      items.push({
        id: `doc_${d.id}`,
        kind: "missing_doc",
        severity: overdue || d.isBaseline ? "high" : "medium",
        title: `Missing: ${d.name}`,
        detail: overdue ? `Overdue ${Math.abs(daysUntil(d.dueDate)!)}d · requested from ${d.requestedFrom ?? "—"}` : d.status === "not_requested" ? "Not yet requested" : d.status === "rejected" ? "Rejected — awaiting replacement" : `Requested from ${d.requestedFrom ?? "—"}`,
        tab: "documents",
        targetId: d.id,
      });
    });
  docs
    .filter((d) => d.status === "received" || d.status === "in_review")
    .forEach((d) =>
      items.push({ id: `rev_${d.id}`, kind: "pending_review", severity: "medium", title: `Review: ${d.name}`, detail: d.reviewer ? `Assigned to ${d.reviewer}` : "No reviewer assigned", tab: "documents", targetId: d.id }),
    );
  docs
    .filter((d) => d.status === "needs_revision")
    .forEach((d) => items.push({ id: `rv_${d.id}`, kind: "revision", severity: "low", title: `Awaiting revision: ${d.name}`, detail: d.requestedFrom, tab: "documents", targetId: d.id }));

  const unverified: string[] = [];
  if (b.certifiedBeds.meta.verification !== "verified") unverified.push("certified beds");
  if (b.licensedBeds.meta.verification !== "verified") unverified.push("licensed beds");
  if (b.averageDailyCensus.meta.verification !== "verified") unverified.push("census");
  if (b.squareFeet.meta.verification !== "verified") unverified.push("square footage");
  if (b.yearBuilt.meta.verification !== "verified") unverified.push("year built");
  if (unverified.length)
    items.push({ id: "unverified", kind: "unverified", severity: unverified.length > 2 ? "medium" : "low", title: `${unverified.length} unverified field${unverified.length > 1 ? "s" : ""}`, detail: unverified.join(", "), tab: "overview" });

  state.siteVisits
    .filter((v) => v.buildingId === buildingId)
    .forEach((v) => {
      v.followUps
        .filter((t) => !t.done)
        .forEach((t) => {
          const n = daysUntil(t.dueDate);
          items.push({ id: `fu_${t.id}`, kind: "follow_up", severity: n !== null && n < 0 ? "high" : "low", title: t.title, detail: `${t.assignee}${t.dueDate ? ` · ${n !== null && n < 0 ? `overdue ${Math.abs(n)}d` : `due in ${n}d`}` : ""}`, tab: "site-visits", targetId: v.id });
        });
      v.observations
        .filter((o) => o.status === "open" && o.severity !== "low")
        .forEach((o) => items.push({ id: `ob_${o.id}`, kind: "observation", severity: o.severity === "high" ? "high" : "medium", title: o.text, detail: "Open site visit observation", tab: "site-visits", targetId: v.id }));
    });

  const cms = state.cms.find((c) => c.buildingId === buildingId);
  const openDefs = cms?.deficiencies.filter((d) => d.status === "open") ?? [];
  if (openDefs.length)
    items.push({ id: "cms_open", kind: "regulatory", severity: "high", title: `${openDefs.length} open survey deficienc${openDefs.length > 1 ? "ies" : "y"}`, detail: openDefs.map((d) => `${d.tag} (${d.scopeSeverity})`).join(", "), tab: "cms" });

  const order = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b2) => order[a.severity] - order[b2.severity]);
}

/** Everything the detail page needs for one building. */
export function useBuildingBundle(id: string | undefined) {
  const { state } = useData();
  return useMemo(() => {
    const building = state.buildings.find((b) => b.id === id);
    if (!building || !id) return null;
    const documents = state.documentRequests.filter((d) => d.buildingId === id);
    return {
      building,
      cms: state.cms.find((c) => c.buildingId === id),
      condition: state.conditions.find((c) => c.buildingId === id),
      capitalProjects: state.capitalProjects.filter((c) => c.buildingId === id),
      financials: state.financials.find((f) => f.buildingId === id),
      siteVisits: state.siteVisits.filter((v) => v.buildingId === id).sort((a, b) => b.date.localeCompare(a.date)),
      documents,
      docStats: docStats(documents),
      activities: state.activities.filter((a) => a.buildingId === id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      ownership: currentOwnership(state, id),
      relationships: state.relationships.filter((r) => r.buildingId === id),
      deals: dealLinks(state, id),
      dataRoom: state.dataRooms.find((r) => r.buildingId === id),
      attention: attentionItems(state, id),
    };
  }, [state, id]);
}

export type BuildingBundle = NonNullable<ReturnType<typeof useBuildingBundle>>;

export interface CompanyDealRow {
  deal: Deal;
  role: string;
  states: string[];
  buildings: number;
  beds: number;
  amount?: number;
  amountLabel: "Purchase" | "Ask" | "—";
  perBed?: number;
}

/** Deals where the company is seller, buyer, broker or lender, with portfolio totals. */
export function companyDeals(state: AppState, orgId: string): CompanyDealRow[] {
  return state.deals
    .filter((d) => d.sellerOrgId === orgId || d.buyerOrgId === orgId || d.brokerOrgId === orgId || d.lenderOrgId === orgId)
    .map((deal) => {
      const blds = state.dealBuildings
        .filter((r) => r.dealId === deal.id)
        .map((r) => state.buildings.find((b) => b.id === r.buildingId))
        .filter((b): b is Building => !!b);
      const beds = blds.reduce((a, b) => a + b.certifiedBeds.value, 0);
      const amount = deal.purchasePrice ?? deal.askingPrice;
      return {
        deal,
        role: [deal.sellerOrgId === orgId && "Seller", deal.buyerOrgId === orgId && "Buyer", deal.brokerOrgId === orgId && "Broker", deal.lenderOrgId === orgId && "Lender"].filter(Boolean).join(" & "),
        states: [...new Set(blds.map((b) => b.address.state))].sort(),
        buildings: blds.length,
        beds,
        amount,
        amountLabel: deal.purchasePrice ? "Purchase" : deal.askingPrice ? "Ask" : "—",
        perBed: amount && beds ? amount / beds : undefined,
      } satisfies CompanyDealRow;
    })
    .sort((a, b) => (b.deal.actualCloseDate ?? b.deal.createdAt).localeCompare(a.deal.actualCloseDate ?? a.deal.createdAt));
}

/** Buildings a contact is connected to — directly, or through their company's ownership/operations. */
export function contactBuildings(state: AppState, contactId: string) {
  const c = state.contacts.find((x) => x.id === contactId);
  if (!c) return [];
  const out = new Map<string, { building: Building; relation: string }>();
  state.relationships
    .filter((r) => r.contactId === contactId)
    .forEach((r) => {
      const b = state.buildings.find((x) => x.id === r.buildingId);
      if (b) out.set(b.id, { building: b, relation: r.description ?? r.role });
    });
  state.ownerships
    .filter((o) => o.isCurrent && o.organizationId === c.organizationId)
    .forEach((o) => {
      const b = state.buildings.find((x) => x.id === o.buildingId);
      if (b && !out.has(b.id)) out.set(b.id, { building: b, relation: o.role === "property_owner" ? "Company owns" : o.role === "operator" ? "Company operates" : "Company affiliated" });
    });
  return [...out.values()].sort((a, b) => a.building.name.localeCompare(b.building.name));
}
