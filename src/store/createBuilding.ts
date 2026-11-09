import type { Activity, Building, BuildingOwnership, CMSData, DocumentRequest, FacilityType, Organization } from "@/types";
import type { CmsRegistryRecord } from "@/data/cmsRegistry";
import { generateCms, baselineDocumentRequests } from "@/data/generators";
import { organizations as seedOrgs } from "@/data/organizations";
import { CURRENT_USER } from "@/lib/labels";
import { nowIso, todayIso, uid } from "@/lib/utils";

export interface ManualBuildingFields {
  name: string;
  facilityType: FacilityType;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  certifiedBeds: number;
  licensedBeds: number;
  averageDailyCensus: number;
  yearBuilt: number | null;
  squareFeet: number | null;
  providerNumber?: string;
  operatorName?: string;
}

export type NewBuildingInput =
  | { method: "cms_search" | "provider_number"; record: CmsRegistryRecord }
  | { method: "manual"; fields: ManualBuildingFields };

export interface NewBuildingBundle {
  building: Building;
  cms?: CMSData;
  ownerships: BuildingOwnership[];
  newOrganizations: Organization[];
  documents: DocumentRequest[];
  activities: Activity[];
}

export function materializeNewBuilding(input: NewBuildingInput): NewBuildingBundle {
  const id = uid("bld");
  const now = nowIso();
  const today = todayIso();
  const seed = Math.floor(Math.random() * 60) + 1;

  const fromCms = input.method !== "manual";
  const f: ManualBuildingFields = fromCms
    ? {
        name: input.record.name,
        facilityType: input.record.type,
        street: input.record.street,
        city: input.record.city,
        state: input.record.state,
        zip: input.record.zip,
        county: input.record.county,
        certifiedBeds: input.record.certifiedBeds,
        licensedBeds: input.record.certifiedBeds,
        averageDailyCensus: input.record.adc,
        yearBuilt: null,
        squareFeet: null,
        providerNumber: input.record.ccn,
        operatorName: input.record.operatorName,
      }
    : input.fields;

  const src = fromCms ? ("cms_mock" as const) : ("manual" as const);
  const meta = (verification: "verified" | "unverified" = fromCms ? "verified" : "unverified") => ({
    source: src,
    asOf: today,
    verification,
    verifiedBy: verification === "verified" ? "CMS registry match (mock)" : undefined,
  });

  const building: Building = {
    id,
    name: f.name,
    alternateNames: [],
    facilityType: f.facilityType,
    address: { street: f.street, city: f.city, state: f.state, zip: f.zip, county: f.county, mapX: 0.35 + Math.random() * 0.3, mapY: 0.35 + Math.random() * 0.3 },
    identifiers: f.providerNumber
      ? [{ id: uid("bid"), type: "cms_ccn", value: f.providerNumber, issuer: "CMS", effectiveFrom: fromCms ? input.record.certificationDate : today, isCurrent: true }]
      : [],
    certifiedBeds: { value: f.certifiedBeds, meta: meta() },
    licensedBeds: { value: f.licensedBeds, meta: { ...meta("unverified"), note: fromCms ? "Defaulted to certified beds; confirm against state license." : undefined } },
    averageDailyCensus: { value: f.averageDailyCensus, meta: meta("unverified") },
    yearBuilt: { value: f.yearBuilt, meta: { ...meta("unverified"), source: "manual" } },
    squareFeet: { value: f.squareFeet, meta: { ...meta("unverified"), source: "manual" } },
    stories: null,
    acreage: null,
    privateRooms: null,
    semiPrivateRooms: null,
    verificationStatus: fromCms ? "partially_verified" : "unverified",
    lastVerifiedAt: fromCms ? today : null,
    photoSeed: seed,
    tags: [],
    createdAt: now,
    updatedAt: now,
    createdBy: CURRENT_USER.name,
  };

  const newOrganizations: Organization[] = [];
  const ownerships: BuildingOwnership[] = [];
  if (f.operatorName?.trim()) {
    const name = f.operatorName.trim();
    let org = seedOrgs.find((o) => o.name.toLowerCase() === name.toLowerCase());
    if (!org) {
      org = { id: `org_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, name, type: "operator", hqCity: f.city, hqState: f.state };
      newOrganizations.push(org);
    }
    ownerships.push({ id: uid("own"), buildingId: id, organizationId: org.id, role: "operator", startDate: today, isCurrent: true, meta: meta() });
  }

  const cms = fromCms ? { ...generateCms(id, input.record.ccn, input.record.ratings, seed), lastRefreshedAt: now } : undefined;

  const activities: Activity[] = [
    {
      id: uid("act"),
      buildingId: id,
      type: "building_created",
      title: "Building record created",
      description: fromCms ? `Created from CMS provider ${f.providerNumber} (mock registry). Baseline document placeholders added.` : "Created manually. Baseline document placeholders added.",
      actor: CURRENT_USER.name,
      timestamp: now,
    },
  ];
  if (cms) activities.unshift({ id: uid("act"), buildingId: id, type: "cms_refreshed", title: "CMS data loaded", description: "Initial mock CMS extract attached.", actor: "System", timestamp: now });

  return { building, cms, ownerships, newOrganizations, documents: baselineDocumentRequests(id, now), activities };
}
