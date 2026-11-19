# Buildings module — functional specification

The Buildings module is the permanent repository of facility intelligence. A building record exists independently of any deal; deals link to buildings through a deal–building relationship that holds deal-specific values (role, price allocation).

Source code: `src/features/buildings/**`, shared CRM pieces in `src/features/crm/**`, state and actions in `src/store/DataProvider.tsx`, derived data in `src/store/selectors.ts`, labels and pick lists in `src/lib/labels.ts`, types in `src/types/index.ts`.

## 1. Routes

| URL | Screen | Source |
|---|---|---|
| `/buildings` | Buildings directory | `src/features/buildings/directory/BuildingsDirectory.tsx` |
| `/buildings/:buildingId` | Building detail — Overview tab | `src/features/buildings/detail/BuildingDetail.tsx` |
| `/buildings/:buildingId/:tab` | Building detail — tab (`owner`, `cms`, `property`, `financials`, `documents`, `site-visits`, `relationships`, `activity`) | same |
| `/buildings/:id/documents?doc=<requestId>` | Documents tab with the review drawer open on a request | `src/features/buildings/documents/DocumentsTab.tsx` |
| `/buildings/:id/documents?view=missing\|review` | Documents tab pre-filtered | same |
| `/buildings/:id/site-visits?new=1` | Site Visits tab with the Add Site Visit dialog open | `src/features/buildings/detail/tabs/SiteVisitsTab.tsx` |

An unknown `:buildingId` renders the "Building not found" empty state with a link back to Buildings.

## 2. Buildings directory (`/buildings`)

### 2.1 Summary metrics (calculated from the **filtered** set)

| Tile | Calculation |
|---|---|
| Facilities | Count of filtered buildings; sub-label = distinct states |
| Certified beds | Σ `certifiedBeds.value`; sub-label = average per facility (rounded) |
| Weighted occupancy | Σ ADC ÷ Σ certified beds × 100 |
| Avg. CMS rating | Mean CMS overall rating across filtered buildings that have CMS data |
| In active deals | Buildings with at least one linked deal whose status = `active` |
| Needs verification | Buildings with verification status `needs_review` or `unverified` |

### 2.2 Toolbar
- **Search** (free text, case-insensitive substring) over: name, alternate names, city, state, county, operator name, owner name, all identifier values (CCN, license, NPI), linked deal names.
- **Filters** (multi-select, each option shows a count from the full dataset; OR within a filter, AND across filters):
  - State · Type (facility type) · **Owner type** (company type of the current property owner; includes "Not set / unknown") · Operator · CMS rating (5…1 stars, "Not CMS-rated") · Beds (range: presets Under 80 / 80–120 / 121–150 / Over 150, or custom min–max on certified beds) · Deals (`In active deal`, `Closed / owned`, `Historical only`, `No deal history`) · Verification.
- Active filters render as removable chips; **Clear all** resets.
- **Sort** menu: Facility name (A–Z), Recently updated, Certified beds, CMS rating, State / city, Deal activity, Verification status; plus ascending/descending. Sortable table headers toggle direction.
- **View toggle**: Table / Cards.
- View, filters and sort persist per browser (`localStorage` key `owner-docket:directory-prefs`); search text does not persist.

### 2.3 Table columns
Facility (thumbnail, name link, required-document approval % bar, first tag) · City / State · Type · CMS provider # (current CCN, or "Not certified") · Cert. beds · ADC (with occupancy %) · CMS rating (stars or N/A) · Current operator · Related deals (first active deal + stage, "+N more", or "Owned · closed deal" / "N historical" / "None") · Verification badge. Clicking anywhere on a row opens the building.

### 2.4 Card view
Image, facility type, active deal stage badge, name, city/state/operator, beds, occupancy, CMS stars, verification badge, document %.

### 2.5 Empty states
- No buildings at all → "No buildings yet" + Add Building.
- No matches → "No facilities match these filters" + Clear filters + Add Building.

## 3. Add Building (dialog)
Source: `src/features/buildings/add/AddBuildingDialog.tsx`, `src/store/createBuilding.ts`.

Three methods:
1. **Search CMS records** — searches a mock registry (`src/data/cmsRegistry.ts`) by name, city, state, county, CCN, operator. Records whose CCN already exists on a building show "Already in repository as …" with an Open link and cannot be selected.
2. **Enter provider number** — 6 alphanumeric characters; **Look up** enabled only at length 6. If the CCN already exists on a building, shows a link to that building. If not found, offers **Create manually** (pre-fills the CCN and Skilled Nursing).
3. **Create manually** — required: Facility name, City, State, Certified beds/units > 0. Optional: type, street, ZIP, county, licensed beds (defaults to certified), ADC, year built, square feet, CCN, operator name.

**Review step** shows all values plus what will happen on creation. **Create building**:
- Creates the building with a new internal ID.
- From CMS: CCN identifier (effective from the certification date), certified beds verified (source CMS mock), licensed beds defaulted to certified (unverified, with a note), mock CMS data generated, verification = `partially_verified`.
- Manual: all tracked fields source `manual`, `unverified`; verification = `unverified`.
- If an operator name is given: links an existing organization with the same name, else creates an organization (type operator) and a current operator ownership record.
- Always creates the two **baseline document placeholders**: "Current facility license" and "Floor plan" (required, status Not Requested).
- Activity: "Building record created" (+ "CMS data loaded" for CMS methods).
- Toast "Building created"; navigates to the new building. The record persists after refresh.

## 4. Building detail — header
Source: `src/features/buildings/detail/BuildingHeader.tsx`.

- **Cover photo**: first photo in the gallery (uploaded image or placeholder illustration) with "1 / N" counter; falls back to the generated illustration.
- Badges: facility type, verification, each **active** deal (click opens the deal preview drawer), building tags, **Edit tags** popover (free-text tag editor with suggestions; saves immediately).
- Name, alternate names, address + county.
- Meta row: CMS provider # (click copies; "N prior" tooltip lists retired CCNs with date ranges), state license, **Owner** (name + company-type badge; links to Owner tab), Updated (relative), Last verified.
- Actions: **Edit Building** (sheet), **Add to Deal** (dialog), **⋯** menu: Mark as verified, Refresh CMS data (CMS buildings only; simulated), Add note.
- Location card: schematic map placeholder (no map API).
- **Key metric tiles**: Certified beds, Licensed beds (+ delta vs certified), Avg. daily census, Occupancy (ADC ÷ certified; flags vs 85% target), CMS overall, Health inspection, Staffing (click → CMS tab). Tiles for tracked fields show a source/verification dot with tooltip (verification, source, as-of date, verified by, note).

**Mark as verified** sets building verification = `verified`, last verified = today, and stamps all five tracked fields verified by the current user. Activity: "Verification changed to verified".

## 5. Detail tabs

### 5.1 Overview (`OverviewTab.tsx`)
Left column:
- **Facility information** — name, alternate names, type, address, county, current identifiers (CCN with "since" date, license, NPI), construction year, square footage, bed counts, room mix, stories/acres, last verified. Tracked fields show the verification dot. Legend explains dot colors.
- **Photos** — gallery shows 5, "Show all N photos" expands; click opens a lightbox (prev/next, keyboard arrows, thumbnails, **Set as cover**, **Remove**). **Add photos** accepts multiple images (downscaled to ≤1280 px JPEG, stored with the building). Invalid files toast "Couldn't read …".
- **Ownership & operations** — four role cells (Property owner with company-type badge, Operator, Parent organization, Management company) with source dots and "since" year; Key contacts (name links to contact record); Ownership history timeline. Links: Owner profile, All relationships.
- **Related deals** — table of all linked deals (active first): name/code/type/skipped LOI, stage, building role, price allocation (tooltip = basis), projected/actual close, status. Row click opens the **deal preview drawer**, which has **Open deal record**.
- **Building condition** — overall rating, core systems with condition meter and remaining useful life, deferred maintenance total and immediate amount, last renovation.
- **Recent site visits** — latest visit summary, participants, photo placeholders, open observations, follow-ups done.

Right column:
- **Attention required** — derived list (`attentionItems` in `selectors.ts`), sorted high → medium → low:
  - Missing required documents (status Not Requested / Requested / Rejected); high if overdue or baseline.
  - Documents pending review (Received / In Review).
  - Documents awaiting revision.
  - Unverified tracked fields (one summary item).
  - Open site-visit follow-ups (high if overdue) and open medium/high observations.
  - Open CMS survey deficiencies.
  Each links to the relevant tab (documents open the request).
- **Documents** — "X of Y required approved", %, tiles Available / Missing / Pending review / Required total (click → filtered Documents tab), list of missing required docs.

### 5.2 Owner (`OwnerTab.tsx`) — CRM view of the current property owner
- **Empty state** (no current owner): "No current owner recorded" + **Set current owner**.
- **Owner banner**: logo, "Current property owner", name, source dot, "Owner since", parent company, count of buildings this company owns. **Company type** dropdown: Bank, Finco, Mezz Lender, REIT, Private, AR Lender, Not set — saves immediately (toast; activity on the building). **Edit company**, **Change owner**.
- **Contact** card — primary contact by default; switcher lists the roster. Shows photo, name, title, contact type, roster role, sectors, work email, mobile, office phone, LinkedIn, **Personal** (date of birth, personal email, mailing address — marked with a lock icon), tags, notes. **Edit**, **Open record** (→ `/contacts/:id`).
- **Company information** — name, type, parent, office address, website, acuity / regional / state focus, tags.
- **Active deals** / **Past deals** — company deals (seller, buyer, broker or lender) with columns Status, Name, State, Buildings, Beds, $ Amount, $ / Bed; 3 rows, "Show N more" expands. Row click → deal preview drawer.
- **Corporate roster** — Role, Name (link to contact; star = primary), Email, Phone (+ mobile), Notes; row menu: Edit contact, Make primary contact, Remove from roster. **Add contact**.
- **Change owner** dialog: search existing companies or create one (name + company type) and set an effective date. Previous owner record gets an end date and moves to history; new record is source `manual`, `unverified`. Activity: "Current owner changed to …".

### 5.3 CMS & Regulatory (`CmsTab.tsx`)
Mock-data banner (source label, provider #, last refreshed, **Refresh** — simulated, updates timestamp + activity). Rating tiles (overall, health, staffing, QM). Badges: abuse icon, SFF, open deficiencies. Nurse staffing (total HPRD vs state and national, RN/LPN/CNA, turnover). Quarterly rating history with up/down arrows. Survey history, deficiencies (tag, description, survey date, scope/severity with tooltip, status), penalties. Non-CMS buildings show an empty state explaining state licensure.

### 5.4 Property & Condition (`PropertyTab.tsx`)
Specifications (year built, GBA, sf per licensed bed, site area, stories, construction, sprinklers, generator, rooms, parking, licensed beds). Building systems table (condition, install year, remaining life, notes, source/date). Deferred maintenance (sorted by priority; total). Renovation history. Capital projects (status, budget, spent bar, target date). Empty state when no assessment exists.

### 5.5 Financials (`FinancialsTab.tsx`)
"Illustrative" banner. KPI tiles for the latest period with deltas vs prior period (revenue, EBITDAR + margin, NOI, occupancy in points). Operating history by period (FY2023, FY2024, FY2025, TTM) with source per column: revenue, opex, EBITDAR, rent, EBITDA, NOI (normalized, 5% management fee), occupancy. Payer mix bar + legend + skilled mix. Debt (lender, type, amounts, rate, dates; maturity badge if < 365 days). Capex by year with 5-year average and per-bed figure. Empty state when no financials.

### 5.6 Documents & Due Diligence (`src/features/buildings/documents/*`)
- **Progress header**: "X of Y required documents approved", %, status distribution bar with legend (click legend → status filter), tiles Missing / To review / Overdue.
- **Quick views**: All, Missing (required items in Not Requested / Requested / Rejected), Pending review (Received / In Review), Needs revision, Approved. Search, category filter, status filter. Category groups are collapsible and show "n/m approved".
- **Row**: name, Baseline badge, Required/Optional, latest file + version + age, deal; requested from; reviewer; due date (red + "Nd late" when overdue); **inline status select**; **Review** button (Received/In Review) or **Upload** button.
- **Statuses**: Not Requested, Requested, Received, In Review, Approved, Rejected, Needs Revision. Status change writes a comment ("Status changed from … to …"); changing to Requested writes an activity.
- **Overdue** = due date in the past and status Requested or Needs Revision.
- **Upload** (row or drawer): records file metadata as a new version; status → Received (or In Review if it was Approved); comment + activity "… uploaded". File bytes are kept for the browser session only (preview of images/PDFs this session); metadata persists.
- **Review drawer** (`DocumentReviewSheet.tsx`): preview (session file or mock page), file info. **Review decision** (when a file exists and status is Received / In Review / Needs Revision / Rejected): Approve, Request revision, Reject — revision/reject **require a comment**. **Start review** moves Received → In Review. Approved state shows approver + **Reopen**. Editable details: status, reviewer, due date, requested from, associated deal, required (locked for baseline), notes. Versions list, comment thread (+ add comment), **Remove request** (not allowed for baseline items).
- **Add request** dialog: name (required), category, deal, requested from (suggestions), reviewer, due date (default +14 days), required, "Mark as requested now", notes.
- **Checklist template** dialog: lists baseline + diligence template items (SNF-only items hidden for non-CMS types); items already present are disabled; required items preselected; adds as Not Requested; activity "N checklist items added from template".
- **Connected data room** panel (simulated SharePoint): folder, last sync, **Sync now** (imports one file for the next Requested/Needs Revision item → status Received, activity), recently imported list (click opens the request). Not-connected state offers **Connect folder**.
- **Completion by category** bars (click filters).

### 5.7 Site Visits (`SiteVisitsTab.tsx`, `AddSiteVisitDialog.tsx`)
Counts (visits, open observations, open follow-ups). Visit cards: type, date, linked deal, participants, summary, observations (Resolve/Reopen), follow-up tasks (checkbox; overdue in red), condition ratings, photo placeholders. **Add site visit**: date*, type, related deal, participants* (chips + team suggestions), summary*, condition rating per system (toggle), observations (text, severity, system), follow-up tasks (title, assignee, due date), photos (file names recorded; placeholders shown). Validation message when required fields are missing. Activity "Site visit recorded".

### 5.8 Relationships (`RelationshipsTab.tsx`)
Organization groups (Owners incl. company-type badge, Operators & management, Brokers, Lenders, Attorneys, Other) with Former badges; Contacts table (name links to contact record, organization, relationship, email/phone); Active and Historical deals (click → deal preview).

### 5.9 Activity (`ActivityTab.tsx`)
Note composer (Post note → activity "Note added"); filters All / Documents / Deals / Site visits / Data & verification / Notes; timeline grouped by day; summary counts.

## 6. Edit Building (sheet)
Source: `src/features/buildings/detail/dialogs/EditBuildingSheet.tsx`.
- Required: name, city, certified beds > 0 (Save disabled otherwise).
- Tracked fields (certified beds, licensed beds, ADC, year built, square footage) each have a value and a verification select. **Changing a value** sets source `manual`, as-of today, chosen verification. Changing only verification keeps the source.
- **CCN change** retires the current CCN (effective-to today, note "Superseded via manual edit") and adds a new current identifier — CCNs are never overwritten.
- Building verification status; "last verified" set to today when it changes to Verified.
- Activity "Building details updated" listing changed fields; verification change writes a separate activity.

## 7. Add to Deal (dialog)
Lists active deals; already-linked deals are disabled. Role (Primary asset / Portfolio asset / Add-on / Excluded; defaults by deal type), optional price allocation, notes. Creates a deal–building relationship; activity "Added to …".

## 8. Acceptance criteria

1. Given the directory, when I type "Maple" in search, then only Maple Grove is listed and the metrics reflect one facility.
2. Given filter State = Kentucky, then exactly the Kentucky facilities are listed and a "KY" chip appears; Clear all restores all rows.
3. Given filter Owner type = Bank, then only buildings whose current owner's company type is Bank are listed.
4. Given I sort by Certified beds descending, the largest facility is first.
5. Given I switch to Cards and reload, Cards view is still selected.
6. Given Add Building → Search CMS → a record already in the repository, then it cannot be selected and offers Open.
7. Given Add Building via CMS search for a new facility and I confirm, then I land on the new building, it has two baseline document placeholders, and it persists after reload.
8. Given Add Building → Create manually with no name, when I click Review details, then required fields are highlighted and I stay on the form.
9. Given I edit a building's ADC, then the ADC tile shows source Manual entry, and an activity lists "average daily census".
10. Given I change the CCN, then the previous CCN appears in the "prior" tooltip with an end date of today.
11. Given Mark as verified, then all key fields show verified and the building verification badge reads Verified.
12. Given a required document in Requested status past its due date, then it appears in Attention required as high priority and in the Missing view with "Nd late".
13. Given a document In Review, when I Approve, then status = Approved, the required-approved count increases on the Documents tab and on Overview, and an activity is written.
14. Given Request revision or Reject without a comment, then a warning toast asks for a comment and the status is unchanged.
15. Given I upload a file on a Requested item, then status = Received and the version list shows v1.
16. Given the data room is connected and an item is Requested, when I Sync now, then that item becomes Received with a SharePoint-sourced file.
17. Given the Owner tab, when I change Company type to REIT, then the badge updates in the header, Overview and Relationships, and the directory Owner type filter reflects it.
18. Given Change owner → create "X Bank" (Bank), then the banner shows X Bank, the previous owner appears in ownership history, and this persists after reload.
19. Given I add a contact with no name, then "Name is required." is shown and nothing is saved.
20. Given the photo gallery has more than 5 photos, then 5 are shown with "Show all N photos"; Set as cover moves the photo to first and updates the header image.
21. Given Add site visit without a summary, then a validation message is shown; with valid input the visit appears first and an activity is written.
22. Given a building with no CMS data and type Assisted Living, the CMS tab shows the non-certified empty state.
23. Given an unknown building URL, the "Building not found" state is shown.
