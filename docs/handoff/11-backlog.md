# Production implementation backlog

Epics and stories for implementing the prototype in the Owner Docket environment. Sizes are rough (S ≈ ≤3 days, M ≈ 1–2 weeks, L ≈ 2–4 weeks for one developer). Acceptance references point to the module specs (`07`–`09`) and the decisions log (`10`).

The same backlog is in `11-backlog.csv` (columns: Epic, Title, Description, Acceptance, Depends On, Size, Labels) for import into GitHub Issues or Jira.

Suggested order: Foundation (F1–F5, F8) → Buildings and Contacts in parallel → Deals → Progress & approvals → Integrations → UI/UX polish. Data migration can start once F3 is in place.

## Foundation

| ID | Story | Description | Acceptance | Depends on | Size |
|---|---|---|---|---|---|
| F1 | Authentication and user accounts | Sign-in for Owner Docket users; map internal team contacts (OD Acquisition Holdings, tagged Internal) to user accounts; replace the prototype 'Acting as' switcher. | 09-spec-deals.md §7.5 (Acting as) | — | M |
| F2 | Roles and permissions | Role model (e.g., Admin, Deal lead, Deal team, Viewer). Enforce approver-only actions server-side; restrict personal contact data by role; decide who can complete/skip/bypass checklist work. | 09-spec-deals.md §7.5; 10-decisions Q3, Q4 | F1 | M |
| F3 | Database schema | Implement the schema for buildings, identifiers, tracked fields, ownerships, organizations, contacts, deals, deal-buildings, deal contacts, reports, checklist items/stages/sub-items/documents/history, documents, site visits, communications, activities. | 03-data-model.md, 04-database-schema.sql | — | L |
| F4 | API layer | Endpoints for CRUD and the domain actions currently in src/store/DataProvider.tsx (e.g., approve, request changes, bypass, change owner, set deal approver, undo auto-advance). | 05-api-contract.yaml, 05-api-mapping.md | F3 | L |
| F5 | Replace prototype store with API data | Swap DataProvider/localStorage for API calls (e.g., TanStack Query) while keeping screens unchanged; remove versioned localStorage migrations. | All specs | F4 | L |
| F6 | File storage | Object storage for building documents, checklist documentation, photos, logos and contact photos (replace session-only bytes and inline data URLs); virus scan; signed URLs. | 07-spec-buildings.md §5.6; 09-spec-deals.md §7.4 | F3 | M |
| F7 | Audit log / activity service | Server-side activity entries for every mutation (who, what, when), reusing the activity types in the prototype; checklist item history. | 07-spec-buildings.md §5.9; 09-spec-deals.md §7.4 | F3 | M |
| F8 | Business rules on the server | Port src/lib/checklist.ts (progress, auto stages, phases, auto-advance, approver rule) and selectors (docStats, attention items, dealView, companyDeals) to the backend or a shared package; keep the unit tests as the contract. | 09-spec-deals.md §7 | F3 | M |
| F9 | Global search | Server-backed search across buildings (incl. identifiers), deals, contacts and documents. | Header search | F4 | S |

## Buildings

| ID | Story | Description | Acceptance | Depends on | Size |
|---|---|---|---|---|---|
| BL1 | Buildings directory | Table/cards, metrics, search, filters (state, type, owner type, operator, rating, beds, deals, verification), sort, persisted view. | 07-spec-buildings.md §2, AC 1–5 | F5 | M |
| BL2 | Add building (CMS search, CCN lookup, manual) | Three creation methods with review step, duplicate CCN detection, baseline document placeholders, operator linking. | 07-spec-buildings.md §3, AC 6–8 | F5,IN1 | M |
| BL3 | Building header and metrics | Cover photo, badges, tags, identifiers with prior CCNs, owner, metrics with provenance tooltips, Mark as verified, notes. | 07-spec-buildings.md §4, AC 11 | F5 | M |
| BL4 | Edit building with provenance | Tracked-field provenance and verification; CCN retirement; building verification; activity entries. | 07-spec-buildings.md §6, AC 9–10 | BL3 | M |
| BL5 | Overview tab | Facility info, photos, ownership & operations, related deals with preview, condition, recent visits, attention required, documents summary. | 07-spec-buildings.md §5.1 | BL3 | L |
| BL6 | Owner tab (CRM owner profile) | Company type dropdown, contact card, company info, active/past deals, roster, change owner with history. | 07-spec-buildings.md §5.2, AC 17–19 | BL5,CT2 | L |
| BL7 | Photo gallery | Upload (multiple), lightbox, cover selection, removal. | 07-spec-buildings.md §5.1, AC 20 | F6 | S |
| BL8 | CMS & Regulatory tab | Ratings, staffing, history, surveys, deficiencies, penalties from real CMS data. | 07-spec-buildings.md §5.3, AC 22 | IN1 | M |
| BL9 | Property & Condition and Financials tabs | Systems, deferred maintenance, renovations, capital projects; P&L by period, payer mix, debt, capex. | 07-spec-buildings.md §5.4–5.5 | F5 | M |
| BL10 | Documents & due diligence | Checklist by category, statuses, quick views, upload/versions, review drawer with approve/revise/reject, add request, template, completion progress. | 07-spec-buildings.md §5.6, AC 12–16 | F6 | L |
| BL11 | Site visits | Visit list and add-visit form with observations, follow-ups, ratings, photos. | 07-spec-buildings.md §5.7, AC 21 | F6 | M |
| BL12 | Relationships and Activity tabs | Organizations by role, contacts, deals; activity timeline with notes and filters. | 07-spec-buildings.md §5.8–5.9 | F7 | S |
| BL13 | Add to deal | Link a building to an active deal with role and price allocation. | 07-spec-buildings.md §7 | DL1 | S |

## Contacts/CRM

| ID | Story | Description | Acceptance | Depends on | Size |
|---|---|---|---|---|---|
| CT1 | Contacts directory | Metrics, search, filters (type, sector, company, tags), sorting, persisted prefs. | 08-spec-contacts.md §3, AC 1–2 | F5 | M |
| CT2 | Contact create/edit | All fields incl. contact type, sectors, personal info, roster role, primary toggle, photo, tags; company picker with inline create; defaults from company. | 08-spec-contacts.md §2, AC 3–6 | F6 | M |
| CT3 | Contact record Overview | Header actions, contact card, active/past deals via company, related buildings, company panel, associated people, delete. | 08-spec-contacts.md §4–5, AC 7–11 | CT2 | M |
| CT4 | Company edit | Company type, parent, office address, focus areas, logo, tags. | 07-spec-buildings.md §5.2; 08-spec-contacts.md §5 | F6 | S |
| CT5 | Communications tab (manual logging) | Thread list, reading pane, filters, search, log call/meeting/email; ready for Outlook sync. | 08-spec-contacts.md §6, AC 12–15 | F5 | M |

## Deals

| ID | Story | Description | Acceptance | Depends on | Size |
|---|---|---|---|---|---|
| DL1 | Deal data model and pipeline | Pipeline board (5 milestones) and table, metrics, filters, market comps toggle. | 09-spec-deals.md §3, AC 1–2 | F5 | M |
| DL2 | New deal | Dialog with buildings, seller default, team lead, stage, skipped LOI; code generation; fresh checklist. | 09-spec-deals.md §3, AC 3 | DL1,PR1 | S |
| DL3 | Deal record header and stage control | Badges, edit, change stage, dead/abandoned with reason, reopen, closed dates, activities. | 09-spec-deals.md §4, AC 10–11 | DL1 | M |
| DL4 | Deal summary and edit | All template summary fields; calculated price/bed, states, totals with overrides; company/contact pickers. | 09-spec-deals.md §5.2, AC 4–5 | DL3 | M |
| DL5 | Deal contacts, vendors and distribution lists | Buyer/seller roles, vendor roles, type-ahead contact pickers with auto-fill, distribution lists with validation. | 09-spec-deals.md §5.3–5.4, AC 6–7 | CT1 | M |
| DL6 | Third-party reports | Date ordered, status, expected delivery, report link per vendor role. | 09-spec-deals.md §5.5, AC 8 | DL3 | S |
| DL7 | Deal buildings table | CMS columns, 10 rows expandable, add/remove buildings. | 09-spec-deals.md §5.6, AC 9 | IN1 | S |
| DL8 | Deal Documents tab | Filed / awaiting / all documentation from checklist items. | 09-spec-deals.md §6 | PR3 | S |

## Progress & approvals

| ID | Story | Description | Acceptance | Depends on | Size |
|---|---|---|---|---|---|
| PR1 | Checklist template and seeding | 19-item template (stages, sub-items, auto rules, requirements); create per deal; configurable template storage. | 09-spec-deals.md §7.1 | F3 | M |
| PR2 | Stages and sub-items | Complete, skip (reason), undo; sub-item done/N/A with automatic stage completion; history. | 09-spec-deals.md §7.3, AC 13–14 | PR1 | M |
| PR3 | Sign-off workflow | Responsible party uploads documentation; approver approves (files) or requests changes; revoke; PSA LOI approval completes final stage. | 09-spec-deals.md §7.4, AC 15, 17–18 | PR2,F6 | L |
| PR4 | Deal approver and item approvers | Deal-level approver, item overrides, apply to all; server-side approver enforcement. | 09-spec-deals.md §7.5, AC 16, 20 | PR3,F2 | M |
| PR5 | Bypass mechanisms | Waive document, mark item not needed (excluded from progress), restore — all with reasons. | 09-spec-deals.md §7.6, AC 19 | PR3 | S |
| PR6 | Automatic stages | Evaluate auto rules on relevant data changes (buildings linked, data room link, vendors, report statuses, AM transition). | 09-spec-deals.md §7.2, AC 12, 24 | PR2,DL5,DL6 | M |
| PR7 | Progress roll-up | Item and deal progress per §7.7; weighting configurable once Q1 is answered. | 09-spec-deals.md §7.7; 10-decisions Q1 | PR3 | S |
| PR8 | Pipeline phases and milestone auto-advance | Phase items with overrides; forward-only auto-advance, floor, undo banner, per-deal toggle, skipped LOI handling. | 09-spec-deals.md §7.8, AC 21–24 | PR6,DL3 | M |
| PR9 | Notifications | Notify approvers of submitted documentation and responsible parties of change requests (in-app + email). | 09-spec-deals.md §7.4 | PR3,F1 | M |

## Integrations

| ID | Story | Description | Acceptance | Depends on | Size |
|---|---|---|---|---|---|
| IN1 | CMS provider data | Ingest CMS Care Compare / provider data (ratings incl. long/short-stay QM, staffing, surveys, deficiencies, penalties); provider lookup for Add Building; refresh schedule. | 07-spec-buildings.md §3, §5.3 | F3 | L |
| IN2 | Outlook / Microsoft Graph | Sync email (and optionally calendar) to contact Communications; matching rules; mailbox scope; privacy. | 08-spec-contacts.md §6; 10-decisions Q7 | F1,CT5 | L |
| IN3 | SharePoint data rooms | Connect deal/building folders, list and import files, match to document requests; deal data room link drives Dataroom Setup. | 07-spec-buildings.md §5.6; 09-spec-deals.md §7.2 | F6 | L |
| IN4 | Maps | Replace schematic map placeholders with a mapping provider (geocoding + static/interactive map). | 07-spec-buildings.md §4 | F3 | S |

## UI/UX polish

| ID | Story | Description | Acceptance | Depends on | Size |
|---|---|---|---|---|---|
| UX1 | Design review and usability pass | Review prototype screens with users; refine layouts, density, terminology; accessibility audit (keyboard, contrast, screen readers). | screenshots/ + specs | — | M |
| UX2 | Owner Docket branding | Apply final brand identity (wordmark, colors) to the design tokens in src/index.css. | 01-architecture.md | UX1 | S |
| UX3 | Responsive and performance | Verify tablet/mobile layouts, pagination/virtualization for large lists, code splitting. | All specs | F5 | M |

## Data migration/seeding

| ID | Story | Description | Acceptance | Depends on | Size |
|---|---|---|---|---|---|
| DM1 | Seed and fixtures | Load the exported prototype dataset as dev/test fixtures. | fixtures/ | F3 | S |
| DM2 | Import existing Owner Docket data | Map existing buildings, companies, contacts and deals into the new schema; dedupe by CCN/name; provenance = imported. | 03-data-model.md | F3 | L |

## QA

| ID | Story | Description | Acceptance | Depends on | Size |
|---|---|---|---|---|---|
| QA1 | Automated tests | Port the business-rule unit tests and browser smoke scripts; add API tests. | 06-business-rules.md, src/**/*.test.ts, e2e/ | F8 | M |
| QA2 | Acceptance testing | Run the numbered acceptance criteria in the three module specs. | 07-spec-buildings.md §8; 08-spec-contacts.md §8; 09-spec-deals.md §8 | All | M |
