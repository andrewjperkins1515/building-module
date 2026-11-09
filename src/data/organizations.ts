import type { Contact, Organization } from "@/types";

/** All organizations and people below are fictional. */
export const organizations: Organization[] = [
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

export const contacts: Contact[] = [
  { id: "ct_hwalsh", name: "Helen Walsh", title: "Managing Director", organizationId: "org_calloway", email: "hwalsh@calloway.example", phone: "(312) 555-0142" },
  { id: "ct_bcarter", name: "Ben Carter", title: "Analyst", organizationId: "org_calloway", email: "bcarter@calloway.example", phone: "(312) 555-0177" },
  { id: "ct_tnguyen", name: "Thomas Nguyen", title: "Senior Vice President", organizationId: "org_stonebridge", email: "tnguyen@stonebridge.example", phone: "(214) 555-0119" },
  { id: "ct_mdelgado", name: "Maria Delgado", title: "Chief Executive Officer", organizationId: "org_cedarbrook", email: "mdelgado@cedarbrook.example", phone: "(616) 555-0101" },
  { id: "ct_rfoster", name: "Ryan Foster", title: "Regional Director of Operations", organizationId: "org_cedarbrook", email: "rfoster@cedarbrook.example", phone: "(616) 555-0164" },
  { id: "ct_lbishop", name: "Laura Bishop", title: "Administrator, Maple Grove", organizationId: "org_cedarbrook", email: "lbishop@cedarbrook.example", phone: "(616) 555-0188" },
  { id: "ct_gpatel", name: "Gautam Patel", title: "Chief Financial Officer", organizationId: "org_northpoint", email: "gpatel@northpoint.example", phone: "(615) 555-0133" },
  { id: "ct_ahughes", name: "Amanda Hughes", title: "VP, Asset Management", organizationId: "org_meridian", email: "ahughes@meridianhcp.example", phone: "(312) 555-0150" },
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
  { id: "ct_mwebb", name: "Michael Webb", title: "Principal", organizationId: "org_bluegrass_props", email: "mwebb@bluegrasscp.example", phone: "(502) 555-0161" },
  { id: "ct_otaylor", name: "Olivia Taylor", title: "Director of Real Estate", organizationId: "org_harborview", email: "otaylor@harborview.example", phone: "(813) 555-0108" },
];
