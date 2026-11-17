/**
 * Deal record overview data (fictional): classification, deal teams, vendors,
 * third-party reports and a provisional progress checklist.
 */
import type { AssetClass, Building, BuyerSellerRole, Deal, DealBuildingRelationship, DealContactAssignment, ProgressItem, ReportStatus, ThirdPartyReport, VendorRole } from "@/types";
import { offsetDate } from "@/lib/utils";

/**
 * STARTER checklist — placeholder until the detailed Progress breakdown is provided.
 * Structure: item → sub-items. Progress rolls up sub-items → item → deal.
 */
export const STARTER_CHECKLIST: { key: string; title: string; children: string[] }[] = [
  { key: "underwriting", title: "Initial underwriting", children: ["Financials received (T-12, census)", "CMS & survey history reviewed", "Valuation model complete", "Investment committee approval to pursue"] },
  { key: "loi", title: "Letter of intent", children: ["LOI drafted", "LOI negotiated", "LOI executed"] },
  { key: "psa", title: "Purchase & sale agreement", children: ["PSA draft received", "PSA negotiated", "PSA executed", "Earnest money deposited"] },
  { key: "diligence", title: "Due diligence", children: ["Third-party reports ordered", "Financial diligence complete", "Legal & title diligence complete", "Site visits complete"] },
  { key: "financing", title: "Financing", children: ["Term sheet executed", "Credit approval", "Loan documents finalized"] },
  { key: "licensure", title: "Licensure / CHOW", children: ["CHOW application filed", "Licensure approval received"] },
  { key: "closing", title: "Closing", children: ["Closing statement approved", "Funds wired", "Closing documents recorded"] },
];

/** How many sub-items of each item are complete at a given stage. */
const DONE_BY_STAGE: Record<Deal["stage"], Record<string, number>> = {
  high_level_review: { underwriting: 2 },
  loi_signed: { underwriting: 4, loi: 3, diligence: 1 },
  psa_signed: { underwriting: 4, loi: 3, psa: 4, diligence: 3, financing: 1, licensure: 1 },
  closed: { underwriting: 4, loi: 3, psa: 4, diligence: 4, financing: 3, licensure: 2, closing: 3 },
};

export function starterProgress(dealId: string, stage: Deal["stage"], skippedLoi = false, blank = false): ProgressItem[] {
  const done = blank ? {} : DONE_BY_STAGE[stage];
  return STARTER_CHECKLIST.map((it) => ({
    id: `${dealId}_${it.key}`,
    title: it.title,
    children: it.children.map((title, i) => {
      const isDone = i < (done[it.key] ?? 0) || (skippedLoi && it.key === "loi" && stage !== "high_level_review");
      return { id: `${dealId}_${it.key}_${i}`, title: skippedLoi && it.key === "loi" && i === 0 ? `${title} (skipped — went direct to PSA)` : title, done: isDone, completedAt: isDone ? offsetDate(-(30 - i * 3)) : undefined };
    }),
  }));
}

const NAME_TO_CONTACT: Record<string, string> = {
  "Jordan Ellis": "ct_jellis",
  "Priya Raman": "ct_praman",
  "Marcus Holloway": "ct_mholloway",
  "Elena Vasquez": "ct_evasquez",
  "Daniel Okafor": "ct_dokafor",
  "Rachel Kim": "ct_rkim",
};

interface SellerTeam {
  lead?: string;
  s1?: string;
  s2?: string;
  inHouse?: string;
}
const SELLER_TEAMS: Record<string, SellerTeam> = {
  org_meridian: { lead: "ct_rcole", s1: "ct_jsimmons", s2: "ct_lpark", inHouse: "ct_mfoley" },
  org_bluegrass_props: { lead: "ct_mwebb", s1: "ct_sgreen" },
  org_harborview: { lead: "ct_otaylor", s1: "ct_plang" },
  org_sunbelt: { lead: "ct_avega" },
  org_keystone: { lead: "ct_ewright", s1: "ct_tbaker" },
  org_tricounty: { lead: "ct_dross", s1: "ct_kmoore" },
  org_willow: { lead: "ct_hdunn" },
};

const VENDOR_CONTACT: Record<VendorRole, string> = {
  survey: "ct_rbenson",
  title: "ct_lmorales",
  zoning: "ct_kgrady",
  environmental: "ct_wgrant",
  property_condition: "ct_wgrant",
  appraisal: "ct_hlowe",
  reimbursement: "ct_ebrooks",
  operations: "ct_tbishop",
};

const SOURCE: Record<string, { org?: string; contact?: string }> = {
  deal_greatlakes: { org: "org_calloway", contact: "ct_hwalsh" },
  deal_bluegrass: { org: "org_calloway", contact: "ct_bcarter" },
  deal_riverside: { org: "org_harborview", contact: "ct_otaylor" },
  deal_sunbelt: { org: "org_stonebridge", contact: "ct_tnguyen" },
  deal_keystone: { org: "org_keystone", contact: "ct_ewright" },
  deal_carolina: { org: "org_tricounty", contact: "ct_dross" },
  deal_seaside: { org: "org_tricounty", contact: "ct_dross" },
  deal_ozark: { org: "org_willow", contact: "ct_hdunn" },
  deal_mkt_meridian2023: { org: "org_calloway", contact: "ct_hwalsh" },
};

const NEW_OPERATOR: Record<string, string> = {
  deal_greatlakes: "org_northpoint",
  deal_bluegrass: "org_northpoint",
  deal_riverside: "org_riverside_rp",
  deal_sunbelt: "org_ashford",
  deal_keystone: "org_pinnacle",
};

const REPORT_PLAN: Record<Deal["stage"], Partial<Record<VendorRole, ReportStatus>>> = {
  high_level_review: {},
  loi_signed: { environmental: "ordered", property_condition: "ordered", appraisal: "not_ordered" },
  psa_signed: { survey: "final_received", title: "final_received", zoning: "draft_received", environmental: "final_received", property_condition: "draft_received", appraisal: "in_progress", reimbursement: "ordered", operations: "not_ordered" },
  closed: { survey: "final_received", title: "final_received", zoning: "final_received", environmental: "final_received", property_condition: "final_received", appraisal: "final_received", reimbursement: "final_received", operations: "waived" },
};

export function assetClassFor(buildings: Building[]): AssetClass | undefined {
  const types = new Set(buildings.map((b) => b.facilityType));
  if (!types.size) return undefined;
  if (types.size > 1) return "mixed";
  const t = [...types][0];
  return t === "skilled_nursing" ? "snf" : t === "assisted_living" ? "alf" : t === "memory_care" ? "mc" : t === "ccrc" ? "ccrc" : "mixed";
}

/** Fields added to each seeded deal for the deal record overview. */
export function dealDetails(deal: Deal, rels: DealBuildingRelationship[], buildings: Building[]): Partial<Deal> {
  const isMarketComp = deal.code.startsWith("MKT");
  const dealBuildings = rels.filter((r) => r.dealId === deal.id).map((r) => buildings.find((b) => b.id === r.buildingId)).filter((b): b is Building => !!b);
  const stage = deal.stage;
  const reached = (s: Deal["stage"]) => ["high_level_review", "loi_signed", "psa_signed", "closed"].indexOf(stage) >= ["high_level_review", "loi_signed", "psa_signed", "closed"].indexOf(s);
  const dataRoomUrl = isMarketComp || stage === "high_level_review" ? undefined : `https://odacquisitions.sharepoint.example/sites/deals/${deal.code}`;

  const contacts: DealContactAssignment[] = [];
  if (!isMarketComp) {
    const lead = NAME_TO_CONTACT[deal.leadName];
    const others = Object.values(NAME_TO_CONTACT).filter((c) => c !== lead && c !== "ct_jellis");
    const buyer: Partial<Record<BuyerSellerRole, string>> = { team_lead: lead, support_1: others[deal.code.length % others.length] };
    if (reached("loi_signed")) Object.assign(buyer, { support_2: lead === "ct_jellis" ? "ct_rkim" : "ct_jellis", in_house_counsel: "ct_nbrooks", transaction_counsel: "ct_dmorgan" });
    if (reached("psa_signed")) Object.assign(buyer, { financing_counsel: "ct_kchen", regulatory_counsel: "ct_jobrien" });
    Object.entries(buyer).forEach(([role, contactId]) => contactId && contacts.push({ side: "buyer", role: role as BuyerSellerRole, contactId }));

    const st = SELLER_TEAMS[deal.sellerOrgId ?? ""] ?? {};
    const seller: Partial<Record<BuyerSellerRole, string>> = { team_lead: st.lead, support_1: st.s1 };
    if (reached("loi_signed")) Object.assign(seller, { support_2: st.s2, in_house_counsel: st.inHouse, transaction_counsel: "ct_ahartwell" });
    if (reached("psa_signed")) Object.assign(seller, { financing_counsel: "ct_spierce", regulatory_counsel: "ct_tquinn" });
    Object.entries(seller).forEach(([role, contactId]) => contactId && contacts.push({ side: "seller", role: role as BuyerSellerRole, contactId }));

    const plan = REPORT_PLAN[stage];
    (Object.keys(plan) as VendorRole[]).forEach((role) => contacts.push({ side: "vendor", role, contactId: VENDOR_CONTACT[role] }));
  }

  const plan = isMarketComp ? {} : REPORT_PLAN[stage];
  const anchor = deal.actualCloseDate ? -Math.round((Date.now() - new Date(deal.actualCloseDate).getTime()) / 86_400_000) : 0;
  const reports: ThirdPartyReport[] = (Object.keys(plan) as VendorRole[]).map((kind, i) => {
    const status = plan[kind]!;
    const ordered = status !== "not_ordered" && status !== "waived";
    return {
      kind,
      status,
      dateOrdered: ordered ? offsetDate(anchor - 40 + i * 2) : undefined,
      expectedDate: ordered ? offsetDate(anchor + (status === "final_received" ? -8 + i : 6 + i * 3)) : undefined,
      url: (status === "final_received" || status === "draft_received") && dataRoomUrl ? `${dataRoomUrl}/reports/${kind}` : undefined,
    };
  });

  return {
    dealKind: deal.id === "deal_keystone" ? "sale_leaseback" : "acquisition",
    assetClass: deal.id === "deal_sunbelt" ? "alf" : assetClassFor(dealBuildings),
    sourceOrgId: SOURCE[deal.id]?.org,
    sourceContactId: SOURCE[deal.id]?.contact,
    newOperatorOrgId: NEW_OPERATOR[deal.id],
    jvPartnerOrgId: deal.id === "deal_greatlakes" ? "org_ridgeline" : undefined,
    jvPct: deal.id === "deal_greatlakes" ? 20 : undefined,
    dataRoomUrl,
    contacts,
    buyerDistribution: deal.id === "deal_greatlakes" ? "ic@odacquisitions.example; atlas-closing@atlasbridge.example; ashah@ridgelinehp.example" : "",
    sellerDistribution: deal.id === "deal_greatlakes" ? "dealteam@meridianhcp.example; hwalsh@calloway.example" : "",
    reports,
    progress: isMarketComp ? [] : starterProgress(deal.id, stage, deal.skippedLoi),
  };
}
