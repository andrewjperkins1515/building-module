# 06 · Business rules

Every rule that isn't obvious from the screens. Each one lives in **framework-free TypeScript** (no React, no storage) and most are covered by unit tests, so they can be moved to the backend as-is or used as the reference implementation.

| Area | Source | Tests |
|---|---|---|
| Deal checklist, progress, approvals, auto-advance | `src/lib/checklist.ts` | `src/lib/checklist.test.ts` |
| Calculated fields, attention items, CRM roll-ups | `src/store/selectors.ts` | `src/store/rules.test.ts` |
| Checklist template (19 items) | `CHECKLIST_TEMPLATE` in `src/lib/checklist.ts` | `checklist.test.ts` → "checklist template" |
| Pick lists & labels | `src/lib/labels.ts` | — |

Run them with `npm test`. **If your implementation passes equivalent tests, the rules match the prototype.**

---

## 1. Buildings

### 1.1 Identity & provenance
- Every building has a stable internal ID. CMS provider numbers (CCNs), state licenses and NPIs are **dated identifiers**: one current CCN, with prior CCNs kept with `effectiveFrom` / `effectiveTo` (a CCN changes on change of ownership, the building doesn't).
- Changing the CCN in Edit Building **retires** the current one (`effectiveTo = today`) and adds a new current one — it never overwrites.
- Key facts (certified beds, licensed beds, average daily census, year built, square feet) carry **source + as-of date + verification status** (`Tracked<T>`). Editing a value resets its source to "Manual entry"; marking it verified stamps the user and date.
- **Mark as verified** sets the building and all key facts to Verified.

### 1.2 Calculated fields
| Field | Rule |
|---|---|
| Occupancy | average daily census ÷ certified beds |
| Document completion % | approved **required** requests ÷ required requests |
| Missing documents | **required** requests in Not Requested, Requested or Rejected |
| Pending review | requests in Received or In Review |
| Overdue | Requested or Needs Revision with a due date in the past |
| Deferred maintenance | sum of deferred-maintenance item estimates |

### 1.3 Attention required (Overview panel), sorted High → Medium → Low
- Missing required document — **High** if overdue or a baseline placeholder, else Medium.
- Document received / in review — Medium. Needs revision — Low.
- Unverified key facts — Medium if more than two, else Low.
- Open site-visit follow-up — High if overdue, else Low. Open observation (medium/high severity) — matching severity.
- Open CMS survey deficiencies — High.

### 1.4 Documents & due diligence (building level)
- Every building gets two **baseline placeholders**: Current facility license, Floor plan (required, cannot be deleted).
- Status flow: Not Requested → Requested → Received → In Review → Approved / Rejected / Needs Revision. Uploading moves the request to Received (or back to In Review if it was Approved) and adds a version.
- Rejecting or requesting revision **requires a comment**.
- Simulated data-room sync imports the next Requested / Needs Revision item as Received.

### 1.5 Ownership
- Owner, operator, parent and management company are **time-bounded ownership records**. Changing the owner closes the current record (`endDate` = effective date) and opens a new one; history is kept.

---

## 2. Contacts & companies (CRM)
- A contact belongs to one company. **Contact type** (Operator, Vendor (Due Diligence), Vendor (Operating), Investor / Capital Provider, Broker, Lawyer) and **sectors** (SNF, ALF, ILF, MC — one or more) default from the company when a contact is created and can be changed.
- A company's **company type** (Bank, Finco, Mezz Lender, REIT, Private, AR Lender) is separate from its **role** (owner, operator, broker…).
- The first contact added to a company becomes its **primary contact**; deleting the primary promotes another roster member.
- **Company deals** (shown on the building Owner tab and on contact records): deals where the company is seller, buyer, broker or lender. Columns: Buildings = linked buildings; Beds = sum of certified beds; $ Amount = purchase price, else asking price; **$ / Bed = amount ÷ beds**. Split into active vs past (closed / dead / abandoned).
- A contact's deals are their **company's** deals (people aren't linked to deals individually yet, except via deal-team roles).
- **Communications**: emails are grouped into threads; "Last contacted" = most recent communication of any kind; "Last reply" = most recent inbound email. Internal team members are not tracked as correspondence.

---

## 3. Deals

### 3.1 Milestones
High-Level Review → LOI Signed → PSA Signed → **Deal Closed** → **Transitioned to Asset Management** (deal officially finished).
- Moving to Deal Closed or Transitioned to AM sets status Closed and records the close date.
- Moving straight from High-Level Review to PSA Signed marks **Skipped LOI**; moving back to HLR/LOI clears it.
- Dead / Abandoned require a reason; Reopen restores Active (a closed deal returns to PSA Signed).

### 3.2 Calculated deal fields
| Field | Rule |
|---|---|
| State(s) | distinct states of linked buildings — **unless** a manual override is entered |
| Total buildings | count of linked buildings — unless overridden |
| Total licensed beds | sum of linked buildings' licensed beds — unless overridden |
| **Asking price per bed** | asking price ÷ total licensed beds |
| Current operator | operator(s) of linked buildings — unless set explicitly |

### 3.3 Deal contacts
- Buyer and seller sides each have 7 roles (Team Lead, Support 1, Support 2, In-House Counsel, Transaction Counsel, Financing Counsel, Regulatory / Licensure Counsel); vendors have 8 (Survey, Title, Zoning, Environmental, Property Condition, Appraisals, Reimbursement Consultant, Operations Consultant). One contact per role; firm, email and phone always come from the contact record.
- Distribution lists are free text, semicolon-separated; invalid addresses are flagged, not blocked.

---

## 4. Deal Progress checklist

### 4.1 Structure
- 19 items (from the Deal Progress Tab spreadsheet), each with its own ordered **stages** (1–8).
- A spreadsheet sub-list becomes **sub-items** of the stage in whose column it appears; single-stage items hold the whole list.
- A stage with sub-items **completes automatically when every sub-item is Done or N/A**.
- Each item has a **Responsible Party** (obtains documentation), an **Approver**, and a **Document** requirement (PSA LOI and Hand Off have none; PSA LOI's last stage completes on approval).

### 4.2 Item states
| State | Condition |
|---|---|
| Not needed | bypassed |
| Complete | all work stages done/skipped **and** approved **and** document satisfied |
| Awaiting approval | all stages resolved and (document submitted, waived or not required) |
| Awaiting documentation | all stages resolved, document required, nothing submitted |
| In progress | any stage or sub-item resolved |
| Not started | otherwise |

### 4.3 Progress roll-up
- **Item progress** = completed steps ÷ total steps, where steps = stages + approval + document (if required). Skipped stages and a waived document count as complete. Sub-items in the current stage add partial credit (resolved ÷ total).
- **Deal progress** = average of item progress over items **not** marked "not needed". Every item is weighted equally (*open question — see 10-decisions-and-open-questions.md*).

### 4.4 Sign-off
1. Responsible party uploads documentation → document **Submitted**.
2. Approver **approves** → submitted documents become **Approved & filed** (appear in the deal's Documents tab), stages that complete on approval are completed, item Complete.
3. Or approver **requests changes** (comment required) → documents **Rejected**, item back to Awaiting documentation.
4. Revoke approval → pending; approval-completed stages reopen. Undoing a stage also withdraws approval.

### 4.5 Approvers (must be enforced server-side)
- **Effective approver** = the item's own approver if set, otherwise the **deal approver**.
- Only the effective approver may approve, request changes or revoke. No approver → cannot be signed off.
- "Apply to all items" clears every item-specific approver.
- Seed defaults: deal approver = buyer Team Lead; items whose responsible party is the Team Lead (Capital Structuring, Lease Term Sheet, Internal Approvals, Closing and Funding Mechanics) are approved by In-House Counsel.

### 4.6 Flexibility (never block a deal) — each needs a reason, is logged and reversible
- Skip a stage · mark a sub-item N/A · waive the document · mark the whole item **Not needed for this deal** (excluded from progress).

### 4.7 System-driven stages (evaluated after every data change; idempotent; never un-complete)
| Item → stage | Completes when |
|---|---|
| Deal Sourced → Owner Docket Setup | the deal exists |
| Deal Sourced → Datatape Setup | at least one building is linked |
| Deal Sourced → Dataroom Setup | a data room link is set |
| Order Third-Party Reports → Engage | any third-party vendor is assigned |
| → Collect Drafts | any report is Draft Received or Final Received |
| → Collect & Approve Final Draft | every ordered report is Final Received or Waived |
| Hand Off to AM → Transitioned to AM | deal stage is Transitioned to Asset Management |

### 4.8 Pipeline phases & milestone auto-advance
Phase items (from the "Deal" sheet) tick from data; any can be overridden manually ("Critical Dates Set" is manual-only):

| Phase | Items (rule) | Advances deal to |
|---|---|---|
| Sourced | Identify Price (asking price set), Set Target Closing Date (projected close set) | High-Level Review |
| BOE Review | Engage Legal (buyer transaction counsel assigned), LOI Issued (PSA LOI → Draft done), Critical Dates Set (manual), Source Funding (Capital Structuring → Senior Lender done) | LOI Signed |
| Full Due Diligence | Produce PSA (Acquisition Documents → Draft done), Order Third Parties (Third-Party Reports → Engage done), Funding Term Sheet Signed (Capital Structuring → Finalize Capital Terms done) | PSA Signed |
| Pre-Closing | Key Docs in Final Form (Acquisition Documents → Finalize done), Received 3rd-Party Drafts/Finals (Third-Party Reports → Collect Drafts done), Funding Closing Authorization (Closing & Funding → "Authorize Funding" done) | Deal Closed |
| (Closed) | Post Closing Follow Up item complete or not needed | Transitioned to AM |

Auto-advance moves the deal to the **furthest** milestone the completed phases support, only if: the deal's auto-advance switch is on; it isn't dead/abandoned or a market comp; and the target is beyond **both** the current stage and the deal's **milestone floor**. Every move records the floor, writes activity, and shows a banner with **Undo** (which keeps the floor, so it doesn't re-advance). Manual stage changes set the floor to the furthest milestone already supported, so completed phases never fight the user.
