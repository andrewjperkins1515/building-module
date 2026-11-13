import type { Contact, Organization } from "@/types";
import { seeded } from "@/lib/utils";
import { defaultContactType, defaultSectors } from "./contactDefaults";

/** All organizations and people below are fictional. */
const baseOrganizations: Organization[] = [
  // Property owners
  { id: "org_meridian", name: "Meridian Healthcare Properties", type: "owner", hqCity: "Chicago", hqState: "IL", website: "meridianhcp.example", description: "Private healthcare real estate owner with a Midwest SNF concentration." },
  { id: "org_keystone", name: "Keystone Senior Realty Trust", type: "owner", hqCity: "Philadelphia", hqState: "PA", website: "keystonesrt.example", description: "Non-traded REIT focused on post-acute and senior housing." },
  { id: "org_harborview", name: "Harborview Capital Partners", type: "owner", hqCity: "Tampa", hqState: "FL", description: "Family office investing in Southeast healthcare real estate." },
  { id: "org_bluegrass_props", name: "Bluegrass Care Properties LLC", type: "owner", hqCity: "Louisville", hqState: "KY", description: "Regional owner-operator real estate entity." },
  { id: "org_tricounty", name: "Tri-County Healthcare Holdings", type: "owner", hqCity: "Columbus", hqState: "OH" },
  { id: "org_sunbelt", name: "Sunbelt Senior Housing Fund II", type: "owner", hqCity: "Dallas", hqState: "TX", description: "Closed-end fund; seller of Texas seniors housing assets." },
  { id: "org_od_holdings", name: "OD Acquisition Holdings LLC", type: "investor", hqCity: "Nashville", hqState: "TN", description: "Buyer entity for platform acquisitions." },

  // Operators
  { id: "org_cedarbrook", name: "Cedarbrook Health Services", type: "operator", hqCity: "Grand Rapids", hqState: "MI", description: "Operates 22 SNFs across MI, OH and IN." },
  { id: "org_ashford", name: "Ashford Senior Living", type: "operator", hqCity: "San Antonio", hqState: "TX", description: "Assisted living and memory care operator." },
  { id: "org_northpoint", name: "Northpoint Care Group", type: "operator", hqCity: "Nashville", hqState: "TN", description: "Mid-size post-acute operator, 31 facilities." },
  { id: "org_riverside_rp", name: "Riverside Rehabilitation Partners", type: "operator", hqCity: "Sarasota", hqState: "FL", description: "Short-term rehab focused operator." },
  { id: "org_pinnacle", name: "Pinnacle Post-Acute", type: "operator", hqCity: "Harrisburg", hqState: "PA", description: "Regional operator; tenant on closed Keystone transaction." },
  { id: "org_willow", name: "Willow Creek Senior Care", type: "operator", hqCity: "Springfield", hqState: "MO" },
  { id: "org_coastal", name: "Coastal Carolina Health", type: "operator", hqCity: "Wilmington", hqState: "NC" },
  { id: "org_heartland", name: "Heartland Prairie Care", type: "operator", hqCity: "Peoria", hqState: "IL" },
  { id: "org_sonoran", name: "Sonoran Health Partners", type: "operator", hqCity: "Phoenix", hqState: "AZ" },
  { id: "org_evergreen_prev", name: "Evergreen Care Centers (former)", type: "operator", hqCity: "Indianapolis", hqState: "IN", description: "Former operator; exited Indiana market in 2021." },

  // Parent organizations
  { id: "org_cedarbrook_hold", name: "Cedarbrook Holdings, Inc.", type: "parent", hqCity: "Grand Rapids", hqState: "MI" },
  { id: "org_northpoint_hold", name: "Northpoint Healthcare Holdings", type: "parent", hqCity: "Nashville", hqState: "TN" },

  // Management
  { id: "org_summit_mgmt", name: "Summit Senior Management", type: "management", hqCity: "Atlanta", hqState: "GA", description: "Third-party manager for seniors housing communities." },

  // Brokers
  { id: "org_calloway", name: "Calloway Healthcare Advisors", type: "broker", hqCity: "Chicago", hqState: "IL", description: "Healthcare real estate investment sales." },
  { id: "org_stonebridge", name: "Stonebridge Capital Markets", type: "broker", hqCity: "Dallas", hqState: "TX" },

  // Lenders
  { id: "org_lakeshore", name: "Lakeshore Commercial Bank", type: "lender", hqCity: "Milwaukee", hqState: "WI" },
  { id: "org_sterling", name: "Sterling HUD Lending Group", type: "lender", hqCity: "Washington", hqState: "DC", description: "HUD 232 lender." },
  { id: "org_atlas", name: "Atlas Bridge Finance", type: "lender", hqCity: "New York", hqState: "NY", description: "Bridge-to-HUD lender." },

  // Law firms
  { id: "org_whitaker", name: "Whitaker & Lowe LLP", type: "law_firm", hqCity: "Nashville", hqState: "TN", description: "Buyer-side healthcare transactional counsel." },
  { id: "org_brennan", name: "Brennan Ross Healthcare Law", type: "law_firm", hqCity: "Cleveland", hqState: "OH", description: "Regulatory and licensure counsel." },

  // Consultants
  { id: "org_clearline", name: "Clearline Property Assessments", type: "consultant", hqCity: "Columbus", hqState: "OH", description: "Property condition assessments and environmental reports." },
  { id: "org_veritas", name: "Veritas Healthcare Consulting", type: "consultant", hqCity: "Atlanta", hqState: "GA", description: "Clinical and regulatory diligence." },
];

type SeedContact = Omit<Contact, "contactType" | "sectors"> & Partial<Pick<Contact, "contactType" | "sectors">>;

const baseContacts: SeedContact[] = [
  { id: "ct_hwalsh", name: "Helen Walsh", title: "Managing Director", organizationId: "org_calloway", email: "hwalsh@calloway.example", phone: "(312) 555-0142" },
  { id: "ct_bcarter", name: "Ben Carter", title: "Analyst", organizationId: "org_calloway", email: "bcarter@calloway.example", phone: "(312) 555-0177" },
  { id: "ct_tnguyen", name: "Thomas Nguyen", title: "Senior Vice President", organizationId: "org_stonebridge", email: "tnguyen@stonebridge.example", phone: "(214) 555-0119" },
  { id: "ct_mdelgado", name: "Maria Delgado", title: "Chief Executive Officer", organizationId: "org_cedarbrook", email: "mdelgado@cedarbrook.example", phone: "(616) 555-0101" },
  { id: "ct_rfoster", name: "Ryan Foster", title: "Regional Director of Operations", organizationId: "org_cedarbrook", email: "rfoster@cedarbrook.example", phone: "(616) 555-0164" },
  { id: "ct_lbishop", name: "Laura Bishop", title: "Administrator, Maple Grove", organizationId: "org_cedarbrook", email: "lbishop@cedarbrook.example", phone: "(616) 555-0188" },
  { id: "ct_gpatel", name: "Gautam Patel", title: "Chief Financial Officer", organizationId: "org_northpoint", email: "gpatel@northpoint.example", phone: "(615) 555-0133" },
  { id: "ct_ahughes", name: "Amanda Hughes", title: "VP, Asset Management", organizationId: "org_meridian", email: "ahughes@meridianhcp.example", phone: "(312) 555-0150", rosterRole: "Asset management", notes: "Point person for property-level questions and site access." },
  { id: "ct_sreyes", name: "Sofia Reyes", title: "Executive Director", organizationId: "org_ashford", email: "sreyes@ashford.example", phone: "(210) 555-0126" },
  { id: "ct_dmorgan", name: "David Morgan", title: "Partner", organizationId: "org_whitaker", email: "dmorgan@whitakerlowe.example", phone: "(615) 555-0110" },
  { id: "ct_kchen", name: "Karen Chen", title: "Associate", organizationId: "org_whitaker", email: "kchen@whitakerlowe.example", phone: "(615) 555-0111" },
  { id: "ct_jobrien", name: "James O'Brien", title: "Licensure Counsel", organizationId: "org_brennan", email: "jobrien@brennanross.example", phone: "(216) 555-0145" },
  { id: "ct_pmills", name: "Patrick Mills", title: "Director, Originations", organizationId: "org_sterling", email: "pmills@sterlinghud.example", phone: "(202) 555-0193" },
  { id: "ct_nsato", name: "Naomi Sato", title: "Vice President", organizationId: "org_atlas", email: "nsato@atlasbridge.example", phone: "(212) 555-0172" },
  { id: "ct_wgrant", name: "William Grant", title: "Project Manager", organizationId: "org_clearline", email: "wgrant@clearline.example", phone: "(614) 555-0154" },
  { id: "ct_ebrooks", name: "Erin Brooks", title: "Clinical Consultant", organizationId: "org_veritas", email: "ebrooks@veritas.example", phone: "(404) 555-0138" },
  { id: "ct_cramirez", name: "Carlos Ramirez", title: "Chief Operating Officer", organizationId: "org_riverside_rp", email: "cramirez@riversiderp.example", phone: "(941) 555-0127" },
  { id: "ct_jlin", name: "Jennifer Lin", title: "Administrator", organizationId: "org_pinnacle", email: "jlin@pinnacle.example", phone: "(717) 555-0185" },
  { id: "ct_mwebb", name: "Michael Webb", title: "Principal", organizationId: "org_bluegrass_props", email: "mwebb@bluegrasscp.example", phone: "(502) 555-0161", rosterRole: "Decision maker", notes: "Second-generation owner; open to seller financing." },
  { id: "ct_otaylor", name: "Olivia Taylor", title: "Director of Real Estate", organizationId: "org_harborview", email: "otaylor@harborview.example", phone: "(813) 555-0108", rosterRole: "Real estate", notes: "Introduced Riverside Gardens off-market." },
];

// ---------------------------------------------------------------------------
// CRM enrichment (all fictional)
// ---------------------------------------------------------------------------

const extraOrganizations: Organization[] = [
  { id: "org_meridian_parent", name: "Meridian Capital Group", type: "investor", hqCity: "Chicago", hqState: "IL", description: "Private real estate investment firm; sponsor of Meridian Healthcare Properties." },
  { id: "org_summit_reit", name: "Summit Healthcare REIT", type: "owner", hqCity: "Phoenix", hqState: "AZ", description: "Non-traded healthcare REIT with seniors housing and post-acute assets in the Southwest." },
];

type OrgProfile = Partial<Organization>;

const ORG_PROFILES: Record<string, OrgProfile> = {
  org_meridian: { companyType: "private", parentOrgId: "org_meridian_parent", officeAddress: { street: "225 W Wacker Drive", street2: "Suite 1800", city: "Chicago", state: "IL", zip: "60606" }, acuityFocus: ["Skilled Nursing", "Assisted Living"], regionalFocus: ["Midwest"], stateFocus: ["MI", "OH", "IN", "IL"], primaryContactId: "ct_rcole", tags: ["Seller", "Repeat counterparty"] },
  org_meridian_parent: { companyType: "private", officeAddress: { street: "225 W Wacker Drive", street2: "Suite 1900", city: "Chicago", state: "IL", zip: "60606" }, regionalFocus: ["National"] },
  org_keystone: { companyType: "reit", officeAddress: { street: "1735 Market Street", street2: "Suite 2600", city: "Philadelphia", state: "PA", zip: "19103" }, acuityFocus: ["Skilled Nursing", "Assisted Living", "Memory Care"], regionalFocus: ["Northeast", "Mid-Atlantic"], stateFocus: ["PA", "NJ", "NY", "MD"], primaryContactId: "ct_ewright", tags: ["Former owner"] },
  org_harborview: { companyType: "private", officeAddress: { street: "100 N Tampa Street", street2: "Suite 2400", city: "Tampa", state: "FL", zip: "33602" }, acuityFocus: ["Skilled Nursing"], regionalFocus: ["Southeast"], stateFocus: ["FL", "GA"], primaryContactId: "ct_otaylor", tags: ["Family office", "Off-market"] },
  org_bluegrass_props: { companyType: "private", officeAddress: { street: "400 W Market Street", street2: "Suite 1200", city: "Louisville", state: "KY", zip: "40202" }, acuityFocus: ["Skilled Nursing"], regionalFocus: ["Southeast", "Midwest"], stateFocus: ["KY", "TN"], primaryContactId: "ct_mwebb", tags: ["Owner-operator"] },
  org_tricounty: { companyType: "private", officeAddress: { street: "41 S High Street", street2: "Suite 2100", city: "Columbus", state: "OH", zip: "43215" }, acuityFocus: ["Skilled Nursing"], regionalFocus: ["Midwest", "Southeast"], stateFocus: ["OH", "PA", "NC"], primaryContactId: "ct_dross", tags: ["Re-engaged"] },
  org_sunbelt: { companyType: "private", officeAddress: { street: "2200 Ross Avenue", street2: "Suite 4500", city: "Dallas", state: "TX", zip: "75201" }, acuityFocus: ["Assisted Living", "Memory Care"], regionalFocus: ["Southwest"], stateFocus: ["TX", "OK"], primaryContactId: "ct_avega", tags: ["Fund exit"] },
  org_od_holdings: { companyType: "private", officeAddress: { street: "1600 West End Avenue", street2: "Suite 900", city: "Nashville", state: "TN", zip: "37203" }, acuityFocus: ["Skilled Nursing", "Assisted Living"], regionalFocus: ["National"], primaryContactId: "ct_gwhitman", tags: ["Internal"] },
  org_willow: { companyType: "private", officeAddress: { street: "1880 E Battlefield Street", city: "Springfield", state: "MO", zip: "65804" }, acuityFocus: ["Skilled Nursing"], regionalFocus: ["Midwest"], stateFocus: ["MO", "AR"], primaryContactId: "ct_hdunn" },
  org_heartland: { companyType: "private", officeAddress: { street: "4120 N Knoxville Avenue", city: "Peoria", state: "IL", zip: "61614" }, acuityFocus: ["Skilled Nursing"], regionalFocus: ["Midwest"], stateFocus: ["IL"], primaryContactId: "ct_bnolan" },
  org_sonoran: { companyType: "private", officeAddress: { street: "4800 N Scottsdale Road", city: "Scottsdale", state: "AZ", zip: "85251" }, acuityFocus: ["Skilled Nursing"], regionalFocus: ["Southwest"], stateFocus: ["AZ"], primaryContactId: "ct_rortiz" },
  org_lakeshore: { companyType: "bank", officeAddress: { street: "411 E Wisconsin Avenue", street2: "Floor 20", city: "Milwaukee", state: "WI", zip: "53202" }, acuityFocus: ["Skilled Nursing", "Assisted Living"], regionalFocus: ["Midwest"], stateFocus: ["WI", "IL", "MI"], primaryContactId: "ct_srao", tags: ["REO owner", "Motivated seller"] },
  org_summit_reit: { companyType: "reit", officeAddress: { street: "2390 E Camelback Road", street2: "Suite 300", city: "Phoenix", state: "AZ", zip: "85016" }, acuityFocus: ["Skilled Nursing", "Assisted Living", "Memory Care"], regionalFocus: ["Southwest", "Mountain West", "West Coast"], stateFocus: ["AZ", "NV", "CA", "CO"], primaryContactId: "ct_cford", tags: ["Capital recycling"] },
  org_sterling: { companyType: "finco" },
  org_atlas: { companyType: "finco" },
  org_cedarbrook: { companyType: "private", parentOrgId: "org_cedarbrook_hold", primaryContactId: "ct_mdelgado" },
  org_northpoint: { companyType: "private", parentOrgId: "org_northpoint_hold" },
  org_calloway: { primaryContactId: "ct_hwalsh" },
};

const extraContacts: SeedContact[] = [
  { id: "ct_rcole", name: "Robert Cole", title: "Chief Executive Officer", organizationId: "org_meridian", email: "rcole@meridianhcp.example", phone: "(312) 555-0102", rosterRole: "Decision maker", notes: "Final say on dispositions. Prefers calls before 9am CT." },
  { id: "ct_lpark", name: "Linda Park", title: "Chief Financial Officer", organizationId: "org_meridian", email: "lpark@meridianhcp.example", phone: "(312) 555-0118", rosterRole: "Finance", notes: "Owns data room access and financial reporting packages." },
  { id: "ct_jsimmons", name: "Jason Simmons", title: "Director of Acquisitions", organizationId: "org_meridian", email: "jsimmons@meridianhcp.example", phone: "(312) 555-0131", rosterRole: "Transactions", notes: "Day-to-day contact on Great Lakes diligence." },
  { id: "ct_ewright", name: "Evelyn Wright", title: "Chief Investment Officer", organizationId: "org_keystone", email: "ewright@keystonesrt.example", phone: "(215) 555-0144", rosterRole: "Decision maker" },
  { id: "ct_tbaker", name: "Tom Baker", title: "Portfolio Manager", organizationId: "org_keystone", email: "tbaker@keystonesrt.example", phone: "(215) 555-0167", rosterRole: "Asset management" },
  { id: "ct_plang", name: "Peter Lang", title: "Principal", organizationId: "org_harborview", email: "plang@harborview.example", phone: "(813) 555-0122", rosterRole: "Decision maker", notes: "Family principal; prefers in-person meetings." },
  { id: "ct_sgreen", name: "Sarah Green", title: "Controller", organizationId: "org_bluegrass_props", email: "sgreen@bluegrasscp.example", phone: "(502) 555-0179", rosterRole: "Finance" },
  { id: "ct_dross", name: "Douglas Ross", title: "Managing Partner", organizationId: "org_tricounty", email: "dross@tricountyhh.example", phone: "(614) 555-0113", rosterRole: "Decision maker", notes: "Re-opened Seaside Pines conversation at reduced price." },
  { id: "ct_kmoore", name: "Kelly Moore", title: "VP, Finance", organizationId: "org_tricounty", email: "kmoore@tricountyhh.example", phone: "(614) 555-0148", rosterRole: "Finance" },
  { id: "ct_avega", name: "Andre Vega", title: "Managing Director", organizationId: "org_sunbelt", email: "avega@sunbeltshf.example", phone: "(214) 555-0163", rosterRole: "Decision maker" },
  { id: "ct_gwhitman", name: "Grace Whitman", title: "Asset Manager", organizationId: "org_od_holdings", email: "gwhitman@odholdings.example", phone: "(615) 555-0186", rosterRole: "Asset management" },
  { id: "ct_hdunn", name: "Harold Dunn", title: "Owner & CEO", organizationId: "org_willow", email: "hdunn@willowcreek.example", phone: "(417) 555-0109", rosterRole: "Decision maker" },
  { id: "ct_bnolan", name: "Brian Nolan", title: "President", organizationId: "org_heartland", email: "bnolan@heartlandprairie.example", phone: "(309) 555-0157", rosterRole: "Decision maker" },
  { id: "ct_srao", name: "Sanjay Rao", title: "SVP, Special Assets", organizationId: "org_lakeshore", email: "srao@lakeshorebank.example", phone: "(414) 555-0136", rosterRole: "Decision maker", notes: "Running the REO disposition for Prairie View. Wants a clean, quick close." },
  { id: "ct_mfisher", name: "Megan Fisher", title: "Relationship Manager, Healthcare", organizationId: "org_lakeshore", email: "mfisher@lakeshorebank.example", phone: "(414) 555-0171", rosterRole: "Lending" },
  { id: "ct_cford", name: "Catherine Ford", title: "SVP, Investments", organizationId: "org_summit_reit", email: "cford@summithreit.example", phone: "(602) 555-0128", rosterRole: "Decision maker" },
  { id: "ct_dlee", name: "Daniel Lee", title: "Asset Manager", organizationId: "org_summit_reit", email: "dlee@summithreit.example", phone: "(602) 555-0152", rosterRole: "Asset management" },
  { id: "ct_rortiz", name: "Rosa Ortiz", title: "Chief Operating Officer", organizationId: "org_sonoran", email: "rortiz@sonoranhp.example", phone: "(480) 555-0147", rosterRole: "Operations" },
];

const ZIP_PREFIX: Record<string, string> = {
  IL: "606", PA: "191", FL: "336", KY: "402", OH: "432", TX: "752", TN: "372", MI: "495", MO: "658",
  NC: "284", AZ: "850", IN: "468", GA: "303", WI: "532", DC: "200", NY: "100",
};

const STREETS = ["Maple Avenue", "Oak Street", "Lakeview Drive", "Ridgeway Lane", "Chestnut Court", "Willow Bend", "Hillcrest Road", "Briar Lane"];

function profiledOrg(id: string): Organization | undefined {
  const o = [...baseOrganizations, ...extraOrganizations].find((x) => x.id === id);
  return o ? { ...o, ...ORG_PROFILES[o.id] } : undefined;
}

/** Deterministic, fictional personal details for every contact. */
function withPersonalDetails(c: SeedContact, i: number): Contact {
  const r = seeded(i * 7717 + 31);
  const org = [...baseOrganizations, ...extraOrganizations].find((o) => o.id === c.organizationId);
  const [first, ...rest] = c.name.toLowerCase().replace(/[^a-z ]/g, "").split(" ");
  const last = rest.join("");
  const area = c.phone.slice(0, 5);
  const year = 1958 + Math.floor(r() * 30);
  const month = String(1 + Math.floor(r() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(r() * 28)).padStart(2, "0");
  return {
    mobilePhone: `${area} 555-${String(1000 + Math.floor(r() * 8999)).slice(0, 4)}`,
    linkedIn: `linkedin.com/in/${first}-${last}-example`,
    dob: `${year}-${month}-${day}`,
    personalEmail: `${first}.${last}@personal.example`,
    mailingAddress: {
      street: `${100 + Math.floor(r() * 9800)} ${STREETS[Math.floor(r() * STREETS.length)]}`,
      city: org?.hqCity ?? "",
      state: org?.hqState ?? "",
      zip: `${ZIP_PREFIX[org?.hqState ?? ""] ?? "100"}${String(10 + Math.floor(r() * 89))}`,
    },
    tags: c.rosterRole === "Decision maker" ? ["Decision maker"] : [],
    ...c,
    contactType: c.contactType ?? defaultContactType(profiledOrg(c.organizationId)),
    sectors: c.sectors ?? defaultSectors(profiledOrg(c.organizationId)),
  };
}

export const organizations: Organization[] = [...baseOrganizations, ...extraOrganizations].map((o) => ({
  acuityFocus: [],
  regionalFocus: [],
  stateFocus: [],
  tags: [],
  ...o,
  ...ORG_PROFILES[o.id],
}));

export const contacts: Contact[] = [...baseContacts, ...extraContacts].map(withPersonalDetails);
