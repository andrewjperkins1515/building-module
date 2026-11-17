import { useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { useData } from "@/store/DataProvider";
import { ORG_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { CompanyLogo, ContactPhoto } from "@/features/crm/components";

export interface PickerItem {
  id: string;
  label: string;
  sub?: string;
  icon?: ReactNode;
  /** Sorted to the top when the search box is empty. */
  preferred?: boolean;
}

/** Type-ahead picker: "start typing a name and select from the system". */
export function SearchPicker({
  items,
  value,
  onChange,
  placeholder = "Start typing a name…",
  emptyLabel = "Not assigned",
  className,
  compact,
  ariaLabel,
}: {
  items: PickerItem[];
  value?: string;
  onChange: (id?: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = items.find((i) => i.id === value);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t ? items.filter((i) => `${i.label} ${i.sub ?? ""}`.toLowerCase().includes(t)) : [...items].sort((a, b) => Number(!!b.preferred) - Number(!!a.preferred));
    return list.slice(0, 50);
  }, [items, q]);

  const choose = (id?: string) => {
    onChange(id);
    setOpen(false);
    setQ("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
        setActive(0);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "group flex w-full min-w-0 items-center gap-2 rounded-md border text-left transition-colors",
            compact ? "h-7 border-transparent px-1.5 hover:border-border hover:bg-background" : "h-8 border-input bg-background px-2.5 shadow-xs hover:border-border-strong",
            className,
          )}
        >
          {selected ? (
            <>
              {selected.icon}
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{selected.label}</span>
            </>
          ) : (
            <span className="flex-1 truncate text-[12.5px] text-ink-4">{compact ? `+ Assign` : emptyLabel}</span>
          )}
          <ChevronDown className={cn("size-3.5 shrink-0 text-ink-4", compact && "opacity-0 group-hover:opacity-100")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                choose(results[active].id);
              }
            }}
            placeholder={placeholder}
            className="h-9 w-full bg-transparent pl-8 pr-3 text-[13px] outline-none placeholder:text-ink-4"
          />
        </div>
        <ul ref={listRef} className="scrollbar-thin max-h-72 overflow-y-auto p-1">
          {results.length === 0 && <li className="px-3 py-4 text-center text-[12.5px] text-ink-3">No matches in the system</li>}
          {results.map((i, idx) => (
            <li key={i.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(idx)}
                onClick={() => choose(i.id)}
                className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left", idx === active && "bg-subtle", i.id === value && "font-medium")}
              >
                {i.icon}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">{i.label}</span>
                  {i.sub && <span className="block truncate text-[11.5px] text-ink-3">{i.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {value && (
          <button type="button" onClick={() => choose(undefined)} className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2 text-left text-[12.5px] text-ink-3 hover:bg-subtle">
            <X className="size-3.5" /> Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Contacts from the CRM as picker items. */
export function useContactItems(preferOrgIds: (string | undefined)[] = []) {
  const { state } = useData();
  return useMemo(
    () =>
      [...state.contacts]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map<PickerItem>((c) => {
          const org = state.organizations.find((o) => o.id === c.organizationId);
          return { id: c.id, label: c.name, sub: [c.title, org?.name].filter(Boolean).join(" · "), icon: <ContactPhoto name={c.name} dataUrl={c.photoDataUrl} size={22} />, preferred: preferOrgIds.includes(c.organizationId) };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.contacts, state.organizations, preferOrgIds.join("|")],
  );
}

/** Companies from the CRM as picker items. */
export function useOrgItems() {
  const { state } = useData();
  return useMemo(
    () =>
      [...state.organizations]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map<PickerItem>((o) => ({ id: o.id, label: o.name, sub: `${ORG_TYPE_LABEL[o.type]}${o.hqCity ? ` · ${o.hqCity}, ${o.hqState}` : ""}`, icon: <CompanyLogo org={o} size={22} /> })),
    [state.organizations],
  );
}
