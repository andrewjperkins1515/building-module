import { AlertOctagon, Database, Gavel, History, RefreshCw, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import { EmptyState, Section } from "@/components/shared/layout";
import { MockDataTag, StarRating } from "@/components/shared/badges";
import { useData } from "@/store/DataProvider";
import { fmtCurrency, fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useBuildingPage } from "../context";

const SURVEY_TYPE: Record<string, string> = { standard: "Standard health", complaint: "Complaint", fire_safety: "Fire safety (LSC)", infection_control: "Infection control" };

function severityTone(s: string) {
  if ("JKL".includes(s)) return "danger" as const;
  if ("GHI".includes(s)) return "warning" as const;
  return "neutral" as const;
}

export function CmsTab() {
  const { bundle } = useBuildingPage();
  const { refreshCms } = useData();
  const toast = useToast();
  const cms = bundle.cms;
  const b = bundle.building;

  if (!cms) {
    return (
      <div className="rounded-lg border border-border bg-background shadow-card">
        <EmptyState
          icon={ShieldCheck}
          title={b.facilityType === "skilled_nursing" ? "No CMS data linked" : "Not a CMS-certified facility"}
          description={
            b.facilityType === "skilled_nursing"
              ? "Add a CMS provider number via Edit Building to attach mock CMS ratings and survey data."
              : `${b.name} is licensed by the state as ${b.facilityType === "memory_care" ? "memory care" : "assisted living"} and does not participate in the CMS Five-Star program. State survey history will appear here in a future iteration.`
          }
        />
      </div>
    );
  }

  const ratings = [
    { label: "Overall rating", value: cms.ratings.overall, hint: "Composite of health, staffing and quality" },
    { label: "Health inspection", value: cms.ratings.health, hint: "Based on last 3 standard surveys and complaints" },
    { label: "Staffing", value: cms.ratings.staffing, hint: "Nurse staffing hours and turnover" },
    { label: "Quality measures", value: cms.ratings.qualityMeasures, hint: "Short- and long-stay quality measures" },
  ];
  const maxHprd = Math.max(cms.staffing.totalNurseHprd, cms.staffing.stateAvgTotalHprd, cms.staffing.nationalAvgTotalHprd) * 1.15;
  const openDefs = cms.deficiencies.filter((d) => d.status === "open").length;

  return (
    <div className="space-y-5">
      {/* Source banner */}
      <div className="flex flex-col gap-3 rounded-lg border border-warning-line bg-warning-soft/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Database className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-[13px]">
            <div className="font-medium text-ink">
              Mock CMS data <MockDataTag className="ml-1 align-middle" />
            </div>
            <div className="text-ink-3">
              Source: {cms.sourceLabel} · Provider <span className="font-mono">{cms.providerNumber}</span> · Last refreshed {fmtDateTime(cms.lastRefreshedAt)} ({fmtRelative(cms.lastRefreshedAt)})
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refreshCms(b.id);
            toast({ title: "CMS data refreshed", description: "Simulated — the mock dataset is unchanged.", tone: "info" });
          }}
        >
          <RefreshCw /> Refresh
        </Button>
      </div>

      {/* Ratings */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card lg:grid-cols-4">
        {ratings.map((r) => (
          <div key={r.label} className="bg-background px-4 py-3.5">
            <div className="text-[11.5px] font-medium text-ink-3">{r.label}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="tabular text-[24px] font-semibold leading-none tracking-[-0.02em]">{r.value}</span>
              <StarRating value={r.value} size="sm" />
            </div>
            <div className="mt-1.5 text-[11.5px] text-ink-4">{r.hint}</div>
          </div>
        ))}
      </div>

      {(cms.abuseIcon || cms.specialFocusFacility || openDefs > 0) && (
        <div className="flex flex-wrap gap-2">
          {cms.abuseIcon && (
            <Badge tone="danger">
              <AlertOctagon /> Abuse icon (mock)
            </Badge>
          )}
          {cms.specialFocusFacility && <Badge tone="danger">Special Focus Facility</Badge>}
          {openDefs > 0 && <Badge tone="warning">{openDefs} open deficiencies</Badge>}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Nurse staffing" icon={Users} description="Hours per resident day (HPRD), reported">
          <div className="space-y-3">
            {[
              { label: "This facility", value: cms.staffing.totalNurseHprd, accent: true },
              { label: "State average", value: cms.staffing.stateAvgTotalHprd },
              { label: "National average", value: cms.staffing.nationalAvgTotalHprd },
            ].map((x) => (
              <div key={x.label}>
                <div className="flex justify-between text-[12.5px]">
                  <span className={x.accent ? "font-medium text-ink" : "text-ink-3"}>{x.label}</span>
                  <span className="tabular font-medium">{x.value.toFixed(2)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className={cn("h-2 rounded-full", x.accent ? "bg-accent" : "bg-border-strong")} style={{ width: `${(x.value / maxHprd) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
            {[
              ["RN", cms.staffing.rnHprd.toFixed(2)],
              ["LPN", cms.staffing.lpnHprd.toFixed(2)],
              ["CNA", cms.staffing.cnaHprd.toFixed(2)],
              ["Turnover", `${cms.staffing.nurseTurnoverPct}%`],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[11px] text-ink-4">{k}</div>
                <div className="tabular text-[14px] font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Historical performance" icon={History} description="Quarterly star ratings (mock)" flush>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
                  <th className="h-8 pl-4 font-medium">Period</th>
                  <th className="px-2 text-center font-medium">Overall</th>
                  <th className="px-2 text-center font-medium">Health</th>
                  <th className="px-2 text-center font-medium">Staffing</th>
                  <th className="pr-4 text-center font-medium">QM</th>
                </tr>
              </thead>
              <tbody>
                {[...cms.ratingHistory].reverse().map((h, i, arr) => {
                  const prev = arr[i + 1];
                  const cell = (v: number, p?: number) => (
                    <span className="tabular inline-flex items-center gap-1">
                      {v}
                      <span className="text-star">★</span>
                      {p !== undefined && v !== p && <span className={cn("text-[10px]", v > p ? "text-success" : "text-danger")}>{v > p ? "▲" : "▼"}</span>}
                    </span>
                  );
                  return (
                    <tr key={h.period} className={cn("border-b border-border/60 last:border-0", i === 0 && "bg-accent-soft/40 font-medium")}>
                      <td className="h-8 pl-4">{h.period}</td>
                      <td className="px-2 text-center">{cell(h.overall, prev?.overall)}</td>
                      <td className="px-2 text-center">{cell(h.health, prev?.health)}</td>
                      <td className="px-2 text-center">{cell(h.staffing, prev?.staffing)}</td>
                      <td className="pr-4 text-center">{cell(h.qualityMeasures, prev?.qualityMeasures)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <Section title="Survey history" icon={Stethoscope} description={`${cms.surveys.length} surveys in the last 3 years`} flush>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
                <th className="h-8 pl-4 font-medium">Survey date</th>
                <th className="px-3 font-medium">Type</th>
                <th className="px-3 text-right font-medium">Deficiencies</th>
                <th className="pl-3 pr-4 font-medium">Highest scope / severity</th>
              </tr>
            </thead>
            <tbody>
              {cms.surveys.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0">
                  <td className="h-9 pl-4">{fmtDate(s.date)}</td>
                  <td className="px-3 text-ink-2">{SURVEY_TYPE[s.type]}</td>
                  <td className="tabular px-3 text-right">{s.deficiencyCount}</td>
                  <td className="pl-3 pr-4">{s.highestScopeSeverity === "—" ? <span className="text-ink-4">None cited</span> : <Badge tone={severityTone(s.highestScopeSeverity)}>{s.highestScopeSeverity}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Deficiencies" icon={AlertOctagon} description="Cited F-tags and K-tags" flush>
        {cms.deficiencies.length === 0 ? (
          <EmptyState compact icon={ShieldCheck} title="No deficiencies cited" />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
                  <th className="h-8 pl-4 font-medium">Tag</th>
                  <th className="px-3 font-medium">Description</th>
                  <th className="px-3 font-medium">Survey</th>
                  <th className="px-3 font-medium">S/S</th>
                  <th className="pl-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {cms.deficiencies.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 align-top last:border-0">
                    <td className="py-2.5 pl-4 font-mono text-[12px] font-medium">{d.tag}</td>
                    <td className="max-w-[520px] px-3 py-2.5">
                      <div className="text-ink">{d.description}</div>
                      <div className="text-[11.5px] text-ink-4">{d.category}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{fmtDate(d.surveyDate)}</td>
                    <td className="px-3 py-2.5">
                      <Tooltip content="Scope & severity grid: A–C minimal, D–F potential harm, G–I actual harm, J–L immediate jeopardy">
                        <span>
                          <Badge tone={severityTone(d.scopeSeverity)}>{d.scopeSeverity}</Badge>
                        </span>
                      </Tooltip>
                    </td>
                    <td className="py-2.5 pl-3 pr-4">
                      <Badge tone={d.status === "open" ? "danger" : "success"}>{d.status === "open" ? "Open" : "Corrected"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Penalties" icon={Gavel} description="Fines and payment denials (3 years)" flush>
        {cms.penalties.length === 0 ? (
          <EmptyState compact icon={Gavel} title="No penalties on record" description="No civil money penalties or payment denials in the last three years." />
        ) : (
          <div className="divide-y divide-border/70">
            {cms.penalties.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <div>
                  <div className="font-medium text-ink">{p.type === "civil_money_penalty" ? "Civil money penalty" : "Denial of payment"}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {fmtDate(p.date)} · {p.description}
                  </div>
                </div>
                <div className="tabular font-medium">{p.amount ? fmtCurrency(p.amount) : "—"}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
