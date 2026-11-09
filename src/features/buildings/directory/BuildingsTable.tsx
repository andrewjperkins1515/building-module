import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { DirectoryRow, SortKey } from "./useDirectoryRows";
import { StarRating, VerificationBadge } from "@/components/shared/badges";
import { FacilityImage } from "@/components/shared/FacilityImage";
import { Tooltip } from "@/components/ui/overlays";
import { Badge, Progress } from "@/components/ui/primitives";
import { DEAL_STAGE_LABEL, FACILITY_TYPE_LABEL } from "@/lib/labels";
import { fmtNumber, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLS: { key: SortKey; label: string; className?: string; align?: "right" }[] = [
  { key: "name", label: "Facility", className: "min-w-[280px]" },
  { key: "location", label: "City / State", className: "min-w-[140px]" },
  { key: "type", label: "Type", className: "min-w-[120px]" },
  { key: "name", label: "CMS provider #", className: "min-w-[110px]" },
  { key: "beds", label: "Cert. beds", align: "right" },
  { key: "adc", label: "ADC", align: "right", className: "min-w-[92px]" },
  { key: "rating", label: "CMS rating", className: "min-w-[110px]" },
  { key: "operator", label: "Current operator", className: "min-w-[180px]" },
  { key: "deals", label: "Related deals", className: "min-w-[170px]" },
  { key: "verification", label: "Verification", className: "min-w-[150px]" },
];

export function BuildingsTable({
  rows,
  sort,
  onSort,
}: {
  rows: DirectoryRow[];
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border bg-canvas/70">
            {COLS.map((c, i) => {
              const sortable = i !== 3;
              const active = sortable && sort.key === c.key;
              return (
                <th key={c.label} className={cn("h-9 whitespace-nowrap px-3 text-left text-[11.5px] font-medium text-ink-3 first:pl-4", c.align === "right" && "text-right", c.className)}>
                  {sortable ? (
                    <button onClick={() => onSort(c.key)} className={cn("inline-flex items-center gap-1 transition-colors hover:text-ink", active && "text-ink")}>
                      {c.label}
                      {active ? sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-40" />}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const b = r.building;
            return (
              <tr
                key={b.id}
                onClick={() => navigate(`/buildings/${b.id}`)}
                className="group cursor-pointer border-b border-border/80 transition-colors last:border-0 hover:bg-canvas"
              >
                <td className="py-2.5 pl-4 pr-3">
                  <div className="flex items-center gap-3">
                    <FacilityImage seed={b.photoSeed} type={b.facilityType} label={false} className="h-9 w-12 shrink-0 rounded-[5px] border border-border" />
                    <div className="min-w-0">
                      <Link to={`/buildings/${b.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-ink decoration-ink-4/50 underline-offset-2 group-hover:underline">
                        {b.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-ink-4">
                        <Tooltip content={`${r.docApproved} of ${r.docRequired} required documents approved`}>
                          <span className="inline-flex items-center gap-1.5">
                            <Progress value={r.docPct} className="h-1 w-10" indicatorClassName={r.docPct === 100 ? "bg-success" : undefined} />
                            <span className="tabular">{r.docPct}% docs</span>
                          </span>
                        </Tooltip>
                        {b.tags[0] && <span className="truncate">· {b.tags[0]}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 text-ink-2">
                  {b.address.city}, <span className="text-ink-3">{b.address.state}</span>
                </td>
                <td className="px-3 text-ink-2">{FACILITY_TYPE_LABEL[b.facilityType]}</td>
                <td className="tabular px-3 font-mono text-[12px] text-ink-2">{r.ccn ?? <span className="font-sans text-ink-4">Not certified</span>}</td>
                <td className="tabular px-3 text-right text-ink">{fmtNumber(b.certifiedBeds.value)}</td>
                <td className="tabular px-3 text-right">
                  <div className="text-ink">{fmtNumber(b.averageDailyCensus.value)}</div>
                  <div className="text-[11px] text-ink-4">{fmtPct(r.occupancy, 0)} occ.</div>
                </td>
                <td className="px-3">{r.rating ? <StarRating value={r.rating} size="xs" /> : <span className="text-xs text-ink-4">N/A</span>}</td>
                <td className="max-w-[200px] truncate px-3 text-ink-2">{r.operator ?? "—"}</td>
                <td className="px-3">
                  {r.allDeals.length === 0 ? (
                    <span className="text-xs text-ink-4">None</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {r.activeDeals.slice(0, 1).map((d) => (
                        <span key={d.id} className="truncate text-[12.5px] text-ink">
                          {d.name}
                          <span className="ml-1 text-[11px] text-ink-4">· {DEAL_STAGE_LABEL[d.stage]}</span>
                        </span>
                      ))}
                      {r.activeDeals.length === 0 && (
                        <span className="truncate text-[12.5px] text-ink-3">
                          {r.dealAssociation === "owned" ? "Owned · closed deal" : `${r.allDeals.length} historical`}
                        </span>
                      )}
                      {r.allDeals.length - Math.min(1, r.activeDeals.length) > 0 && r.activeDeals.length > 0 && (
                        <span className="text-[11px] text-ink-4">+{r.allDeals.length - 1} more</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 pr-4">
                  <VerificationBadge status={b.verificationStatus} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function BuildingCards({ rows }: { rows: DirectoryRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map((r) => {
        const b = r.building;
        return (
          <Link
            key={b.id}
            to={`/buildings/${b.id}`}
            className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-card transition-[box-shadow,border-color] hover:border-border-strong hover:shadow-pop"
          >
            <div className="relative">
              <FacilityImage seed={b.photoSeed} type={b.facilityType} label={false} className="h-32 w-full" />
              <div className="absolute left-2.5 top-2.5 flex gap-1.5">
                <Badge tone="outline" className="bg-white/90 backdrop-blur-sm">
                  {FACILITY_TYPE_LABEL[b.facilityType]}
                </Badge>
              </div>
              {r.activeDeals[0] && (
                <div className="absolute right-2.5 top-2.5">
                  <Badge tone="dark">{DEAL_STAGE_LABEL[r.activeDeals[0].stage]}</Badge>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-3.5">
              <div className="truncate text-[13.5px] font-semibold text-ink group-hover:underline group-hover:decoration-ink-4/50 group-hover:underline-offset-2">{b.name}</div>
              <div className="mt-0.5 text-xs text-ink-3">
                {b.address.city}, {b.address.state} · {r.operator ?? "Operator unknown"}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                <div>
                  <div className="text-ink-4">Beds</div>
                  <div className="tabular mt-0.5 font-medium text-ink">{b.certifiedBeds.value}</div>
                </div>
                <div>
                  <div className="text-ink-4">Occupancy</div>
                  <div className="tabular mt-0.5 font-medium text-ink">{fmtPct(r.occupancy, 0)}</div>
                </div>
                <div>
                  <div className="text-ink-4">CMS</div>
                  <div className="mt-0.5">{r.rating ? <StarRating value={r.rating} size="xs" /> : <span className="text-ink-4">N/A</span>}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <VerificationBadge status={b.verificationStatus} />
                <span className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                  <Progress value={r.docPct} className="h-1 w-12" indicatorClassName={r.docPct === 100 ? "bg-success" : undefined} />
                  <span className="tabular">{r.docPct}%</span>
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
