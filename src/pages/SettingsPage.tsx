import { Database, RotateCcw, Plug, ListChecks } from "lucide-react";
import { useBreadcrumbs } from "@/components/layout/breadcrumbs";
import { PageHeader, Section } from "@/components/shared/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useData } from "@/store/DataProvider";
import { useToast } from "@/components/ui/toast";
import { BASELINE_DOCUMENTS, DILIGENCE_TEMPLATE } from "@/data/templates";
import { DOC_CATEGORY_LABEL } from "@/lib/labels";

export function SettingsPage() {
  useBreadcrumbs([{ label: "Settings" }]);
  const { state, resetDemo } = useData();
  const toast = useToast();
  const counts = [
    ["Buildings", state.buildings.length],
    ["Deals", state.deals.length],
    ["Organizations", state.organizations.length],
    ["Document requests", state.documentRequests.length],
    ["Site visits", state.siteVisits.length],
    ["Activity entries", state.activities.length],
  ] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 lg:px-8">
      <PageHeader title="Settings" subtitle="Prototype configuration. Full workspace administration will be designed in a later iteration." />

      <Section title="Prototype data" icon={Database} description="All data is fictional and stored in this browser’s localStorage.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {counts.map(([k, v]) => (
            <div key={k} className="rounded-md border border-border bg-canvas px-3 py-2">
              <div className="text-[11.5px] text-ink-3">{k}</div>
              <div className="tabular text-lg font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-md border border-warning-line bg-warning-soft/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[13px] text-ink-2">Reset restores the original mock dataset and discards all edits, uploads and reviews.</div>
          <Button
            variant="danger-outline"
            onClick={() => {
              resetDemo();
              toast({ title: "Demo data reset", tone: "info" });
            }}
          >
            <RotateCcw /> Reset demo data
          </Button>
        </div>
      </Section>

      <Section title="Document checklist template" icon={ListChecks} description="Baseline placeholders are created for every building. Diligence items can be applied per building.">
        <div className="space-y-1.5">
          {[...BASELINE_DOCUMENTS, ...DILIGENCE_TEMPLATE].map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-3 border-b border-border/70 py-1.5 last:border-0">
              <div className="min-w-0">
                <div className="truncate text-[13px] text-ink">{t.name}</div>
                <div className="text-[11.5px] text-ink-4">{DOC_CATEGORY_LABEL[t.category]}</div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {t.baseline && <Badge tone="dark">Baseline</Badge>}
                {t.cmsOnly && <Badge tone="outline">SNF only</Badge>}
                {t.required ? <Badge tone="accent">Required</Badge> : <Badge>Optional</Badge>}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-4">Template editing is planned; for now, items are configured per building from the Documents tab.</p>
      </Section>

      <Section title="Integrations" icon={Plug} description="Not connected in this prototype.">
        <div className="divide-y divide-border">
          {[
            ["CMS Provider Data", "Facility ratings, surveys and staffing — currently a mock dataset."],
            ["Microsoft SharePoint", "Deal data rooms — currently simulated."],
            ["Microsoft Outlook", "Email capture and correspondence — planned."],
            ["Mapping provider", "Location maps — currently schematic placeholders."],
          ].map(([name, d]) => (
            <div key={name} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <div className="text-[13px] font-medium">{name}</div>
                <div className="text-xs text-ink-3">{d}</div>
              </div>
              <Badge tone="outline">Planned</Badge>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
