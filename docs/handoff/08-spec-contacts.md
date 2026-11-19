# Contacts module — functional specification

CRM records for people across owners, operators, capital providers, brokers, lawyers and vendors. Each contact belongs to one company (organization). Deals are associated with a contact through their company.

Source code: `src/features/contacts/**`, shared CRM components in `src/features/crm/**` (`EditContactSheet.tsx`, `ContactCard.tsx`, `contactBadges.tsx`, `components.tsx`, `EditCompanySheet.tsx`), selectors `companyDeals` and `contactBuildings` in `src/store/selectors.ts`, defaults in `src/data/contactDefaults.ts`, mock communications in `src/data/communications.ts`.

## 1. Routes

| URL | Screen | Source |
|---|---|---|
| `/contacts` | Contacts directory | `src/features/contacts/ContactsDirectory.tsx` |
| `/contacts/:contactId` | Contact record — Overview | `src/features/contacts/ContactDetail.tsx` |
| `/contacts/:contactId/communications` | Contact record — Communications | `src/features/contacts/CommunicationsTab.tsx` |

Unknown IDs render "Contact not found".

## 2. Data captured per contact

| Field | Notes |
|---|---|
| Name | **Required** |
| Title | |
| Company | **Required**; choose an existing organization or create one inline ("+ New company…", created with type Investor) |
| Contact type | Single select: Operator, Vendor (Due Diligence), Vendor (Operating), Investor / Capital Provider, Broker, Lawyer |
| Sector | Multi select: Skilled Nursing Facility, Assisted Living, Independent Living, Memory Care Facility |
| Work email, Mobile phone, Office phone, LinkedIn | |
| Date of birth, Personal email, Mailing address (2 lines, city, state, ZIP) | "Personal information" — shown to everyone in the prototype; role-based visibility is planned |
| Photo | Upload, downscaled to ≤320 px; else initials avatar |
| Corporate roster role | Decision maker, Transactions, Finance, Asset management, Operations, Real estate, Legal, Lending, Other |
| Primary contact for company | Toggle; one primary per company |
| Notes, Tags | Free text; tags with suggestions |

**Defaults for new contacts** (`contactDefaults.ts`): when a company is chosen, contact type and sectors pre-fill from the company — operator → Operator, broker → Broker, law firm → Lawyer, consultant → Vendor (Due Diligence), management → Vendor (Operating), owners/lenders/investors → Investor / Capital Provider; sectors from the company's acuity focus (fallback: SNF). Users can change both. The first contact added to a company becomes its primary contact.

## 3. Contacts directory (`/contacts`)

- **Metrics** (whole dataset): Contacts (+ company count), Investors / capital, Operators, Brokers & lawyers, Vendors, In active deals (contacts whose company has ≥1 active deal).
- **Search**: name, title, work email, phones, company name, tags.
- **Filters** (multi-select with counts): Contact type, Sector (contact matches if it has any selected sector), Company, Tags. Chips + Clear all.
- **Sort** (column headers): Name, Company, Contact type, Deals (active × 100 + total).
- **Columns**: Name (photo, star if primary, title, up to two tags), Company (logo, name, company-type badge), Contact type, Sector (SNF/ALF/ILF/MC chips with full-name tooltips), Email / phone (mobile preferred), Deals ("N active · M past" via company).
- Filters and sort persist per browser (`owner-docket:contacts-prefs`).
- **Add Contact** opens the contact sheet; on save, navigates to the new record.
- Empty states: no contacts at all; no matches (Clear filters).

## 4. Contact record — header
Photo, name, Primary contact badge, "Title at Company", **Last contacted** (latest communication, links to Communications), contact type badge, sector badges (full names), tags with **Edit tags** popover (saves immediately). Actions: **Email** (mailto), **Call** (tel: mobile else office), **Edit contact**, **⋯**: Make primary for company, Add colleague, Delete contact (confirmation dialog; removes the contact, its building links, and reassigns company primary to another roster member if needed; navigates to `/contacts`).

## 5. Overview tab
- **Contact details** — the shared contact card (`ContactCard.tsx`): work email, mobile, office phone, LinkedIn; Personal (DOB, personal email, mailing address); tags; notes.
- **Active deals** / **Past deals** — deals where the contact's company is seller, buyer, broker or lender. Columns: Status (stage badge if active, status badge otherwise), Name (+ role and code, closed date), State(s), Buildings, Beds (certified), $ Amount (purchase price, else asking with "asking" label), $ / Bed (amount ÷ certified beds, rounded to $1K). 3 rows, expandable. Row click → deal preview drawer → Open deal record.
- **Related buildings** — buildings linked to the contact directly (building relationships) or via the company (current owner / operator), with relation label; click → building.
- **Company** — logo, name, role type, company-type badge, parent, office city/state, acuity / regional / state focus; **Edit** opens the company sheet.
- **Associated people** — other contacts at the same company (primary first), each linking to their record; **Add** creates a colleague pre-assigned to the company.

## 6. Communications tab
Source: `src/features/contacts/CommunicationsTab.tsx`; data model `Communication` in `src/types/index.ts`.

- **Outlook panel** (simulated): mailbox, matching address, last synced; **Sync now** (simulated delay, toast "Mailbox is up to date"); labeled "Simulated sync" and "Dummy data".
- **Stats**: Email threads (messages, received), Calls & meetings, Last contact, Last reply from contact.
- **List** (threads grouped by `threadId`, newest first): channel icon, sender or "To:", subject, message count, preview, Sent/Received, duration, attachment icon, linked deal. Filters: All / Emails / Calls / Meetings (with counts), deal filter, search (subject, body, sender, attachment names).
- **Reading pane**: subject, deal and building chips, source ("Synced from Outlook (simulated)" or "Logged by …"), each message with from/to/cc, timestamp, body, attachments (not openable). **Reply** opens a mailto with "RE:" subject.
- **Log communication**: type (Phone call, Meeting, Email (manual)), direction, date, duration (calls/meetings), subject (required), notes, related deal (company deals). Saved with source `manual`.
- Empty state when there are no communications.
- Mobile: list and reading pane are shown one at a time with a back link.

## 7. Cross-module links
- Building Owner tab roster names, Overview key contacts and Relationships contacts link to the contact record.
- Deal record: source contact and every assigned deal contact (buyer, seller, vendor) link to the contact record.
- Global search (header) returns contacts by name, email, title or company.

## 8. Acceptance criteria

1. Given the directory, filter Contact type = Broker returns only broker contacts; the chip removes the filter.
2. Given Sector = Memory Care Facility, every listed contact has MC among its sectors.
3. Given Add Contact with no name and no company, then "Name is required." and "Choose or create a company." are shown and nothing is saved.
4. Given Add Contact with company Calloway Healthcare Advisors, contact type pre-fills to Broker; after save I land on the new record.
5. Given "+ New company…" with a new name, then saving creates the company and the contact belongs to it.
6. Given I edit a contact's contact type and sectors, then the header badges update and the change persists after reload.
7. Given a contact whose company sells an active deal, the Active deals table lists it with $ / Bed = amount ÷ certified beds.
8. Given a company with more than 3 past deals, 3 are shown with "Show N more".
9. Given Associated people, clicking a colleague opens their record.
10. Given Make primary for company, the star moves to this contact in the directory and on the building Owner tab.
11. Given Delete contact and confirm, the contact disappears from the directory and building rosters.
12. Given the Communications tab, filter Calls shows only call logs; search "offering" finds the OM thread.
13. Given Log communication (call, subject, notes), it appears at the top of the list after save and persists after reload.
14. Given a thread with attachments, attachment chips render with size, and the reading pane lists all messages oldest → newest.
15. Given mobile width, opening a thread shows a back link to the list and there is no horizontal page scroll.
