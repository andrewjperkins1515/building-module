import { NavLink } from "react-router-dom";
import {
  Building2,
  Briefcase,
  FileText,
  Landmark,
  LayoutDashboard,
  ListChecks,
  PieChart,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/store/DataProvider";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  ready?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/deals", label: "Deals", icon: Briefcase },
  { to: "/buildings", label: "Buildings", icon: Building2, ready: true },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/organizations", label: "Organizations", icon: Landmark },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/tasks", label: "Tasks & Activity", icon: ListChecks },
  { to: "/asset-management", label: "Asset Management", icon: PieChart },
];

export function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 items-center justify-center rounded-md bg-white/95 text-[13px] font-bold tracking-tight text-navy">OD</div>
      {!compact && (
        <div className="leading-none">
          <div className="text-[14px] font-semibold tracking-[-0.01em] text-white">Owner Docket</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Prototype</div>
        </div>
      )}
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { state } = useData();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Wordmark />
      </div>
      <nav className="flex-1 space-y-0.5 px-2.5 pt-3">
        <div className="px-2 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-white/35">Workspace</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
                isActive ? "bg-white/[0.09] text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white/90",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("size-4", isActive ? "text-white" : "text-white/45 group-hover:text-white/70")} strokeWidth={1.8} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.ready ? (
                  <span className="tabular rounded bg-white/10 px-1.5 text-[10.5px] text-white/70">{state.buildings.length}</span>
                ) : (
                  <span className="hidden text-[10px] text-white/30 group-hover:inline">Soon</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-white/[0.07] px-2.5 py-3">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
              isActive ? "bg-white/[0.09] text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white/90",
            )
          }
        >
          <Settings className="size-4 text-white/45" strokeWidth={1.8} />
          Settings
        </NavLink>
        <div className="px-2 pt-2 text-[10.5px] leading-snug text-white/30">Prometheus Rising Studios</div>
      </div>
    </div>
  );
}
