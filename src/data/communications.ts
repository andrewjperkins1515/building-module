/**
 * Fictional email threads, calls and meetings, standing in for an Outlook sync.
 * Generated deterministically from each contact's role, company deals and buildings.
 */
import type { AppState, CommParticipant, Communication, Contact } from "@/types";
import { CURRENT_USER } from "@/lib/labels";
import { seeded } from "@/lib/utils";

type Category = "seller" | "investor" | "lender" | "broker" | "operator" | "lawyer" | "vendor_dd" | "vendor_operating";

interface Msg {
  dir: "in" | "out";
  body: string;
  attach?: string[];
  cc?: boolean;
}
interface Template {
  subject: string;
  needsDeal?: boolean;
  needsBuilding?: boolean;
  messages: Msg[];
}

const ME: CommParticipant = { name: CURRENT_USER.name, email: CURRENT_USER.email };
const TEAM: CommParticipant[] = [
  { name: "Priya Raman", email: "priya.raman@example.com" },
  { name: "Marcus Holloway", email: "marcus.holloway@example.com" },
];

const T: Record<Category, Template[]> = {
  seller: [
    {
      subject: "{deal} — data room access & next steps",
      needsDeal: true,
      messages: [
        { dir: "out", cc: true, body: "Hi {first},\n\nThanks for the time on Tuesday. As discussed, could you grant data room access to Priya Raman and Marcus Holloway on our team? We're prioritizing the trailing 12-month P&Ls, census by payer and the most recent CMS-2567s for {building}.\n\nBest,\nJordan" },
        { dir: "in", body: "Jordan —\n\nAccess has been granted to both. Q3 financials will be uploaded by Friday; let me know if anything else is missing from the index.\n\n{first}" },
        { dir: "out", body: "Perfect, thank you {first}. We'll circle back with a supplemental diligence list early next week." },
      ],
    },
    {
      subject: "{building} — rent roll and lease abstract",
      needsBuilding: true,
      messages: [
        { dir: "in", attach: ["Lease_Abstract.pdf", "Rent_Roll_Sep-2026.xlsx"], body: "Hi Jordan,\n\nAttached are the current lease abstract and the rent roll as of month-end. Note the operator's renewal option in Section 4.2.\n\nRegards,\n{first}" },
        { dir: "out", body: "Thanks {first}. One question: is the 2.5% annual escalator fixed, or CPI-linked with a cap?" },
        { dir: "in", body: "Fixed at 2.5% — no CPI linkage. The guaranty from the parent runs through the initial term." },
      ],
    },
    {
      subject: "Pricing feedback — {deal}",
      needsDeal: true,
      messages: [
        { dir: "out", body: "{first},\n\nFollowing our investment committee review, we remain comfortable at the current price subject to the roof and HVAC credits we discussed. Happy to walk through our capex assumptions on a call.\n\nJordan" },
        { dir: "in", body: "Understood. I'll take this back to our partners and come back to you by end of week." },
      ],
    },
  ],
  investor: [
    {
      subject: "Introduction — OD Acquisitions",
      messages: [
        { dir: "out", body: "Hi {first},\n\nI lead acquisitions at OD Acquisition Holdings. We're active buyers of skilled nursing and seniors housing, with a focus on {region}. Would you be open to a brief call about {company}'s portfolio plans over the next 12–18 months?\n\nBest,\nJordan" },
        { dir: "in", body: "Hi Jordan,\n\nHappy to connect. How does next Thursday at 10am CT look?\n\n{first}" },
        { dir: "out", body: "Thursday at 10 works — I'll send an invite. Talk then." },
      ],
    },
    {
      subject: "Q3 transaction comps — SNF & seniors housing",
      messages: [{ dir: "out", attach: ["OD_Q3_Transaction_Comps.pdf"], body: "{first},\n\nSharing our Q3 comp set as promised — per-bed pricing for Midwest and Southeast SNF trades has held up better than expected. Would welcome your view on where cap rates settle into year-end.\n\nJordan" }],
    },
  ],
  lender: [
    {
      subject: "{deal} — financing term sheet",
      needsDeal: true,
      messages: [
        { dir: "in", attach: ["Term_Sheet_Draft.pdf"], body: "Jordan,\n\nAttached is our draft term sheet: 75% LTC, 36-month term with two 6-month extensions, SOFR + 3.75%, and a HUD exit expected inside 24 months. Third-party reports to be lender-ordered.\n\n{first}" },
        { dir: "out", cc: true, body: "Thanks {first}. Can you get us to 80% LTC if we fund the capex reserve at close? Also need to confirm prepayment is open after month 12." },
        { dir: "in", body: "We can do 77.5% with the reserve funded. Prepay is open after 12 months with a 1% exit fee waived on a HUD take-out." },
      ],
    },
    {
      subject: "Loan maturity — {building}",
      needsBuilding: true,
      messages: [
        { dir: "in", body: "Hi Jordan,\n\nFlagging that the existing loan on {building} matures in roughly nine months. If ownership is changing hands, we should discuss assumption versus payoff timing.\n\n{first}" },
        { dir: "out", body: "Appreciate the heads up — we'd plan to pay off at closing. I'll have our counsel request a payoff letter template." },
      ],
    },
  ],
  broker: [
    {
      subject: "{deal} — offering memorandum",
      needsDeal: true,
      messages: [
        { dir: "in", attach: ["Offering_Memorandum.pdf", "Confidentiality_Agreement_Executed.pdf"], body: "Jordan,\n\nPlease find attached the OM and executed CA for {deal}. Tours are being scheduled over the next two weeks, and we expect a first-round bid date shortly after.\n\n{first}" },
        { dir: "out", body: "Thanks {first} — please put us down for a tour of {building}. Could you share the T-12 and census reports ahead of the visit?" },
        { dir: "in", body: "Done. T-12 and census are in the data room under folder 03 – Financials." },
      ],
    },
    {
      subject: "Bid deadline reminder — {deal}",
      needsDeal: true,
      messages: [
        { dir: "in", body: "Quick reminder that best-and-final offers are due Friday at 5pm ET. The seller is focused on certainty of close and minimal re-trade." },
        { dir: "out", cc: true, body: "Noted. We'll submit with bridge-to-HUD financing already sourced and a 45-day diligence period." },
      ],
    },
    {
      subject: "Off-market opportunity — two-building SNF portfolio",
      messages: [
        { dir: "in", body: "Jordan,\n\nWe have an owner-operator quietly exploring a sale of two SNFs (~210 beds combined, 3-star average, 82% occupancy). Not being widely marketed. Interested in a teaser?\n\n{first}" },
        { dir: "out", body: "Yes, please send it over — happy to sign a CA." },
      ],
    },
  ],
  operator: [
    {
      subject: "{building} — monthly census update",
      needsBuilding: true,
      messages: [
        { dir: "in", attach: ["Census_Report_Oct-2026.pdf"], body: "Hi Jordan,\n\nCensus closed the month at {adc}, with Medicare ADC up 6 versus the prior month following the new hospital referral agreement. Full payer breakdown attached.\n\n{first}" },
        { dir: "out", body: "Great progress, {first}. Going forward, can you break managed care days out separately from Medicare?" },
        { dir: "in", body: "Will do — starting with the November report." },
      ],
    },
    {
      subject: "Site visit logistics — {building}",
      needsBuilding: true,
      messages: [
        { dir: "out", body: "{first},\n\nConfirming our walkthrough next Tuesday at 9:30am. We'll have the PCA engineer with us — could your maintenance director be available for the roof and mechanical rooms?\n\nThanks,\nJordan" },
        { dir: "in", body: "Confirmed. Our maintenance director will meet you at the main entrance. Visitor badges will be at the front desk." },
      ],
    },
    {
      subject: "Plan of correction — recent survey",
      needsBuilding: true,
      messages: [{ dir: "in", attach: ["Plan_of_Correction_Accepted.pdf"], body: "Jordan,\n\nSharing the accepted plan of correction from the recent standard survey at {building}. All tags were cleared at the revisit.\n\n{first}" }],
    },
  ],
  lawyer: [
    {
      subject: "{deal} — PSA markup",
      needsDeal: true,
      messages: [
        { dir: "in", attach: ["PSA_Buyer_Markup_v2.docx"], body: "Jordan,\n\nAttached is our markup of the seller's PSA draft. Key issues:\n\n1. Survival period on reps is 6 months — we're proposing 18.\n2. Indemnity cap at 5% — proposing 10%.\n3. The operations transfer agreement needs an interim covenant on staffing levels.\n\nHappy to discuss.\n\n{first}" },
        { dir: "out", body: "Thanks {first}. Aligned on all three — push hardest on the survival period." },
      ],
    },
    {
      subject: "CHOW filing timeline — {building}",
      needsBuilding: true,
      messages: [
        { dir: "in", body: "Jordan,\n\nThe state's change-of-ownership application should be filed at least 60 days before closing. We'll need the new operator's organizational documents and the draft lease by the 15th.\n\n{first}" },
        { dir: "out", body: "Understood — I'll get you both by the 12th." },
      ],
    },
  ],
  vendor_dd: [
    {
      subject: "{building} — draft property condition assessment",
      needsBuilding: true,
      messages: [
        { dir: "in", attach: ["PCA_Draft_Report.pdf", "Capital_Reserve_Table.xlsx"], body: "Jordan,\n\nAttached is the draft PCA. Immediate needs total roughly $310K, primarily HVAC and life safety. The 12-year reserve schedule is in the spreadsheet.\n\n{first}" },
        { dir: "out", body: "Thanks {first}. Can you confirm whether the roof figures assume a full replacement or a recover?" },
        { dir: "in", body: "Full replacement of the resident wings; the administrative wing is a recover." },
      ],
    },
    {
      subject: "Phase I ESA — scheduling",
      messages: [
        { dir: "out", body: "{first}, can your team schedule the Phase I site reconnaissance within the next two weeks? Lender requires ASTM E1527-21." },
        { dir: "in", body: "Yes — we have availability on the 18th and 19th. Report delivery within 10 business days of the site visit." },
      ],
    },
  ],
  vendor_operating: [
    {
      subject: "Monthly management report — October",
      messages: [{ dir: "in", attach: ["Management_Report_Oct-2026.pdf"], body: "Jordan,\n\nAttached is the October management report. Occupancy improved 1.4 points and agency labor fell below 4% of nursing hours for the first time this year.\n\n{first}" }],
    },
    {
      subject: "2027 budget review",
      messages: [
        { dir: "out", body: "{first}, can we schedule the 2027 budget review for the week of the 8th? I'd like to focus on wage assumptions and capex timing." },
        { dir: "in", body: "Works for us — I'll send a draft budget two days ahead." },
      ],
    },
  ],
};

const CALL_NOTES: Record<Category, string> = {
  seller: "Discussed timing for the next marketing milestone and the seller's flexibility on the capex credit. They're motivated to close before year-end.",
  investor: "Intro call. They're net sellers in the Midwest next year and open to off-market conversations. Follow up after their Q4 board meeting.",
  lender: "Walked through the term sheet. Lender comfortable with the operator transition plan; wants a 6-month interest reserve.",
  broker: "Broker indicated three other groups toured. Pricing guidance holding; seller values certainty over price.",
  operator: "Operations check-in. Staffing stable, agency usage down. Flagged a likely complaint survey in the next 60 days.",
  lawyer: "Reviewed open PSA points. Expect a turn of the draft by Thursday.",
  vendor_dd: "Reviewed draft findings. Final report expected next week after the lender's comments.",
  vendor_operating: "Monthly check-in on performance and the capex plan.",
};

function categoryFor(c: Contact, orgType?: string, isSeller?: boolean): Category {
  if (c.contactType === "investor") return orgType === "lender" ? "lender" : isSeller ? "seller" : "investor";
  return c.contactType as Category;
}

function fill(t: string, v: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
}

const REGION: Record<string, string> = { MI: "the Midwest", OH: "the Midwest", IN: "the Midwest", IL: "the Midwest", WI: "the Midwest", MO: "the Midwest", KY: "the Southeast", TN: "the Southeast", FL: "the Southeast", NC: "the Southeast", GA: "the Southeast", TX: "the Southwest", AZ: "the Southwest", PA: "the Mid-Atlantic" };

/** Places a timestamp on the given day between 8:00 and 17:59, never in the future. */
function businessHours(ms: number, r: () => number) {
  const d = new Date(ms);
  d.setHours(8 + Math.floor(r() * 10), Math.floor(r() * 60), 0, 0);
  return new Date(Math.min(d.getTime(), Date.now() - 15 * 60_000)).toISOString();
}

export function buildCommunications(s: Pick<AppState, "contacts" | "organizations" | "deals" | "dealBuildings" | "buildings" | "ownerships" | "relationships">): Communication[] {
  const out: Communication[] = [];
  const now = Date.now();

  s.contacts.forEach((c, ci) => {
    // Internal team members are not tracked as external correspondence.
    if (c.organizationId === "org_od_holdings" && c.tags?.includes("Internal")) return;
    const r = seeded([...c.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0);
    const org = s.organizations.find((o) => o.id === c.organizationId);
    const deals = s.deals
      .filter((d) => [d.sellerOrgId, d.buyerOrgId, d.brokerOrgId, d.lenderOrgId].includes(c.organizationId) && d.buyerOrgId !== c.organizationId)
      .sort((a, b) => Number(b.status === "active") - Number(a.status === "active"));
    const deal = deals[0];
    const dealBuilding = deal ? s.buildings.find((b) => b.id === s.dealBuildings.find((x) => x.dealId === deal.id)?.buildingId) : undefined;
    const linkedBuilding =
      s.buildings.find((b) => s.relationships.some((x) => x.contactId === c.id && x.buildingId === b.id)) ??
      s.buildings.find((b) => s.ownerships.some((o) => o.isCurrent && o.organizationId === c.organizationId && o.buildingId === b.id));
    const building = dealBuilding ?? linkedBuilding;
    const cat = categoryFor(c, org?.type, !!deal && deal.sellerOrgId === c.organizationId);
    const vars = {
      first: c.name.split(" ")[0],
      company: org?.name ?? "your firm",
      deal: deal?.name ?? "",
      building: building?.name ?? "",
      adc: String(building?.averageDailyCensus.value ?? ""),
      region: REGION[org?.hqState ?? ""] ?? "the Midwest and Southeast",
    };
    const contactP: CommParticipant = { name: c.name, email: c.email };
    const templates = T[cat].filter((t) => (!t.needsDeal || deal) && (!t.needsBuilding || building));
    const count = Math.min(templates.length, 2 + Math.floor(r() * 2));

    let cursorDays = 1 + r() * 4; // most recent activity, days ago
    templates.slice(0, count).forEach((t, ti) => {
      const threadId = `th_${c.id}_${ti}`;
      const msgs = t.messages;
      // Thread spans a few days, newest message at cursorDays.
      const gaps = msgs.map(() => 1 + Math.floor(r() * 2));
      const span = msgs.map((_, mi) => gaps.slice(mi + 1).reduce((a, g) => a + g, 0));
      msgs.forEach((m, mi) => {
        const sentAt = businessHours(now - (Math.floor(cursorDays) + span[mi]) * 86_400_000, r);
        const subject = fill(t.subject, vars);
        out.push({
          id: `${threadId}_m${mi}`,
          threadId,
          channel: "email",
          direction: m.dir === "in" ? "inbound" : "outbound",
          subject: mi === 0 ? subject : `RE: ${subject}`,
          from: m.dir === "in" ? contactP : ME,
          to: m.dir === "in" ? [ME] : [contactP],
          cc: m.cc ? [TEAM[ci % 2]] : [],
          sentAt,
          body: fill(m.body, vars),
          attachments: (m.attach ?? []).map((a) => ({ name: a, size: 120_000 + Math.floor(r() * 3_800_000) })),
          contactIds: [c.id],
          dealId: t.needsDeal || subject.includes(vars.deal || "∅") ? deal?.id : undefined,
          buildingId: t.needsBuilding ? building?.id : undefined,
          source: "outlook_sync",
        });
      });
      cursorDays += span[0] + 4 + r() * 18;
    });

    // Logged call (most contacts) and a meeting for decision makers.
    if (r() > 0.25) {
      const d = 2 + r() * 30;
      out.push({
        id: `call_${c.id}`,
        threadId: `call_${c.id}`,
        channel: "call",
        direction: r() > 0.5 ? "outbound" : "inbound",
        subject: deal ? `Call — ${deal.name}` : `Call — check-in with ${vars.first}`,
        from: ME,
        to: [contactP],
        cc: [],
        sentAt: businessHours(now - Math.floor(d) * 86_400_000, r),
        body: CALL_NOTES[cat],
        attachments: [],
        contactIds: [c.id],
        dealId: deal?.id,
        durationMin: 10 + Math.floor(r() * 40),
        source: "outlook_sync",
      });
    }
    if (c.rosterRole === "Decision maker" || c.tags?.includes("Decision maker")) {
      const d = 12 + r() * 40;
      out.push({
        id: `mtg_${c.id}`,
        threadId: `mtg_${c.id}`,
        channel: "meeting",
        direction: "outbound",
        subject: building ? `Meeting — ${building.name} tour & discussion` : `Meeting — ${vars.company} introduction`,
        from: ME,
        to: [contactP, TEAM[0]],
        cc: [],
        sentAt: businessHours(now - Math.floor(d) * 86_400_000, r),
        body: building
          ? `In-person tour of ${building.name} followed by a working session on timing and structure. ${vars.first} confirmed willingness to provide a 45-day exclusivity window once LOI terms are agreed.`
          : `Introductory meeting at ${vars.company}'s offices. Discussed portfolio strategy and potential off-market opportunities.`,
        attachments: [],
        contactIds: [c.id],
        dealId: deal?.id,
        buildingId: building?.id,
        durationMin: 60 + Math.floor(r() * 3) * 30,
        source: "outlook_sync",
      });
    }
  });
  return out;
}
