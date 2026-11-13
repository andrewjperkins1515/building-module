import type { ContactType, Organization, Sector } from "@/types";

/** Default CRM contact type based on the contact's company role. */
export function defaultContactType(org?: Pick<Organization, "type">): ContactType {
  switch (org?.type) {
    case "operator":
      return "operator";
    case "broker":
      return "broker";
    case "law_firm":
      return "lawyer";
    case "consultant":
      return "vendor_dd";
    case "management":
      return "vendor_operating";
    default:
      return "investor"; // owners, parents, lenders, investors
  }
}

const ACUITY_TO_SECTOR: Record<string, Sector> = {
  "Skilled Nursing": "snf",
  "Assisted Living": "alf",
  "Independent Living": "ilf",
  "Memory Care": "mc",
};

const SECTOR_OVERRIDES: Record<string, Sector[]> = {
  org_ashford: ["alf", "mc"],
  org_summit_mgmt: ["alf", "ilf", "mc"],
  org_calloway: ["snf", "alf"],
  org_stonebridge: ["alf", "ilf", "mc"],
  org_whitaker: ["snf", "alf"],
  org_clearline: ["snf", "alf", "ilf", "mc"],
};

/** Default sectors from the company's acuity focus (fallback: SNF). */
export function defaultSectors(org?: Pick<Organization, "id" | "acuityFocus">): Sector[] {
  if (org && SECTOR_OVERRIDES[org.id]) return SECTOR_OVERRIDES[org.id];
  const s = [...new Set((org?.acuityFocus ?? []).map((a) => ACUITY_TO_SECTOR[a]).filter(Boolean))];
  return s.length ? s : ["snf"];
}
