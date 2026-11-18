import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  Activity,
  AppState,
  Building,
  BuildingPhoto,
  Communication,
  Deal,
  DealContactAssignment,
  ThirdPartyReport,
  Contact,
  DealBuildingRelationship,
  Organization,
  DocumentFile,
  DocumentRequest,
  DocumentStatus,
  ReviewComment,
  SiteVisit,
} from "@/types";
import { buildSeedState, STATE_VERSION } from "@/data/seed";
import { defaultContactType, defaultSectors } from "@/data/contactDefaults";
import { buildCommunications } from "@/data/communications";
import { applyAutoRules, applyChecklistAction, buildChecklist, canApprove, floorFor, pendingAutoAdvance, type ChecklistAction } from "@/lib/checklist";
import { CURRENT_USER, DEAL_STAGE_LABEL, DOC_STATUS_LABEL } from "@/lib/labels";
import { nowIso, uid } from "@/lib/utils";
import { templateFor, BASELINE_DOCUMENTS } from "@/data/templates";
import type { NewBuildingInput } from "./createBuilding";
import { materializeNewBuilding } from "./createBuilding";

const STORAGE_KEY = "owner-docket:prototype-state";
const PERSONA_KEY = "owner-docket:acting-as";
const DEFAULT_PERSONA = "ct_jellis";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return parsed;
      const migrated = migrate(parsed);
      if (migrated) return migrated;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return buildSeedState();
}

/** Upgrade saved prototype data in place so demo edits survive new releases. */
function migrate(input: AppState): AppState | null {
  let s = input;
  if (s.version < 4) return null; // too old — reseed
  if (s.version === 4) {
    const orgs = new Map(s.organizations.map((o) => [o.id, o]));
    s = {
      ...s,
      version: 5,
      contacts: s.contacts.map((c) => ({
        ...c,
        contactType: c.contactType ?? defaultContactType(orgs.get(c.organizationId)),
        sectors: c.sectors ?? defaultSectors(orgs.get(c.organizationId)),
      })),
    };
  }
  if (s.version === 5) {
    s = { ...s, version: 6, communications: buildCommunications(s) };
  }
  if (s.version === 6) {
    // Deals module: add new seed companies/contacts, deal record fields and extra CMS ratings,
    // without touching anything the user already has.
    const seed = buildSeedState();
    const haveOrg = new Set(s.organizations.map((o) => o.id));
    const haveContact = new Set(s.contacts.map((c) => c.id));
    const newContacts = seed.contacts.filter((c) => !haveContact.has(c.id));
    const newContactIds = new Set(newContacts.map((c) => c.id));
    s = {
      ...s,
      version: 7,
      organizations: [
        ...s.organizations.map((o) => {
          const so = seed.organizations.find((x) => x.id === o.id);
          return so && !o.primaryContactId && so.primaryContactId ? { ...o, primaryContactId: so.primaryContactId } : o;
        }),
        ...seed.organizations.filter((o) => !haveOrg.has(o.id)),
      ],
      contacts: [...s.contacts, ...newContacts],
      deals: s.deals.map((d) => {
        const sd = seed.deals.find((x) => x.id === d.id);
        if (!sd) return { ...d, contacts: [], reports: [], progress: [] };
        const { id: _i, name: _n, stage: _s, status: _st, ...extras } = sd;
        void _i; void _n; void _s; void _st;
        const fresh = Object.fromEntries(Object.entries(extras).filter(([k]) => (d as unknown as Record<string, unknown>)[k] === undefined));
        return { ...d, ...fresh };
      }),
      cms: s.cms.map((c) => {
        const sc = seed.cms.find((x) => x.buildingId === c.buildingId);
        return { ...c, ratings: { longStayQm: sc?.ratings.longStayQm ?? c.ratings.qualityMeasures, shortStayQm: sc?.ratings.shortStayQm ?? c.ratings.qualityMeasures, ...c.ratings } };
      }),
      communications: [...s.communications, ...seed.communications.filter((m) => m.contactIds.some((id) => newContactIds.has(id)))],
    };
  }
  if (s.version === 7) {
    // New final stage "Transitioned to Asset Management": the long-closed, operating Chestnut Hill deal is finished.
    s = { ...s, version: 8, deals: s.deals.map((d) => (d.id === "deal_keystone" && d.stage === "closed" && d.status === "closed" ? { ...d, stage: "asset_management" } : d)) };
  }
  if (s.version === 8) {
    // Deal Progress checklist: seeded deals get their checklist; user-created deals get a fresh one.
    const seed = buildSeedState();
    s = {
      ...s,
      version: 9,
      deals: s.deals.map((d) => {
        if (d.checklist?.length) return d;
        const sd = seed.deals.find((x) => x.id === d.id);
        const checklist = sd ? sd.checklist : d.code.startsWith("MKT") ? [] : buildChecklist(d);
        const withList = { ...d, checklist };
        return { ...withList, checklist: applyAutoRules(withList, s) ?? checklist };
      }),
    };
  }
  if (s.version === 9) {
    // Deal approver: the buyer team lead approves by default; item approvers that matched become "use deal approver".
    s = {
      ...s,
      version: 10,
      deals: s.deals.map((d) => {
        const lead = d.contacts?.find((c) => c.side === "buyer" && c.role === "team_lead")?.contactId;
        const approver = d.dealApproverContactId ?? lead;
        return {
          ...d,
          dealApproverContactId: approver,
          checklist: d.checklist?.map((i) => (i.approverContactId && i.approverContactId === approver ? { ...i, approverContactId: undefined } : i)),
          milestoneFloor: d.milestoneFloor ?? floorFor(d, d.stage),
        };
      }),
    };
  }
  return s.version === STATE_VERSION ? s : null;
}

type ReviewAction = "approved" | "rejected" | "needs_revision";

interface DataContextValue {
  state: AppState;
  updateBuilding: (id: string, patch: Partial<Building>, change?: { title: string; description?: string; type?: Activity["type"] }) => void;
  addBuilding: (input: NewBuildingInput) => string;
  addDealAssociation: (rel: Omit<DealBuildingRelationship, "id" | "addedAt">) => void;
  addSiteVisit: (visit: Omit<SiteVisit, "id" | "createdAt" | "createdBy">) => void;
  toggleFollowUp: (visitId: string, taskId: string) => void;
  toggleObservation: (visitId: string, obsId: string) => void;
  addDocumentRequest: (req: Omit<DocumentRequest, "id" | "createdAt" | "updatedAt" | "files" | "comments">) => void;
  updateDocumentRequest: (id: string, patch: Partial<DocumentRequest>, note?: string) => void;
  setDocumentStatus: (id: string, status: DocumentStatus) => void;
  uploadDocumentFile: (id: string, file: { name: string; size: number; type: string }) => void;
  reviewDocument: (id: string, action: ReviewAction, comment: string) => void;
  addDocumentComment: (id: string, text: string) => void;
  deleteDocumentRequest: (id: string) => void;
  applyChecklistTemplate: (buildingId: string, keys: string[], dealId?: string) => number;
  syncDataRoom: (buildingId: string) => { imported: number };
  connectDataRoom: (buildingId: string, folderPath: string) => void;
  addNote: (buildingId: string, text: string) => void;
  refreshCms: (buildingId: string) => void;
  resetDemo: () => void;
  // CRM
  updateOrganization: (id: string, patch: Partial<Organization>, change?: { buildingId?: string; title: string }) => void;
  addOrganization: (org: Omit<Organization, "id">) => string;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  addContact: (contact: Omit<Contact, "id">) => string;
  deleteContact: (id: string) => void;
  changeOwner: (buildingId: string, organizationId: string, effectiveDate: string) => void;
  addBuildingPhotos: (buildingId: string, photos: Omit<BuildingPhoto, "id" | "uploadedAt" | "uploadedBy">[]) => void;
  removeBuildingPhoto: (buildingId: string, photoId: string) => void;
  setCoverPhoto: (buildingId: string, photoId: string) => void;
  addCommunication: (c: Omit<Communication, "id" | "threadId" | "source" | "loggedBy">) => void;
  // Deals
  updateDeal: (id: string, patch: Partial<Deal>, logTitle?: string) => void;
  addDeal: (deal: Omit<Deal, "id" | "code" | "createdAt"> & { id?: string }, buildingIds: string[]) => string;
  setDealContact: (dealId: string, a: Omit<DealContactAssignment, "contactId"> & { contactId?: string }) => void;
  updateDealReport: (dealId: string, kind: ThirdPartyReport["kind"], patch: Partial<ThirdPartyReport>) => void;
  checklistAction: (dealId: string, itemId: string, action: ChecklistAction) => boolean;
  setDealApprover: (dealId: string, contactId: string | undefined, applyToAll: boolean) => void;
  undoAutoAdvance: (dealId: string) => void;
  dismissAutoAdvance: (dealId: string) => void;
  actingAs: { id: string; name: string };
  setActingAs: (contactId: string) => void;
  setPhaseOverride: (dealId: string, key: string, value?: boolean) => void;
  removeDealBuilding: (relId: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Prototype persona ("acting as"): who performs actions and approvals until user accounts exist.
  const [actingAs, setActingAsState] = useState<string>(() => {
    try {
      return localStorage.getItem(PERSONA_KEY) || DEFAULT_PERSONA;
    } catch {
      return DEFAULT_PERSONA;
    }
  });
  const actorRef = useRef<{ id: string; name: string }>({ id: actingAs, name: CURRENT_USER.name });
  actorRef.current = { id: actingAs, name: state.contacts.find((c) => c.id === actingAs)?.name ?? CURRENT_USER.name };
  const actorName = () => actorRef.current.name;
  const setActingAs = useCallback((id: string) => {
    setActingAsState(id);
    try {
      localStorage.setItem(PERSONA_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — prototype continues in memory */
    }
  }, [state]);

  const activity = (a: Omit<Activity, "id" | "timestamp" | "actor"> & { actor?: string }): Activity => ({
    id: uid("act"),
    timestamp: nowIso(),
    actor: a.actor ?? actorName(),
    ...a,
  });

  const touchBuilding = (s: AppState, buildingId: string): Building[] =>
    s.buildings.map((b) => (b.id === buildingId ? { ...b, updatedAt: nowIso() } : b));

  const updateBuilding = useCallback<DataContextValue["updateBuilding"]>((id, patch, change) => {
    setState((s) => {
      const prev = s.buildings.find((b) => b.id === id);
      if (!prev) return s;
      const acts: Activity[] = [];
      if (patch.verificationStatus && patch.verificationStatus !== prev.verificationStatus) {
        acts.push(activity({ buildingId: id, type: "verification_changed", title: `Verification changed to ${patch.verificationStatus.replace("_", " ")}`, description: `Previously ${prev.verificationStatus.replace("_", " ")}.` }));
      }
      if (change) acts.push(activity({ buildingId: id, type: change.type ?? "building_updated", title: change.title, description: change.description }));
      return {
        ...s,
        buildings: s.buildings.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: nowIso() } : b)),
        activities: [...acts, ...s.activities],
      };
    });
  }, []);

  const addBuilding = useCallback<DataContextValue["addBuilding"]>((input) => {
    const bundle = materializeNewBuilding(input);
    setState((s) => ({
      ...s,
      buildings: [bundle.building, ...s.buildings],
      cms: bundle.cms ? [...s.cms, bundle.cms] : s.cms,
      conditions: s.conditions,
      financials: s.financials,
      ownerships: [...s.ownerships, ...bundle.ownerships],
      organizations: [...s.organizations, ...bundle.newOrganizations.filter((o) => !s.organizations.some((x) => x.id === o.id))],
      documentRequests: [...s.documentRequests, ...bundle.documents],
      activities: [...bundle.activities, ...s.activities],
      dataRooms: [...s.dataRooms, { buildingId: bundle.building.id, provider: "sharepoint", siteName: "", folderPath: "", status: "not_connected", recentFiles: [] }],
    }));
    return bundle.building.id;
  }, []);

  const addDealAssociation = useCallback<DataContextValue["addDealAssociation"]>((rel) => {
    setState((s) => {
      const deal = s.deals.find((d) => d.id === rel.dealId);
      return {
        ...s,
        dealBuildings: [...s.dealBuildings, { ...rel, id: uid("db"), addedAt: nowIso().slice(0, 10) }],
        buildings: touchBuilding(s, rel.buildingId),
        activities: [activity({ buildingId: rel.buildingId, dealId: rel.dealId, type: "deal_associated", title: `Added to ${deal?.name ?? "deal"}`, description: rel.notes }), ...s.activities],
      };
    });
  }, []);

  const addSiteVisit = useCallback<DataContextValue["addSiteVisit"]>((visit) => {
    setState((s) => {
      const v: SiteVisit = { ...visit, id: uid("sv"), createdAt: nowIso(), createdBy: actorName() };
      return {
        ...s,
        siteVisits: [v, ...s.siteVisits],
        buildings: touchBuilding(s, visit.buildingId),
        activities: [
          activity({
            buildingId: visit.buildingId,
            dealId: visit.dealId,
            type: "site_visit",
            title: "Site visit recorded",
            description: `${visit.participants.length} participant${visit.participants.length === 1 ? "" : "s"} · ${visit.observations.length} observation${visit.observations.length === 1 ? "" : "s"} · ${visit.followUps.length} follow-up${visit.followUps.length === 1 ? "" : "s"}`,
          }),
          ...s.activities,
        ],
      };
    });
  }, []);

  const toggleFollowUp = useCallback<DataContextValue["toggleFollowUp"]>((visitId, taskId) => {
    setState((s) => ({
      ...s,
      siteVisits: s.siteVisits.map((v) =>
        v.id === visitId ? { ...v, followUps: v.followUps.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) } : v,
      ),
    }));
  }, []);

  const toggleObservation = useCallback<DataContextValue["toggleObservation"]>((visitId, obsId) => {
    setState((s) => ({
      ...s,
      siteVisits: s.siteVisits.map((v) =>
        v.id === visitId
          ? { ...v, observations: v.observations.map((o) => (o.id === obsId ? { ...o, status: o.status === "open" ? "resolved" : "open" } : o)) }
          : v,
      ),
    }));
  }, []);

  const addDocumentRequest = useCallback<DataContextValue["addDocumentRequest"]>((req) => {
    setState((s) => {
      const doc: DocumentRequest = { ...req, id: uid("doc"), files: [], comments: [], createdAt: nowIso(), updatedAt: nowIso() };
      return {
        ...s,
        documentRequests: [...s.documentRequests, doc],
        activities: [
          activity({ buildingId: req.buildingId, dealId: req.dealId, type: "document_requested", title: `${req.name} ${req.status === "not_requested" ? "added to checklist" : "requested"}`, description: req.requestedFrom ? `Requested from ${req.requestedFrom}` : undefined }),
          ...s.activities,
        ],
      };
    });
  }, []);

  const mapDoc = (s: AppState, id: string, fn: (d: DocumentRequest) => DocumentRequest) =>
    s.documentRequests.map((d) => (d.id === id ? { ...fn(d), updatedAt: nowIso() } : d));

  const updateDocumentRequest = useCallback<DataContextValue["updateDocumentRequest"]>((id, patch, note) => {
    setState((s) => ({
      ...s,
      documentRequests: mapDoc(s, id, (d) => ({
        ...d,
        ...patch,
        comments: note ? [...d.comments, { id: uid("cm"), author: actorName(), text: note, createdAt: nowIso(), action: "status_change" }] : d.comments,
      })),
    }));
  }, []);

  const setDocumentStatus = useCallback<DataContextValue["setDocumentStatus"]>((id, status) => {
    setState((s) => {
      const doc = s.documentRequests.find((d) => d.id === id);
      if (!doc || doc.status === status) return s;
      const c: ReviewComment = { id: uid("cm"), author: actorName(), text: `Status changed from ${DOC_STATUS_LABEL[doc.status]} to ${DOC_STATUS_LABEL[status]}.`, createdAt: nowIso(), action: "status_change" };
      return {
        ...s,
        documentRequests: mapDoc(s, id, (d) => ({ ...d, status, comments: [...d.comments, c] })),
        activities:
          status === "requested"
            ? [activity({ buildingId: doc.buildingId, dealId: doc.dealId, type: "document_requested", title: `${doc.name} requested`, description: doc.requestedFrom ? `From ${doc.requestedFrom}` : undefined }), ...s.activities]
            : s.activities,
      };
    });
  }, []);

  const uploadDocumentFile = useCallback<DataContextValue["uploadDocumentFile"]>((id, file) => {
    setState((s) => {
      const doc = s.documentRequests.find((d) => d.id === id);
      if (!doc) return s;
      const version = doc.files.length + 1;
      const f: DocumentFile = {
        id: uid("file"),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        version,
        uploadedAt: nowIso(),
        uploadedBy: actorName(),
        source: "upload",
      };
      const nextStatus: DocumentStatus = ["approved"].includes(doc.status) ? "in_review" : "received";
      return {
        ...s,
        documentRequests: mapDoc(s, id, (d) => ({
          ...d,
          files: [...d.files, f],
          status: nextStatus,
          comments: [...d.comments, { id: uid("cm"), author: actorName(), text: `Uploaded ${file.name} (v${version}).`, createdAt: nowIso(), action: "comment" }],
        })),
        buildings: touchBuilding(s, doc.buildingId),
        activities: [activity({ buildingId: doc.buildingId, dealId: doc.dealId, type: "document_uploaded", title: `${doc.name} uploaded`, description: `${file.name} · v${version}` }), ...s.activities],
      };
    });
  }, []);

  const reviewDocument = useCallback<DataContextValue["reviewDocument"]>((id, action, comment) => {
    setState((s) => {
      const doc = s.documentRequests.find((d) => d.id === id);
      if (!doc) return s;
      const verb = action === "approved" ? "approved" : action === "rejected" ? "rejected" : "returned for revision";
      return {
        ...s,
        documentRequests: mapDoc(s, id, (d) => ({
          ...d,
          status: action,
          reviewer: d.reviewer ?? actorName(),
          comments: [...d.comments, { id: uid("cm"), author: actorName(), text: comment || `Document ${verb}.`, createdAt: nowIso(), action }],
        })),
        buildings: touchBuilding(s, doc.buildingId),
        activities: [activity({ buildingId: doc.buildingId, dealId: doc.dealId, type: "document_reviewed", title: `${doc.name} ${verb}`, description: comment || undefined }), ...s.activities],
      };
    });
  }, []);

  const addDocumentComment = useCallback<DataContextValue["addDocumentComment"]>((id, text) => {
    setState((s) => ({
      ...s,
      documentRequests: mapDoc(s, id, (d) => ({ ...d, comments: [...d.comments, { id: uid("cm"), author: actorName(), text, createdAt: nowIso(), action: "comment" }] })),
    }));
  }, []);

  const deleteDocumentRequest = useCallback<DataContextValue["deleteDocumentRequest"]>((id) => {
    setState((s) => ({ ...s, documentRequests: s.documentRequests.filter((d) => d.id !== id) }));
  }, []);

  const applyChecklistTemplate = useCallback<DataContextValue["applyChecklistTemplate"]>((buildingId, keys, dealId) => {
    const cur = stateRef.current;
    const bld = cur.buildings.find((x) => x.id === buildingId);
    const have = new Set(cur.documentRequests.filter((d) => d.buildingId === buildingId).map((d) => d.name));
    const added = bld ? [...BASELINE_DOCUMENTS, ...templateFor(bld.facilityType)].filter((t) => keys.includes(t.key) && !have.has(t.name)).length : 0;
    setState((s) => {
      const b = s.buildings.find((x) => x.id === buildingId);
      if (!b) return s;
      const existing = new Set(s.documentRequests.filter((d) => d.buildingId === buildingId).map((d) => d.name));
      const items = [...BASELINE_DOCUMENTS, ...templateFor(b.facilityType)].filter((t) => keys.includes(t.key) && !existing.has(t.name));
      if (!items.length) return s;
      const docs: DocumentRequest[] = items.map((t) => ({
        id: uid("doc"),
        buildingId,
        dealId,
        name: t.name,
        category: t.category,
        required: t.required,
        isBaseline: !!t.baseline,
        status: "not_requested",
        files: [],
        notes: t.description,
        comments: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }));
      return {
        ...s,
        documentRequests: [...s.documentRequests, ...docs],
        activities: [activity({ buildingId, dealId, type: "document_requested", title: `${docs.length} checklist item${docs.length === 1 ? "" : "s"} added from template`, description: docs.map((d) => d.name).join(", ") }), ...s.activities],
      };
    });
    return added;
  }, []);

  const syncDataRoom = useCallback<DataContextValue["syncDataRoom"]>((buildingId) => {
    // Simulated: the next outstanding request (requested / needs revision) "arrives" from SharePoint.
    const imported = stateRef.current.documentRequests.some(
      (d) => d.buildingId === buildingId && (d.status === "requested" || d.status === "needs_revision"),
    )
      ? 1
      : 0;
    setState((s) => {
      const room = s.dataRooms.find((r) => r.buildingId === buildingId);
      if (!room || room.status !== "connected") return s;
      const candidate = s.documentRequests.find((d) => d.buildingId === buildingId && (d.status === "requested" || d.status === "needs_revision"));
      const now = nowIso();
      let documentRequests = s.documentRequests;
      let recentFiles = room.recentFiles;
      const acts: Activity[] = [];
      if (candidate) {
        const b = s.buildings.find((x) => x.id === buildingId)!;
        const fileName = `${b.name.split(" ").slice(0, 2).join("_")}_${candidate.name.replace(/[^A-Za-z0-9]+/g, "_")}${candidate.files.length ? `_v${candidate.files.length + 1}` : ""}.pdf`;
        const f: DocumentFile = { id: uid("file"), fileName, fileSize: 412_000 + Math.round(Math.random() * 2_000_000), mimeType: "application/pdf", version: candidate.files.length + 1, uploadedAt: now, uploadedBy: "Data room sync", source: "sharepoint", pageCount: 4 + Math.round(Math.random() * 30) };
        documentRequests = mapDoc(s, candidate.id, (d) => ({ ...d, files: [...d.files, f], status: "received", comments: [...d.comments, { id: uid("cm"), author: "Data room sync", text: `Imported ${fileName} from SharePoint.`, createdAt: now, action: "comment" }] }));
        recentFiles = [{ id: uid("drf"), name: fileName, importedAt: now, size: f.fileSize, matchedRequestId: candidate.id }, ...recentFiles].slice(0, 6);
        acts.push(activity({ buildingId, dealId: candidate.dealId, type: "data_room_sync", actor: "Data room sync", title: `${candidate.name} imported from SharePoint`, description: `${fileName} matched to checklist item` }));
      } else {
        acts.push(activity({ buildingId, type: "data_room_sync", actor: "Data room sync", title: "Data room synced", description: "No new files found." }));
      }
      return {
        ...s,
        documentRequests,
        dataRooms: s.dataRooms.map((r) => (r.buildingId === buildingId ? { ...r, lastSyncAt: now, status: "connected", recentFiles } : r)),
        activities: [...acts, ...s.activities],
      };
    });
    return { imported };
  }, []);

  const connectDataRoom = useCallback<DataContextValue["connectDataRoom"]>((buildingId, folderPath) => {
    setState((s) => {
      const exists = s.dataRooms.some((r) => r.buildingId === buildingId);
      const room = { buildingId, provider: "sharepoint" as const, siteName: "OD Acquisitions", folderPath, status: "connected" as const, lastSyncAt: nowIso(), recentFiles: [] };
      return {
        ...s,
        dataRooms: exists ? s.dataRooms.map((r) => (r.buildingId === buildingId ? room : r)) : [...s.dataRooms, room],
        activities: [activity({ buildingId, type: "data_room_sync", title: "SharePoint folder connected (simulated)", description: folderPath }), ...s.activities],
      };
    });
  }, []);

  const addNote = useCallback<DataContextValue["addNote"]>((buildingId, text) => {
    setState((s) => ({ ...s, buildings: touchBuilding(s, buildingId), activities: [activity({ buildingId, type: "note", title: "Note added", description: text }), ...s.activities] }));
  }, []);

  const refreshCms = useCallback<DataContextValue["refreshCms"]>((buildingId) => {
    setState((s) => ({
      ...s,
      cms: s.cms.map((c) => (c.buildingId === buildingId ? { ...c, lastRefreshedAt: nowIso() } : c)),
      activities: [activity({ buildingId, type: "cms_refreshed", actor: "System", title: "CMS data refreshed", description: "Simulated refresh — mock dataset unchanged." }), ...s.activities],
    }));
  }, []);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(buildSeedState());
  }, []);

  const updateOrganization = useCallback<DataContextValue["updateOrganization"]>((id, patch, change) => {
    setState((s) => ({
      ...s,
      organizations: s.organizations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      activities: change?.buildingId ? [activity({ buildingId: change.buildingId, type: "building_updated", title: change.title }), ...s.activities] : s.activities,
    }));
  }, []);

  const addOrganization = useCallback<DataContextValue["addOrganization"]>((org) => {
    const id = uid("org");
    setState((s) => ({ ...s, organizations: [...s.organizations, { acuityFocus: [], regionalFocus: [], stateFocus: [], tags: [], ...org, id }] }));
    return id;
  }, []);

  const updateContact = useCallback<DataContextValue["updateContact"]>((id, patch) => {
    setState((s) => ({ ...s, contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const addContact = useCallback<DataContextValue["addContact"]>((contact) => {
    const id = uid("ct");
    setState((s) => {
      const org = s.organizations.find((o) => o.id === contact.organizationId);
      return {
        ...s,
        contacts: [...s.contacts, { ...contact, id }],
        // First person on a company's roster becomes its primary contact.
        organizations: org && !org.primaryContactId ? s.organizations.map((o) => (o.id === org.id ? { ...o, primaryContactId: id } : o)) : s.organizations,
      };
    });
    return id;
  }, []);

  const deleteContact = useCallback<DataContextValue["deleteContact"]>((id) => {
    setState((s) => ({
      ...s,
      contacts: s.contacts.filter((c) => c.id !== id),
      organizations: s.organizations.map((o) => (o.primaryContactId === id ? { ...o, primaryContactId: s.contacts.find((c) => c.organizationId === o.id && c.id !== id)?.id } : o)),
      relationships: s.relationships.filter((r) => r.contactId !== id),
    }));
  }, []);

  const changeOwner = useCallback<DataContextValue["changeOwner"]>((buildingId, organizationId, effectiveDate) => {
    setState((s) => {
      const current = s.ownerships.find((o) => o.buildingId === buildingId && o.isCurrent && o.role === "property_owner");
      if (current?.organizationId === organizationId) return s;
      const prevName = s.organizations.find((o) => o.id === current?.organizationId)?.name;
      const nextName = s.organizations.find((o) => o.id === organizationId)?.name ?? "new owner";
      return {
        ...s,
        ownerships: [
          ...s.ownerships.map((o) => (o.id === current?.id ? { ...o, isCurrent: false, endDate: effectiveDate } : o)),
          { id: uid("own"), buildingId, organizationId, role: "property_owner", startDate: effectiveDate, isCurrent: true, meta: { source: "manual", asOf: effectiveDate, verification: "unverified" } },
        ],
        buildings: touchBuilding(s, buildingId),
        activities: [
          activity({ buildingId, type: "building_updated", title: `Current owner changed to ${nextName}`, description: prevName ? `Previous owner ${prevName} moved to ownership history (effective ${effectiveDate}).` : `Effective ${effectiveDate}.` }),
          ...s.activities,
        ],
      };
    });
  }, []);

  const addBuildingPhotos = useCallback<DataContextValue["addBuildingPhotos"]>((buildingId, photos) => {
    setState((s) => ({
      ...s,
      buildings: s.buildings.map((b) =>
        b.id === buildingId
          ? { ...b, updatedAt: nowIso(), photos: [...b.photos, ...photos.map((p) => ({ ...p, id: uid("ph"), uploadedAt: nowIso(), uploadedBy: actorName() }))] }
          : b,
      ),
      activities: [activity({ buildingId, type: "building_updated", title: `${photos.length} photo${photos.length === 1 ? "" : "s"} added` }), ...s.activities],
    }));
  }, []);

  const removeBuildingPhoto = useCallback<DataContextValue["removeBuildingPhoto"]>((buildingId, photoId) => {
    setState((s) => ({ ...s, buildings: s.buildings.map((b) => (b.id === buildingId ? { ...b, photos: b.photos.filter((p) => p.id !== photoId) } : b)) }));
  }, []);

  const setCoverPhoto = useCallback<DataContextValue["setCoverPhoto"]>((buildingId, photoId) => {
    setState((s) => ({
      ...s,
      buildings: s.buildings.map((b) => {
        if (b.id !== buildingId) return b;
        const p = b.photos.find((x) => x.id === photoId);
        return p ? { ...b, photos: [p, ...b.photos.filter((x) => x.id !== photoId)] } : b;
      }),
    }));
  }, []);

  const addCommunication = useCallback<DataContextValue["addCommunication"]>((c) => {
    const id = uid("comm");
    setState((s) => ({ ...s, communications: [{ ...c, id, threadId: id, source: "manual", loggedBy: actorName() }, ...s.communications] }));
  }, []);

  /** Logs a deal event on each building in the deal (activity lives on buildings in this prototype). */
  const dealActivities = (s: AppState, dealId: string, title: string, description?: string) =>
    s.dealBuildings.filter((r) => r.dealId === dealId).map((r) => activity({ buildingId: r.buildingId, dealId, type: "deal_associated", title, description }));

  const updateDeal = useCallback<DataContextValue["updateDeal"]>((id, patch, logTitle) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      activities: logTitle ? [...dealActivities(s, id, logTitle), ...s.activities] : s.activities,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addDeal = useCallback<DataContextValue["addDeal"]>((deal, buildingIds) => {
    const id = deal.id ?? uid("deal");
    const cur = stateRef.current;
    const year = new Date().getFullYear();
    const n = cur.deals.filter((d) => d.code.startsWith(`OD-${year}-`)).map((d) => Number(d.code.split("-")[2]) || 0);
    const code = `OD-${year}-${String(Math.max(0, ...n) + 1).padStart(3, "0")}`;
    setState((s) => {
      const rels = buildingIds.map((buildingId) => ({ id: uid("db"), dealId: id, buildingId, role: (buildingIds.length > 1 ? "portfolio_asset" : "primary_asset") as DealBuildingRelationship["role"], addedAt: nowIso().slice(0, 10) }));
      return {
        ...s,
        deals: [{ ...deal, id, code, createdAt: nowIso().slice(0, 10) }, ...s.deals],
        dealBuildings: [...s.dealBuildings, ...rels],
        activities: [...rels.map((r) => activity({ buildingId: r.buildingId, dealId: id, type: "deal_associated", title: `Added to ${deal.name}`, description: "New deal created" })), ...s.activities],
      };
    });
    return id;
  }, []);

  const setDealContact = useCallback<DataContextValue["setDealContact"]>((dealId, a) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) => {
        if (d.id !== dealId) return d;
        const rest = (d.contacts ?? []).filter((x) => !(x.side === a.side && x.role === a.role));
        return { ...d, contacts: a.contactId ? [...rest, { ...a, contactId: a.contactId } as DealContactAssignment] : rest };
      }),
    }));
  }, []);

  const updateDealReport = useCallback<DataContextValue["updateDealReport"]>((dealId, kind, patch) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) => {
        if (d.id !== dealId) return d;
        const reports = d.reports ?? [];
        const exists = reports.some((r) => r.kind === kind);
        return { ...d, reports: exists ? reports.map((r) => (r.kind === kind ? { ...r, ...patch } : r)) : [...reports, { kind, status: "not_ordered", ...patch }] };
      }),
    }));
  }, []);

  const checklistAction = useCallback<DataContextValue["checklistAction"]>((dealId, itemId, action) => {
    // Only the assigned approver may approve, request changes or revoke approval.
    if (action.type === "approve" || action.type === "request_changes" || action.type === "revoke_approval") {
      const deal = stateRef.current.deals.find((d) => d.id === dealId);
      const item = deal?.checklist?.find((i) => i.id === itemId);
      if (!deal || !item || !canApprove(item, deal, actorRef.current.id)) return false;
    }
    setState((s) => {
      const deal = s.deals.find((d) => d.id === dealId);
      const item = deal?.checklist?.find((i) => i.id === itemId);
      if (!deal || !item) return s;
      const next = applyChecklistAction(item, action, actorName());
      const acts: Activity[] = [];
      if (action.type === "approve" || action.type === "bypass") {
        acts.push(...dealActivities(s, dealId, action.type === "approve" ? `${item.title} approved` : `${item.title} marked not needed`, action.type === "bypass" ? action.reason : action.note));
      }
      return { ...s, deals: s.deals.map((d) => (d.id === dealId ? { ...d, checklist: d.checklist!.map((i) => (i.id === itemId ? next : i)) } : d)), activities: [...acts, ...s.activities] };
    });
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDealApprover = useCallback<DataContextValue["setDealApprover"]>((dealId, contactId, applyToAll) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) =>
        d.id === dealId
          ? { ...d, dealApproverContactId: contactId, checklist: applyToAll ? d.checklist?.map((i) => (i.approverContactId ? { ...i, approverContactId: undefined } : i)) : d.checklist }
          : d,
      ),
    }));
  }, []);

  const undoAutoAdvance = useCallback<DataContextValue["undoAutoAdvance"]>((dealId) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) =>
        d.id === dealId && d.lastAutoAdvance
          ? { ...d, stage: d.lastAutoAdvance.from, status: d.lastAutoAdvance.fromStatus, skippedLoi: d.lastAutoAdvance.from === "high_level_review" || d.lastAutoAdvance.from === "loi_signed" ? false : d.skippedLoi, actualCloseDate: d.lastAutoAdvance.fromStatus === "closed" ? d.actualCloseDate : undefined, lastAutoAdvance: undefined }
          : d,
      ),
      activities: [...dealActivities(s, dealId, "Automatic milestone move undone"), ...s.activities],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissAutoAdvance = useCallback<DataContextValue["dismissAutoAdvance"]>((dealId) => {
    setState((s) => ({ ...s, deals: s.deals.map((d) => (d.id === dealId && d.lastAutoAdvance ? { ...d, lastAutoAdvance: { ...d.lastAutoAdvance, dismissed: true } } : d)) }));
  }, []);

  const setPhaseOverride = useCallback<DataContextValue["setPhaseOverride"]>((dealId, key, value) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) => {
        if (d.id !== dealId) return d;
        const o = { ...(d.phaseOverrides ?? {}) };
        if (value === undefined) delete o[key];
        else o[key] = value;
        return { ...d, phaseOverrides: o };
      }),
    }));
  }, []);

  // System-driven checklist stages: whenever data changes, complete any auto stage whose condition is now met.
  useEffect(() => {
    const updates = state.deals.map((d) => [d.id, applyAutoRules(d, state)] as const).filter(([, c]) => c);
    if (updates.length) {
      setState((s) => ({ ...s, deals: s.deals.map((d) => { const u = updates.find(([id]) => id === d.id); return u ? { ...d, checklist: u[1]! } : d; }) }));
      return;
    }
    // Milestone auto-advance: move deals forward as pipeline phases complete.
    const moves = state.deals.map((d) => [d, pendingAutoAdvance(d)] as const).filter(([, m]) => m);
    if (!moves.length) return;
    setState((s) => {
      let acts: Activity[] = [];
      const deals = s.deals.map((d) => {
        const m = moves.find(([x]) => x.id === d.id)?.[1];
        if (!m) return d;
        const closing = m.stage === "closed" || m.stage === "asset_management";
        acts = [...acts, ...dealActivities(s, d.id, `${d.name} moved to ${DEAL_STAGE_LABEL[m.stage]} automatically`, m.reason)];
        return {
          ...d,
          stage: m.stage,
          status: closing ? ("closed" as const) : d.status,
          actualCloseDate: closing ? (d.actualCloseDate ?? nowIso().slice(0, 10)) : d.actualCloseDate,
          skippedLoi: d.skippedLoi || (m.stage === "psa_signed" && d.stage === "high_level_review"),
          milestoneFloor: m.stage,
          lastAutoAdvance: { from: d.stage, fromStatus: d.status, to: m.stage, at: nowIso(), reason: m.reason },
        };
      });
      return { ...s, deals, activities: [...acts, ...s.activities] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const removeDealBuilding = useCallback<DataContextValue["removeDealBuilding"]>((relId) => {
    setState((s) => {
      const rel = s.dealBuildings.find((r) => r.id === relId);
      const deal = s.deals.find((d) => d.id === rel?.dealId);
      return {
        ...s,
        dealBuildings: s.dealBuildings.filter((r) => r.id !== relId),
        activities: rel ? [activity({ buildingId: rel.buildingId, dealId: rel.dealId, type: "deal_associated", title: `Removed from ${deal?.name ?? "deal"}` }), ...s.activities] : s.activities,
      };
    });
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      state,
      updateBuilding,
      addBuilding,
      addDealAssociation,
      addSiteVisit,
      toggleFollowUp,
      toggleObservation,
      addDocumentRequest,
      updateDocumentRequest,
      setDocumentStatus,
      uploadDocumentFile,
      reviewDocument,
      addDocumentComment,
      deleteDocumentRequest,
      applyChecklistTemplate,
      syncDataRoom,
      connectDataRoom,
      addNote,
      refreshCms,
      resetDemo,
      updateOrganization,
      addOrganization,
      updateContact,
      addContact,
      deleteContact,
      changeOwner,
      addBuildingPhotos,
      removeBuildingPhoto,
      setCoverPhoto,
      addCommunication,
      updateDeal,
      addDeal,
      setDealContact,
      updateDealReport,
      checklistAction,
      setPhaseOverride,
      setDealApprover,
      undoAutoAdvance,
      dismissAutoAdvance,
      actingAs: actorRef.current,
      setActingAs,
      removeDealBuilding,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, actingAs],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
