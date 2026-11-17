/**
 * Deterministic generators that expand compact specs into detailed mock records.
 * Used both for the seed dataset and for buildings added during the demo.
 */
import type {
  BuildingFinancials,
  BuildingSystem,
  CapitalProject,
  CMSData,
  CMSDeficiency,
  CMSPenalty,
  CMSRatingSnapshot,
  CMSSurvey,
  ConditionRating,
  DocumentRequest,
  FacilityType,
  PropertyCondition,
  StarRating,
  SystemCondition,
} from "@/types";
import { offsetDate, offsetTimestamp, seeded } from "@/lib/utils";
import { BASELINE_DOCUMENTS } from "./templates";

type Rand = () => number;
const pick = <T,>(r: Rand, arr: T[]) => arr[Math.floor(r() * arr.length)];
const clampStar = (n: number) => Math.max(1, Math.min(5, Math.round(n))) as StarRating;
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

// ---------------------------------------------------------------------------
// CMS
// ---------------------------------------------------------------------------

const DEFICIENCY_POOL = [
  { tag: "F689", category: "Accidents & supervision", description: "Free of accident hazards/supervision/devices — fall interventions not implemented per care plan." },
  { tag: "F684", category: "Quality of care", description: "Quality of care — delayed physician notification of change in condition." },
  { tag: "F880", category: "Infection control", description: "Infection prevention & control — hand hygiene not performed between resident contacts." },
  { tag: "F812", category: "Food & nutrition", description: "Food procurement, store/prepare/serve — refrigerator temperature logs incomplete." },
  { tag: "F656", category: "Care planning", description: "Develop/implement comprehensive care plan — care plan not updated after readmission." },
  { tag: "F761", category: "Pharmacy services", description: "Label/store drugs and biologicals — expired medications in medication cart." },
  { tag: "F686", category: "Quality of care", description: "Treatment/services to prevent/heal pressure ulcers — repositioning schedule not followed." },
  { tag: "F600", category: "Abuse & neglect", description: "Free from abuse and neglect — allegation not reported within required timeframe." },
  { tag: "F584", category: "Environment", description: "Safe/clean/comfortable/homelike environment — damaged wall surfaces and odors in east wing." },
  { tag: "F725", category: "Nursing services", description: "Sufficient nursing staff — call light response times exceeded policy on night shift." },
  { tag: "K0353", category: "Life safety", description: "Sprinkler system maintenance and testing — quarterly inspection documentation missing." },
  { tag: "K0918", category: "Life safety", description: "Electrical systems — generator load test not documented monthly." },
];

export function generateCms(
  buildingId: string,
  providerNumber: string,
  ratings: { overall: StarRating; health: StarRating; staffing: StarRating; qm: StarRating },
  seed: number,
): CMSData {
  const r = seeded(seed * 7919 + 13);
  const total = round(3.15 + (ratings.staffing - 3) * 0.38 + (r() - 0.5) * 0.2);
  const rn = round(0.38 + ratings.staffing * 0.09 + r() * 0.05);
  const lpn = round(0.72 + r() * 0.2);
  const cna = round(Math.max(1.8, total - rn - lpn));

  // Surveys: three annual standard surveys plus complaints.
  const surveys: CMSSurvey[] = [];
  const deficiencies: CMSDeficiency[] = [];
  const healthPenalty = 6 - ratings.health; // 1..5
  for (let y = 0; y < 3; y++) {
    const date = offsetDate(-(y * 365 + 40 + Math.floor(r() * 90)));
    const count = Math.max(0, Math.round(healthPenalty * 2.2 + (r() - 0.5) * 4 - 1));
    const sevPool = ratings.health <= 1 ? ["G", "J", "E", "F"] : ratings.health <= 2 ? ["D", "E", "G", "F"] : ["D", "E", "D", "F"];
    const highest = count === 0 ? "—" : pick(r, sevPool);
    surveys.push({ id: `${buildingId}_sv_${y}`, date, type: "standard", deficiencyCount: count, highestScopeSeverity: highest });
    for (let i = 0; i < Math.min(count, 4); i++) {
      const d = pick(r, DEFICIENCY_POOL);
      deficiencies.push({
        id: `${buildingId}_def_${y}_${i}`,
        surveyDate: date,
        tag: d.tag,
        category: d.category,
        description: d.description,
        scopeSeverity: i === 0 ? highest : pick(r, ["D", "E", "D", "F"]),
        status: y === 0 && i === 0 && ratings.health <= 2 ? "open" : "corrected",
      });
    }
  }
  const complaintCount = Math.max(0, Math.round(healthPenalty - 1 + r()));
  for (let c = 0; c < complaintCount; c++) {
    const date = offsetDate(-(30 + Math.floor(r() * 700)));
    const count = Math.max(1, Math.round(r() * healthPenalty));
    surveys.push({ id: `${buildingId}_cs_${c}`, date, type: "complaint", deficiencyCount: count, highestScopeSeverity: pick(r, ["D", "E", "G"]) });
    const d = pick(r, DEFICIENCY_POOL.slice(0, 10));
    deficiencies.push({ id: `${buildingId}_cdef_${c}`, surveyDate: date, tag: d.tag, category: d.category, description: d.description, scopeSeverity: pick(r, ["D", "E", "G"]), status: "corrected" });
  }
  const fsDate = offsetDate(-(60 + Math.floor(r() * 200)));
  const fsCount = ratings.overall <= 2 ? 2 + Math.floor(r() * 3) : Math.floor(r() * 2);
  surveys.push({ id: `${buildingId}_fs`, date: fsDate, type: "fire_safety", deficiencyCount: fsCount, highestScopeSeverity: fsCount ? "E" : "—" });
  if (fsCount) {
    deficiencies.push({ id: `${buildingId}_fsdef`, surveyDate: fsDate, tag: "K0353", category: "Life safety", description: DEFICIENCY_POOL[10].description, scopeSeverity: "E", status: ratings.overall <= 2 ? "open" : "corrected" });
  }
  surveys.sort((a, b) => b.date.localeCompare(a.date));
  deficiencies.sort((a, b) => b.surveyDate.localeCompare(a.surveyDate));

  const penalties: CMSPenalty[] = [];
  if (ratings.health <= 2) {
    penalties.push({ id: `${buildingId}_pen_1`, date: offsetDate(-210 - Math.floor(r() * 200)), type: "civil_money_penalty", amount: Math.round((18 + r() * 60) * 1000), description: "Civil money penalty following standard survey." });
  }
  if (ratings.health === 1) {
    penalties.push({ id: `${buildingId}_pen_2`, date: offsetDate(-120), type: "payment_denial", description: "Denial of payment for new admissions (DPNA), 21 days." });
    penalties.push({ id: `${buildingId}_pen_3`, date: offsetDate(-480), type: "civil_money_penalty", amount: Math.round((60 + r() * 90) * 1000), description: "Per-day CMP related to immediate jeopardy citation." });
  }

  const history: CMSRatingSnapshot[] = [];
  const quarters = ["Q4 2024", "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026"];
  quarters.forEach((period, i) => {
    const drift = (quarters.length - 1 - i) * 0.12 * (r() > 0.5 ? 1 : -1);
    history.push({
      period,
      overall: i === quarters.length - 1 ? ratings.overall : clampStar(ratings.overall + drift + (r() - 0.5) * 0.9),
      health: i === quarters.length - 1 ? ratings.health : clampStar(ratings.health + drift + (r() - 0.5) * 0.9),
      staffing: i === quarters.length - 1 ? ratings.staffing : clampStar(ratings.staffing + (r() - 0.5) * 0.8),
      qualityMeasures: i === quarters.length - 1 ? ratings.qm : clampStar(ratings.qm + (r() - 0.5) * 0.9),
    });
  });

  return {
    buildingId,
    providerNumber,
    ratings: { overall: ratings.overall, health: ratings.health, staffing: ratings.staffing, qualityMeasures: ratings.qm, longStayQm: clampStar(ratings.qm + (seed % 3 === 0 ? -1 : 0)), shortStayQm: clampStar(ratings.qm + (seed % 4 === 1 ? 1 : seed % 5 === 2 ? -1 : 0)) },
    staffing: {
      totalNurseHprd: total,
      rnHprd: rn,
      lpnHprd: lpn,
      cnaHprd: cna,
      stateAvgTotalHprd: round(3.6 + r() * 0.4),
      nationalAvgTotalHprd: 3.82,
      nurseTurnoverPct: Math.round(68 - ratings.staffing * 6 + r() * 10),
    },
    surveys,
    deficiencies,
    penalties,
    ratingHistory: history,
    specialFocusFacility: false,
    abuseIcon: ratings.health === 1,
    lastRefreshedAt: offsetTimestamp(-(2 + r() * 10)),
    sourceLabel: "Mock CMS Care Compare extract (prototype data)",
  };
}

// ---------------------------------------------------------------------------
// Property condition
// ---------------------------------------------------------------------------

const LEVELS: ConditionRating[] = ["good", "fair", "poor", "critical"];

const SYSTEM_NOTES: Record<BuildingSystem, Record<ConditionRating, string>> = {
  roof: {
    good: "Modified bitumen membrane in serviceable condition; no active leaks observed.",
    fair: "Localized ponding at north wing; minor flashing repairs recommended.",
    poor: "Membrane at end of useful life; multiple patched leaks above resident corridors.",
    critical: "Active leaks in 6 resident rooms; full replacement required within 12 months.",
  },
  hvac: {
    good: "Rooftop units replaced 2019–2021; PTACs in resident rooms functioning.",
    fair: "Chiller nearing end of life; PTAC replacement program ~40% complete.",
    poor: "Original boilers and chiller; inconsistent temperatures reported in west wing.",
    critical: "Chiller failure summer 2025 required rental unit; immediate replacement needed.",
  },
  plumbing: {
    good: "Copper domestic lines; water heaters replaced 2020.",
    fair: "Galvanized branch lines in original wing; occasional pressure issues.",
    poor: "Cast iron waste lines with recurring backups; scoping recommended.",
    critical: "Repeated waste line failures; Legionella water management plan deficient.",
  },
  electrical: {
    good: "Main switchgear adequate; generator load tested monthly.",
    fair: "Panels adequate; generator transfer switch should be replaced in 3–5 years.",
    poor: "Federal Pacific panels in service wing; generator undersized for full HVAC load.",
    critical: "Generator failed load test; panels require replacement.",
  },
  life_safety: {
    good: "Fully sprinklered; fire alarm panel upgraded; no K-tag citations last survey.",
    fair: "Fully sprinklered; minor K-tag citations corrected; smoke barrier penetrations noted.",
    poor: "Partial sprinkler coverage in attic; multiple open K-tag deficiencies.",
    critical: "Open life-safety deficiencies; fire alarm panel obsolete and unsupported.",
  },
  elevators: {
    good: "Hydraulic elevator modernized 2018.",
    fair: "Original controller; parts availability limited.",
    poor: "Frequent outages; modernization required.",
    critical: "Out of service; state inspection failed.",
  },
  interiors: {
    good: "Resident rooms renovated within last 5 years.",
    fair: "Common areas updated; resident rooms dated.",
    poor: "Worn finishes, dated bathrooms, institutional feel.",
    critical: "Significant finish damage; infection-control concerns.",
  },
  site: {
    good: "Parking lot resurfaced; ADA compliant.",
    fair: "Asphalt cracking; seal and restripe recommended.",
    poor: "Drainage issues at loading dock; lot replacement needed.",
    critical: "Trip hazards and failed drainage.",
  },
};

export function generateCondition(buildingId: string, base: ConditionRating, yearBuilt: number, seed: number): PropertyCondition {
  const r = seeded(seed * 104729 + 7);
  const baseIdx = LEVELS.indexOf(base);
  const systems: SystemCondition[] = (["roof", "hvac", "plumbing", "electrical", "life_safety", "elevators", "interiors", "site"] as BuildingSystem[]).map((system) => {
    const jitter = r() < 0.25 ? -1 : r() > 0.75 ? 1 : 0;
    const idx = Math.max(0, Math.min(3, baseIdx + jitter));
    const rating = LEVELS[idx];
    const installYear = idx === 0 ? 2015 + Math.floor(r() * 9) : Math.max(yearBuilt, 1995 + Math.floor(r() * 15));
    return {
      system,
      rating,
      installYear,
      remainingUsefulLifeYrs: [14, 7, 3, 0][idx] + Math.floor(r() * 4),
      lastAssessed: offsetDate(-(30 + Math.floor(r() * 200))),
      notes: SYSTEM_NOTES[system][rating],
      source: r() > 0.4 ? "third_party_report" : "site_visit",
    };
  });

  const deferred = systems
    .filter((s) => s.rating !== "good")
    .map((s, i) => ({
      id: `${buildingId}_dm_${i}`,
      system: s.system,
      description: s.notes.split(";")[0],
      estimatedCost: Math.round((s.rating === "critical" ? 380 : s.rating === "poor" ? 190 : 45) * (0.6 + r()) ) * 1000,
      priority: (s.rating === "critical" ? "immediate" : s.rating === "poor" ? "short_term" : "long_term") as "immediate" | "short_term" | "long_term",
    }));

  return {
    buildingId,
    overall: base,
    assessedBy: "Clearline Property Assessments",
    assessmentDate: offsetDate(-(45 + Math.floor(r() * 120))),
    construction: pick(r, ["Wood frame on slab, brick veneer", "Steel frame, masonry exterior", "Load-bearing masonry, concrete slab", "Wood frame, vinyl and stone exterior"]),
    sprinklered: base === "critical" || base === "poor" ? (r() > 0.5 ? "partial" : "full") : "full",
    generator: pick(r, ["350 kW diesel, 2014", "500 kW natural gas, 2019", "250 kW diesel, 2006", "400 kW diesel, 2017"]),
    parkingSpaces: 40 + Math.floor(r() * 80),
    systems,
    deferredMaintenance: deferred,
    renovations: [
      { id: `${buildingId}_ren_1`, year: Math.max(yearBuilt + 8, 2008 + Math.floor(r() * 6)), description: "Rehab gym and therapy suite expansion", cost: Math.round(250 + r() * 400) * 1000 },
      { id: `${buildingId}_ren_2`, year: 2016 + Math.floor(r() * 6), description: "Nurse call system replacement", cost: Math.round(120 + r() * 160) * 1000 },
      ...(base === "good"
        ? [{ id: `${buildingId}_ren_3`, year: 2021 + Math.floor(r() * 4), description: "Resident room and corridor refresh (flooring, lighting, millwork)", cost: Math.round(600 + r() * 900) * 1000 }]
        : []),
    ].filter((x) => x.year >= yearBuilt),
  };
}

export function generateCapitalProjects(buildingId: string, base: ConditionRating, seed: number): CapitalProject[] {
  const r = seeded(seed * 31337 + 5);
  const projects: CapitalProject[] = [
    { id: `${buildingId}_cp_1`, buildingId, name: "Nurse call & Wi-Fi infrastructure upgrade", category: "electrical", status: "completed", budget: 185_000, spent: 179_400, startDate: offsetDate(-420), targetDate: offsetDate(-330) },
  ];
  if (base !== "good") {
    projects.push({ id: `${buildingId}_cp_2`, buildingId, name: base === "fair" ? "PTAC replacement program, phase 2" : "Central plant (boiler/chiller) replacement", category: "hvac", status: "in_progress", budget: base === "fair" ? 240_000 : 1_150_000, spent: Math.round((base === "fair" ? 240_000 : 1_150_000) * (0.2 + r() * 0.5)), startDate: offsetDate(-90), targetDate: offsetDate(150) });
    projects.push({ id: `${buildingId}_cp_3`, buildingId, name: "Roof replacement — resident wings", category: "roof", status: "planned", budget: Math.round((420 + r() * 500) * 1000), spent: 0, targetDate: offsetDate(300) });
  } else {
    projects.push({ id: `${buildingId}_cp_2`, buildingId, name: "Resident room refresh — 2nd floor", category: "resident_rooms", status: "planned", budget: 360_000, spent: 0, targetDate: offsetDate(240) });
  }
  return projects;
}

// ---------------------------------------------------------------------------
// Financials (illustrative)
// ---------------------------------------------------------------------------

export function generateFinancials(
  buildingId: string,
  type: FacilityType,
  beds: number,
  adc: number,
  revenuePerDay: number,
  skilledMix: number,
  leased: boolean,
  seed: number,
  debt?: BuildingFinancials["debt"],
): BuildingFinancials {
  const r = seeded(seed * 65537 + 3);
  const snf = type === "skilled_nursing" || type === "ccrc";
  const periods = [
    { label: "FY2023", periodEnd: "2023-12-31", growth: 0.9, occAdj: -0.035 },
    { label: "FY2024", periodEnd: "2024-12-31", growth: 0.95, occAdj: -0.018 },
    { label: "FY2025", periodEnd: "2025-12-31", growth: 0.985, occAdj: -0.006 },
    { label: "TTM Sep-2026", periodEnd: "2026-09-30", growth: 1, occAdj: 0 },
  ].map((p, i) => {
    const occ = Math.min(0.99, adc / beds + p.occAdj + (r() - 0.5) * 0.01);
    const revenue = Math.round(beds * occ * 365 * revenuePerDay * p.growth);
    const opexRatio = (snf ? 0.855 : 0.66) + (r() - 0.5) * 0.03 - i * 0.004;
    const operatingExpenses = Math.round(revenue * opexRatio);
    const ebitdar = revenue - operatingExpenses;
    const rent = leased ? Math.round(revenue * (snf ? 0.082 : 0.11)) : 0;
    const ebitda = ebitdar - rent;
    const noi = Math.round(ebitdar - revenue * 0.05);
    return {
      label: p.label,
      periodEnd: p.periodEnd,
      revenue,
      operatingExpenses,
      ebitdar,
      rent,
      ebitda,
      noi,
      occupancyPct: round(occ * 100, 1),
      source: (i === 3 ? "operator_report" : i === 2 ? "data_room" : "broker_om") as BuildingFinancials["periods"][number]["source"],
    };
  });

  const medicare = snf ? Math.round(skilledMix * 62) : 0;
  const managedCare = snf ? Math.round(skilledMix * 38) : 0;
  const privatePay = snf ? Math.round(6 + r() * 6) : Math.round(84 + r() * 8);
  const other = snf ? Math.round(2 + r() * 3) : 0;
  const medicaid = 100 - medicare - managedCare - privatePay - other;

  return {
    buildingId,
    periods,
    payerMix: { medicare, medicaid: Math.max(0, medicaid), managedCare, privatePay, other: snf ? other : 100 - privatePay - Math.max(0, medicaid) },
    payerMixAsOf: "2026-09-30",
    debt,
    capex: [2022, 2023, 2024, 2025, 2026].map((year) => ({ year, amount: Math.round(beds * (900 + r() * 1400)) })),
  };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export function baselineDocumentRequests(buildingId: string, createdAt: string): DocumentRequest[] {
  return BASELINE_DOCUMENTS.map((t) => ({
    id: `${buildingId}_doc_${t.key}`,
    buildingId,
    name: t.name,
    category: t.category,
    required: t.required,
    isBaseline: true,
    status: "not_requested" as const,
    files: [],
    notes: t.description,
    comments: [],
    createdAt,
    updatedAt: createdAt,
  }));
}
