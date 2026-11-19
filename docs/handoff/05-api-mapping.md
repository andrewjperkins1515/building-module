# 05 — Prototype actions → API endpoints

Every read in the prototype goes through `useData()` / selectors, and every write is an action on the store in `src/store/DataProvider.tsx`. To move to a real backend, re-implement each action as a call to the endpoint below (for example with React Query mutations) and replace `state` reads with the matching GET. The full contract is in `05-api-contract.yaml`.

**Server-side responsibilities**

The prototype does the following in the browser. In production the server must do it:
- set actor and timestamp fields
- write activity entries
- run checklist auto rules (`applyAutoRules`) and milestone auto-advance (`pendingAutoAdvance`) after any write that can affect them
- enforce approver permissions on checklist sign-off

## Buildings

| Prototype action | Endpoint |
|---|---|
| `addBuilding(input)` | `POST /buildings` |
| `updateBuilding(id, patch, change?)` | `PATCH /buildings/{buildingId}`. "Mark as verified" in the header menu is `POST /buildings/{buildingId}/verify` |
| `changeOwner(buildingId, orgId, date)` | `PUT /buildings/{buildingId}/owner`; inline new company via `newOrganization` |
| `addBuildingPhotos(buildingId, photos)` | `POST /uploads`, then `POST /buildings/{buildingId}/photos` |
| `removeBuildingPhoto(buildingId, photoId)` | `DELETE /buildings/{buildingId}/photos/{photoId}` |
| `setCoverPhoto(buildingId, photoId)` | `POST /buildings/{buildingId}/photos/{photoId}/cover` |
| `addNote(buildingId, text)` | `POST /buildings/{buildingId}/notes` |
| `refreshCms(buildingId)` | `POST /buildings/{buildingId}/cms/refresh` |
| Add Building CMS search / provider-number lookup (`data/cmsRegistry.ts`) | `GET /cms/providers?q=…` / `?ccn=…` |
| `addDealAssociation(rel)` (Add to Deal, add buildings on a deal) | `POST /deals/{dealId}/buildings` |

## Building documents, data room, site visits

| Prototype action | Endpoint |
|---|---|
| `addDocumentRequest(req)` | `POST /buildings/{buildingId}/document-requests` |
| `updateDocumentRequest(id, patch, note?)` | `PATCH /document-requests/{requestId}` |
| `setDocumentStatus(id, status)` | `PATCH /document-requests/{requestId}` with `{ status }` |
| `uploadDocumentFile(id, file)` | `POST /uploads`, then `POST /document-requests/{requestId}/files` |
| `reviewDocument(id, action, comment)` | `POST /document-requests/{requestId}/review` |
| `addDocumentComment(id, text)` | `POST /document-requests/{requestId}/comments` |
| `deleteDocumentRequest(id)` | `DELETE /document-requests/{requestId}` |
| `applyChecklistTemplate(buildingId, keys, dealId?)` | `POST /buildings/{buildingId}/document-requests/apply-template` |
| `connectDataRoom(buildingId, folderPath)` | `PUT /buildings/{buildingId}/data-room` |
| `syncDataRoom(buildingId)` | `POST /buildings/{buildingId}/data-room/sync` |
| `addSiteVisit(visit)` | `POST /buildings/{buildingId}/site-visits` |
| `toggleFollowUp(visitId, taskId)` | `PATCH /site-visits/{visitId}/follow-ups/{taskId}` |
| `toggleObservation(visitId, obsId)` | `PATCH /site-visits/{visitId}/observations/{obsId}` |

## Companies, contacts, communications

| Prototype action | Endpoint |
|---|---|
| `addOrganization(org)` | `POST /organizations` |
| `updateOrganization(id, patch, change?)` | `PATCH /organizations/{orgId}`; logo via `POST /uploads` and `logoObjectKey`. The Owner tab's inline Company Type dropdown uses this too |
| `addContact(contact)` | `POST /contacts`; new company inline via `newOrganizationName` |
| `updateContact(id, patch)` | `PATCH /contacts/{contactId}`; photo via `POST /uploads` and `photoObjectKey` |
| `deleteContact(id)` | `DELETE /contacts/{contactId}` |
| `addCommunication(c)` (Log communication) | `POST /communications` |
| Communications tab "Sync now" (simulated) | `POST /integrations/outlook/sync` |

## Deals

| Prototype action | Endpoint |
|---|---|
| `addDeal(deal, buildingIds)` | `POST /deals`. The server generates `code`, creates the checklist and runs auto rules |
| `updateDeal(id, patch, logTitle?)` for summary fields, overrides, distribution lists, data room link, auto-advance toggle | `PATCH /deals/{dealId}` |
| `updateDeal` from **Change stage / Mark dead / Mark abandoned / Reopen** (`DealRecord.tsx`) | `POST /deals/{dealId}/stage` |
| `removeDealBuilding(relId)` | `DELETE /deal-buildings/{relId}` |
| `setDealContact(dealId, { side, role, contactId })` | `PUT /deals/{dealId}/contacts/{side}/{role}`; `DELETE` when cleared |
| `updateDealReport(dealId, kind, patch)` | `PATCH /deals/{dealId}/reports/{kind}` |
| `checklistAction(dealId, itemId, action)` | `POST /deals/{dealId}/checklist/{itemId}/actions`. Body = `ChecklistAction`; 403 if the caller isn't the effective approver for approve, request_changes or revoke_approval |
| `setDealApprover(dealId, contactId, applyToAll)` | `PUT /deals/{dealId}/approver` |
| `setPhaseOverride(dealId, key, value?)` | `PUT /deals/{dealId}/phase-overrides/{key}`; `DELETE` = reset to automatic |
| `undoAutoAdvance(dealId)` | `POST /deals/{dealId}/auto-advance/undo` |
| `dismissAutoAdvance(dealId)` | `POST /deals/{dealId}/auto-advance/dismiss` |
| Checklist document upload (`ProgressTab.tsx`) | `POST /uploads`, then the `upload_doc` action with `objectKey` |
| Deal Documents tab | `GET /deals/{dealId}/documents?view=filed\|pending\|all` |

## Reads (screen → endpoint)

| Screen | Endpoint |
|---|---|
| Buildings directory, plus filters and metrics | `GET /buildings` |
| Building detail (all tabs except documents and activity paging) | `GET /buildings/{buildingId}` (`BuildingBundle`) |
| Building Documents tab | `GET /buildings/{buildingId}/document-requests` |
| Building Activity tab | `GET /buildings/{buildingId}/activities` |
| Owner tab roster and company deals | `GET /organizations/{orgId}` |
| Contacts directory | `GET /contacts` |
| Contact record | `GET /contacts/{contactId}` |
| Contact Communications tab | `GET /contacts/{contactId}/communications` |
| Deals pipeline (board/table) | `GET /deals` |
| Deal record (Overview, Progress) | `GET /deals/{dealId}` (`DealBundle`) |
| Pickers (companies / contacts) | `GET /organizations?q=`, `GET /contacts?q=` |
| Global search | Fan out to `GET /buildings?q=`, `/contacts?q=`, `/deals?q=` (or add a `GET /search`) |

## Prototype-only (no endpoint)

| Prototype feature | Production replacement |
|---|---|
| `resetDemo()` | Dev and seed tooling only |
| `actingAs` / `setActingAs` | The authenticated user (bearer token) |
| `migrate()` / `STATE_VERSION` | Database migrations |
