# Owner Docket — Building Module (Interactive Prototype)

A functional, interactive prototype of the **Building Module** for Owner Docket, a skilled nursing facility (SNF) M&A platform by Prometheus Rising Studios.

> **All data is fictional.** CMS ratings, surveys and financials are mock/illustrative data generated for demonstration. There are no live CMS, SharePoint, Outlook or mapping integrations.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. Other scripts:

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm run typecheck  # TypeScript only
```

Changes persist in the browser's `localStorage`. To restore the original dataset, use **avatar menu → Reset demo data** or **Settings → Reset demo data**.

## Suggested demo walkthrough

1. **Buildings** — search "Maple", try filters (State, CMS rating, Deals, Verification), toggle Table/Cards.
2. Open **Maple Grove Health & Rehabilitation Center**.
3. Review header metrics, Facility information (hover the colored dots for source & verification), and the **CMS & Regulatory** tab.
4. **Ownership & operations** and **Related deals** — click *Great Lakes Portfolio* to open the deal preview.
5. **Building condition** / **Site Visits** — resolve an observation, check off a follow-up, add a site visit.
6. **Attention required** → click "Missing: Floor plan" to jump to Documents.
7. **Documents** — use the *Missing* and *Pending review* views; click **Review** on *Property condition assessment* and **Approve**.
8. Return to **Overview** — the documents progress and attention list reflect the approval.

### CRM: current owner
- **Owner tab** on any building: who owns the real estate today, with a **Company type** dropdown (Bank, Finco, Mezz Lender, REIT, Private, AR Lender), primary contact (work and personal details, photo, tags), company information (logo, parent company, office address, acuity / regional / state focus), active deals, corporate roster (Role, Name, Email, Phone, Notes) and past deals. Both deal tables show Status, Name, State, Buildings, Beds, $ Amount and $ / Bed, three rows at a time with an expand control.
- **Change owner** moves the previous owner into ownership history; you can also create a new company on the spot.
- **Photos** on the Overview: shows 5, expands to all, opens a lightbox, uploads images and sets the cover.
- Directory **Owner type** filter (try *Bank* → Prairie View, a foreclosed REO property).

### Contacts module
- **Contacts** in the sidebar: a CRM directory with search and filters for Contact type, Sector, Company and Tags.
- Each **contact record** has a Contact type (Operator, Vendor (Due Diligence), Vendor (Operating), Investor / Capital Provider, Broker, Lawyer), one or more Sectors (Skilled Nursing Facility, Assisted Living, Independent Living, Memory Care Facility), the full contact card (work and personal details), tags, active and past deals, associated people at the same company, and related buildings.
- Add a contact (pick a company or create one; type and sectors are pre-filled from the company), edit, tag, make primary, or delete. People's names link to their record from the building Owner tab, Relationships, key contacts and global search.

- **Communications tab** on each contact record: an inbox-style view of email threads, calls and meetings with that person (fictional dummy data standing in for the planned Outlook integration). Search, filter by type or deal, read full threads with attachments, reply via your email client, and log calls, meetings or emails manually.

### Deals module
- **Deals** in the sidebar: pipeline board by stage (High-Level Review → LOI Signed → PSA Signed → Deal Closed → Transitioned to Asset Management, which means the deal is officially finished) or table, with filters (status, deal type, asset class, state, lead), summary metrics and **New Deal**. Recorded market transactions are hidden unless "Market comps" is on.
- **Deal record → Overview** follows the Deal Record Overview template: progress bar and stage tracker; deal summary (deal type, primary asset class, source company/contact, asking price, calculated price per bed, states, total buildings and licensed beds, current operator, seller, new operator, JV partner and %, projected closing, data room link); buyer and seller deal contacts by role with additional email distribution lists; third-party vendors; third-party reports (date ordered, status, expected delivery, link); and a CMS buildings table showing 10 rows, expandable. Contacts are chosen by typing a name; firm, email and phone fill in automatically. Buildings and contacts link to their records.
- **Deal record → Progress** follows the Deal Progress Tab spec: 19 checklist items, each with its own stages (sub-lists become stage sub-items that can be ticked or marked N/A). Some stages complete automatically from data in the system (e.g. Deal Sourced → Dataroom Setup when a data room link is added; Order Third-Party Reports → Engage / Collect Drafts / Final from the deal's vendors and reports; Hand Off when the deal is Transitioned to Asset Management). Each item has a Responsible Party who submits documentation and an Approver who signs off; approval files the documentation to the deal's **Documents** tab and completes the item. To keep deals moving, stages can be skipped, sub-items marked N/A, the document waived, or a whole item marked "not needed for this deal" (excluded from progress) — all with a reason and undoable. A pipeline-phase panel (Sourced → BOE Review → Full Due Diligence → Pre-Closing) ticks from the checklist and can be overridden.
- **Deal record → Documents**: documentation filed through checklist approvals (file contents are kept for the browser session only).
- Change stage, mark a deal dead or abandoned (with reason) or reopen it; add or remove buildings.

Also try: **Add Building** (CMS search, provider number e.g. `155921`, or manual), **Edit Building** (changing a CCN retires the old one into history), **Add to Deal**, **Sync now** in the Connected Data Room, and **⌘K** global search (works with provider numbers).

## Architecture

```
src/
  types/            Domain model (Building, BuildingIdentifier, Deal, DealBuildingRelationship, CMSData, DocumentRequest, …)
  data/             Fictional seed data + deterministic generators, mock CMS registry, checklist templates
  store/            DataProvider (React context + localStorage), selectors (derived stats, attention items)
  components/
    ui/             shadcn-style primitives on Radix (button, dialog, sheet, select, tabs, dropdown, tooltip, toast…)
    shared/         Domain components (badges, star ratings, facility illustration, schematic map, layout pieces)
    layout/         App shell, sidebar, header (breadcrumbs, global search, notifications)
  features/buildings/
    directory/      Buildings Directory (table/cards, filters, sort, metrics)
    add/            Add Building workflow
    detail/         Building detail page, header, tabs, dialogs (edit, add-to-deal, deal preview, site visit)
    documents/      Documents & Due Diligence (checklist, review sheet, templates, simulated data room)
  pages/            Placeholder modules, Settings, Not found
```

### Data model notes

- **Stable internal IDs** for every entity. CMS provider numbers (CCNs), state licenses and NPIs are time-bounded `BuildingIdentifier` records — a building can carry several historical CCNs (see Brookhaven and Chestnut Hill).
- **Deal-specific values** (role in deal, price allocation) live on `DealBuildingRelationship`, never on the `Building`. A building can belong to many deals (Seaside Pines is in a dead 2024 deal and an active 2026 deal).
- Key facts (beds, census, year built, square footage) are `Tracked<T>` values with **source metadata and verification status**.
- Every building gets **baseline document placeholders** (current facility license, floor plan); more can be added from the configurable diligence template.

### Prototype limitations

- Personal contact data (date of birth, personal email, mailing address) is visible to everyone; role-based visibility is planned.
- Uploaded photos, logos and contact photos are downscaled and stored in the browser's localStorage, so storage limits apply.
- File uploads store **metadata only** (name, size, version, review state). File contents are previewable for the current browser session but are not persisted.
- Outlook email sync, SharePoint sync, CMS refresh and maps are simulated. Other modules (Deals, Contacts, etc.) are placeholders.

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui-style components (Radix primitives), Lucide icons, React Router.
