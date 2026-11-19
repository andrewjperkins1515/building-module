# Owner Docket — Buildings, Contacts & Deals: developer handoff

This package hands the **Buildings**, **Contacts** and **Deals** modules from the interactive prototype to the Owner Docket development team. It contains the working code, a specification of every screen and rule, a proposed database and API, tests that act as an executable spec, demo data, and reference screenshots.

- **Live prototype:** https://building-module.vercel.app (data is fictional and stored in each viewer's browser)
- **Frozen reference version:** git tag `handoff-v1` (the state approved for handoff)
- **Code:** this repository (`main`)

## Start here
| # | Document | For |
|---|---|---|
| — | **This README** | everyone |
| 01 | [Architecture & integration path](01-architecture.md) | tech lead |
| 03 | [Data model](03-data-model.md) (+ ER diagram) | backend |
| 04 | [Proposed database schema (PostgreSQL)](04-database-schema.sql) | backend |
| 05 | [API contract (OpenAPI 3.1)](05-api-contract.yaml) · [action → endpoint map](05-api-mapping.md) | backend, frontend |
| 06 | [Business rules](06-business-rules.md) | everyone — the rules the tests enforce |
| 07 | [Spec: Buildings](07-spec-buildings.md) | frontend, QA |
| 08 | [Spec: Contacts](08-spec-contacts.md) | frontend, QA |
| 09 | [Spec: Deals](09-spec-deals.md) | frontend, QA |
| 10 | [Decisions log & open questions](10-decisions-and-open-questions.md) | product, tech lead |
| 11 | [Implementation backlog](11-backlog.md) · [CSV for GitHub/Jira import](11-backlog.csv) | project lead |
| 12 | [Integrations, files, auth & roles](12-integrations-and-security.md) | backend, security |
| — | [`fixtures/`](fixtures/) — demo dataset as JSON, one file per table | backend, QA |
| — | [`screenshots/`](screenshots/) — every screen, desktop and mobile | design, QA |

## Run it locally (5 minutes)
Requires Node.js 20+.
```bash
git clone https://github.com/andrewjperkins1515/building-module
cd building-module
npm install
npm run dev          # http://localhost:5173
```
Other commands:
```bash
npm test             # 42 business-rule tests (Vitest)
npm run typecheck    # strict TypeScript
npm run build        # production build to dist/
npx playwright install chromium   # once, for browser tests
npm run e2e          # 8 browser smoke scripts against the running dev server
npm run export:fixtures           # regenerate fixtures/ from the seed data
```
The app resets to the demo dataset from the account menu → **Reset demo data**.

## What is real vs. simulated
| Real (working code you can reuse) | Simulated / prototype-only (replace) |
|---|---|
| All screens, components, navigation, forms, validation | Storage: browser `localStorage` instead of a database (`src/store/DataProvider.tsx`) |
| Domain model (`src/types/index.ts`) | Seed data: fictional facilities, companies, people, deals, emails (`src/data/`) |
| Business rules: checklist engine, progress roll-up, approvals, auto-stages, milestone auto-advance, calculated fields | Login: an "Acting as" switcher in the account menu stands in for users |
| Design system: tokens + components | CMS, Outlook, SharePoint and maps integrations (mock data / placeholders) |
| Unit tests and browser smoke scripts | File storage: uploaded file contents are kept for the browser session only |

## Demo walkthrough (to see every feature)
1. **Buildings** → open *Maple Grove Health & Rehabilitation Center*: Overview, **Owner** tab (company type, contacts, roster, deal history), CMS, Documents (review & approve a document).
2. **Contacts** → *Robert Cole*: contact record, associated people, deals; **Communications** tab (simulated Outlook).
3. **Deals** → pipeline board → *Great Lakes Portfolio*: Overview (deal summary, deal teams, vendors, reports, buildings), **Progress** (19-item checklist, sign-off, bypasses, pipeline phases), **Documents**.
4. **Deals** → *Riverside Gardens* → Progress: tick *Critical Dates Set* to watch the deal auto-advance to LOI Signed (with Undo).
5. Account menu → **Acting as** → switch to *Natalie Brooks* to approve items assigned to her.

## Suggested first sprint for the team
1. Read 01, 06 and skim 07–09 alongside the live prototype.
2. Agree the schema (04) and API (05) against Owner Docket's conventions.
3. Import the backlog (11-backlog.csv) into your tracker.
4. Stand up the database + API with fixtures; replace `DataProvider`'s internals with API calls (see 01 → "Recommended path").
5. Resolve the open questions in 10 with product.
