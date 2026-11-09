import type { DocumentCategory, FacilityType } from "@/types";

export interface DocumentTemplateItem {
  key: string;
  name: string;
  category: DocumentCategory;
  required: boolean;
  /** Only applies to CMS-certified facility types. */
  cmsOnly?: boolean;
  baseline?: boolean;
  description: string;
}

/** Placeholders automatically created for every building. */
export const BASELINE_DOCUMENTS: DocumentTemplateItem[] = [
  { key: "license", name: "Current facility license", category: "licenses", required: true, baseline: true, description: "Active state operating license showing licensed bed count and licensee." },
  { key: "floor_plan", name: "Floor plan", category: "property", required: true, baseline: true, description: "Current floor plan with room numbers, bed configuration and life-safety layout." },
];

/** Standard acquisition diligence checklist. Configurable per building. */
export const DILIGENCE_TEMPLATE: DocumentTemplateItem[] = [
  { key: "cert_letters", name: "Medicare / Medicaid certification letters", category: "licenses", required: true, cmsOnly: true, description: "CMS tie-in notice and state Medicaid provider agreement." },
  { key: "survey_2567", name: "CMS-2567 survey reports (3 years)", category: "licenses", required: true, cmsOnly: true, description: "Statements of deficiencies for standard and complaint surveys." },
  { key: "poc", name: "Plans of correction", category: "licenses", required: false, cmsOnly: true, description: "Accepted plans of correction for cited deficiencies." },
  { key: "cert_occupancy", name: "Certificate of occupancy", category: "property", required: true, description: "Most recent certificate of occupancy for all structures." },
  { key: "alta", name: "ALTA / NSPS land title survey", category: "property", required: true, description: "Current ALTA survey certified to buyer and lender." },
  { key: "t12", name: "Trailing 12-month P&L", category: "financial", required: true, description: "Monthly operating statements for the trailing twelve months." },
  { key: "cost_reports", name: "Medicare cost reports (3 years)", category: "financial", required: true, cmsOnly: true, description: "Filed cost reports including worksheet S-3 census." },
  { key: "census", name: "Census & payer mix reports", category: "financial", required: true, description: "Monthly census by payer for 24 months." },
  { key: "ar_aging", name: "Accounts receivable aging", category: "financial", required: false, description: "AR aging by payer as of most recent month-end." },
  { key: "tax_bills", name: "Real estate tax bills", category: "financial", required: false, description: "Two most recent years of property tax bills." },
  { key: "title", name: "Title commitment", category: "legal", required: true, description: "Title commitment with copies of exceptions." },
  { key: "lease", name: "Existing operating lease", category: "legal", required: true, description: "Current lease and all amendments, guaranties and estoppels." },
  { key: "contracts", name: "Vendor & service contracts", category: "legal", required: false, description: "Therapy, pharmacy, dietary, staffing agency and maintenance contracts." },
  { key: "litigation", name: "Pending litigation summary", category: "legal", required: true, description: "Schedule of pending and threatened claims." },
  { key: "pca", name: "Property condition assessment", category: "third_party", required: true, description: "Third-party PCA with 12-year capital reserve table." },
  { key: "phase1", name: "Phase I environmental site assessment", category: "third_party", required: true, description: "ASTM E1527-21 Phase I ESA." },
  { key: "appraisal", name: "Appraisal", category: "third_party", required: false, description: "MAI appraisal supporting price allocation." },
  { key: "capex_history", name: "Capital expenditure history (5 years)", category: "capex", required: true, description: "Schedule of completed capital projects with invoices." },
  { key: "site_photos", name: "Site visit photo log", category: "site_visit", required: false, description: "Annotated photo log from diligence walkthrough." },
];

export function templateFor(type: FacilityType) {
  const cms = type === "skilled_nursing" || type === "ccrc";
  return DILIGENCE_TEMPLATE.filter((t) => cms || !t.cmsOnly);
}
