/**
 * Owner Docket — core domain model (prototype).
 *
 * Design principles:
 *  - Every entity has a stable, internal ID. External identifiers (CMS CCN, state
 *    license, NPI) are modeled as time-bounded `BuildingIdentifier` records, because a
 *    CMS provider number follows the *operator's certification*, not the physical
 *    property, and can change after a change of ownership (CHOW).
 *  - A Building is a permanent record of facility intelligence. Deal-specific values
 *    (price allocation, role in a transaction) live on `DealBuildingRelationship`.
 *  - Important building facts carry source metadata and a verification status.
 */

export type ID = string;
export type ISODate = string; // YYYY-MM-DD or full ISO timestamp

// ---------------------------------------------------------------------------
// Provenance & verification
// ---------------------------------------------------------------------------

export type VerificationStatus = "verified" | "partially_verified" | "unverified" | "needs_review";

export type DataSource =
  | "cms_mock"
  | "state_license"
  | "operator_report"
  | "broker_om"
  | "site_visit"
  | "third_party_report"
  | "public_record"
  | "data_room"
  | "manual";

export interface SourceMeta {
  source: DataSource;
  asOf: ISODate;
  verification: VerificationStatus;
  verifiedBy?: string;
  note?: string;
}

/** A building attribute value with provenance. */
export interface Tracked<T> {
  value: T;
  meta: SourceMeta;
}

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

export type FacilityType =
  | "skilled_nursing"
  | "assisted_living"
  | "memory_care"
  | "ccrc"
  | "behavioral_health";

export interface Address {
  street: string;
  city: string;
  state: string; // USPS code
  zip: string;
  county: string;
  /** Normalized 0–1 coordinates used only for the placeholder map rendering. */
  mapX: number;
  mapY: number;
}

export type IdentifierType = "cms_ccn" | "state_license" | "npi" | "medicaid_id";

export interface BuildingIdentifier {
  id: ID;
  type: IdentifierType;
  value: string;
  issuer?: string;
  effectiveFrom: ISODate;
  effectiveTo?: ISODate;
  isCurrent: boolean;
  note?: string;
}

export interface BuildingPhoto {
  id: ID;
  caption: string;
  /** Uploaded image (downscaled data URL). Absent = generated placeholder. */
  dataUrl?: string;
  /** Placeholder subject when no image is uploaded. */
  subject?: "exterior" | "entrance" | "dining" | "therapy" | "resident_room" | "courtyard" | "lobby";
  uploadedAt: ISODate;
  uploadedBy: string;
}

export interface Building {
  id: ID;
  name: string;
  alternateNames: string[];
  facilityType: FacilityType;
  address: Address;
  identifiers: BuildingIdentifier[];

  certifiedBeds: Tracked<number>;
  licensedBeds: Tracked<number>;
  averageDailyCensus: Tracked<number>;
  yearBuilt: Tracked<number | null>;
  squareFeet: Tracked<number | null>;
  stories: number | null;
  acreage: number | null;
  privateRooms: number | null;
  semiPrivateRooms: number | null;

  verificationStatus: VerificationStatus;
  lastVerifiedAt: ISODate | null;
  /** Seed for the generated facility illustration. */
  photoSeed: number;
  /** Property photo gallery. The first photo is the cover image. */
  photos: BuildingPhoto[];
  tags: string[];
  createdAt: ISODate;
  updatedAt: ISODate;
  createdBy: string;
}

// ---------------------------------------------------------------------------
// Organizations & contacts
// ---------------------------------------------------------------------------

export type OrganizationType =
  | "owner"
  | "operator"
  | "parent"
  | "management"
  | "broker"
  | "lender"
  | "law_firm"
  | "consultant"
  | "investor";

/** Capital / ownership classification of a company (CRM "Company Type"). */
export type CompanyType = "bank" | "finco" | "mezz_lender" | "reit" | "private" | "ar_lender";

export interface PostalAddress {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface Organization {
  id: ID;
  name: string;
  /** Primary role in the ecosystem (owner, operator, broker…). */
  type: OrganizationType;
  /** Capital classification — e.g. whether a property owner is a Bank, REIT or Private. */
  companyType?: CompanyType;
  parentOrgId?: ID;
  hqCity: string;
  hqState: string;
  officeAddress?: PostalAddress;
  website?: string;
  description?: string;
  /** Downscaled image data URL (prototype storage). */
  logoDataUrl?: string;
  acuityFocus?: string[];
  regionalFocus?: string[];
  stateFocus?: string[];
  primaryContactId?: ID;
  tags?: string[];
}

export interface Contact {
  id: ID;
  name: string;
  title: string;
  organizationId: ID;
  /** Work email. */
  email: string;
  /** Office / work phone. */
  phone: string;
  mobilePhone?: string;
  linkedIn?: string;
  dob?: ISODate;
  personalEmail?: string;
  mailingAddress?: PostalAddress;
  /** Downscaled image data URL (prototype storage). */
  photoDataUrl?: string;
  /** Role on the company's corporate roster (e.g. "Decision maker", "Asset management"). */
  rosterRole?: string;
  notes?: string;
  tags?: string[];
}

export type OwnershipRole = "property_owner" | "operator" | "parent_organization" | "management_company";

/** Time-bounded ownership/operations record for a building. */
export interface BuildingOwnership {
  id: ID;
  buildingId: ID;
  organizationId: ID;
  role: OwnershipRole;
  startDate: ISODate;
  endDate?: ISODate;
  isCurrent: boolean;
  meta: SourceMeta;
  note?: string;
}

export type BuildingRelationshipRole =
  | "broker"
  | "lender"
  | "attorney"
  | "consultant"
  | "key_contact"
  | "administrator"
  | "other";

/** Non-ownership connections between a building and organizations/contacts. */
export interface BuildingRelationship {
  id: ID;
  buildingId: ID;
  role: BuildingRelationshipRole;
  organizationId?: ID;
  contactId?: ID;
  description?: string;
  since?: ISODate;
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export type DealStage = "high_level_review" | "loi_signed" | "psa_signed" | "closed";
export type DealStatus = "active" | "closed" | "dead" | "abandoned";
export type DealType = "single_asset" | "portfolio";

export interface Deal {
  id: ID;
  name: string;
  code: string;
  type: DealType;
  stage: DealStage;
  status: DealStatus;
  skippedLoi: boolean;
  sellerOrgId?: ID;
  brokerOrgId?: ID;
  lenderOrgId?: ID;
  buyerEntity: string;
  /** Buyer as a CRM company, when known. */
  buyerOrgId?: ID;
  askingPrice?: number;
  purchasePrice?: number;
  projectedCloseDate?: ISODate;
  actualCloseDate?: ISODate;
  deadReason?: string;
  leadName: string;
  summary: string;
  createdAt: ISODate;
}

export type DealBuildingRole = "primary_asset" | "portfolio_asset" | "add_on" | "excluded";

/** Deal-specific values for a building. Never stored on the Building itself. */
export interface DealBuildingRelationship {
  id: ID;
  dealId: ID;
  buildingId: ID;
  role: DealBuildingRole;
  priceAllocation?: number;
  allocationBasis?: string;
  notes?: string;
  addedAt: ISODate;
}

// ---------------------------------------------------------------------------
// CMS & regulatory (mock)
// ---------------------------------------------------------------------------

export type StarRating = 1 | 2 | 3 | 4 | 5;

export interface CMSSurvey {
  id: ID;
  date: ISODate;
  type: "standard" | "complaint" | "fire_safety" | "infection_control";
  deficiencyCount: number;
  highestScopeSeverity: string; // A–L
}

export interface CMSDeficiency {
  id: ID;
  surveyDate: ISODate;
  tag: string;
  category: string;
  description: string;
  scopeSeverity: string; // A–L
  status: "corrected" | "open" | "past_noncompliance";
}

export interface CMSPenalty {
  id: ID;
  date: ISODate;
  type: "civil_money_penalty" | "payment_denial";
  amount?: number;
  description: string;
}

export interface CMSRatingSnapshot {
  period: string; // e.g. "Q3 2025"
  overall: StarRating;
  health: StarRating;
  staffing: StarRating;
  qualityMeasures: StarRating;
}

export interface CMSData {
  buildingId: ID;
  providerNumber: string;
  ratings: {
    overall: StarRating;
    health: StarRating;
    staffing: StarRating;
    qualityMeasures: StarRating;
  };
  staffing: {
    totalNurseHprd: number;
    rnHprd: number;
    lpnHprd: number;
    cnaHprd: number;
    stateAvgTotalHprd: number;
    nationalAvgTotalHprd: number;
    nurseTurnoverPct: number;
  };
  surveys: CMSSurvey[];
  deficiencies: CMSDeficiency[];
  penalties: CMSPenalty[];
  ratingHistory: CMSRatingSnapshot[];
  specialFocusFacility: boolean;
  abuseIcon: boolean;
  lastRefreshedAt: ISODate;
  sourceLabel: string;
}

// ---------------------------------------------------------------------------
// Property & condition
// ---------------------------------------------------------------------------

export type BuildingSystem =
  | "roof"
  | "hvac"
  | "plumbing"
  | "electrical"
  | "life_safety"
  | "elevators"
  | "interiors"
  | "site";

export type ConditionRating = "good" | "fair" | "poor" | "critical";

export interface SystemCondition {
  system: BuildingSystem;
  rating: ConditionRating;
  installYear?: number;
  remainingUsefulLifeYrs?: number;
  lastAssessed: ISODate;
  notes: string;
  source: DataSource;
}

export interface DeferredMaintenanceItem {
  id: ID;
  system: BuildingSystem;
  description: string;
  estimatedCost: number;
  priority: "immediate" | "short_term" | "long_term";
}

export interface RenovationRecord {
  id: ID;
  year: number;
  description: string;
  cost?: number;
}

export interface PropertyCondition {
  buildingId: ID;
  overall: ConditionRating;
  assessedBy: string;
  assessmentDate: ISODate;
  construction: string;
  sprinklered: "full" | "partial" | "none";
  generator: string;
  parkingSpaces: number;
  systems: SystemCondition[];
  deferredMaintenance: DeferredMaintenanceItem[];
  renovations: RenovationRecord[];
}

export interface CapitalProject {
  id: ID;
  buildingId: ID;
  name: string;
  category: BuildingSystem | "resident_rooms" | "common_areas";
  status: "planned" | "in_progress" | "completed";
  budget: number;
  spent: number;
  startDate?: ISODate;
  targetDate?: ISODate;
}

// ---------------------------------------------------------------------------
// Financials (illustrative)
// ---------------------------------------------------------------------------

export interface FinancialPeriod {
  label: string; // "FY2023", "TTM Sep-2025"
  periodEnd: ISODate;
  revenue: number;
  operatingExpenses: number;
  ebitdar: number;
  rent: number;
  ebitda: number;
  noi: number;
  occupancyPct: number;
  source: DataSource;
}

export interface PayerMix {
  medicare: number;
  medicaid: number;
  managedCare: number;
  privatePay: number;
  other: number;
}

export interface DebtInfo {
  lenderOrgId?: ID;
  loanType: string;
  originalAmount: number;
  balance: number;
  rate: string;
  originationDate: ISODate;
  maturityDate: ISODate;
}

export interface BuildingFinancials {
  buildingId: ID;
  periods: FinancialPeriod[];
  payerMix: PayerMix;
  payerMixAsOf: ISODate;
  debt?: DebtInfo;
  capex: { year: number; amount: number }[];
}

// ---------------------------------------------------------------------------
// Site visits
// ---------------------------------------------------------------------------

export interface SiteVisitObservation {
  id: ID;
  text: string;
  severity: "low" | "medium" | "high";
  system?: BuildingSystem;
  status: "open" | "resolved";
}

export interface FollowUpTask {
  id: ID;
  title: string;
  assignee: string;
  dueDate?: ISODate;
  done: boolean;
}

export interface SitePhoto {
  id: ID;
  caption: string;
  area: string;
  fileName?: string;
}

export interface SiteVisit {
  id: ID;
  buildingId: ID;
  dealId?: ID;
  date: ISODate;
  type: "initial_tour" | "diligence_inspection" | "pca_walkthrough" | "asset_review";
  participants: string[];
  summary: string;
  conditionRatings: Partial<Record<BuildingSystem, ConditionRating>>;
  observations: SiteVisitObservation[];
  followUps: FollowUpTask[];
  photos: SitePhoto[];
  createdBy: string;
  createdAt: ISODate;
}

// ---------------------------------------------------------------------------
// Documents & due diligence
// ---------------------------------------------------------------------------

export type DocumentCategory =
  | "licenses"
  | "property"
  | "financial"
  | "legal"
  | "third_party"
  | "capex"
  | "site_visit"
  | "other";

export type DocumentStatus =
  | "not_requested"
  | "requested"
  | "received"
  | "in_review"
  | "approved"
  | "rejected"
  | "needs_revision";

/** A file version attached to a request. File bytes are not persisted in the prototype. */
export interface DocumentFile {
  id: ID;
  fileName: string;
  fileSize: number;
  mimeType: string;
  version: number;
  uploadedAt: ISODate;
  uploadedBy: string;
  source: "upload" | "sharepoint" | "email";
  pageCount?: number;
}

export interface ReviewComment {
  id: ID;
  author: string;
  text: string;
  createdAt: ISODate;
  action?: "approved" | "rejected" | "needs_revision" | "status_change" | "comment";
}

export interface DocumentRequest {
  id: ID;
  buildingId: ID;
  dealId?: ID;
  name: string;
  category: DocumentCategory;
  required: boolean;
  isBaseline: boolean;
  requestedFrom?: string;
  reviewer?: string;
  dueDate?: ISODate;
  status: DocumentStatus;
  files: DocumentFile[];
  notes?: string;
  comments: ReviewComment[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export type ActivityType =
  | "building_created"
  | "building_updated"
  | "cms_refreshed"
  | "document_uploaded"
  | "document_reviewed"
  | "document_requested"
  | "deal_associated"
  | "site_visit"
  | "verification_changed"
  | "note"
  | "data_room_sync";

export interface Activity {
  id: ID;
  buildingId: ID;
  dealId?: ID;
  type: ActivityType;
  title: string;
  description?: string;
  actor: string;
  timestamp: ISODate;
}

// ---------------------------------------------------------------------------
// Data room (simulated SharePoint)
// ---------------------------------------------------------------------------

export interface DataRoomConnection {
  buildingId: ID;
  provider: "sharepoint";
  siteName: string;
  folderPath: string;
  status: "connected" | "syncing" | "error" | "not_connected";
  lastSyncAt?: ISODate;
  recentFiles: { id: ID; name: string; importedAt: ISODate; size: number; matchedRequestId?: ID }[];
}

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

export interface AppState {
  version: number;
  buildings: Building[];
  organizations: Organization[];
  contacts: Contact[];
  ownerships: BuildingOwnership[];
  relationships: BuildingRelationship[];
  deals: Deal[];
  dealBuildings: DealBuildingRelationship[];
  cms: CMSData[];
  conditions: PropertyCondition[];
  capitalProjects: CapitalProject[];
  financials: BuildingFinancials[];
  siteVisits: SiteVisit[];
  documentRequests: DocumentRequest[];
  activities: Activity[];
  dataRooms: DataRoomConnection[];
}
