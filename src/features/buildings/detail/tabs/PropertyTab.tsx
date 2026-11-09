import { Building, ClipboardList, Hammer, HardHat, History, Wrench } from "lucide-react";
import { Badge, Progress } from "@/components/ui/primitives";
import { EmptyState, Field, FieldGrid, Section } from "@/components/shared/layout";
import { ConditionBadge, ConditionMeter, SourceIndicator } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { SOURCE_LABEL, SYSTEM_LABEL } from "@/lib/labels";
import { fmtCurrency, fmtDate, fmtNumber } from "@/lib/format";
import { useBuildingPage } from "../context";

const PRIORITY: Record<string, { label: string; tone: "danger" | "warning" | "neutral" }> = {
  immediate: { label: "Immediate", tone: "danger" },
  short_term: { label: "1–2 years", tone: "warning" },
  long_term: { label: "3–5 years", tone: "neutral" },
};

const PROJECT_STATUS: Record<string, { label: string; tone: "success" | "accent" | "neutral" }> = {
  completed: { label: "Completed", tone: "success" },
  in_progress: { label: "In progress", tone: "accent" },
  planned: { label: "Planned", tone: "neutral" },
};

export function PropertyTab() {
  const { bundle, goTab } = useBuildingPage();
  const b = bundle.building;
  const c = bundle.condition;
  const projects = bundle.capitalProjects;

  return (
    <div className="space-y-5">
      <Section title="Property specifications" icon={Building}>
        <FieldGrid cols={4}>
          <Field label="Year built" aside={<SourceIndicator meta={b.yearBuilt.meta} />}>
            {b.yearBuilt.value ?? "—"}
          </Field>
          <Field label="Gross building area" aside={<SourceIndicator meta={b.squareFeet.meta} />}>
            {b.squareFeet.value ? `${fmtNumber(b.squareFeet.value)} sf` : "—"}
          </Field>
          <Field label="Sf per bed">{b.squareFeet.value ? fmtNumber(b.squareFeet.value / b.licensedBeds.value) : "—"}</Field>
          <Field label="Site area">{b.acreage ? `${b.acreage} acres` : "—"}</Field>
          <Field label="Stories">{b.stories ?? "—"}</Field>
          <Field label="Construction">{c?.construction ?? "—"}</Field>
          <Field label="Sprinklered">{c ? (c.sprinklered === "full" ? "Fully sprinklered" : c.sprinklered === "partial" ? "Partially sprinklered" : "None") : "—"}</Field>
          <Field label="Emergency generator">{c?.generator ?? "—"}</Field>
          <Field label="Private rooms">{b.privateRooms ?? "—"}</Field>
          <Field label="Semi-private rooms">{b.semiPrivateRooms ?? "—"}</Field>
          <Field label="Parking spaces">{c?.parkingSpaces ?? "—"}</Field>
          <Field label="Licensed beds">{b.licensedBeds.value}</Field>
        </FieldGrid>
      </Section>

      {!c ? (
        <div className="rounded-lg border border-border bg-background shadow-card">
          <EmptyState
            icon={Hammer}
            title="No condition assessment yet"
            description="Building systems, deferred maintenance and renovation history will appear once a property condition assessment is uploaded or a site visit is recorded."
            action={<Button variant="outline" onClick={() => goTab("site-visits", { new: "1" })}>Record site visit</Button>}
          />
        </div>
      ) : (
        <>
          <Section
            title="Building systems"
            icon={Wrench}
            description={`Condition assessment by ${c.assessedBy} · ${fmtDate(c.assessmentDate)}`}
            actions={<ConditionBadge rating={c.overall} />}
            flush
          >
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
                    <th className="h-8 pl-4 font-medium">System</th>
                    <th className="px-3 font-medium">Condition</th>
                    <th className="px-3 font-medium">Installed</th>
                    <th className="px-3 font-medium">Remaining life</th>
                    <th className="px-3 font-medium">Notes</th>
                    <th className="pl-3 pr-4 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {c.systems.map((s) => (
                    <tr key={s.system} className="border-b border-border/60 align-top last:border-0">
                      <td className="whitespace-nowrap py-2.5 pl-4 font-medium text-ink">{SYSTEM_LABEL[s.system]}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <ConditionMeter rating={s.rating} />
                          <span className="text-[12px] text-ink-2">{s.rating[0].toUpperCase() + s.rating.slice(1)}</span>
                        </div>
                      </td>
                      <td className="tabular px-3 py-2.5 text-ink-2">{s.installYear ?? "—"}</td>
                      <td className="tabular whitespace-nowrap px-3 py-2.5 text-ink-2">{s.remainingUsefulLifeYrs !== undefined ? `${s.remainingUsefulLifeYrs} yrs` : "—"}</td>
                      <td className="min-w-[280px] max-w-[460px] px-3 py-2.5 text-ink-2">{s.notes}</td>
                      <td className="whitespace-nowrap py-2.5 pl-3 pr-4 text-[12px] text-ink-3">
                        {SOURCE_LABEL[s.source]}
                        <div className="text-[11px] text-ink-4">{fmtDate(s.lastAssessed)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section
              title="Deferred maintenance"
              icon={ClipboardList}
              description={`${c.deferredMaintenance.length} items · ${fmtCurrency(c.deferredMaintenance.reduce((a, d) => a + d.estimatedCost, 0))} estimated`}
              flush
            >
              {c.deferredMaintenance.length === 0 ? (
                <EmptyState compact icon={ClipboardList} title="No deferred maintenance identified" />
              ) : (
                <div className="divide-y divide-border/70">
                  {[...c.deferredMaintenance]
                    .sort((a, b) => ["immediate", "short_term", "long_term"].indexOf(a.priority) - ["immediate", "short_term", "long_term"].indexOf(b.priority))
                    .map((d) => (
                      <div key={d.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <div className="text-[13px] text-ink">{d.description}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-ink-3">
                            {SYSTEM_LABEL[d.system]} · <Badge tone={PRIORITY[d.priority].tone}>{PRIORITY[d.priority].label}</Badge>
                          </div>
                        </div>
                        <div className="tabular shrink-0 text-[13px] font-medium">{fmtCurrency(d.estimatedCost)}</div>
                      </div>
                    ))}
                </div>
              )}
            </Section>

            <Section title="Renovation history" icon={History}>
              {c.renovations.length === 0 ? (
                <EmptyState compact icon={History} title="No renovations recorded" />
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-4">
                  {[...c.renovations]
                    .sort((a, b) => b.year - a.year)
                    .map((r) => (
                      <li key={r.id} className="relative">
                        <span className="absolute -left-[21px] top-1 size-2 rounded-full border-2 border-background bg-accent" />
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="tabular text-[12px] font-semibold text-ink">{r.year}</span>
                          {r.cost && <span className="tabular text-[12px] text-ink-3">{fmtCurrency(r.cost, { compact: true })}</span>}
                        </div>
                        <div className="text-[13px] text-ink-2">{r.description}</div>
                      </li>
                    ))}
                </ol>
              )}
            </Section>
          </div>
        </>
      )}

      <Section title="Capital projects" icon={HardHat} description={`${projects.length} projects`} flush>
        {projects.length === 0 ? (
          <EmptyState compact icon={HardHat} title="No capital projects" description="Planned and in-progress capital projects will be tracked here." />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
                  <th className="h-8 pl-4 font-medium">Project</th>
                  <th className="px-3 font-medium">Status</th>
                  <th className="px-3 text-right font-medium">Budget</th>
                  <th className="min-w-[160px] px-3 font-medium">Spent</th>
                  <th className="pl-3 pr-4 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pl-4">
                      <div className="font-medium text-ink">{p.name}</div>
                      <div className="text-[11.5px] text-ink-4">{p.category in SYSTEM_LABEL ? SYSTEM_LABEL[p.category as keyof typeof SYSTEM_LABEL] : p.category.replace("_", " ")}</div>
                    </td>
                    <td className="px-3">
                      <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
                    </td>
                    <td className="tabular px-3 text-right">{fmtCurrency(p.budget)}</td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <Progress value={(p.spent / p.budget) * 100} className="h-1.5 w-20" indicatorClassName={p.status === "completed" ? "bg-success" : undefined} />
                        <span className="tabular text-[12px] text-ink-3">{fmtCurrency(p.spent, { compact: true })}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap pl-3 pr-4 text-ink-2">{fmtDate(p.targetDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
