import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Briefcase, FileText, Landmark, LayoutDashboard, ListChecks, PieChart, Users } from "lucide-react";
import { DataProvider } from "@/store/DataProvider";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/overlays";
import { BreadcrumbProvider } from "@/components/layout/breadcrumbs";
import { AppShell } from "@/components/layout/AppShell";
import { BuildingsDirectory } from "@/features/buildings/directory/BuildingsDirectory";
import { BuildingDetail } from "@/features/buildings/detail/BuildingDetail";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFound } from "@/pages/NotFound";

const PLACEHOLDERS = [
  { path: "dashboard", title: "Dashboard", icon: LayoutDashboard, description: "Pipeline summary, upcoming milestones and portfolio KPIs across all deals and assets." },
  { path: "deals", title: "Deals", icon: Briefcase, description: "Deal pipeline from High-Level Review through LOI, PSA and close — with multi-building portfolio support." },
  { path: "contacts", title: "Contacts", icon: Users, description: "People across sellers, operators, brokers, lenders and counsel, linked to deals and buildings." },
  { path: "organizations", title: "Organizations", icon: Landmark, description: "Owners, operators, parent companies and service providers with relationship history." },
  { path: "documents", title: "Documents", icon: FileText, description: "Cross-deal document library and diligence tracker. Building-level diligence is available today on each building's Documents tab." },
  { path: "tasks", title: "Tasks & Activity", icon: ListChecks, description: "Assigned tasks, follow-ups and a unified activity feed across the platform." },
  { path: "asset-management", title: "Asset Management", icon: PieChart, description: "Post-close performance monitoring, lease compliance and capital planning for owned assets." },
];

export default function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <TooltipProvider>
          <BreadcrumbProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Navigate to="/buildings" replace />} />
                  <Route path="buildings" element={<BuildingsDirectory />} />
                  <Route path="buildings/:buildingId" element={<BuildingDetail />} />
                  <Route path="buildings/:buildingId/:tab" element={<BuildingDetail />} />
                  {PLACEHOLDERS.map((p) => (
                    <Route key={p.path} path={p.path} element={<PlaceholderPage title={p.title} icon={p.icon} description={p.description} />} />
                  ))}
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </BreadcrumbProvider>
        </TooltipProvider>
      </ToastProvider>
    </DataProvider>
  );
}
