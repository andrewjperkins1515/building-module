import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const triggerCls = (active: boolean) =>
  cn(
    "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium shadow-xs transition-colors",
    active ? "border-accent-line bg-accent-soft text-accent" : "border-border bg-background text-ink-2 hover:bg-subtle",
  );

export function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; count?: number }[];
  selected: T[];
  onChange: (v: T[]) => void;
}) {
  const active = selected.length > 0;
  const summary = active ? (selected.length === 1 ? options.find((o) => o.value === selected[0])?.label : `${selected.length} selected`) : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={triggerCls(active)}>
          <span className={cn(active && "text-accent/70")}>{label}</span>
          {summary && <span className="max-w-[120px] truncate">: {summary}</span>}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="scrollbar-thin max-h-80 w-60 overflow-y-auto">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            onCheckedChange={(c) => onChange(c ? [...selected, o.value] : selected.filter((s) => s !== o.value))}
          >
            <span className="flex-1 truncate">{o.label}</span>
            {o.count !== undefined && <span className="tabular text-[11.5px] text-ink-4">{o.count}</span>}
          </DropdownMenuCheckboxItem>
        ))}
        {active && (
          <>
            <DropdownMenuSeparator />
            <button className="w-full rounded-md px-2 py-1.5 text-left text-[12.5px] text-ink-3 hover:bg-subtle" onClick={() => onChange([])}>
              Clear selection
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under 80", max: 79 },
  { label: "80 – 120", min: 80, max: 120 },
  { label: "121 – 150", min: 121, max: 150 },
  { label: "Over 150", min: 151 },
];

export function BedRangeFilter({ min, max, onChange }: { min?: number; max?: number; onChange: (min?: number, max?: number) => void }) {
  const active = min !== undefined || max !== undefined;
  const [lo, setLo] = useState(min?.toString() ?? "");
  const [hi, setHi] = useState(max?.toString() ?? "");
  const summary = active ? `${min ?? 0}–${max ?? "∞"}` : null;
  return (
    <Popover
      onOpenChange={(o) => {
        if (o) {
          setLo(min?.toString() ?? "");
          setHi(max?.toString() ?? "");
        }
      }}
    >
      <PopoverTrigger asChild>
        <button className={triggerCls(active)}>
          Beds{summary && <span>: {summary}</span>}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="text-[11px] font-medium uppercase tracking-wide text-ink-4">Certified beds</div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setLo(p.min?.toString() ?? "");
                setHi(p.max?.toString() ?? "");
                onChange(p.min, p.max);
              }}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                min === p.min && max === p.max ? "border-accent-line bg-accent-soft text-accent" : "border-border text-ink-2 hover:bg-subtle",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="bmin">Min</Label>
            <Input id="bmin" type="number" min={0} value={lo} onChange={(e) => setLo(e.target.value)} className="mt-1" placeholder="0" />
          </div>
          <span className="pb-2 text-ink-4">–</span>
          <div className="flex-1">
            <Label htmlFor="bmax">Max</Label>
            <Input id="bmax" type="number" min={0} value={hi} onChange={(e) => setHi(e.target.value)} className="mt-1" placeholder="Any" />
          </div>
        </div>
        <div className="mt-3 flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLo("");
              setHi("");
              onChange(undefined, undefined);
            }}
          >
            Clear
          </Button>
          <Button size="sm" onClick={() => onChange(lo === "" ? undefined : Number(lo), hi === "" ? undefined : Number(hi))}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-background pl-2.5 pr-1 text-xs text-ink-2">
      {label}
      <button onClick={onRemove} className="rounded-full p-0.5 text-ink-4 hover:bg-subtle hover:text-ink" aria-label={`Remove ${label}`}>
        <X className="size-3" />
      </button>
    </span>
  );
}
