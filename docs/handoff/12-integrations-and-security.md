# 12 · Integrations, files, auth & roles

Everything below is **simulated or absent** in the prototype. Each section lists what the UI already expects, so the integration can be dropped in without redesign.

## Authentication & users
- **Prototype:** no login. An "Acting as" switcher in the account menu (`src/components/layout/Header.tsx`, persisted in `localStorage` key `owner-docket:acting-as`) stands in for the signed-in user; the store records actions under that person (`actingAs` in `src/store/DataProvider.tsx`).
- **Production:** replace with Owner Docket's authentication. Map each user to an internal **contact** record (internal team members are contacts at `OD Acquisition Holdings` tagged `Internal`) — deal-team roles, responsible parties and approvers all reference contact IDs.

## Roles & permissions (to decide; current behavior noted)
| Capability | Prototype | Recommendation |
|---|---|---|
| Approve / request changes / revoke a checklist item | **Effective approver only** (enforced in UI and store) | Enforce on the server |
| Upload checklist documentation, complete/skip stages, bypass items | Anyone | Decide (see open questions) — likely deal team only |
| See personal contact data (DOB, personal email, home address) | Everyone (lock icon shown) | Restrict by role |
| Building document review (approve/reject) | Anyone | Assigned reviewer or document admins |
| Reset demo data | Anyone | Remove |

Every mutation should write an **audit/activity entry** (the prototype already does for most actions — see `activity()` calls in `DataProvider.tsx` and the checklist `history`).

## File storage
- **Prototype:** document *metadata* is saved; file *bytes* live only in the browser session (`src/features/buildings/documents/sessionFiles.ts`). Photos, logos and contact photos are downscaled to JPEG data URLs and saved in `localStorage` (`src/features/crm/images.ts`).
- **Production:** object storage (S3/Azure Blob/SharePoint) with presigned upload URLs; store keys/URLs on `DocumentFile`, `ChecklistDoc`, `BuildingPhoto`, `Organization.logo`, `Contact.photo`. Keep versioning for building documents.

## CMS (Care Compare / Provider Data Catalog)
- **Prototype:** fictional data (`src/data/generators.ts`, `src/data/cmsRegistry.ts`), clearly labeled "Mock".
- **UI expects:** overall / health / staffing / QM / long-stay QM / short-stay QM ratings, staffing HPRD (RN/LPN/CNA, state & national averages, turnover), surveys, deficiencies (tag, scope/severity, status), penalties, quarterly rating history, special-focus status, abuse icon, certification date, `lastRefreshedAt`.
- **Production:** scheduled refresh keyed by **current CCN** (`BuildingIdentifier`); CMS provider search for Add Building; never assume a CCN permanently identifies a building.

## Microsoft Outlook (Graph API)
- **Prototype:** fictional threads (`src/data/communications.ts`) with a "Simulated sync" panel.
- **UI expects:** `Communication` records (thread id, channel email/call/meeting, direction, from/to/cc, sent time, body, attachments, linked contact/deal/building, source `outlook_sync` | `manual`).
- **Decide:** matching rules (exact address vs domain), which mailboxes sync (individual vs team), privacy of synced mail, retention.

## SharePoint data rooms
- **Prototype:** simulated folder connection and "Sync now" (`DataRoomPanel.tsx`); the deal record stores a data-room **link** (`deal.dataRoomUrl`), which also completes the checklist's *Dataroom Setup* stage.
- **Production:** Graph API folder linking; sync new files and match them to building document requests / checklist items.

## Maps
- **Prototype:** schematic placeholder (`MapPreview.tsx`) using fake `mapX/mapY`.
- **Production:** geocode the address (store lat/lng) and use the org's map provider.

## Environment & hosting
- The prototype is a static Vite build (deployed on Vercel with an SPA rewrite in `vercel.json`). No environment variables or secrets are used.
