import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Activity, BarChart3, Building, ClipboardCheck, FileText, LayoutDashboard, Network, ShieldCheck } from "lucide-react";
import { useBreadcrumbs } from "@/components/layout/breadcrumbs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBuildingBundle } from "@/store/selectors";
import { NotFound } from "@/pages/NotFound";
import { BuildingPageContext, type BuildingPageCtx, type DetailTab } from "./context";
import { BuildingHeader } from "./BuildingHeader";
import { OverviewTab } from "./tabs/OverviewTab";
import { CmsTab } from "./tabs/CmsTab";
import { PropertyTab } from "./tabs/PropertyTab";
import { FinancialsTab } from "./tabs/FinancialsTab";
import { DocumentsTab } from "../documents/DocumentsTab";
import { SiteVisitsTab } from "./tabs/SiteVisitsTab";
import { RelationshipsTab } from "./tabs/RelationshipsTab";
import { ActivityTab } from "./tabs/ActivityTab";
import { EditBuildingSheet } from "./dialogs/EditBuildingSheet";
import { AddToDealDialog } from "./dialogs/AddToDealDialog";
import { DealPreviewSheet } from "./dialogs/DealPreviewSheet";

const TABS: { id: DetailTab; label: string; icon: typeof Building }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "cms", label: "CMS & Regulatory", icon: ShieldCheck },
  { id: "property", label: "Property & Condition", icon: Building },
  { id: "financials", label: "Financials", icon: BarChart3 },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "site-visits", label: "Site Visits", icon: ClipboardCheck },
  { id: "relationships", label: "Relationships", icon: Network },
  { id: "activity", label: "Activity", icon: Activity },
];

export function BuildingDetail() {
  const { buildingId, tab: tabParam } = useParams();
  const [, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const bundle = useBuildingBundle(buildingId);
  const tab: DetailTab = TABS.some((t) => t.id === tabParam) ? (tabParam as DetailTab) : "overview";
  const [editOpen, setEditOpen] = useState(false);
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [dealId, setDealId] = useState<string | null>(null);

  useBreadcrumbs(
    bundle
      ? [
          { label: "Buildings", to: "/buildings" },
          { label: bundle.building.name, to: `/buildings/${bundle.building.id}` },
          ...(tab !== "overview" ? [{ label: TABS.find((t) => t.id === tab)!.label }] : []),
        ]
      : [{ label: "Buildings", to: "/buildings" }, { label: "Not found" }],
  );

  const ctx = useMemo<BuildingPageCtx | null>(
    () =>
      bundle
        ? {
            bundle,
            goTab: (t, params) => {
              const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
              navigate(`/buildings/${bundle.building.id}${t === "overview" ? "" : `/${t}`}${qs}`);
              document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
            },
            openDeal: (id) => setDealId(id),
            openEdit: () => setEditOpen(true),
            openAddToDeal: () => setAddDealOpen(true),
          }
        : null,
    [bundle, navigate],
  );

  if (!bundle || !ctx) return <NotFound title="Building not found" description="This building may have been removed, or the link is incorrect." />;

  const counts: Partial<Record<DetailTab, number>> = {
    documents: bundle.docStats.missing + bundle.docStats.pendingReview,
    "site-visits": bundle.siteVisits.length,
  };

  return (
    <BuildingPageContext.Provider value={ctx}>
      <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 lg:px-8">
        <BuildingHeader />
        <Tabs
          value={tab}
          onValueChange={(t) => {
            setSearch({});
            ctx.goTab(t as DetailTab);
          }}
          className="mt-6"
        >
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                <t.icon className="size-3.5 opacity-70" />
                {t.label}
                {counts[t.id] ? (
                  <span className="tabular ml-0.5 rounded-full bg-subtle px-1.5 text-[10.5px] font-medium text-ink-3">{counts[t.id]}</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="mt-5">
          {tab === "overview" && <OverviewTab />}
          {tab === "cms" && <CmsTab />}
          {tab === "property" && <PropertyTab />}
          {tab === "financials" && <FinancialsTab />}
          {tab === "documents" && <DocumentsTab />}
          {tab === "site-visits" && <SiteVisitsTab />}
          {tab === "relationships" && <RelationshipsTab />}
          {tab === "activity" && <ActivityTab />}
        </div>
      </div>
      <EditBuildingSheet open={editOpen} onOpenChange={setEditOpen} />
      <AddToDealDialog open={addDealOpen} onOpenChange={setAddDealOpen} />
      <DealPreviewSheet dealId={dealId} onOpenChange={(o) => !o && setDealId(null)} />
    </BuildingPageContext.Provider>
  );
}
