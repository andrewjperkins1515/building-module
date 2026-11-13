import type {
  ActivityType,
  BuildingRelationshipRole,
  BuildingSystem,
  CompanyType,
  ConditionRating,
  DataSource,
  DealBuildingRole,
  DealStage,
  DealStatus,
  DocumentCategory,
  DocumentStatus,
  FacilityType,
  IdentifierType,
  OrganizationType,
  OwnershipRole,
  SiteVisit,
  VerificationStatus,
} from "@/types";

export const FACILITY_TYPES: FacilityType[] = [
  "skilled_nursing",
  "assisted_living",
  "memory_care",
  "ccrc",
  "behavioral_health",
];

export const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  skilled_nursing: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "CCRC",
  behavioral_health: "Behavioral Health",
};

export const VERIFICATION_STATUSES: VerificationStatus[] = [
  "verified",
  "partially_verified",
  "needs_review",
  "unverified",
];

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified",
  partially_verified: "Partially verified",
  unverified: "Unverified",
  needs_review: "Needs review",
};

export const SOURCE_LABEL: Record<DataSource, string> = {
  cms_mock: "CMS (mock)",
  state_license: "State license",
  operator_report: "Operator report",
  broker_om: "Broker OM",
  site_visit: "Site visit",
  third_party_report: "Third-party report",
  public_record: "Public record",
  data_room: "Data room",
  manual: "Manual entry",
};

export const IDENTIFIER_LABEL: Record<IdentifierType, string> = {
  cms_ccn: "CMS CCN",
  state_license: "State license",
  npi: "NPI",
  medicaid_id: "Medicaid ID",
};

export const ORG_TYPE_LABEL: Record<OrganizationType, string> = {
  owner: "Property owner",
  operator: "Operator",
  parent: "Parent organization",
  management: "Management company",
  broker: "Broker",
  lender: "Lender",
  law_firm: "Law firm",
  consultant: "Consultant",
  investor: "Investor",
};

export const OWNERSHIP_ROLE_LABEL: Record<OwnershipRole, string> = {
  property_owner: "Property owner",
  operator: "Operator",
  parent_organization: "Parent organization",
  management_company: "Management company",
};

export const RELATIONSHIP_ROLE_LABEL: Record<BuildingRelationshipRole, string> = {
  broker: "Broker",
  lender: "Lender",
  attorney: "Attorney",
  consultant: "Consultant",
  key_contact: "Key contact",
  administrator: "Administrator",
  other: "Other",
};

export const DEAL_STAGES: DealStage[] = ["high_level_review", "loi_signed", "psa_signed", "closed"];

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  high_level_review: "High-Level Review",
  loi_signed: "LOI Signed",
  psa_signed: "PSA Signed",
  closed: "Closed / Asset Mgmt",
};

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  active: "Active",
  closed: "Closed",
  dead: "Dead",
  abandoned: "Abandoned",
};

export const DEAL_ROLE_LABEL: Record<DealBuildingRole, string> = {
  primary_asset: "Primary asset",
  portfolio_asset: "Portfolio asset",
  add_on: "Add-on",
  excluded: "Excluded",
};

export const SYSTEM_LABEL: Record<BuildingSystem, string> = {
  roof: "Roof",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  life_safety: "Life safety",
  elevators: "Elevators",
  interiors: "Interiors",
  site: "Site & parking",
};

export const ALL_SYSTEMS: BuildingSystem[] = [
  "roof",
  "hvac",
  "plumbing",
  "electrical",
  "life_safety",
  "elevators",
  "interiors",
  "site",
];
export const CORE_SYSTEMS: BuildingSystem[] = ["roof", "hvac", "plumbing", "electrical", "life_safety"];

export const CONDITION_RATINGS: ConditionRating[] = ["good", "fair", "poor", "critical"];
export const CONDITION_LABEL: Record<ConditionRating, string> = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  critical: "Critical",
};

export const DOC_CATEGORIES: DocumentCategory[] = [
  "licenses",
  "property",
  "financial",
  "legal",
  "third_party",
  "capex",
  "site_visit",
  "other",
];

export const DOC_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  licenses: "Licenses & Certifications",
  property: "Property & Floor Plans",
  financial: "Financial Documents",
  legal: "Legal Documents",
  third_party: "Third-Party Reports",
  capex: "Capital Expenditures",
  site_visit: "Site Visit Materials",
  other: "Other",
};

export const DOC_STATUSES: DocumentStatus[] = [
  "not_requested",
  "requested",
  "received",
  "in_review",
  "approved",
  "rejected",
  "needs_revision",
];

export const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  not_requested: "Not Requested",
  requested: "Requested",
  received: "Received",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs Revision",
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  building_created: "Building created",
  building_updated: "Building updated",
  cms_refreshed: "CMS refreshed",
  document_uploaded: "Document uploaded",
  document_reviewed: "Document reviewed",
  document_requested: "Document requested",
  deal_associated: "Deal association",
  site_visit: "Site visit",
  verification_changed: "Verification",
  note: "Note",
  data_room_sync: "Data room sync",
};

export const SITE_VISIT_TYPE_LABEL: Record<SiteVisit["type"], string> = {
  initial_tour: "Initial tour",
  diligence_inspection: "Diligence inspection",
  pca_walkthrough: "PCA walkthrough",
  asset_review: "Asset management review",
};

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const COMPANY_TYPES: CompanyType[] = ["bank", "finco", "mezz_lender", "reit", "private", "ar_lender"];

export const COMPANY_TYPE_LABEL: Record<CompanyType, string> = {
  bank: "Bank",
  finco: "Finco",
  mezz_lender: "Mezz Lender",
  reit: "REIT",
  private: "Private",
  ar_lender: "AR Lender",
};

export const ACUITY_OPTIONS = ["Skilled Nursing", "Assisted Living", "Memory Care", "Independent Living", "CCRC", "Behavioral Health", "LTACH"];

export const REGION_OPTIONS = ["Northeast", "Mid-Atlantic", "Southeast", "Midwest", "Southwest", "Mountain West", "West Coast", "National"];

export const CURRENT_USER = { name: "Jordan Ellis", title: "VP, Acquisitions", email: "jordan.ellis@example.com" };

export const TEAM_MEMBERS = [
  "Jordan Ellis",
  "Priya Raman",
  "Marcus Holloway",
  "Elena Vasquez",
  "Daniel Okafor",
  "Rachel Kim",
];
