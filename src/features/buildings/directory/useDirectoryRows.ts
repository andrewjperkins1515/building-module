import { useMemo } from "react";
import type { Building, CompanyType, Deal, VerificationStatus } from "@/types";
import { useData } from "@/store/DataProvider";
import { currentCcn, currentOwnership, dealLinks, docStats, occupancy } from "@/store/selectors";

export interface DirectoryRow {
  building: Building;
  ccn?: string;
  rating?: number;
  operator?: string;
  owner?: string;
  ownerType?: CompanyType;
  occupancy: number | null;
  activeDeals: Deal[];
  allDeals: Deal[];
  dealAssociation: DealAssociation;
  docPct: number;
  docRequired: number;
  docApproved: number;
}

export type DealAssociation = "active" | "owned" | "historical" | "none";

export const DEAL_ASSOCIATION_LABEL: Record<DealAssociation, string> = {
  active: "In active deal",
  owned: "Closed / owned",
  historical: "Historical only",
  none: "No deal history",
};

export function useDirectoryRows(): DirectoryRow[] {
  const { state } = useData();
  return useMemo(
    () =>
      state.buildings.map((b) => {
        const own = currentOwnership(state, b.id);
        const links = dealLinks(state, b.id);
        const active = links.filter((l) => l.deal.status === "active").map((l) => l.deal);
        const closed = links.some((l) => l.deal.status === "closed");
        const stats = docStats(state.documentRequests.filter((d) => d.buildingId === b.id));
        return {
          building: b,
          ccn: currentCcn(b),
          rating: state.cms.find((c) => c.buildingId === b.id)?.ratings.overall,
          operator: own.operator?.name,
          owner: own.owner?.name,
          ownerType: own.owner?.companyType,
          occupancy: occupancy(b),
          activeDeals: active,
          allDeals: links.map((l) => l.deal),
          dealAssociation: active.length ? "active" : closed ? "owned" : links.length ? "historical" : "none",
          docPct: stats.pct,
          docRequired: stats.required,
          docApproved: stats.requiredApproved,
        };
      }),
    [state],
  );
}

export interface DirectoryFilters {
  q: string;
  states: string[];
  types: string[];
  operators: string[];
  ownerTypes: string[]; // CompanyType | "none"
  ratings: string[]; // "1".."5" | "none"
  deal: DealAssociation[];
  verification: VerificationStatus[];
  bedsMin?: number;
  bedsMax?: number;
}

export const EMPTY_FILTERS: DirectoryFilters = { q: "", states: [], types: [], operators: [], ownerTypes: [], ratings: [], deal: [], verification: [] };

export type SortKey = "name" | "location" | "type" | "beds" | "adc" | "rating" | "operator" | "deals" | "verification" | "updated";

export function applyFilters(rows: DirectoryRow[], f: DirectoryFilters) {
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    const b = r.building;
    if (q) {
      const hay = [b.name, ...b.alternateNames, b.address.city, b.address.state, b.address.county, r.operator ?? "", r.owner ?? "", ...b.identifiers.map((i) => i.value), ...r.allDeals.map((d) => d.name)]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.states.length && !f.states.includes(b.address.state)) return false;
    if (f.types.length && !f.types.includes(b.facilityType)) return false;
    if (f.operators.length && !f.operators.includes(r.operator ?? "")) return false;
    if (f.ownerTypes?.length && !f.ownerTypes.includes(r.ownerType ?? "none")) return false;
    if (f.ratings.length && !f.ratings.includes(r.rating ? String(r.rating) : "none")) return false;
    if (f.deal.length && !f.deal.includes(r.dealAssociation)) return false;
    if (f.verification.length && !f.verification.includes(b.verificationStatus)) return false;
    if (f.bedsMin !== undefined && b.certifiedBeds.value < f.bedsMin) return false;
    if (f.bedsMax !== undefined && b.certifiedBeds.value > f.bedsMax) return false;
    return true;
  });
}

const VERIF_RANK: Record<VerificationStatus, number> = { verified: 0, partially_verified: 1, needs_review: 2, unverified: 3 };

export function sortRows(rows: DirectoryRow[], key: SortKey, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;
  const val = (r: DirectoryRow): string | number => {
    switch (key) {
      case "name":
        return r.building.name.toLowerCase();
      case "location":
        return `${r.building.address.state}-${r.building.address.city}`.toLowerCase();
      case "type":
        return r.building.facilityType;
      case "beds":
        return r.building.certifiedBeds.value;
      case "adc":
        return r.building.averageDailyCensus.value;
      case "rating":
        return r.rating ?? -1;
      case "operator":
        return (r.operator ?? "~").toLowerCase();
      case "deals":
        return r.activeDeals.length * 10 + r.allDeals.length;
      case "verification":
        return VERIF_RANK[r.building.verificationStatus];
      case "updated":
        return r.building.updatedAt;
    }
  };
  return [...rows].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    return (va < vb ? -1 : va > vb ? 1 : 0) * m;
  });
}
