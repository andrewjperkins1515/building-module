# Decisions log and open questions

Decisions made while building the prototype, with rationale. **Revisit?** = Yes means the decision was a reasonable default chosen without explicit product sign-off and should be confirmed before production.

## 1. Platform and data model

| # | Decision | Rationale | Revisit? |
|---|---|---|---|
| D1 | Stack: React, TypeScript, Vite, Tailwind, shadcn-style components on Radix, Lucide, React Router. Development team confirmed it can adopt this stack and design system. | Requested in the original brief. | No |
| D2 | Buildings have stable internal IDs; CMS CCN, state license and NPI are time-bounded identifiers. Changing a CCN retires the old one (effective-to date) instead of overwriting. | CCNs follow the operator's certification and change at a CHOW; the property is permanent. | No |
| D3 | Deal-specific values (role in deal, price allocation, allocation basis) live on the deal–building relationship, never on the building. | A building can be in many deals over time. | No |
| D4 | Key building facts (certified/licensed beds, ADC, year built, square footage) carry source, as-of date, verification status and verified-by. | Brief required source metadata and verification. | No |
| D5 | Ownership is a time-bounded list of ownership records per role (property owner, operator, parent, management). "Change owner" ends the current record and starts a new one. | Preserves ownership history. | No |
| D6 | CMS, financial, survey and condition data are mock/illustrative and labeled as such. | No CMS integration in scope. | Production: real sources |
| D7 | Prototype persistence is browser localStorage with versioned migrations; file bytes are not stored (session preview only); images are downscaled and stored inline. | Prototype only; replace with database + object storage. | Production |

## 2. Buildings

| # | Decision | Rationale | Revisit? |
|---|---|---|---|
| B1 | Every building gets two baseline document placeholders: Current facility license and Floor plan (required). | Brief. | No |
| B2 | "Missing" documents = **required** items in Not Requested, Requested or Rejected. Optional items never count as missing. | Aligns the header, quick views, Overview and Attention panel (inconsistency found in testing). | No |
| B3 | Overdue = due date passed and status Requested or Needs Revision. | Only items awaiting the counterparty can be late. | Yes |
| B4 | Reject / Request revision require a review comment; Approve does not. | Audit trail for negative decisions. | No |
| B5 | Occupancy = ADC ÷ **certified** beds; 85% shown as target. | Common SNF convention. | Yes |
| B6 | The "Building Template" spreadsheet was interpreted as a CRM owner profile on the building: Owner tab with contact (incl. personal data), tags, company information, corporate roster, active/past deals (3 rows, expandable) and a photo carousel (5, expandable). | Spreadsheet described contact/company data; product owner confirmed "the building module on a CRM" showing who owns the real estate. | No |
| B7 | Company type is a dropdown: Bank, Finco, Mezz Lender, REIT, Private, AR Lender (+ Not set). Kept separate from the company's **role** (owner, operator, broker, lender…). | Product owner's list; a company can be a lender on one building and owner of another. | No |
| B8 | Personal contact data (DOB, personal email, mailing address) is stored and shown to all users in the prototype, marked with a lock icon. | Product owner: CRM needs it; role-based restrictions later. | Production: roles |
| B9 | "Owner type" filter added to the Buildings directory. | Lets users find bank-owned / REIT-owned facilities. | No |

## 3. Contacts

| # | Decision | Rationale | Revisit? |
|---|---|---|---|
| C1 | Contact types: Operator, Vendor (Due Diligence), Vendor (Operating), Investor / Capital Provider, Broker, Lawyer. Sectors: Skilled Nursing Facility, Assisted Living, Independent Living, Memory Care Facility (multi). | Product-owner specified. | No |
| C2 | Default contact type and sectors derive from the company (role and acuity focus) and are editable. | Fast data entry. | Yes |
| C3 | A contact's deals are the deals where **their company** is seller, buyer, broker or lender. | Deals don't yet link to individual people beyond the deal-contact roles. | Yes — consider linking via deal-contact roles too |
| C4 | Internal buyer team (Jordan Ellis, Priya Raman, etc.) exist as contacts at OD Acquisition Holdings, tagged Internal, and are excluded from email tracking. | Deal-contact pickers select "from contacts in the system". | Yes — map to user accounts |
| C5 | Communications tab uses fictional email threads, calls and meetings generated per contact; manual logging supported. | Outlook integration planned. | Production: Outlook |

## 4. Deals — overview and pipeline

| # | Decision | Rationale | Revisit? |
|---|---|---|---|
| E1 | Deal type pick list: Acquisition, Sale-Leaseback, Joint Venture, Recapitalization, Refinance, Disposition. | Template said "Pick List" without values. | Yes |
| E2 | Primary asset class pick list: Skilled Nursing, Assisted Living, Independent Living, Memory Care, CCRC / Campus, Mixed Portfolio. Defaults from the deal's buildings. | Template said "Pick List". | Yes |
| E3 | Third-party report status: Not Ordered, Ordered, In Progress, Draft Received, Final Received, Waived. | Template listed "Status" only. | Yes |
| E4 | Asking price per bed uses **licensed** beds. | Template's bed field is "Total Lic Beds". | Yes |
| E5 | States, total buildings and total licensed beds are calculated from linked buildings, with optional manual overrides. | Template marks them "Input / calculated"; buildings may not all be in the system yet. | No |
| E6 | Current operator defaults to the operator(s) of the linked buildings, overridable. | Template: "display company name from contacts list". | No |
| E7 | Buyer/seller contact roles (7 each) and vendor roles (8) as in the template; firm, email, phone auto-fill from the contact. Additional distribution lists are semicolon-separated text with validation. | Template. | No |
| E8 | Buildings table shows the template's CMS columns, 10 rows expandable. "Affiliated entity" = parent organization, else operator. "Date first approved" = earliest CCN effective date. | Template; interpretation of CMS fields. | Yes |
| E9 | Milestones: High-Level Review, LOI Signed, PSA Signed, **Deal Closed**, **Transitioned to Asset Management** (deal officially finished). | Product owner request. | No |
| E10 | Market comps (code MKT-…) are recorded third-party transactions without checklists, hidden from the pipeline by default. | Provide counterparty deal history. | Yes |
| E11 | Company names on deals are not links (no Organizations module yet); buildings and contacts are. | Out of scope. | When Organizations exists |

## 5. Deals — Progress tab

| # | Decision | Rationale | Revisit? |
|---|---|---|---|
| P1 | 19 checklist items and their stages taken from the "Deal Progress Tab" sheet; an "x" means the item has no further stage. | Spreadsheet. | No |
| P2 | Non-bold lists attach as **sub-items of the stage in whose column they appear** (e.g., capital sources under "Senior Lender"; Rates/Labor under "Collect Due Diligence and Third-Party Input"; the report list under "Solicit Proposals"). Sub-items can be done or N/A; all resolved completes the stage. | Spreadsheet layout. | Yes — confirm per item |
| P3 | Single-stage items (Internal Approvals, Guarantor, Insurance, Accounting, Closing and Funding, Post Closing) become one stage whose sub-items are the full list (including the bold first entry). | Avoids a stage named after one list entry. | Yes |
| P4 | Typos corrected (Structuring, Acquisition, Purchase, Guarantor, Lease Classification, First Month's Rent Invoices, etc.). "Review" after "Draft 2" renamed "Review 2". | Readability. | No |
| P5 | PSA LOI: no responsible party and no document; the approver's sign-off completes "Completed (Moved to File System)". | Sheet: Approver "** Marks it done **", Responsible Party and Document "x". | Yes |
| P6 | Hand Off to Asset Management: single auto stage completed when the deal is Transitioned to AM; no document. | No stages in the sheet. | Yes |
| P7 | Auto stages: Deal Sourced (record exists, buildings linked = "data tape", data room link set); Order Third-Party Reports Engage / Collect Drafts / Collect & Approve Final Draft from vendors and report statuses. | Product owner: "completed once the Dataroom is set up in the system". | Yes — extend list |
| P8 | Sign-off: responsible party submits documentation → approver approves (files to Documents tab) or requests changes. Approval only after all stages are complete/skipped. | Product owner workflow. | No |
| P9 | Flexibility: skip stage, N/A sub-item, waive document, mark item not needed (excluded from progress) — reason required, logged, reversible. | Product owner: deals must not get stuck. | No |
| P10 | Progress: item = (stages + approval + document) steps with partial credit for current-stage sub-items; deal = **equal-weight** average of non-bypassed items. | Simple default. | **Yes — open question Q1** |
| P11 | Deal approver approves every item by default; items can have their own approver; "Apply to all items" resets. Only the assigned approver can approve, request changes or revoke. | Product owner answer #1. | No |
| P12 | Default responsible parties/approvers per item (e.g., NDA → buyer transaction counsel; Title → title vendor; DD Requests → seller team lead; in-house counsel approves items the team lead is responsible for). | Product owner: "defaults are fine for now". | Later |
| P13 | Prototype "Acting as" persona switcher stands in for user accounts. | Needed to demonstrate approver restrictions. | Production: auth |
| P14 | Pipeline phases from the "Deal" sheet: red items are the phase checklist, each derived from the checklist/deal record with manual override; "Critical Dates Set" is manual-only. | Sheet legend RED = checklist. | Yes — Critical Dates source |
| P15 | Auto-advance: phase complete → that column's milestone (BOE → LOI Signed, Full DD → PSA Signed with Skipped LOI if needed, Pre-Closing → Deal Closed); Closed → Transitioned to AM when Post Closing Follow Up is complete or not needed. Forward-only, banner with Undo, milestone floor prevents fighting manual moves, per-deal switch (default on). | Product owner answer #4 and the sheet's phase/milestone alignment. | Yes — confirm triggers |
| P16 | Anyone can complete stages, tick sub-items, upload documents and bypass items; only approval actions are restricted. | Not specified. | **Yes — open question Q3** |

## 6. Open questions

| # | Question | Context / current behavior |
|---|---|---|
| Q1 | **Progress weighting** — should some checklist items (e.g., Acquisition Documents, Closing and Funding Mechanics) weigh more toward deal progress? | Awaiting clarification; currently equal weighting (P10). |
| Q2 | **Item #5** from the product owner's reply was left blank. | Follow up with the product owner. |
| Q3 | Who may complete stages, upload documentation, skip stages and mark items not needed? Only the responsible party? Deal team only? | Currently anyone (P16). |
| Q4 | Role-based visibility of personal contact data (DOB, personal email, mailing address). Which roles see it? | Currently visible to all (B8). |
| Q5 | Organizations module scope (company records as first-class pages; links from deals). | Placeholder module. |
| Q6 | Source for "Critical Dates Set" — a critical-dates schedule on the deal (DD expiry, deposit dates, closing)? | Manual-only today (P14). |
| Q7 | Outlook matching rules: by address only or also by domain; whose mailboxes sync; private emails. | Simulated today. |
| Q8 | Should completing specific checklist items auto-advance milestones directly (in addition to phases)? E.g., PSA LOI complete → PSA Signed. | Phase-based today. |
| Q9 | Pick-list values E1–E3 and contact defaults C2 — confirm or replace. | Prototype defaults. |
| Q10 | Document storage of record: SharePoint data room vs Owner Docket file storage; retention and versioning. | Session-only bytes today. |
| Q11 | Should approvals require a specific approver per item type by default (e.g., legal items → in-house counsel) via configurable templates? | Hard-coded defaults today. |
| Q12 | Which deal stage transitions require approval or confirmation (e.g., marking Deal Closed)? | No confirmation today besides dead/abandoned reason. |
| Q13 | Mock data replacement: real CMS Care Compare ingestion cadence, state license data, financial reporting sources. | Mock today. |
