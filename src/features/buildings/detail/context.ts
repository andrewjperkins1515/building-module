import { createContext, useContext } from "react";
import type { BuildingBundle } from "@/store/selectors";

export type DetailTab = "overview" | "cms" | "property" | "financials" | "documents" | "site-visits" | "relationships" | "activity";

export interface BuildingPageCtx {
  bundle: BuildingBundle;
  goTab: (tab: DetailTab, params?: Record<string, string>) => void;
  openDeal: (dealId: string) => void;
  openEdit: () => void;
  openAddToDeal: () => void;
}

export const BuildingPageContext = createContext<BuildingPageCtx | null>(null);

export function useBuildingPage() {
  const ctx = useContext(BuildingPageContext);
  if (!ctx) throw new Error("useBuildingPage must be used within BuildingDetail");
  return ctx;
}
