-- =============================================================================
-- Owner Docket — Buildings, Contacts & Deals
-- Proposed — derived from the prototype's TypeScript model (src/types/index.ts);
-- adjust to Owner Docket's conventions (naming, ID strategy, tenancy, auditing).
--
-- Conventions used here:
--   * Primary keys are TEXT so prototype seed IDs (e.g. 'bld_maplegrove') import as-is.
--     Swap for UUID (gen_random_uuid()) if that's the house standard.
--   * Pick lists are TEXT + CHECK constraints (easy to extend) rather than ENUM types.
--   * Every table has created_at / updated_at; user-attributed actions reference users(id).
--   * Display-name strings in the prototype (createdBy, completedBy, uploadedBy, actor…)
--     become FKs to users. Contacts are external people; users are Owner Docket staff.
--     Internal staff may ALSO exist as contacts (deal team assignments reference contacts).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Users (stand-in — replace with Owner Docket's existing users/auth table)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  contact_id    TEXT,                       -- optional link to the person's CRM contact (FK added below)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Organizations (companies)
-- ---------------------------------------------------------------------------
CREATE TABLE organizations (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  type               TEXT NOT NULL CHECK (type IN ('owner','operator','parent','management','broker','lender','law_firm','consultant','investor')),
  company_type       TEXT CHECK (company_type IN ('bank','finco','mezz_lender','reit','private','ar_lender')),
  parent_org_id      TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  hq_city            TEXT NOT NULL DEFAULT '',
  hq_state           CHAR(2),
  office_street      TEXT,
  office_street2     TEXT,
  office_city        TEXT,
  office_state       CHAR(2),
  office_zip         TEXT,
  website            TEXT,
  description        TEXT,
  logo_object_key    TEXT,                  -- object storage key (prototype: logoDataUrl)
  acuity_focus       TEXT[] NOT NULL DEFAULT '{}',   -- values from ACUITY_OPTIONS
  regional_focus     TEXT[] NOT NULL DEFAULT '{}',   -- values from REGION_OPTIONS
  state_focus        CHAR(2)[] NOT NULL DEFAULT '{}',
  primary_contact_id TEXT,                  -- FK added after contacts
  tags               TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         TEXT REFERENCES users(id)
);
CREATE INDEX organizations_name_idx ON organizations (lower(name));
CREATE INDEX organizations_type_idx ON organizations (type);

-- ---------------------------------------------------------------------------
-- Contacts (people)
-- ---------------------------------------------------------------------------
CREATE TABLE contacts (
  id                TEXT PRIMARY KEY,
  organization_id   TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL CHECK (length(trim(name)) > 0),
  title             TEXT NOT NULL DEFAULT '',
  contact_type      TEXT NOT NULL CHECK (contact_type IN ('operator','vendor_dd','vendor_operating','investor','broker','lawyer')),
  sectors           TEXT[] NOT NULL DEFAULT '{}'
                    CHECK (sectors <@ ARRAY['snf','alf','ilf','mc']::TEXT[]),
  email             TEXT,                   -- work email
  phone             TEXT,                   -- office phone
  mobile_phone      TEXT,
  linkedin          TEXT,
  -- Personal data: restrict by role in the API layer.
  dob               DATE,
  personal_email    TEXT,
  mail_street       TEXT,
  mail_street2      TEXT,
  mail_city         TEXT,
  mail_state        CHAR(2),
  mail_zip          TEXT,
  photo_object_key  TEXT,                   -- prototype: photoDataUrl
  roster_role       TEXT,                   -- e.g. 'Decision maker', 'Finance' (ROSTER_ROLES)
  notes             TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        TEXT REFERENCES users(id)
);
CREATE INDEX contacts_org_idx ON contacts (organization_id);
CREATE INDEX contacts_email_idx ON contacts (lower(email));
CREATE INDEX contacts_name_idx ON contacts (lower(name));
CREATE INDEX contacts_type_idx ON contacts (contact_type);
CREATE INDEX contacts_sectors_idx ON contacts USING GIN (sectors);
CREATE INDEX contacts_tags_idx ON contacts USING GIN (tags);

ALTER TABLE organizations
  ADD CONSTRAINT organizations_primary_contact_fk
  FOREIGN KEY (primary_contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE users
  ADD CONSTRAINT users_contact_fk
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Buildings
-- ---------------------------------------------------------------------------
-- Provenance for tracked facts (Tracked<T>): value + *_source/*_as_of/*_verification/*_verified_by/*_note.
CREATE TABLE buildings (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  alternate_names        TEXT[] NOT NULL DEFAULT '{}',
  facility_type          TEXT NOT NULL CHECK (facility_type IN ('skilled_nursing','assisted_living','memory_care','ccrc','behavioral_health')),
  street                 TEXT NOT NULL DEFAULT '',
  city                   TEXT NOT NULL,
  state                  CHAR(2) NOT NULL,
  zip                    TEXT NOT NULL DEFAULT '',
  county                 TEXT NOT NULL DEFAULT '',
  latitude               NUMERIC(9,6),      -- replaces prototype mapX/mapY
  longitude              NUMERIC(9,6),

  certified_beds               INTEGER NOT NULL CHECK (certified_beds >= 0),
  certified_beds_source        TEXT NOT NULL,
  certified_beds_as_of         DATE NOT NULL,
  certified_beds_verification  TEXT NOT NULL,
  certified_beds_verified_by   TEXT,
  certified_beds_note          TEXT,

  licensed_beds                INTEGER NOT NULL CHECK (licensed_beds >= 0),
  licensed_beds_source         TEXT NOT NULL,
  licensed_beds_as_of          DATE NOT NULL,
  licensed_beds_verification   TEXT NOT NULL,
  licensed_beds_verified_by    TEXT,
  licensed_beds_note           TEXT,

  average_daily_census               INTEGER NOT NULL CHECK (average_daily_census >= 0),
  average_daily_census_source        TEXT NOT NULL,
  average_daily_census_as_of         DATE NOT NULL,
  average_daily_census_verification  TEXT NOT NULL,
  average_daily_census_verified_by   TEXT,
  average_daily_census_note          TEXT,

  year_built                   INTEGER,
  year_built_source            TEXT NOT NULL,
  year_built_as_of             DATE NOT NULL,
  year_built_verification      TEXT NOT NULL,
  year_built_verified_by       TEXT,
  year_built_note              TEXT,

  square_feet                  INTEGER,
  square_feet_source           TEXT NOT NULL,
  square_feet_as_of            DATE NOT NULL,
  square_feet_verification     TEXT NOT NULL,
  square_feet_verified_by      TEXT,
  square_feet_note             TEXT,

  stories                INTEGER,
  acreage                NUMERIC(8,2),
  private_rooms          INTEGER,
  semi_private_rooms     INTEGER,
  verification_status    TEXT NOT NULL CHECK (verification_status IN ('verified','partially_verified','unverified','needs_review')),
  last_verified_at       DATE,
  tags                   TEXT[] NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             TEXT REFERENCES users(id),

  CONSTRAINT buildings_sources_chk CHECK (
    certified_beds_source       IN ('cms_mock','state_license','operator_report','broker_om','site_visit','third_party_report','public_record','data_room','manual') AND
    licensed_beds_source        IN ('cms_mock','state_license','operator_report','broker_om','site_visit','third_party_report','public_record','data_room','manual') AND
    average_daily_census_source IN ('cms_mock','state_license','operator_report','broker_om','site_visit','third_party_report','public_record','data_room','manual') AND
    year_built_source           IN ('cms_mock','state_license','operator_report','broker_om','site_visit','third_party_report','public_record','data_room','manual') AND
    square_feet_source          IN ('cms_mock','state_license','operator_report','broker_om','site_visit','third_party_report','public_record','data_room','manual')
  ),
  CONSTRAINT buildings_verifications_chk CHECK (
    certified_beds_verification       IN ('verified','partially_verified','unverified','needs_review') AND
    licensed_beds_verification        IN ('verified','partially_verified','unverified','needs_review') AND
    average_daily_census_verification IN ('verified','partially_verified','unverified','needs_review') AND
    year_built_verification           IN ('verified','partially_verified','unverified','needs_review') AND
    square_feet_verification          IN ('verified','partially_verified','unverified','needs_review')
  )
);
-- Note: in production rename source value 'cms_mock' → 'cms'.
CREATE INDEX buildings_name_idx ON buildings (lower(name));
CREATE INDEX buildings_state_idx ON buildings (state);
CREATE INDEX buildings_type_idx ON buildings (facility_type);
CREATE INDEX buildings_verification_idx ON buildings (verification_status);

-- Time-bounded external identifiers (CCN history survives CHOWs).
CREATE TABLE building_identifiers (
  id              TEXT PRIMARY KEY,
  building_id     TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('cms_ccn','state_license','npi','medicaid_id')),
  value           TEXT NOT NULL,
  issuer          TEXT,
  effective_from  DATE NOT NULL,
  effective_to    DATE,
  is_current      BOOLEAN NOT NULL DEFAULT true,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CHECK (NOT is_current OR effective_to IS NULL)
);
CREATE UNIQUE INDEX building_identifiers_one_current_idx ON building_identifiers (building_id, type) WHERE is_current;
CREATE INDEX building_identifiers_value_idx ON building_identifiers (type, value);

CREATE TABLE building_photos (
  id            TEXT PRIMARY KEY,
  building_id   TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  caption       TEXT NOT NULL DEFAULT '',
  object_key    TEXT NOT NULL,              -- prototype: dataUrl / generated placeholder
  sort_order    INTEGER NOT NULL DEFAULT 0, -- 0 = cover photo
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by   TEXT REFERENCES users(id)
);
CREATE INDEX building_photos_building_idx ON building_photos (building_id, sort_order);

-- Time-bounded ownership / operations history.
CREATE TABLE building_ownerships (
  id               TEXT PRIMARY KEY,
  building_id      TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  organization_id  TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  role             TEXT NOT NULL CHECK (role IN ('property_owner','operator','parent_organization','management_company')),
  start_date       DATE NOT NULL,
  end_date         DATE,
  is_current       BOOLEAN NOT NULL DEFAULT true,
  source           TEXT NOT NULL CHECK (source IN ('cms_mock','state_license','operator_report','broker_om','site_visit','third_party_report','public_record','data_room','manual')),
  source_as_of     DATE NOT NULL,
  verification     TEXT NOT NULL CHECK (verification IN ('verified','partially_verified','unverified','needs_review')),
  verified_by      TEXT,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT is_current OR end_date IS NULL)
);
CREATE UNIQUE INDEX building_ownerships_one_current_idx ON building_ownerships (building_id, role) WHERE is_current;
CREATE INDEX building_ownerships_org_idx ON building_ownerships (organization_id) WHERE is_current;

-- Non-ownership relationships (brokers, lenders, attorneys, key contacts…).
CREATE TABLE building_relationships (
  id               TEXT PRIMARY KEY,
  building_id      TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('broker','lender','attorney','consultant','key_contact','administrator','other')),
  organization_id  TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id       TEXT REFERENCES contacts(id) ON DELETE CASCADE,
  description      TEXT,
  since            DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (organization_id IS NOT NULL OR contact_id IS NOT NULL)
);
CREATE INDEX building_relationships_building_idx ON building_relationships (building_id);
CREATE INDEX building_relationships_contact_idx ON building_relationships (contact_id);

-- ---------------------------------------------------------------------------
-- CMS & regulatory (sourced from CMS Provider Data in production)
-- ---------------------------------------------------------------------------
CREATE TABLE cms_snapshots (
  id                      TEXT PRIMARY KEY,
  building_id             TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  provider_number         TEXT NOT NULL,
  rating_overall          SMALLINT CHECK (rating_overall BETWEEN 1 AND 5),
  rating_health           SMALLINT CHECK (rating_health BETWEEN 1 AND 5),
  rating_staffing         SMALLINT CHECK (rating_staffing BETWEEN 1 AND 5),
  rating_qm               SMALLINT CHECK (rating_qm BETWEEN 1 AND 5),
  rating_long_stay_qm     SMALLINT CHECK (rating_long_stay_qm BETWEEN 1 AND 5),
  rating_short_stay_qm    SMALLINT CHECK (rating_short_stay_qm BETWEEN 1 AND 5),
  total_nurse_hprd        NUMERIC(5,2),
  rn_hprd                 NUMERIC(5,2),
  lpn_hprd                NUMERIC(5,2),
  cna_hprd                NUMERIC(5,2),
  state_avg_total_hprd    NUMERIC(5,2),
  national_avg_total_hprd NUMERIC(5,2),
  nurse_turnover_pct      NUMERIC(5,2),
  special_focus_facility  BOOLEAN NOT NULL DEFAULT false,
  abuse_icon              BOOLEAN NOT NULL DEFAULT false,
  source_label            TEXT NOT NULL,
  retrieved_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_latest               BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX cms_snapshots_latest_idx ON cms_snapshots (building_id) WHERE is_latest;
CREATE INDEX cms_snapshots_ccn_idx ON cms_snapshots (provider_number);

CREATE TABLE cms_rating_history (
  building_id   TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  period        TEXT NOT NULL,              -- e.g. 'Q3 2026'
  overall       SMALLINT NOT NULL CHECK (overall BETWEEN 1 AND 5),
  health        SMALLINT NOT NULL CHECK (health BETWEEN 1 AND 5),
  staffing      SMALLINT NOT NULL CHECK (staffing BETWEEN 1 AND 5),
  qm            SMALLINT NOT NULL CHECK (qm BETWEEN 1 AND 5),
  PRIMARY KEY (building_id, period)
);

CREATE TABLE cms_surveys (
  id                      TEXT PRIMARY KEY,
  building_id             TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  survey_date             DATE NOT NULL,
  type                    TEXT NOT NULL CHECK (type IN ('standard','complaint','fire_safety','infection_control')),
  deficiency_count        INTEGER NOT NULL DEFAULT 0,
  highest_scope_severity  TEXT              -- 'A'..'L' or NULL when none cited
);
CREATE INDEX cms_surveys_building_idx ON cms_surveys (building_id, survey_date DESC);

CREATE TABLE cms_deficiencies (
  id              TEXT PRIMARY KEY,
  building_id     TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  survey_date     DATE NOT NULL,
  tag             TEXT NOT NULL,            -- F-tag / K-tag
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  scope_severity  TEXT NOT NULL CHECK (scope_severity ~ '^[A-L]$'),
  status          TEXT NOT NULL CHECK (status IN ('corrected','open','past_noncompliance'))
);
CREATE INDEX cms_deficiencies_building_idx ON cms_deficiencies (building_id, survey_date DESC);

CREATE TABLE cms_penalties (
  id            TEXT PRIMARY KEY,
  building_id   TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  penalty_date  DATE NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('civil_money_penalty','payment_denial')),
  amount        NUMERIC(14,2),
  description   TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Property condition & capital projects
-- ---------------------------------------------------------------------------
CREATE TABLE property_conditions (
  building_id      TEXT PRIMARY KEY REFERENCES buildings(id) ON DELETE CASCADE,
  overall          TEXT NOT NULL CHECK (overall IN ('good','fair','poor','critical')),
  assessed_by      TEXT NOT NULL,
  assessment_date  DATE NOT NULL,
  construction     TEXT,
  sprinklered      TEXT NOT NULL CHECK (sprinklered IN ('full','partial','none')),
  generator        TEXT,
  parking_spaces   INTEGER,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE building_system_conditions (
  building_id               TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  system                    TEXT NOT NULL CHECK (system IN ('roof','hvac','plumbing','electrical','life_safety','elevators','interiors','site')),
  rating                    TEXT NOT NULL CHECK (rating IN ('good','fair','poor','critical')),
  install_year              INTEGER,
  remaining_useful_life_yrs INTEGER,
  last_assessed             DATE NOT NULL,
  notes                     TEXT NOT NULL DEFAULT '',
  source                    TEXT NOT NULL CHECK (source IN ('cms_mock','state_license','operator_report','broker_om','site_visit','third_party_report','public_record','data_room','manual')),
  PRIMARY KEY (building_id, system)
);

CREATE TABLE deferred_maintenance_items (
  id              TEXT PRIMARY KEY,
  building_id     TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  system          TEXT NOT NULL CHECK (system IN ('roof','hvac','plumbing','electrical','life_safety','elevators','interiors','site')),
  description     TEXT NOT NULL,
  estimated_cost  NUMERIC(14,2) NOT NULL,
  priority        TEXT NOT NULL CHECK (priority IN ('immediate','short_term','long_term'))
);

CREATE TABLE renovations (
  id            TEXT PRIMARY KEY,
  building_id   TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  description   TEXT NOT NULL,
  cost          NUMERIC(14,2)
);

CREATE TABLE capital_projects (
  id            TEXT PRIMARY KEY,
  building_id   TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('roof','hvac','plumbing','electrical','life_safety','elevators','interiors','site','resident_rooms','common_areas')),
  status        TEXT NOT NULL CHECK (status IN ('planned','in_progress','completed')),
  budget        NUMERIC(14,2) NOT NULL,
  spent         NUMERIC(14,2) NOT NULL DEFAULT 0,
  start_date    DATE,
  target_date   DATE
);

-- ---------------------------------------------------------------------------
-- Financials
-- ---------------------------------------------------------------------------
CREATE TABLE financial_periods (
  building_id         TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,        -- 'FY2025', 'TTM Sep-2026'
  period_end          DATE NOT NULL,
  revenue             NUMERIC(16,2) NOT NULL,
  operating_expenses  NUMERIC(16,2) NOT NULL,
  ebitdar             NUMERIC(16,2) NOT NULL,
  rent                NUMERIC(16,2) NOT NULL DEFAULT 0,
  ebitda              NUMERIC(16,2) NOT NULL,
  noi                 NUMERIC(16,2) NOT NULL,
  occupancy_pct       NUMERIC(5,2),
  source              TEXT NOT NULL CHECK (source IN ('cms_mock','state_license','operator_report','broker_om','site_visit','third_party_report','public_record','data_room','manual')),
  PRIMARY KEY (building_id, label)
);

CREATE TABLE payer_mix (
  building_id    TEXT PRIMARY KEY REFERENCES buildings(id) ON DELETE CASCADE,
  as_of          DATE NOT NULL,
  medicare       NUMERIC(5,2) NOT NULL,
  medicaid       NUMERIC(5,2) NOT NULL,
  managed_care   NUMERIC(5,2) NOT NULL,
  private_pay    NUMERIC(5,2) NOT NULL,
  other          NUMERIC(5,2) NOT NULL
);

CREATE TABLE building_debt (
  building_id       TEXT PRIMARY KEY REFERENCES buildings(id) ON DELETE CASCADE,
  lender_org_id     TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  loan_type         TEXT NOT NULL,
  original_amount   NUMERIC(16,2) NOT NULL,
  balance           NUMERIC(16,2) NOT NULL,
  rate              TEXT NOT NULL,          -- e.g. 'SOFR + 3.25%'
  origination_date  DATE NOT NULL,
  maturity_date     DATE NOT NULL
);

CREATE TABLE capex_history (
  building_id  TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  amount       NUMERIC(14,2) NOT NULL,
  PRIMARY KEY (building_id, year)
);

-- ---------------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------------
CREATE TABLE deals (
  id                         TEXT PRIMARY KEY,
  code                       TEXT NOT NULL UNIQUE,      -- 'OD-2026-014'; 'MKT-…' = recorded market comp
  name                       TEXT NOT NULL,
  type                       TEXT NOT NULL CHECK (type IN ('single_asset','portfolio')),
  stage                      TEXT NOT NULL CHECK (stage IN ('high_level_review','loi_signed','psa_signed','closed','asset_management')),
  status                     TEXT NOT NULL CHECK (status IN ('active','closed','dead','abandoned')),
  skipped_loi                BOOLEAN NOT NULL DEFAULT false,
  dead_reason                TEXT,
  deal_kind                  TEXT CHECK (deal_kind IN ('acquisition','sale_leaseback','joint_venture','recapitalization','refinance','disposition')),
  asset_class                TEXT CHECK (asset_class IN ('snf','alf','ilf','mc','ccrc','mixed')),
  seller_org_id              TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  buyer_org_id               TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  buyer_entity               TEXT NOT NULL DEFAULT 'TBD',
  broker_org_id              TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  lender_org_id              TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  source_org_id              TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  source_contact_id          TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  current_operator_org_id    TEXT REFERENCES organizations(id) ON DELETE SET NULL, -- NULL = derive from buildings
  new_operator_org_id        TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  jv_partner_org_id          TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  jv_pct                     NUMERIC(5,2) CHECK (jv_pct BETWEEN 0 AND 100),
  asking_price               NUMERIC(16,2),
  purchase_price             NUMERIC(16,2),
  projected_close_date       DATE,
  actual_close_date          DATE,
  data_room_url              TEXT,
  states_override            CHAR(2)[],     -- NULL/empty = derive from buildings
  total_buildings_override   INTEGER,
  total_lic_beds_override    INTEGER,
  buyer_distribution         TEXT NOT NULL DEFAULT '',  -- semicolon-separated emails
  seller_distribution        TEXT NOT NULL DEFAULT '',
  lead_name                  TEXT NOT NULL,             -- prototype display name; prefer lead contact via deal_contacts team_lead
  summary                    TEXT NOT NULL DEFAULT '',
  deal_approver_contact_id   TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  auto_advance               BOOLEAN NOT NULL DEFAULT true,
  milestone_floor            TEXT CHECK (milestone_floor IN ('high_level_review','loi_signed','psa_signed','closed','asset_management')),
  last_auto_advance          JSONB,          -- {from, fromStatus, to, at, reason, dismissed}
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                 TEXT REFERENCES users(id)
);
CREATE INDEX deals_stage_status_idx ON deals (status, stage);
CREATE INDEX deals_seller_idx ON deals (seller_org_id);
CREATE INDEX deals_buyer_idx ON deals (buyer_org_id);
CREATE INDEX deals_broker_idx ON deals (broker_org_id);
CREATE INDEX deals_lender_idx ON deals (lender_org_id);

-- Pipeline-phase manual overrides (phase item key → done).
CREATE TABLE deal_phase_overrides (
  deal_id    TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  item_key   TEXT NOT NULL,  -- e.g. 'identify_price','critical_dates' (PIPELINE_PHASES in src/lib/checklist.ts)
  done       BOOLEAN NOT NULL,
  set_by     TEXT REFERENCES users(id),
  set_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, item_key)
);

-- Deal-specific values for a building (never on buildings).
CREATE TABLE deal_buildings (
  id                TEXT PRIMARY KEY,
  deal_id           TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  building_id       TEXT NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
  role              TEXT NOT NULL CHECK (role IN ('primary_asset','portfolio_asset','add_on','excluded')),
  price_allocation  NUMERIC(16,2),
  allocation_basis  TEXT,
  notes             TEXT,
  added_at          DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (deal_id, building_id)
);
CREATE INDEX deal_buildings_building_idx ON deal_buildings (building_id);

-- Deal team: one contact per (deal, side, role).
CREATE TABLE deal_contacts (
  deal_id     TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  side        TEXT NOT NULL CHECK (side IN ('buyer','seller','vendor')),
  role        TEXT NOT NULL,
  contact_id  TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, side, role),
  CHECK (
    (side IN ('buyer','seller') AND role IN ('team_lead','support_1','support_2','in_house_counsel','transaction_counsel','financing_counsel','regulatory_counsel'))
    OR (side = 'vendor' AND role IN ('survey','title','zoning','environmental','property_condition','appraisal','reimbursement','operations'))
  )
);
CREATE INDEX deal_contacts_contact_idx ON deal_contacts (contact_id);

CREATE TABLE deal_reports (
  deal_id        TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('survey','title','zoning','environmental','property_condition','appraisal','reimbursement','operations')),
  status         TEXT NOT NULL DEFAULT 'not_ordered' CHECK (status IN ('not_ordered','ordered','in_progress','draft_received','final_received','waived')),
  date_ordered   DATE,
  expected_date  DATE,
  url            TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, kind)
);

-- ---------------------------------------------------------------------------
-- Deal checklist (Progress tab)
-- ---------------------------------------------------------------------------
CREATE TABLE deal_checklist_items (
  id                       TEXT PRIMARY KEY,
  deal_id                  TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  key                      TEXT NOT NULL,     -- CHECKLIST_TEMPLATE key, e.g. 'deal_sourced','psa_loi'
  title                    TEXT NOT NULL,
  sort_order               INTEGER NOT NULL,
  responsible_contact_id   TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  approver_contact_id      TEXT REFERENCES contacts(id) ON DELETE SET NULL,  -- NULL = deal approver applies
  requires_responsible     BOOLEAN NOT NULL DEFAULT true,
  requires_document        BOOLEAN NOT NULL DEFAULT true,
  approval_status          TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved')),
  approved_by              TEXT REFERENCES users(id),
  approved_at              TIMESTAMPTZ,
  approval_note            TEXT,
  document_waived_reason   TEXT,
  document_waived_by       TEXT REFERENCES users(id),
  document_waived_at       TIMESTAMPTZ,
  bypass_reason            TEXT,              -- non-NULL = "not needed for this deal"
  bypass_by                TEXT REFERENCES users(id),
  bypass_at                TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deal_id, key)
);
CREATE INDEX deal_checklist_items_deal_idx ON deal_checklist_items (deal_id, sort_order);
CREATE INDEX deal_checklist_items_approver_idx ON deal_checklist_items (approver_contact_id) WHERE approval_status = 'pending';

CREATE TABLE checklist_stages (
  id                     TEXT PRIMARY KEY,
  item_id                TEXT NOT NULL REFERENCES deal_checklist_items(id) ON DELETE CASCADE,
  sort_order             INTEGER NOT NULL,
  title                  TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','done','skipped')),
  auto_rule              TEXT CHECK (auto_rule IN ('deal_created','has_buildings','has_dataroom','vendors_engaged','reports_drafts','reports_finals','transitioned_to_am')),
  completed_by_approval  BOOLEAN NOT NULL DEFAULT false,
  completed_at           TIMESTAMPTZ,
  completed_by           TEXT REFERENCES users(id),   -- NULL with auto_rule set = completed by system
  skip_reason            TEXT,
  UNIQUE (item_id, sort_order),
  CHECK (status <> 'skipped' OR skip_reason IS NOT NULL)
);

CREATE TABLE checklist_sub_items (
  id          TEXT PRIMARY KEY,
  stage_id    TEXT NOT NULL REFERENCES checklist_stages(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','done','na')),
  UNIQUE (stage_id, sort_order)
);

CREATE TABLE checklist_documents (
  id            TEXT PRIMARY KEY,
  item_id       TEXT NOT NULL REFERENCES deal_checklist_items(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  mime_type     TEXT NOT NULL,
  object_key    TEXT NOT NULL,               -- prototype keeps bytes for the browser session only
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by   TEXT REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected')),
  reviewed_by   TEXT REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  review_note   TEXT
);
CREATE INDEX checklist_documents_item_idx ON checklist_documents (item_id);

CREATE TABLE checklist_events (
  id        TEXT PRIMARY KEY,
  item_id   TEXT NOT NULL REFERENCES deal_checklist_items(id) ON DELETE CASCADE,
  at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id  TEXT REFERENCES users(id),        -- NULL = System
  text      TEXT NOT NULL,
  tone      TEXT NOT NULL DEFAULT 'default' CHECK (tone IN ('default','success','warning','danger'))
);
CREATE INDEX checklist_events_item_idx ON checklist_events (item_id, at DESC);

-- ---------------------------------------------------------------------------
-- Site visits
-- ---------------------------------------------------------------------------
CREATE TABLE site_visits (
  id            TEXT PRIMARY KEY,
  building_id   TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  deal_id       TEXT REFERENCES deals(id) ON DELETE SET NULL,
  visit_date    DATE NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('initial_tour','diligence_inspection','pca_walkthrough','asset_review')),
  participants  TEXT[] NOT NULL DEFAULT '{}', -- free-text names; consider site_visit_participants(contact_id/user_id)
  summary       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    TEXT REFERENCES users(id)
);
CREATE INDEX site_visits_building_idx ON site_visits (building_id, visit_date DESC);

CREATE TABLE site_visit_condition_ratings (
  visit_id  TEXT NOT NULL REFERENCES site_visits(id) ON DELETE CASCADE,
  system    TEXT NOT NULL CHECK (system IN ('roof','hvac','plumbing','electrical','life_safety','elevators','interiors','site')),
  rating    TEXT NOT NULL CHECK (rating IN ('good','fair','poor','critical')),
  PRIMARY KEY (visit_id, system)
);

CREATE TABLE site_visit_observations (
  id        TEXT PRIMARY KEY,
  visit_id  TEXT NOT NULL REFERENCES site_visits(id) ON DELETE CASCADE,
  text      TEXT NOT NULL,
  severity  TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  system    TEXT CHECK (system IN ('roof','hvac','plumbing','electrical','life_safety','elevators','interiors','site')),
  status    TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved'))
);

CREATE TABLE site_visit_follow_ups (
  id        TEXT PRIMARY KEY,
  visit_id  TEXT NOT NULL REFERENCES site_visits(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  assignee  TEXT NOT NULL,                    -- prototype: team member name; production: users(id)
  due_date  DATE,
  done      BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE site_visit_photos (
  id          TEXT PRIMARY KEY,
  visit_id    TEXT NOT NULL REFERENCES site_visits(id) ON DELETE CASCADE,
  caption     TEXT NOT NULL DEFAULT '',
  area        TEXT NOT NULL DEFAULT 'General',
  object_key  TEXT,                           -- prototype stores file name only
  file_name   TEXT
);

-- ---------------------------------------------------------------------------
-- Building documents & due diligence
-- ---------------------------------------------------------------------------
CREATE TABLE document_requests (
  id              TEXT PRIMARY KEY,
  building_id     TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  deal_id         TEXT REFERENCES deals(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('licenses','property','financial','legal','third_party','capex','site_visit','other')),
  required        BOOLEAN NOT NULL DEFAULT true,
  is_baseline     BOOLEAN NOT NULL DEFAULT false, -- license + floor plan; cannot be deleted
  requested_from  TEXT,
  reviewer        TEXT,                           -- prototype: team member name; production: users(id)
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'not_requested' CHECK (status IN ('not_requested','requested','received','in_review','approved','rejected','needs_revision')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX document_requests_building_idx ON document_requests (building_id, status);
CREATE INDEX document_requests_deal_idx ON document_requests (deal_id);
CREATE INDEX document_requests_due_idx ON document_requests (due_date) WHERE status IN ('requested','needs_revision');

CREATE TABLE document_files (
  id           TEXT PRIMARY KEY,
  request_id   TEXT NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  file_size    BIGINT NOT NULL,
  mime_type    TEXT NOT NULL,
  version      INTEGER NOT NULL,
  object_key   TEXT NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by  TEXT REFERENCES users(id),     -- NULL = data room sync
  source       TEXT NOT NULL CHECK (source IN ('upload','sharepoint','email')),
  page_count   INTEGER,
  UNIQUE (request_id, version)
);

CREATE TABLE review_comments (
  id          TEXT PRIMARY KEY,
  request_id  TEXT NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  author_id   TEXT REFERENCES users(id),
  text        TEXT NOT NULL,
  action      TEXT CHECK (action IN ('approved','rejected','needs_revision','status_change','comment')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX review_comments_request_idx ON review_comments (request_id, created_at);

-- Data room connection per building (simulated SharePoint in the prototype).
CREATE TABLE data_room_connections (
  building_id   TEXT PRIMARY KEY REFERENCES buildings(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL DEFAULT 'sharepoint' CHECK (provider IN ('sharepoint')),
  site_name     TEXT NOT NULL DEFAULT '',
  folder_path   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'not_connected' CHECK (status IN ('connected','syncing','error','not_connected')),
  last_sync_at  TIMESTAMPTZ
);

CREATE TABLE data_room_imports (
  id                  TEXT PRIMARY KEY,
  building_id         TEXT NOT NULL REFERENCES data_room_connections(building_id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  size_bytes          BIGINT NOT NULL,
  imported_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_request_id  TEXT REFERENCES document_requests(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- Communications (Outlook / Microsoft Graph in production)
-- ---------------------------------------------------------------------------
CREATE TABLE communications (
  id                 TEXT PRIMARY KEY,
  thread_id          TEXT NOT NULL,          -- Graph conversationId for emails
  channel            TEXT NOT NULL CHECK (channel IN ('email','call','meeting')),
  direction          TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  subject            TEXT NOT NULL,
  body               TEXT NOT NULL DEFAULT '',
  sent_at            TIMESTAMPTZ NOT NULL,
  duration_min       INTEGER,
  deal_id            TEXT REFERENCES deals(id) ON DELETE SET NULL,
  building_id        TEXT REFERENCES buildings(id) ON DELETE SET NULL,
  source             TEXT NOT NULL CHECK (source IN ('outlook_sync','manual')),
  external_message_id TEXT UNIQUE,           -- Graph message id (dedupe on sync)
  logged_by          TEXT REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX communications_thread_idx ON communications (thread_id, sent_at);
CREATE INDEX communications_deal_idx ON communications (deal_id);

CREATE TABLE communication_participants (
  communication_id  TEXT NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL CHECK (kind IN ('from','to','cc')),
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  position          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (communication_id, kind, position)
);
CREATE INDEX communication_participants_email_idx ON communication_participants (lower(email));

-- Which CRM contacts a message is logged against.
CREATE TABLE communication_contacts (
  communication_id  TEXT NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  contact_id        TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (communication_id, contact_id)
);
CREATE INDEX communication_contacts_contact_idx ON communication_contacts (contact_id);

CREATE TABLE communication_attachments (
  id                TEXT PRIMARY KEY,
  communication_id  TEXT NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL,
  object_key        TEXT                    -- optional: fetched on demand from Graph
);

-- ---------------------------------------------------------------------------
-- Activity timeline
-- ---------------------------------------------------------------------------
CREATE TABLE activities (
  id           TEXT PRIMARY KEY,
  building_id  TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  deal_id      TEXT REFERENCES deals(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('building_created','building_updated','cms_refreshed','document_uploaded','document_reviewed','document_requested','deal_associated','site_visit','verification_changed','note','data_room_sync')),
  title        TEXT NOT NULL,
  description  TEXT,
  actor_id     TEXT REFERENCES users(id),      -- NULL = System / Data room sync
  actor_label  TEXT,                           -- display label when actor_id is NULL
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activities_building_idx ON activities (building_id, occurred_at DESC);
CREATE INDEX activities_deal_idx ON activities (deal_id, occurred_at DESC);
