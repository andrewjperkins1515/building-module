/** Reusable CRM pieces: logos, contact photos, tag editor, multi-select chips, image picker, deal summary table. */
import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, ImagePlus, Plus, X } from "lucide-react";
import type { CompanyType, Organization } from "@/types";
import type { CompanyDealRow } from "@/store/selectors";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { DealStageBadge, DealStatusBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/layout";
import { useToast } from "@/components/ui/toast";
import { COMPANY_TYPE_LABEL } from "@/lib/labels";
import { fmtCurrency, fmtDate, fmtNumber } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import { downscaleImage } from "./images";
import { Briefcase } from "lucide-react";

const PALETTE = [
  ["#1f3a6e", "#e7ecf6"],
  ["#2f6b4f", "#e6f1eb"],
  ["#7a4b1c", "#f5ece2"],
  ["#4e3f8a", "#eeebf7"],
  ["#245f7d", "#e3eff5"],
  ["#8a3333", "#f6e7e7"],
];
const pal = (key: string) => PALETTE[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export function CompanyLogo({ org, size = 40, className }: { org: Pick<Organization, "id" | "name" | "logoDataUrl">; size?: number; className?: string }) {
  if (org.logoDataUrl)
    return <img src={org.logoDataUrl} alt={`${org.name} logo`} style={{ width: size, height: size }} className={cn("shrink-0 rounded-md border border-border bg-white object-contain", className)} />;
  const [fg, bg] = pal(org.id);
  const letters = org.name
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36 }} className={cn("inline-flex shrink-0 items-center justify-center rounded-md border border-black/5 font-semibold tracking-tight", className)}>
      {letters || "?"}
    </span>
  );
}

export function ContactPhoto({ name, dataUrl, size = 40, className }: { name: string; dataUrl?: string; size?: number; className?: string }) {
  if (dataUrl) return <img src={dataUrl} alt={name} style={{ width: size, height: size }} className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", className)} />;
  const [fg, bg] = pal(name);
  return (
    <span style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36 }} className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", className)}>
      {initials(name || "?")}
    </span>
  );
}

const TYPE_TONE: Record<CompanyType, BadgeTone> = { bank: "info", finco: "violet", mezz_lender: "violet", reit: "accent", private: "neutral", ar_lender: "warning" };

export function CompanyTypeBadge({ type, className }: { type?: CompanyType; className?: string }) {
  if (!type) return <Badge tone="outline" className={cn("text-ink-4", className)}>Type not set</Badge>;
  return (
    <Badge tone={TYPE_TONE[type]} className={className}>
      {COMPANY_TYPE_LABEL[type]}
    </Badge>
  );
}

/** Hidden file input + trigger that returns a downscaled data URL. */
export function ImagePicker({ onPick, maxDim, children, multiple }: { onPick: (dataUrls: { dataUrl: string; name: string }[]) => void; maxDim?: number; children: (open: () => void) => ReactNode; multiple?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const toast = useToast();
  return (
    <>
      {children(() => ref.current?.click())}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          const out: { dataUrl: string; name: string }[] = [];
          for (const f of files) {
            try {
              out.push({ dataUrl: await downscaleImage(f, maxDim), name: f.name });
            } catch {
              toast({ title: `Couldn't read ${f.name}`, description: "Choose a JPG, PNG or WebP image.", tone: "warning" });
            }
          }
          if (out.length) onPick(out);
        }}
      />
    </>
  );
}

export function TagEditor({ tags, onChange, placeholder = "Add tag", suggestions = [] }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const [v, setV] = useState("");
  const add = (t: string) => {
    const x = t.trim();
    if (x && !tags.some((y) => y.toLowerCase() === x.toLowerCase())) onChange([...tags, x]);
    setV("");
  };
  const rest = suggestions.filter((s) => !tags.includes(s));
  return (
    <div>
      <div className="flex min-h-8 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-1.5 py-1 shadow-xs focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15">
        {tags.map((t) => (
          <span key={t} className="inline-flex h-6 items-center gap-1 rounded bg-subtle pl-2 pr-1 text-xs text-ink-2">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="rounded p-0.5 text-ink-4 hover:text-ink" aria-label={`Remove ${t}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(v);
            } else if (e.key === "Backspace" && !v && tags.length) onChange(tags.slice(0, -1));
          }}
          onBlur={() => v && add(v)}
          placeholder={placeholder}
          className="h-6 min-w-[100px] flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-ink-4"
        />
      </div>
      {rest.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {rest.map((s) => (
            <button type="button" key={s} onClick={() => add(s)} className="rounded border border-dashed border-border px-1.5 py-0.5 text-[11.5px] text-ink-3 hover:border-border-strong hover:text-ink">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Multi-select rendered as removable chips with a searchable popover. */
export function ChipMultiSelect({ value, onChange, options, placeholder = "Select…", labelFor }: { value: string[]; onChange: (v: string[]) => void; options: string[]; placeholder?: string; labelFor?: (o: string) => string }) {
  const [q, setQ] = useState("");
  const shown = options.filter((o) => (labelFor?.(o) ?? o).toLowerCase().includes(q.toLowerCase()) || o.toLowerCase().includes(q.toLowerCase()));
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <Popover onOpenChange={(o) => !o && setQ("")}>
      <PopoverTrigger asChild>
        <button type="button" className="flex min-h-8 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-left shadow-xs hover:border-border-strong">
          {value.length === 0 && <span className="px-1 text-[13px] text-ink-4">{placeholder}</span>}
          {value.map((v) => (
            <span key={v} className="inline-flex h-6 items-center rounded bg-subtle px-2 text-xs text-ink-2">
              {v}
            </span>
          ))}
          <ChevronDown className="ml-auto size-3.5 text-ink-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 p-1.5">
        {options.length > 10 && (
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="mb-1 h-7 w-full rounded border border-border px-2 text-[13px] outline-none focus:border-ring/50" />
        )}
        <div className="scrollbar-thin max-h-60 overflow-y-auto">
          {shown.map((o) => (
            <button key={o} type="button" onClick={() => toggle(o)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-ink-2 hover:bg-subtle">
              <span className={cn("flex size-4 items-center justify-center rounded-[4px] border", value.includes(o) ? "border-accent bg-accent text-white" : "border-border-strong")}>
                {value.includes(o) && <Check className="size-3" strokeWidth={3} />}
              </span>
              {labelFor ? labelFor(o) : o}
            </button>
          ))}
        </div>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-ink-3 hover:bg-subtle">
            Clear selection
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Spreadsheet-spec deal table: Status, Name, State, Buildings, Beds, $ Amount, $/Bed. Shows N rows, expandable. */
export function DealSummaryTable({ rows, initialRows = 3, emptyText, onOpenDeal }: { rows: CompanyDealRow[]; initialRows?: number; emptyText: string; onOpenDeal?: (dealId: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return <EmptyState compact icon={Briefcase} title={emptyText} />;
  const shown = expanded ? rows : rows.slice(0, initialRows);
  return (
    <div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
              <th className="h-8 pl-4 font-medium">Status</th>
              <th className="px-3 font-medium">Name</th>
              <th className="px-3 font-medium">State</th>
              <th className="px-3 text-right font-medium">Buildings</th>
              <th className="px-3 text-right font-medium">Beds</th>
              <th className="px-3 text-right font-medium">$ Amount</th>
              <th className="pl-3 pr-4 text-right font-medium">$ / Bed</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.deal.id} onClick={() => onOpenDeal?.(r.deal.id)} className={cn("border-b border-border/70 last:border-0", onOpenDeal && "cursor-pointer hover:bg-canvas")}>
                <td className="py-2.5 pl-4">
                  {r.deal.status === "active" ? <DealStageBadge stage={r.deal.stage} status={r.deal.status} /> : <DealStatusBadge status={r.deal.status} />}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-ink">{r.deal.name}</div>
                  <div className="text-[11.5px] text-ink-4">
                    {r.role} · {r.deal.code}
                    {r.deal.actualCloseDate ? ` · closed ${fmtDate(r.deal.actualCloseDate)}` : ""}
                  </div>
                </td>
                <td className="px-3 text-ink-2">{r.states.join(", ") || "—"}</td>
                <td className="tabular px-3 text-right">{r.buildings}</td>
                <td className="tabular px-3 text-right">{fmtNumber(r.beds)}</td>
                <td className="tabular px-3 text-right">
                  {r.amount ? fmtCurrency(r.amount, { compact: true }) : "—"}
                  {r.amountLabel === "Ask" && <div className="text-[10.5px] text-ink-4">asking</div>}
                </td>
                <td className="tabular pl-3 pr-4 text-right font-medium">{r.perBed ? fmtCurrency(Math.round(r.perBed / 1000) * 1000, { compact: true }) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > initialRows && (
        <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center justify-center gap-1 border-t border-border py-2 text-xs font-medium text-accent hover:bg-canvas">
          {expanded ? (
            <>
              <ChevronUp className="size-3.5" /> Show fewer
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" /> Show {rows.length - initialRows} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function CompanyLink({ org }: { org: Organization }) {
  return (
    <Link to="/organizations" className="hover:underline">
      {org.name}
    </Link>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <Plus /> {children}
    </Button>
  );
}

export function UploadButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <ImagePlus /> {children}
    </Button>
  );
}
