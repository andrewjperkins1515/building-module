# Deals module — functional specification

Acquisition deals from High-Level Review through close and transition to Asset Management. A deal links to one or more buildings, to CRM companies (seller, source, operators, JV partner) and to CRM contacts (buyer team, seller team, vendors). The **Progress** tab is a structured checklist that drives the deal's progress bar and, optionally, its pipeline milestone.

Source code: `src/features/deals/**`; checklist engine `src/lib/checklist.ts`; deal totals `dealView` in `src/store/selectors.ts`; actions in `src/store/DataProvider.tsx` (`updateDeal`, `addDeal`, `setDealContact`, `updateDealReport`, `removeDealBuilding`, `checklistAction`, `setPhaseOverride`, `setDealApprover`, `undoAutoAdvance`, `dismissAutoAdvance`); seed data `src/data/deals.ts`, `src/data/dealDetails.ts`.

## 1. Routes

| URL | Screen | Source |
|---|---|---|
| `/deals` | Pipeline (board / table) | `DealsDirectory.tsx` |
| `/deals/:dealId` | Deal record — Overview | `DealRecord.tsx`, `DealOverview.tsx` |
| `/deals/:dealId/progress` | Progress tab (`?item=<key>` opens and scrolls to an item) | `ProgressTab.tsx` |
| `/deals/:dealId/documents` | Documents tab | `DealDocumentsTab.tsx` |

## 2. Milestones and statuses

**Milestones (stages)**, in order: High-Level Review → LOI Signed → PSA Signed → Deal Closed → Transitioned to Asset Management. "Transitioned to Asset Management" means the deal is officially finished.

**Status**: Active, Closed, Dead, Abandoned. Deal Closed and Transitioned to Asset Management both have status Closed. A deal that went straight to PSA is flagged **Skipped LOI** (shown as a dashed, struck-through LOI step).

**Market comps**: deals whose code starts with `MKT` are recorded third-party transactions; they have no checklist and are hidden from the pipeline unless "Market comps" is on.

## 3. Pipeline (`/deals`)

- **Metrics** (non-comp deals): Active deals (+ under PSA), Pipeline asking value (Σ asking price of active), Buildings / beds (Σ total buildings / Σ total licensed beds of active), Closing in 60 days (active deals with projected close 0–60 days out, named), Avg. progress (mean progress % of active deals).
- **Search**: deal name, code, lead, seller name, building names.
- **Filters**: Status (default **Active + Closed**), Deal type, Asset class, State, Lead, Market comps toggle. Chips + Clear all. View and filters persist per browser (`owner-docket:deals-prefs`).
- **Board**: one column per milestone (5), header shows count and Σ asking (or purchase) price. Card: name, code, status badge if not active, buildings · licensed beds, states, asking price, $/bed (rounded to $1K), progress bar + %, lead, projected or actual close date. Card click → deal record.
- **Table**: Deal (name, code, lead), Stage (+ status), Type / asset class, Seller, State(s), Bldgs / beds, Asking, $ / bed, Close, Progress (bar, or "Market comp").
- **New Deal** (dialog, `NewDealDialog.tsx`): Deal name (required), Deal type, Primary asset class (default "From selected buildings"), Buildings (searchable multi-select), Seller (defaults to the current owner of the first selected building), Buyer team lead (internal contacts first; default Jordan Ellis), Asking price, Projected closing date, Starting stage (HLR / LOI / PSA) and "Skipped LOI" when starting at PSA. Creates code `OD-<year>-<nnn>` (next number), type portfolio when >1 building, buyer = OD Acquisition Holdings, a fresh 19-item checklist (PSA LOI marked not needed when Skipped LOI), deal–building links and activities. Navigates to the record.

## 4. Deal record — header and stage control (`DealRecord.tsx`)
- Code · Portfolio/Single asset · Lead; name; badges: status, stage, deal type, asset class, Skipped LOI; summary; dead/abandoned reason.
- **Edit deal** → Edit sheet (§5.2).
- **Change stage** menu: move to any milestone; **Mark dead** / **Mark abandoned** (reason required, dialog); **Reopen deal** for closed/dead/abandoned.
  - Moving to Deal Closed or Transitioned to AM sets status Closed and actual close date (if not set).
  - Moving from HLR straight to PSA sets Skipped LOI; moving back to HLR or LOI clears it.
  - Reopen sets status Active; a closed/AM deal returns to PSA Signed.
  - Every manual move records a **milestone floor** (see §7.6) and clears any auto-advance banner. Each move writes an activity on every building in the deal.
- **Auto-advance banner**: "Moved to <milestone> automatically — <phase> complete." with **Undo** and **Dismiss**.
- Tabs: Overview · Progress (badge = progress %) · Documents (badge = filed documents).

## 5. Overview tab (`DealOverview.tsx`) — per the Deal Record Overview template

### 5.1 Progress card
Overall progress %, "X of Y checklist items complete · N awaiting approval", progress bar, 5-step milestone tracker. Click → Progress tab.

### 5.2 Deal summary (left / right columns)
| Field | Source |
|---|---|
| Deal name | stored |
| Deal type | pick list: Acquisition, Sale-Leaseback, Joint Venture, Recapitalization, Refinance, Disposition |
| Primary asset class | pick list: Skilled Nursing, Assisted Living, Independent Living, Memory Care, CCRC / Campus, Mixed Portfolio |
| Source | company + contact (name links to contact record; email shown) |
| Asking price | stored |
| Asking price per bed | **calculated** = asking price ÷ total licensed beds |
| State(s) | **calculated** from linked buildings unless manually overridden ("Manual" badge) |
| Total buildings | **calculated** count of linked buildings unless overridden |
| Total licensed beds | **calculated** Σ licensed beds of linked buildings unless overridden |
| Current operator | stored override, else the current operator(s) of the linked buildings |
| Seller (current owner), New operator, JV partner | CRM companies |
| JV % | 0–100 |
| Projected closing date | date; when closed shows "Closed <date> (projected …)" |
| Link to data room | URL (opens in new tab) |
| Deal lead | stored name |

**Edit deal** sheet (`EditDealSheet.tsx`): all of the above; companies and contacts via type-ahead pickers; choosing a source contact also sets the source company; overrides left blank fall back to calculated values (placeholders show the calculated value). Validation: name required; JV % 0–100. Save writes activity "Deal details updated".

### 5.3 Deal contacts (Buyer) and Deal contacts (Seller)
Seven roles each: Team Lead, Support 1, Support 2, In-House Counsel, Transaction Counsel, Financing Counsel, Regulatory / Licensure Counsel. Columns: Role · Firm (auto from contact's company) · Name (type-ahead picker — "start typing a name and select from contacts in the system"; relevant firms listed first) · Email (auto) · Phone (auto; mobile preferred). Open-record icon next to each name. "N of 7 roles assigned".
**Additional distribution list** per side: free text, addresses separated by semicolons/commas/new lines; shows address count and number invalid; saves on blur.

### 5.4 Third-party vendors
Eight roles: Survey, Title, Zoning, Environmental, Property Condition, Appraisals, Reimbursement Consultant, Operations Consultant — same columns and picker as §5.3. "N of 8 engaged".

### 5.5 Third-party reports
One row per vendor role: Date ordered (setting a date on a Not Ordered report changes it to Ordered), Status (Not Ordered, Ordered, In Progress, Draft Received, Final Received, Waived), Expected delivery, Link to report (paste/edit; "Open report"). "N of 8 final or waived".

### 5.6 Buildings
CMS-style table, 10 rows with "Show all N buildings": Photo, CCN, Provider name (link to building), Provider address, City, State, Affiliated entity (parent organization, else operator), Date first approved for Medicare & Medicaid (earliest CCN effective date), Certified beds, Avg. residents per day, Overall, Health inspection, QM, Long-stay QM, Short-stay QM, Staffing ratings, Special focus status (SFF / SFF candidate / Not SFF / N/A). Row click → building. **Add building** (multi-select from repository, already-linked excluded) and remove (row hover). Activities written on each building.

## 6. Documents tab (`DealDocumentsTab.tsx`)
All documentation submitted through checklist items. Views: Filed (approved), Awaiting approval (submitted or changes requested), All; search. Columns: Document (opens session file if available), Checklist item (link → Progress tab with the item open), Status, Submitted (by, date), Approved (by, date). Data room link shown when set.

## 7. Progress tab (`ProgressTab.tsx`, engine `src/lib/checklist.ts`)

### 7.1 Checklist items (template `CHECKLIST_TEMPLATE`)
| # | Item | Stages (sub-items in brackets) |
|---|---|---|
| 1 | Deal Sourced | Owner Docket Setup *(auto)* · Datatape Setup *(auto)* · Dataroom Setup *(auto)* |
| 2 | NDA | Draft · Comments · Execution |
| 3 | Due Diligence Requests | Seller Provides · Buyer Reviews · Buyer Signs Off |
| 4 | Capital Structuring | Senior Lender [Mezzanine Lender, Preferred Equity, Common Equity, Seller Debt, Earnout] · Solicit Capital Partner Term Sheets · Finalize Capital Terms |
| 5 | Historical & Pro Forma Model | Back of Envelope Model · Collect Due Diligence and Third-Party Input [Rates, Labor] · Refine Model · Finalize Model |
| 6 | Lease Term Sheet | Identify Operator · Negotiate Terms · Draft LOI · Comments · Finalize · Execute |
| 7 | PSA LOI | Negotiate Terms · Draft · Comments · Finalize · Execute · Completed (Moved to File System) *(completed by approval)* |
| 8 | Internal Approvals | single stage [Investment Lead / CIO Approval, Investment Committee, Accounting, Tax, Legal] |
| 9 | Engage Title / Escrow Agent | Escrow Instruction Letter · Deposit · Closing Conditions · Closing Statement Draft [Invoices, Transfer Taxes, Mortgage Taxes, Recording Fees, Prorations] |
| 10 | Order Third-Party Reports | Solicit Proposals [Title Policies, Land Surveys, Zoning Reports, Property Condition Reports, Environmental Reports, Appraisals, Rate Consultant, Transaction Counsel, Licensure / Regulatory Counsel, Engage with Capital, Internal Site Visits] · Engage *(auto)* · Schedule Site Visits · Collect Drafts *(auto)* · Comment · Finalize · Collect & Approve Final Draft *(auto)* · Collect Final Invoices |
| 11 | Investment Summary | Build Template [Recommendation, Returns Summary, Subject Portfolio, Backstory, Structure, Thesis / Assumptions, Risks / Mitigants, Clinical, Photos, Operator — About / Key Personnel / Global Map / Global Performance / Global Clinical] · Draft · Review · Draft 2 · Review 2 · Finalize · Publish |
| 12 | Acquisition Documents | Draft [APA / MIPA, Deposit, Purchase Price, Security Package (Indemnity), Allocations, Timing, Schedules] · Redline · Comments · Issues List · Finalize · Execute |
| 13 | Lease & Guaranty Documents | Draft [Term, Rent, CapEx Requirements, Escalators, Purchase Option, Contingent Payments, Guaranty, Schedules] · Redline · Comments · Issues List · Finalize · Execute |
| 14 | Guarantor | single stage [PSA Guarantor, Lease / Loan Guarantor Review] |
| 15 | Insurance Requirements | single stage [GL / PL, Property, Cyber Insurance, Workers' Comp] |
| 16 | Lease / Loan Accounting | single stage [Lease Classification, First Month's Rent Invoices] |
| 17 | Closing and Funding Mechanics | single stage [14 items: Invoices to Title … Authorize Funding, Authorize Closing] |
| 18 | Post Closing Follow Up | single stage [Operator Portal, Invoicing, Collect Any Other Post-Closing Items] |
| 19 | Hand Off to Asset Management | Transitioned to Asset Management *(auto)*; no document required |

Every item requires a responsible party, an approval and a document, **except** PSA LOI (no responsible party, no document; approval completes its final stage) and Hand Off (no document).

### 7.2 Automatic (system-driven) stages
| Rule | Completes when |
|---|---|
| `deal_created` | always (deal record exists) |
| `has_buildings` | ≥1 building linked to the deal |
| `has_dataroom` | deal has a data room link (can be entered inline on the stage) |
| `vendors_engaged` | ≥1 third-party vendor assigned on the deal |
| `reports_drafts` | any report Draft Received or Final Received |
| `reports_finals` | every ordered report (status ≠ Not Ordered) is Final Received or Waived, and ≥1 is ordered |
| `transitioned_to_am` | deal stage = Transitioned to Asset Management |

Auto stages are evaluated after **every** data change (`applyAutoRules`); they can complete out of order and are completed by "System" (history entry). Auto stages can also be completed manually ("Mark complete manually").

### 7.3 Stage and sub-item actions
- **Current stage** = first stage still To Do (stages completed by approval are not "current").
- **Complete stage** (current stage) · **Skip stage** (reason required; skipped counts as complete) · **Undo** on the most recently completed/skipped stage (only while not approved; resets approval to pending).
- **Sub-items**: tick done, or **N/A**. When every sub-item of a stage is done or N/A, the stage completes automatically ("all items resolved").

### 7.4 Sign-off workflow
1. **Responsible party** obtains documentation and **uploads** it → document status Submitted; history entry. Anyone may upload (prototype).
2. Approval opens only when every work stage is complete or skipped.
3. **Approver** (see §7.5): **Approve** (or "Approve & file" when documents are submitted) → approval = approved; submitted documents become Approved and appear in the Documents tab; stages flagged "completed by approval" (PSA LOI final stage) complete; activity on deal buildings. Approve is disabled while a required document is neither submitted, approved nor waived.
4. **Request changes** (comment required) → submitted documents become "Changes requested" with the note; item returns to Awaiting documentation.
5. **Revoke** approval → pending; approval-completed stages reopen.

**Item state** (`itemState`): Not needed (bypassed) · Complete (approved + all stages resolved + document satisfied) · Awaiting approval · Awaiting documentation · In progress · Not started.

### 7.5 Approvers and permissions
- **Deal approver**: approves every item by default (set in the "Deal approver" bar). Seed default: buyer team lead.
- **Item approver**: optional override per item ("Use deal approver instead" removes it). **Apply to all items** clears every item override.
- Seed defaults for responsible parties and item approvers come from deal roles (e.g., NDA → buyer transaction counsel; Engage Title → title vendor; Due Diligence Requests → seller team lead; Capital Structuring, Lease Term Sheet, Internal Approvals, Closing and Funding → approver = buyer in-house counsel).
- **Rule**: only the effective approver (`item.approverContactId ?? deal.dealApproverContactId`) may Approve, Request changes or Revoke. The store enforces this (`checklistAction` returns `false` and makes no change). Others see "Awaiting sign-off from <name>. Only the assigned approver can approve…".
- **Acting as** (account menu): prototype persona switcher listing internal team contacts; persisted per browser (`owner-docket:acting-as`). All actions are recorded under the persona. Production replaces this with authenticated users.

### 7.6 Flexibility / bypass mechanisms
All require a reason (except N/A), are written to the item history, and are reversible:
- **Skip stage** · **N/A sub-item** · **Waive document** (Restore) · **Not needed for this deal** on a whole item (Restore) — bypassed items are excluded from deal progress and counted separately.

### 7.7 Progress calculation
- Item steps = stages + 1 (approval) + 1 (document, when required).
- Done = resolved stages + approval (if approved) + document (if approved or waived) + partial credit for the current stage's resolved sub-items (resolved ÷ total).
- Item progress = done ÷ steps (bypassed = excluded).
- **Deal progress** = average of non-bypassed items (equal weighting). Used on the record, Overview card, pipeline board/table and metrics.

### 7.8 Pipeline phases and milestone auto-advance
Phase panel (from the "Deal" sheet) — each phase item ticks from data, or by manual override (click; "reset" returns to automatic):

| Phase → milestone | Items (rule) |
|---|---|
| Sourced → High-Level Review | Identify Price (asking price set) · Set Target Closing Date (projected close set) |
| BOE Review → LOI Signed | Engage Legal (buyer transaction counsel assigned) · LOI Issued (PSA LOI "Draft" done) · Critical Dates Set (**manual only**) · Source Funding (Capital Structuring "Senior Lender" done) |
| Full Due Diligence → PSA Signed | Produce PSA and Other Key Docs (Acquisition Documents "Draft" done) · Order Third Parties (Order Third-Party Reports "Engage" done) · Funding Term Sheet Signed (Capital Structuring "Finalize Capital Terms" done) |
| Pre-Closing → Deal Closed | Key Docs in Final Form (Acquisition Documents "Finalize" done) · Received 3rd-Party Drafts / Finals ("Collect Drafts" done) · Funding Closing Authorization (Closing and Funding "Authorize Funding" sub-item done) |
| Closed → Transitioned to AM | Post Closing Follow Up item complete or not needed (deal must be at/reaching Deal Closed) |

**Auto-advance** (`pendingAutoAdvance`, evaluated after every change): target = furthest milestone supported by completed phases. The deal moves to the target only if: auto-advance is on (per-deal switch, default on), status is not dead/abandoned, not a market comp, and target is beyond both the current stage and the **milestone floor**. On move: stage updated; closing milestones set status Closed + actual close date; skipping from HLR to PSA sets Skipped LOI; floor = target; banner recorded; activity on each deal building. **Undo** restores the previous stage/status (clears Skipped LOI when returning to HLR/LOI) and keeps the floor so it does not immediately re-advance. Manual stage changes set floor = max(new stage, phase target) so existing completion doesn't fight the user.

### 7.9 Filters and layout
Overall card with state filter chips (All, Awaiting approval, Awaiting documentation, In progress, Not started, Complete, Not needed) and milestone tracker; Pipeline phases panel with auto-advance switch and explanation; Deal approver bar; checklist rows (number/state icon, title, state badge, subtitle — current stage "Stage n of N: …" or awaiting party, segmented stage/doc/approval bar, responsible + approver avatars, %); expand for Stages panel and Sign-off panel (responsible party, approver, document list with statuses and remove for unapproved files, upload, waive, approval box, history, Not needed).

## 8. Acceptance criteria

**Pipeline**
1. Default view shows active and closed non-comp deals in 5 board columns; toggling Market comps adds MKT deals.
2. Filter Lead = Priya Raman shows only her deals; filters persist after reload.
3. New Deal without a name shows "Deal name is required."; selecting Prairie View pre-fills Seller = Lakeshore Commercial Bank; Create navigates to the new record with code OD-<year>-<next>.

**Overview**
4. Asking price per bed = asking ÷ total licensed beds (Great Lakes: $86,500,000 ÷ 470 = $184,043).
5. Clearing the states override returns to calculated states; setting it shows a "Manual" badge.
6. Typing "natalie" in Buyer In-House Counsel and pressing Enter fills Firm, Email and Phone automatically and links to her record.
7. Entering "bad-address" in a distribution list shows "1 invalid".
8. Setting an Ordered date on a Not Ordered report changes its status to Ordered.
9. Buildings table shows 10 rows max with "Show all N buildings"; provider name links to the building.

**Stages**
10. Change stage → Deal Closed sets status Closed and the tracker shows Deal Closed checked with step 5 pending; → Transitioned to AM checks all five.
11. Mark dead requires a reason; Reopen returns status to Active.

**Progress**
12. Riverside (HLR) Deal Sourced shows Owner Docket Setup and Datatape Setup completed by System; entering a data room link completes Dataroom Setup automatically.
13. Ticking every sub-item (or N/A) of Capital Structuring "Senior Lender" completes that stage and the item moves to stage 2.
14. Skip stage requires a reason; the item advances and the history shows the reason.
15. Uploading documentation sets it to Awaiting approval; approving as the assigned approver files it to the Documents tab and the item becomes Complete; deal progress increases.
16. Acting as someone other than the approver shows "Only the assigned approver can approve…" and no Approve button.
17. Request changes (with comment) marks the document "Changes requested" and the item returns to Awaiting documentation.
18. PSA LOI: after its five work stages, approval (no document) completes "Completed (Moved to File System)".
19. Marking an item Not needed (reason) excludes it from progress ("N not needed for this deal"); Restore includes it again.
20. Setting an item approver shows "Item-specific approver"; Apply to all items reverts all items to the deal approver.
21. Completing all BOE Review phase items on an HLR deal moves it to LOI Signed with a banner; Undo returns it to HLR and it does not re-advance.
22. Completing Full Due Diligence on an HLR deal moves it to PSA Signed and marks Skipped LOI; manually moving back to HLR clears Skipped LOI and does not auto-advance again.
23. With Auto-advance milestones off, completing phases does not change the milestone.
24. On a Deal Closed deal, completing or bypassing Post Closing Follow Up moves it to Transitioned to Asset Management and completes Hand Off's auto stage.
