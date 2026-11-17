import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Briefcase, Building2, ChevronRight, UserRound as UserIcon, CornerDownLeft, FileText, LogOut, Menu, RotateCcw, Search, Settings, UserRound } from "lucide-react";
import { useCrumbState } from "./breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/overlays";
import { Avatar } from "@/components/shared/layout";
import { useData } from "@/store/DataProvider";
import { currentCcn, isOverdue } from "@/store/selectors";
import { CURRENT_USER, DEAL_STAGE_LABEL, FACILITY_TYPE_LABEL } from "@/lib/labels";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

function GlobalSearch() {
  const { state } = useData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return { buildings: [], contacts: [], deals: [], docs: [] };
    const buildings = state.buildings
      .filter((b) =>
        [b.name, ...b.alternateNames, b.address.city, b.address.state, b.address.county, ...b.identifiers.map((i) => i.value)].some((s) => s.toLowerCase().includes(t)),
      )
      .slice(0, 6);
    const contacts = state.contacts
      .filter((c) => [c.name, c.email, c.title, state.organizations.find((o) => o.id === c.organizationId)?.name ?? ""].some((s) => s.toLowerCase().includes(t)))
      .slice(0, 5);
    const docs = state.documentRequests.filter((d) => d.name.toLowerCase().includes(t)).slice(0, 4);
    const deals = state.deals.filter((d) => [d.name, d.code].some((s) => s.toLowerCase().includes(t))).slice(0, 4);
    return { buildings, contacts, deals, docs };
  }, [q, state]);

  const flat = [
    ...results.buildings.map((b) => ({ key: b.id, to: `/buildings/${b.id}` })),
    ...results.contacts.map((c) => ({ key: c.id, to: `/contacts/${c.id}` })),
    ...results.deals.map((d) => ({ key: d.id, to: `/deals/${d.id}` })),
    ...results.docs.map((d) => ({ key: d.id, to: `/buildings/${d.buildingId}/documents?doc=${d.id}` })),
  ];

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
  };

  return (
    <Popover open={open && q.trim().length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, flat.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && flat[active]) {
                go(flat[active].to);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Search buildings, deals, contacts, documents…"
            className="h-8 w-full rounded-md border border-border bg-canvas pl-8 pr-12 text-[13px] text-ink placeholder:text-ink-4 focus:border-ring/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/10"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-ink-4 sm:block">⌘K</kbd>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-1.5"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (e.target === inputRef.current) e.preventDefault();
        }}
      >
        {flat.length === 0 ? (
          <div className="px-3 py-6 text-center text-[13px] text-ink-3">No results for “{q}”</div>
        ) : (
          <>
            {results.buildings.length > 0 && <div className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-ink-4">Buildings</div>}
            {results.buildings.map((b, i) => (
              <button
                key={b.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(`/buildings/${b.id}`)}
                className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left", active === i && "bg-subtle")}
              >
                <Building2 className="size-4 shrink-0 text-ink-4" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">{b.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    {b.address.city}, {b.address.state} · {FACILITY_TYPE_LABEL[b.facilityType]}
                    {currentCcn(b) ? ` · CCN ${currentCcn(b)}` : ""}
                  </div>
                </div>
                {active === i && <CornerDownLeft className="size-3.5 text-ink-4" />}
              </button>
            ))}
            {results.contacts.length > 0 && <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-4">Contacts</div>}
            {results.contacts.map((c, j) => {
              const i = results.buildings.length + j;
              const org = state.organizations.find((o) => o.id === c.organizationId);
              return (
                <button key={c.id} onMouseEnter={() => setActive(i)} onClick={() => go(`/contacts/${c.id}`)} className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left", active === i && "bg-subtle")}>
                  <UserIcon className="size-4 shrink-0 text-ink-4" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">{c.name}</div>
                    <div className="truncate text-[11.5px] text-ink-3">
                      {c.title}
                      {org ? ` · ${org.name}` : ""}
                    </div>
                  </div>
                </button>
              );
            })}
            {results.deals.length > 0 && <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-4">Deals</div>}
            {results.deals.map((d, j) => {
              const i = results.buildings.length + results.contacts.length + j;
              return (
                <button key={d.id} onMouseEnter={() => setActive(i)} onClick={() => go(`/deals/${d.id}`)} className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left", active === i && "bg-subtle")}>
                  <Briefcase className="size-4 shrink-0 text-ink-4" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">{d.name}</div>
                    <div className="truncate text-[11.5px] text-ink-3">
                      {d.code} · {DEAL_STAGE_LABEL[d.stage]}
                    </div>
                  </div>
                </button>
              );
            })}
            {results.docs.length > 0 && <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-4">Documents</div>}
            {results.docs.map((d, j) => {
              const i = results.buildings.length + results.contacts.length + results.deals.length + j;
              const b = state.buildings.find((x) => x.id === d.buildingId);
              return (
                <button
                  key={d.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(`/buildings/${d.buildingId}/documents?doc=${d.id}`)}
                  className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left", active === i && "bg-subtle")}
                >
                  <FileText className="size-4 shrink-0 text-ink-4" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-ink">{d.name}</div>
                    <div className="truncate text-[11.5px] text-ink-3">{b?.name}</div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Notifications() {
  const { state } = useData();
  const items = useMemo(() => {
    const out: { id: string; title: string; detail: string; to: string; when?: string; tone: "warning" | "info" | "danger" }[] = [];
    state.documentRequests
      .filter((d) => d.status === "in_review" || d.status === "received")
      .slice(0, 3)
      .forEach((d) => {
        const b = state.buildings.find((x) => x.id === d.buildingId);
        out.push({ id: d.id, title: `${d.name} ready for review`, detail: b?.name ?? "", to: `/buildings/${d.buildingId}/documents?doc=${d.id}`, when: d.updatedAt, tone: "info" });
      });
    state.documentRequests
      .filter(isOverdue)
      .slice(0, 3)
      .forEach((d) => {
        const b = state.buildings.find((x) => x.id === d.buildingId);
        out.push({ id: `o_${d.id}`, title: `${d.name} overdue`, detail: b?.name ?? "", to: `/buildings/${d.buildingId}/documents?doc=${d.id}`, tone: "danger" });
      });
    state.activities
      .filter((a) => a.type === "data_room_sync")
      .slice(0, 1)
      .forEach((a) => out.push({ id: a.id, title: a.title, detail: state.buildings.find((b) => b.id === a.buildingId)?.name ?? "", to: `/buildings/${a.buildingId}/documents`, when: a.timestamp, tone: "info" }));
    return out;
  }, [state]);
  const [seen, setSeen] = useState(false);

  return (
    <Popover onOpenChange={(o) => o && setSeen(true)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          {!seen && items.length > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger ring-2 ring-background" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <span className="text-[13px] font-semibold">Notifications</span>
          <span className="text-[11.5px] text-ink-4">{items.length} items</span>
        </div>
        <div className="scrollbar-thin max-h-80 overflow-y-auto p-1">
          {items.length === 0 && <div className="px-3 py-8 text-center text-[13px] text-ink-3">You're all caught up.</div>}
          {items.map((n) => (
            <Link key={n.id} to={n.to} className="flex gap-2.5 rounded-md px-2.5 py-2 hover:bg-subtle">
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.tone === "danger" ? "bg-danger" : n.tone === "warning" ? "bg-warning" : "bg-info")} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-ink">{n.title}</div>
                <div className="truncate text-[11.5px] text-ink-3">
                  {n.detail}
                  {n.when ? ` · ${fmtRelative(n.when)}` : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const { resetDemo } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full ring-offset-2 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" aria-label="Account menu">
          <Avatar name={CURRENT_USER.name} size="md" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <div className="text-[13px] font-medium text-ink">{CURRENT_USER.name}</div>
          <div className="text-xs font-normal text-ink-3">{CURRENT_USER.title}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <UserRound /> Profile & preferences
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            resetDemo();
            navigate("/buildings");
            toast({ title: "Demo data reset", description: "All prototype changes were cleared.", tone: "info" });
          }}
        >
          <RotateCcw /> Reset demo data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <LogOut /> Sign out (prototype)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const crumbs = useCrumbState();
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu />
      </Button>
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-[13px] md:flex">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-ink-4" />}
            {c.to && i < crumbs.length - 1 ? (
              <Link to={c.to} className="truncate text-ink-3 transition-colors hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span className="max-w-[320px] truncate font-medium text-ink">{c.label}</span>
            )}
          </Fragment>
        ))}
      </nav>
      <div className="flex flex-1 justify-end md:justify-center md:px-4">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-1.5">
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
}
