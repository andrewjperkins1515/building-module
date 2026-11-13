import type {
  Activity,
  AppState,
  Building,
  BuildingFinancials,
  BuildingIdentifier,
  BuildingOwnership,
  BuildingRelationship,
  DataRoomConnection,
  DocumentFile,
  DocumentRequest,
  DocumentStatus,
  SiteVisit,
  SourceMeta,
} from "@/types";
import { offsetDate, offsetTimestamp, seeded } from "@/lib/utils";
import { organizations, contacts } from "./organizations";
import { buildDeals, buildDealBuildings } from "./deals";
import { buildingSpecs, type BuildingSpec } from "./buildingSpecs";
import { generateCapitalProjects, generateCms, generateCondition, generateFinancials } from "./generators";
import { BASELINE_DOCUMENTS, templateFor } from "./templates";

export const STATE_VERSION = 5;

const orgName = (id: string) => organizations.find((o) => o.id === id)?.name ?? "";
const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");

function meta(source: SourceMeta["source"], daysAgo: number, verification: SourceMeta["verification"], verifiedBy?: string): SourceMeta {
  return { source, asOf: offsetDate(-daysAgo), verification, verifiedBy };
}

function buildBuilding(s: BuildingSpec): Building {
  const v = s.verification;
  const verifiedBy = v === "verified" || v === "partially_verified" ? "Priya Raman" : undefined;
  const identifiers: BuildingIdentifier[] = [];
  if (s.ccn) {
    const currentFrom = s.priorCcns?.[0] ? offsetDateFrom(s.priorCcns[0].to, 1) : "2004-01-01";
    identifiers.push({ id: `${s.id}_id_ccn`, type: "cms_ccn", value: s.ccn, issuer: "CMS", effectiveFrom: currentFrom, isCurrent: true });
    s.priorCcns?.forEach((p, i) =>
      identifiers.push({ id: `${s.id}_id_ccn_prior_${i}`, type: "cms_ccn", value: p.value, issuer: "CMS", effectiveFrom: p.from, effectiveTo: p.to, isCurrent: false, note: p.note }),
    );
  }
  identifiers.push({ id: `${s.id}_id_lic`, type: "state_license", value: s.stateLicense, issuer: `${s.state} Department of Health`, effectiveFrom: offsetDate(-300), isCurrent: true });
  if (s.npi) identifiers.push({ id: `${s.id}_id_npi`, type: "npi", value: s.npi, issuer: "NPPES", effectiveFrom: "2008-05-23", isCurrent: true });

  return {
    id: s.id,
    name: s.name,
    alternateNames: s.alternateNames ?? [],
    facilityType: s.type,
    address: {
      street: s.street,
      city: s.city,
      state: s.state,
      zip: s.zip,
      county: s.county,
      mapX: 0.3 + seeded(s.photoSeed)() * 0.4,
      mapY: 0.3 + seeded(s.photoSeed + 1)() * 0.4,
    },
    identifiers,
    certifiedBeds: { value: s.certified, meta: meta(s.ccn ? "cms_mock" : "state_license", 12, s.ccn ? "verified" : v, verifiedBy) },
    licensedBeds: { value: s.licensed, meta: meta("state_license", 40, v === "unverified" ? "unverified" : "verified", verifiedBy) },
    averageDailyCensus: { value: s.adc, meta: meta("operator_report", 20, v === "verified" ? "verified" : "unverified", v === "verified" ? verifiedBy : undefined) },
    yearBuilt: { value: s.yearBuilt, meta: meta("public_record", 90, v === "unverified" ? "unverified" : "verified", verifiedBy) },
    squareFeet: { value: s.sqft, meta: meta(v === "verified" ? "third_party_report" : "broker_om", 70, v === "verified" ? "verified" : "needs_review") },
    stories: s.stories,
    acreage: s.acreage,
    privateRooms: s.privateRooms,
    semiPrivateRooms: s.semiPrivateRooms,
    verificationStatus: v,
    lastVerifiedAt: v === "unverified" ? null : offsetDate(-Math.min(s.createdDaysAgo - 1, 18)),
    photoSeed: s.photoSeed,
    photos: seedPhotos(s),
    tags: s.tags,
    createdAt: offsetTimestamp(-s.createdDaysAgo),
    updatedAt: offsetTimestamp(-(1 + (s.photoSeed % 9))),
    createdBy: "Jordan Ellis",
  };
}

const PHOTO_SET: { subject: NonNullable<Building["photos"][number]["subject"]>; caption: string }[] = [
  { subject: "exterior", caption: "Front elevation" },
  { subject: "entrance", caption: "Main entrance" },
  { subject: "lobby", caption: "Lobby & reception" },
  { subject: "dining", caption: "Main dining room" },
  { subject: "therapy", caption: "Therapy gym" },
  { subject: "resident_room", caption: "Typical resident room" },
  { subject: "courtyard", caption: "Courtyard" },
];

function seedPhotos(s: BuildingSpec): Building["photos"] {
  const n = s.docProgress < 0 ? 3 : s.docProgress < 0.2 ? 5 : 7;
  return PHOTO_SET.filter((p) => s.type === "skilled_nursing" || p.subject !== "therapy")
    .slice(0, n)
    .map((p, i) => ({ id: `${s.id}_photo_${i}`, caption: p.caption, subject: p.subject, uploadedAt: offsetTimestamp(-(s.createdDaysAgo - 2)), uploadedBy: i < 2 ? "Broker OM" : "Jordan Ellis" }));
}

function offsetDateFrom(d: string, days: number) {
  const dt = new Date(`${d}T12:00:00`);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

function buildOwnerships(s: BuildingSpec): BuildingOwnership[] {
  const out: BuildingOwnership[] = [];
  const v = s.verification === "unverified" ? "unverified" : "verified";
  const start = s.priorOwnership?.find((p) => p.role === "property_owner")?.to ?? "2014-01-01";
  out.push({ id: `${s.id}_own_owner`, buildingId: s.id, organizationId: s.owner, role: "property_owner", startDate: offsetDateFrom(start, 1), isCurrent: true, meta: meta("public_record", 60, v) });
  const opStart = s.priorOwnership?.find((p) => p.role === "operator")?.to ?? "2016-07-01";
  out.push({ id: `${s.id}_own_operator`, buildingId: s.id, organizationId: s.operator, role: "operator", startDate: offsetDateFrom(opStart, 1), isCurrent: true, meta: meta(s.ccn ? "cms_mock" : "state_license", 30, v) });
  if (s.parent) out.push({ id: `${s.id}_own_parent`, buildingId: s.id, organizationId: s.parent, role: "parent_organization", startDate: offsetDateFrom(opStart, 1), isCurrent: true, meta: meta("cms_mock", 30, "partially_verified") });
  if (s.management) out.push({ id: `${s.id}_own_mgmt`, buildingId: s.id, organizationId: s.management, role: "management_company", startDate: "2019-03-01", isCurrent: true, meta: meta("operator_report", 90, "unverified") });
  s.priorOwnership?.forEach((p, i) =>
    out.push({ id: `${s.id}_own_prior_${i}`, buildingId: s.id, organizationId: p.org, role: p.role, startDate: p.from, endDate: p.to, isCurrent: false, meta: meta("public_record", 200, "verified") }),
  );
  return out;
}

function buildRelationships(s: BuildingSpec, dealIds: string[]): BuildingRelationship[] {
  const deals = buildDeals().filter((d) => dealIds.includes(d.id));
  const active = deals.find((d) => d.status === "active") ?? deals.find((d) => d.status === "closed");
  const out: BuildingRelationship[] = [];
  const add = (r: Omit<BuildingRelationship, "id" | "buildingId">) => out.push({ id: `${s.id}_rel_${out.length}`, buildingId: s.id, ...r });
  if (active?.brokerOrgId) add({ role: "broker", organizationId: active.brokerOrgId, contactId: active.brokerOrgId === "org_calloway" ? "ct_hwalsh" : "ct_tnguyen", description: `Sell-side broker, ${active.name}` });
  if (s.lenderOrg) add({ role: "lender", organizationId: s.lenderOrg, contactId: s.lenderOrg === "org_sterling" ? "ct_pmills" : undefined, description: "Existing mortgage lender" });
  if (active?.lenderOrgId && active.lenderOrgId !== s.lenderOrg) add({ role: "lender", organizationId: active.lenderOrgId, contactId: active.lenderOrgId === "org_atlas" ? "ct_nsato" : undefined, description: "Acquisition financing (proposed)" });
  if (active) add({ role: "attorney", organizationId: "org_whitaker", contactId: "ct_dmorgan", description: "Buyer transactional counsel" });
  if (active && s.ccn) add({ role: "attorney", organizationId: "org_brennan", contactId: "ct_jobrien", description: "CHOW & licensure counsel" });
  if (active) add({ role: "consultant", organizationId: "org_clearline", contactId: "ct_wgrant", description: "PCA & Phase I ESA" });
  if (active && s.ccn) add({ role: "consultant", organizationId: "org_veritas", contactId: "ct_ebrooks", description: "Clinical & regulatory diligence" });

  const opContacts = contacts.filter((c) => c.organizationId === s.operator);
  opContacts.slice(0, 2).forEach((c) => add({ role: c.title.startsWith("Administrator") ? "administrator" : "key_contact", organizationId: s.operator, contactId: c.id, description: c.title }));
  const ownerContact = contacts.find((c) => c.organizationId === s.owner);
  if (ownerContact) add({ role: "key_contact", organizationId: s.owner, contactId: ownerContact.id, description: `${ownerContact.title}, ownership` });
  return out;
}

const REVIEWERS = ["Priya Raman", "Marcus Holloway", "Elena Vasquez", "Daniel Okafor"];

function buildDocuments(s: BuildingSpec, dealId: string | undefined, building: Building): DocumentRequest[] {
  const r = seeded(s.photoSeed * 2654435761);
  const created = building.createdAt;
  const items = [...BASELINE_DOCUMENTS, ...(s.docProgress < 0 ? [] : templateFor(s.type))];
  const requestedFrom = orgName(s.operator);
  const shortName = slug(s.name.split(" ").slice(0, 2).join(" "));

  // Choose statuses
  const statuses: DocumentStatus[] = items.map(() => "not_requested");
  if (s.docProgress >= 0) {
    const order = items.map((_, i) => i).sort(() => r() - 0.5);
    const nApproved = Math.round(s.docProgress * items.length);
    order.forEach((idx, rank) => {
      if (rank < nApproved) statuses[idx] = "approved";
      else {
        const x = r();
        statuses[idx] = x < 0.18 ? "in_review" : x < 0.3 ? "received" : x < 0.62 ? "requested" : x < 0.72 ? "needs_revision" : x < 0.76 ? "rejected" : "not_requested";
      }
    });
    if (s.docProgress > 0 && s.docProgress < 1 && !statuses.includes("in_review")) {
      const i = statuses.findIndex((x) => x !== "approved");
      if (i >= 0) statuses[i] = "in_review";
    }
  }

  // Demo-specific shaping for the primary walkthrough building.
  if (s.id === "bld_maplegrove") {
    const set = (key: string, st: DocumentStatus) => {
      const i = items.findIndex((t) => t.key === key);
      if (i >= 0) statuses[i] = st;
    };
    set("license", "approved");
    set("floor_plan", "requested");
    set("pca", "in_review");
    set("t12", "in_review");
    set("phase1", "received");
    set("alta", "needs_revision");
    set("litigation", "requested");
    set("title", "approved");
    set("appraisal", "not_requested");
  }

  return items.map((t, i) => {
    const status = statuses[i];
    const hasFile = ["received", "in_review", "approved", "rejected", "needs_revision"].includes(status);
    const version = status === "approved" && r() > 0.7 ? 2 : 1;
    const uploadedDaysAgo = 3 + Math.floor(r() * 40);
    const files: DocumentFile[] = hasFile
      ? Array.from({ length: version }, (_, v) => ({
          id: `${s.id}_doc_${t.key}_f${v + 1}`,
          fileName: `${shortName}_${slug(t.name)}${v ? `_v${v + 1}` : ""}.pdf`,
          fileSize: Math.round((180 + r() * 4200) * 1024),
          mimeType: "application/pdf",
          version: v + 1,
          uploadedAt: offsetTimestamp(-(uploadedDaysAgo - v * 2)),
          uploadedBy: r() > 0.5 ? "Data room sync" : "Ryan Foster",
          source: (r() > 0.45 ? "sharepoint" : "upload") as DocumentFile["source"],
          pageCount: 2 + Math.floor(r() * 80),
        }))
      : [];
    const reviewer = status === "not_requested" ? undefined : REVIEWERS[Math.floor(r() * REVIEWERS.length)];
    const dueOffset = status === "requested" ? -6 + Math.floor(r() * 24) : status === "needs_revision" ? 4 + Math.floor(r() * 8) : -10 - Math.floor(r() * 20);
    const comments: DocumentRequest["comments"] = [];
    if (status === "approved")
      comments.push({ id: `${s.id}_c_${t.key}`, author: reviewer!, text: "Reviewed against data tape; no exceptions.", createdAt: offsetTimestamp(-(uploadedDaysAgo - 2)), action: "approved" });
    if (status === "needs_revision")
      comments.push({ id: `${s.id}_c_${t.key}`, author: reviewer!, text: t.key === "alta" ? "Survey is not certified to buyer or lender, and Table A item 11 (utilities) is missing. Please request a revised certification." : "Document is incomplete — missing pages for the most recent period. Requested a complete copy.", createdAt: offsetTimestamp(-(uploadedDaysAgo - 3)), action: "needs_revision" });
    if (status === "rejected")
      comments.push({ id: `${s.id}_c_${t.key}`, author: reviewer!, text: "Wrong facility — file references a different provider number.", createdAt: offsetTimestamp(-(uploadedDaysAgo - 1)), action: "rejected" });

    return {
      id: `${s.id}_doc_${t.key}`,
      buildingId: s.id,
      dealId: t.baseline ? undefined : dealId,
      name: t.name,
      category: t.category,
      required: t.required,
      isBaseline: !!t.baseline,
      requestedFrom: status === "not_requested" ? undefined : t.category === "third_party" ? "Clearline Property Assessments" : t.category === "legal" ? "Whitaker & Lowe LLP" : requestedFrom,
      reviewer,
      dueDate: status === "not_requested" || status === "approved" ? undefined : offsetDate(dueOffset),
      status,
      files,
      notes: t.description,
      comments,
      createdAt: created,
      updatedAt: hasFile ? files[files.length - 1].uploadedAt : created,
    };
  });
}

function buildSiteVisits(s: BuildingSpec, dealId?: string): SiteVisit[] {
  if (s.id === "bld_maplegrove") {
    return [
      {
        id: "sv_maple_2",
        buildingId: s.id,
        dealId,
        date: offsetDate(-12),
        type: "diligence_inspection",
        participants: ["Jordan Ellis", "Marcus Holloway", "William Grant (Clearline)", "Laura Bishop (Administrator)"],
        summary:
          "Full building walkthrough with PCA consultant. Building is well maintained overall; second-floor east wing PTACs are original and noisy. Roof replaced 2019 and in good condition. Generator transfer switch flagged for replacement within 3 years. Therapy gym recently expanded and a strong selling point.",
        conditionRatings: { roof: "good", hvac: "fair", plumbing: "good", electrical: "fair", life_safety: "good" },
        observations: [
          { id: "ob_m1", text: "Original PTAC units in 2nd floor east wing (22 rooms) — replacement recommended.", severity: "medium", system: "hvac", status: "open" },
          { id: "ob_m2", text: "Automatic transfer switch is 2004 vintage; parts availability limited.", severity: "medium", system: "electrical", status: "open" },
          { id: "ob_m3", text: "Minor ceiling staining near nurse station B — confirmed historical, roof replaced since.", severity: "low", system: "roof", status: "resolved" },
        ],
        followUps: [
          { id: "fu_m1", title: "Obtain PTAC replacement quote from operator", assignee: "Marcus Holloway", dueDate: offsetDate(6), done: false },
          { id: "fu_m2", title: "Confirm generator load test logs for last 12 months", assignee: "Priya Raman", dueDate: offsetDate(-2), done: false },
          { id: "fu_m3", title: "Request roof warranty transfer documentation", assignee: "Jordan Ellis", dueDate: offsetDate(-5), done: true },
        ],
        photos: [
          { id: "ph_m1", caption: "Main entrance & porte-cochère", area: "Exterior" },
          { id: "ph_m2", caption: "Expanded therapy gym", area: "Therapy" },
          { id: "ph_m3", caption: "PTAC unit, room 214", area: "Resident room" },
          { id: "ph_m4", caption: "Roof — north wing membrane", area: "Roof" },
          { id: "ph_m5", caption: "Generator & ATS enclosure", area: "Mechanical" },
        ],
        createdBy: "Jordan Ellis",
        createdAt: offsetTimestamp(-11),
      },
      {
        id: "sv_maple_1",
        buildingId: s.id,
        dealId,
        date: offsetDate(-142),
        type: "initial_tour",
        participants: ["Jordan Ellis", "Helen Walsh (Calloway)", "Maria Delgado (Cedarbrook)"],
        summary:
          "Initial tour during marketing process. Strong curb appeal and clinical leadership. Census at 108. Operator open to new long-term lease structure.",
        conditionRatings: { roof: "good", hvac: "fair", interiors: "good" },
        observations: [{ id: "ob_m0", text: "Dining room furniture dated; cosmetic only.", severity: "low", system: "interiors", status: "resolved" }],
        followUps: [{ id: "fu_m0", title: "Request 24-month census by payer", assignee: "Priya Raman", dueDate: offsetDate(-135), done: true }],
        photos: [
          { id: "ph_m0a", caption: "Front elevation", area: "Exterior" },
          { id: "ph_m0b", caption: "Main dining room", area: "Common area" },
        ],
        createdBy: "Jordan Ellis",
        createdAt: offsetTimestamp(-141),
      },
    ];
  }
  if (!dealId || s.docProgress < 0.1) return [];
  const r = seeded(s.photoSeed * 97);
  const rating = s.condition;
  const second = rating === "poor" || rating === "critical" ? "poor" : "fair";
  return [
    {
      id: `sv_${s.id}_1`,
      buildingId: s.id,
      dealId,
      date: offsetDate(-(10 + Math.floor(r() * 60))),
      type: s.docProgress > 0.5 ? "diligence_inspection" : "initial_tour",
      participants: [...new Set([pickName(r), pickName(r), pickName(r)])].slice(0, 2).concat(`${contacts.find((c) => c.organizationId === s.operator)?.name ?? "Administrator"} (Operator)`),
      summary:
        rating === "good"
          ? "Building presents well; recent capital investment evident in common areas. Staff engagement high. No major concerns identified."
          : rating === "fair"
            ? "Building is functional with typical age-related wear. HVAC and resident room finishes will need investment within 3–5 years."
            : "Significant deferred maintenance observed. Roof leaks in multiple resident rooms and aging central plant. Capex reserve must be reflected in pricing.",
      conditionRatings: { roof: rating, hvac: second, plumbing: rating === "critical" ? "poor" : rating, electrical: "fair", life_safety: rating === "good" ? "good" : "fair" },
      observations:
        rating === "good"
          ? [{ id: `ob_${s.id}_1`, text: "Parking lot needs seal coat and restriping.", severity: "low", system: "site", status: "open" }]
          : [
              { id: `ob_${s.id}_1`, text: "Water staining on ceiling tiles in multiple resident rooms.", severity: "high", system: "roof", status: "open" },
              { id: `ob_${s.id}_2`, text: "Chiller is original equipment; maintenance logs incomplete.", severity: "medium", system: "hvac", status: "open" },
            ],
      followUps: [{ id: `fu_${s.id}_1`, title: "Request 3 years of capex invoices", assignee: pickName(r), dueDate: offsetDate(Math.floor(r() * 20) - 5), done: r() > 0.6 }],
      photos: [
        { id: `ph_${s.id}_1`, caption: "Front elevation", area: "Exterior" },
        { id: `ph_${s.id}_2`, caption: "Typical resident room", area: "Resident room" },
        { id: `ph_${s.id}_3`, caption: "Mechanical room", area: "Mechanical" },
      ],
      createdBy: "Jordan Ellis",
      createdAt: offsetTimestamp(-10),
    },
  ];
}

function pickName(r: () => number) {
  const names = ["Jordan Ellis", "Priya Raman", "Marcus Holloway", "Elena Vasquez", "Daniel Okafor"];
  return names[Math.floor(r() * names.length)];
}

function buildActivities(s: BuildingSpec, b: Building, docs: DocumentRequest[], visits: SiteVisit[], dealLinks: { dealId: string; addedAt: string; name: string }[]): Activity[] {
  const out: Activity[] = [];
  const add = (a: Omit<Activity, "id" | "buildingId">) => out.push({ id: `${s.id}_act_${out.length}`, buildingId: s.id, ...a });
  add({ type: "building_created", title: "Building record created", description: s.ccn ? `Imported from CMS provider ${s.ccn} (mock).` : "Created from state licensure record.", actor: "Jordan Ellis", timestamp: b.createdAt });
  dealLinks.forEach((d) =>
    add({ type: "deal_associated", title: `Added to ${d.name}`, dealId: d.dealId, actor: "Jordan Ellis", timestamp: d.addedAt.length === 10 ? `${d.addedAt}T15:20:00.000Z` : d.addedAt }),
  );
  if (s.ccn) {
    add({ type: "cms_refreshed", title: "CMS data refreshed", description: "Q3 2026 star ratings and staffing data loaded (mock extract).", actor: "System", timestamp: offsetTimestamp(-(2 + (s.photoSeed % 7))) });
  }
  docs
    .filter((d) => d.files.length)
    .slice(0, 6)
    .forEach((d) => {
      const f = d.files[d.files.length - 1];
      add({ type: "document_uploaded", title: `${d.name} uploaded`, description: `${f.fileName} · v${f.version} via ${f.source === "sharepoint" ? "SharePoint sync" : "upload"}`, actor: f.uploadedBy, timestamp: f.uploadedAt });
    });
  docs
    .filter((d) => d.comments.length)
    .slice(0, 4)
    .forEach((d) => {
      const c = d.comments[d.comments.length - 1];
      add({ type: "document_reviewed", title: `${d.name} ${c.action === "approved" ? "approved" : c.action === "rejected" ? "rejected" : "returned for revision"}`, description: c.text, actor: c.author, timestamp: c.createdAt });
    });
  visits.forEach((v) => add({ type: "site_visit", title: "Site visit completed", description: v.summary.slice(0, 120) + (v.summary.length > 120 ? "…" : ""), actor: v.createdBy, timestamp: v.createdAt, dealId: v.dealId }));
  if (b.verificationStatus !== "unverified") {
    add({ type: "verification_changed", title: `Marked ${b.verificationStatus === "verified" ? "verified" : b.verificationStatus === "needs_review" ? "as needing review" : "partially verified"}`, description: "Bed counts reconciled against state license.", actor: "Priya Raman", timestamp: b.lastVerifiedAt ? `${b.lastVerifiedAt}T17:05:00.000Z` : b.updatedAt });
  }
  if (s.id === "bld_maplegrove") {
    add({ type: "note", title: "Note added", description: "Operator confirmed census of 106 as of last Friday; Medicare ADC trending up after new hospital partnership.", actor: "Marcus Holloway", timestamp: offsetTimestamp(-3.2) });
  }
  if (s.id === "bld_seaside") {
    add({ type: "note", title: "Prior diligence carried forward", description: "Documents from Carolina Coast (OD-2024-011) linked to new deal. Roof report must be refreshed.", actor: "Daniel Okafor", timestamp: offsetTimestamp(-7) });
  }
  return out.sort((a, b2) => b2.timestamp.localeCompare(a.timestamp));
}

function buildDataRoom(s: BuildingSpec, docs: DocumentRequest[], dealName?: string): DataRoomConnection {
  if (!dealName) {
    return { buildingId: s.id, provider: "sharepoint", siteName: "", folderPath: "", status: "not_connected", recentFiles: [] };
  }
  const synced = docs.filter((d) => d.files.some((f) => f.source === "sharepoint")).slice(0, 4);
  return {
    buildingId: s.id,
    provider: "sharepoint",
    siteName: "OD Acquisitions",
    folderPath: `Deals / ${dealName} / ${s.name.split(" ").slice(0, 2).join(" ")}`,
    status: "connected",
    lastSyncAt: offsetTimestamp(-0.08 - (s.photoSeed % 5) * 0.03),
    recentFiles: synced.map((d) => {
      const f = d.files.find((x) => x.source === "sharepoint")!;
      return { id: `${f.id}_dr`, name: f.fileName, importedAt: f.uploadedAt, size: f.fileSize, matchedRequestId: d.id };
    }),
  };
}

export function buildSeedState(): AppState {
  const deals = buildDeals();
  const dealBuildings = buildDealBuildings();
  const state: AppState = {
    version: STATE_VERSION,
    buildings: [],
    organizations,
    contacts,
    ownerships: [],
    relationships: [],
    deals,
    dealBuildings,
    cms: [],
    conditions: [],
    capitalProjects: [],
    financials: [],
    siteVisits: [],
    documentRequests: [],
    activities: [],
    dataRooms: [],
  };

  for (const s of buildingSpecs) {
    const b = buildBuilding(s);
    const links = dealBuildings.filter((db) => db.buildingId === s.id);
    const linkedDeals = links.map((l) => deals.find((d) => d.id === l.dealId)!);
    const activeDeal = linkedDeals.find((d) => d.status === "active");
    const docDeal = activeDeal ?? linkedDeals.find((d) => d.status === "closed");

    state.buildings.push(b);
    state.ownerships.push(...buildOwnerships(s));
    state.relationships.push(...buildRelationships(s, links.map((l) => l.dealId)));
    if (s.ccn && s.ratings) state.cms.push(generateCms(s.id, s.ccn, s.ratings, s.photoSeed));
    state.conditions.push(generateCondition(s.id, s.condition, s.yearBuilt, s.photoSeed));
    state.capitalProjects.push(...generateCapitalProjects(s.id, s.condition, s.photoSeed));

    const debt: BuildingFinancials["debt"] = s.lenderOrg
      ? {
          lenderOrgId: s.lenderOrg,
          loanType: s.lenderOrg === "org_sterling" ? "HUD 232/223(f)" : "Bank term loan",
          originalAmount: Math.round(s.certified * 118_000),
          balance: Math.round(s.certified * 104_000),
          rate: s.lenderOrg === "org_sterling" ? "3.85% fixed" : "SOFR + 3.25%",
          originationDate: s.lenderOrg === "org_sterling" ? "2024-09-01" : "2021-04-15",
          maturityDate: s.lenderOrg === "org_sterling" ? "2059-09-01" : offsetDate(260),
        }
      : undefined;
    state.financials.push(generateFinancials(s.id, s.type, s.certified, s.adc, s.revenuePerDay, s.skilledMix, s.owner !== s.operator, s.photoSeed, debt));

    const docs = buildDocuments(s, docDeal?.id, b);
    state.documentRequests.push(...docs);
    const visits = buildSiteVisits(s, docDeal?.id);
    state.siteVisits.push(...visits);
    state.activities.push(
      ...buildActivities(
        s,
        b,
        docs,
        visits,
        links.map((l) => ({ dealId: l.dealId, addedAt: l.addedAt, name: deals.find((d) => d.id === l.dealId)!.name })),
      ),
    );
    state.dataRooms.push(buildDataRoom(s, docs, activeDeal?.name));
  }
  return state;
}
