# 01 · Architecture & how to bring it into Owner Docket

## Stack
| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | `tsconfig.app.json` — `strict`, no unused locals/params |
| UI | React 19 | function components + hooks |
| Build/dev | Vite 7 | `@/` alias → `src/` |
| Styling | Tailwind CSS v4 | design tokens in `src/index.css` (`@theme`) |
| Components | shadcn/ui pattern on Radix primitives | owned source in `src/components/ui/` (not a package) |
| Icons | lucide-react | |
| Routing | react-router-dom 7 | routes in `src/App.tsx` |
| State | React context + `useState` | `src/store/DataProvider.tsx`, persisted to `localStorage` |
| Tests | Vitest (rules), Playwright scripts (browser smoke) | `npm test`, `npm run e2e` |

## Repository map
```
src/
  App.tsx                 routes + providers
  index.css               design tokens (colors, radii, shadows, type) — the design system
  types/index.ts          ★ domain model (every entity) — see 03-data-model.md
  lib/
    checklist.ts          ★ deal checklist engine: template, progress, approvals, auto-stages, auto-advance
    labels.ts             ★ pick lists and display labels
    format.ts, utils.ts   formatting (dates, currency) and helpers
  store/
    DataProvider.tsx      ★ the ONLY place data is read/written (state + every mutation + migrations)
    selectors.ts          ★ derived data (doc stats, attention items, deal totals, company deals)
    createBuilding.ts     building creation from CMS / manual input
  data/                   fictional seed data + generators (replace with real data; keep as test fixtures)
  components/
    ui/                   design-system primitives (button, dialog, sheet, select, tabs, toast…)
    shared/               domain components (badges, star rating, facility image, map placeholder, layout)
    layout/               app shell: sidebar, header (search, notifications, account menu), breadcrumbs
  features/
    buildings/            directory, add building, detail page + tabs, documents & due diligence
    contacts/             directory, contact record, communications tab
    crm/                  owner tab pieces: company/contact editors, photo carousel, shared CRM components
    deals/                pipeline, deal record (overview / progress / documents), dialogs
  pages/                  placeholder modules, settings, not found
docs/handoff/             this package (fixtures/, screenshots/ included)
e2e/                      browser smoke scripts
```
★ = files most worth reading first.

## How data flows today
- Screens **read** through `useData()` (`state`) and the selectors in `src/store/selectors.ts`.
- Screens **write** only through the action functions exposed by `useData()` (e.g. `updateBuilding`, `addDeal`, `checklistAction`, `setDealApprover`). There are no direct storage calls in components.
- After every change the provider runs two reactions: **auto-complete checklist stages** (`applyAutoRules`) and **milestone auto-advance** (`pendingAutoAdvance`). In production these belong on the server, triggered after the relevant writes.
- State is saved to `localStorage` with a version number; `migrate()` upgrades older saves. **This is prototype-only** — drop it when moving to a database.

## Recommended path into Owner Docket
Your team said they can adopt this stack and design system, so the lowest-effort route is:

1. **Bring the code over as-is.** Copy `src/` (or add this repo as a package/workspace in the Owner Docket monorepo) along with `src/index.css` tokens and `src/components/ui/`. Wire the routes from `src/App.tsx` into Owner Docket's router and its existing app shell (or keep `components/layout/` if Owner Docket has none yet).
2. **Stand up the database and API** from `04-database-schema.sql` and `05-api-contract.yaml` (both proposals derived from the TypeScript model — adjust to your conventions). Seed it from `fixtures/`.
3. **Swap the data layer, not the screens.** Re-implement `DataProvider` so each action calls the API (`05-api-mapping.md` maps every action → endpoint) and `state` comes from server queries (e.g. TanStack Query). Because components only use `useData()` and the selectors, they shouldn't need changes. A good intermediate step: keep the `DataContextValue` interface identical and change only its implementation.
4. **Move the rules server-side.** Port `src/lib/checklist.ts` and the selectors' calculations to the backend (or share them as a TypeScript package if the backend is Node). Keep the unit tests — they are the acceptance test for the port. **Approval permissions must be enforced on the server.**
5. **Replace simulations** with real integrations (CMS, Outlook, SharePoint, maps, file storage, auth) — see `12-integrations-and-security.md`.
6. **Delete prototype-only code:** `src/data/` (after fixtures are exported), `migrate()`, the "Acting as" switcher, Reset demo data, `sessionFiles.ts`, `MockDataTag` banners.
7. **UI/UX pass.** The screenshots in `screenshots/` are the baseline; the design tokens in `src/index.css` are the single place to re-theme.

## Design system
- Tokens (`src/index.css`): neutral ink scale (`ink`, `ink-2…4`), canvas/subtle/muted surfaces, one accent (deep blue), semantic success/warning/danger/info/violet with `-soft`/`-line` variants, radii, shadows. Font: Inter Variable.
- Primitives (`src/components/ui/`): Button (variants default/accent/outline/secondary/ghost/link/success/danger), Badge (tones), Input, Textarea, Select, Checkbox, Switch, Progress, Dialog, Sheet (side drawer), Popover, Tooltip, DropdownMenu, Tabs/Segmented, Toast.
- Shared patterns (`src/components/shared/layout.tsx`): `Section`, `Field`/`FieldGrid`, `MetricTile`, `EmptyState`, `PageHeader`, `Avatar`, `KeyValueRow`.

## Quality gates
- `npm run typecheck` — strict TypeScript.
- `npm test` — 42 rule tests (checklist engine, approvals, auto-advance, calculations, seed integrity, migrations).
- `npm run build` — production build.
- `npm run e2e` — 8 browser smoke scripts against a running app (`npm run dev` first; `BASE_URL=…` to target a deployment). Requires `npx playwright install chromium` once.
- GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, tests and build on every push and pull request.
