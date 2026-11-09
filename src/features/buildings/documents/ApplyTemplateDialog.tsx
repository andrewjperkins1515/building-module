import { useEffect, useMemo, useState } from "react";
import { ListPlus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Badge, Checkbox } from "@/components/ui/primitives";
import { useData } from "@/store/DataProvider";
import { BASELINE_DOCUMENTS, templateFor } from "@/data/templates";
import { DOC_CATEGORIES, DOC_CATEGORY_LABEL } from "@/lib/labels";
import { useToast } from "@/components/ui/toast";
import { useBuildingPage } from "../detail/context";

/** Configure additional checklist placeholders from the standard diligence template. */
export function ApplyTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { bundle } = useBuildingPage();
  const { applyChecklistTemplate } = useData();
  const toast = useToast();
  const existing = useMemo(() => new Set(bundle.documents.map((d) => d.name)), [bundle.documents]);
  const items = useMemo(() => [...BASELINE_DOCUMENTS, ...templateFor(bundle.building.facilityType)], [bundle.building.facilityType]);
  const available = items.filter((t) => !existing.has(t.name));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const activeDeal = bundle.deals.find((d) => d.deal.status === "active")?.deal;

  useEffect(() => {
    if (open) setSelected(new Set(available.filter((t) => t.required).map((t) => t.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader
          icon={<ListPlus />}
          title="Configure checklist"
          description={`Add placeholders from the standard ${bundle.building.facilityType === "skilled_nursing" ? "SNF" : "seniors housing"} acquisition diligence template.`}
        />
        <DialogBody className="space-y-4">
          {available.length === 0 && <div className="rounded-md bg-canvas px-3 py-6 text-center text-[13px] text-ink-3">Every template item is already on this building’s checklist.</div>}
          {DOC_CATEGORIES.map((c) => {
            const group = items.filter((t) => t.category === c);
            if (!group.length) return null;
            return (
              <div key={c}>
                <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wide text-ink-4">{DOC_CATEGORY_LABEL[c]}</div>
                <div className="divide-y divide-border/70 rounded-md border border-border">
                  {group.map((t) => {
                    const has = existing.has(t.name);
                    return (
                      <label key={t.key} className={`flex items-start gap-3 px-3 py-2 ${has ? "opacity-55" : "cursor-pointer hover:bg-canvas"}`}>
                        <Checkbox checked={has || selected.has(t.key)} disabled={has} onCheckedChange={() => toggle(t.key)} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink">
                            {t.name}
                            {t.baseline && <Badge tone="dark" className="px-1 text-[10px]">Baseline</Badge>}
                            {t.required ? <Badge tone="accent" className="text-[10px]">Required</Badge> : <Badge className="text-[10px]">Optional</Badge>}
                            {has && <span className="text-[11px] text-ink-4">· On checklist</span>}
                          </div>
                          <div className="text-[11.5px] text-ink-3">{t.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </DialogBody>
        <DialogFooter className="justify-between">
          <div className="flex gap-3 text-xs">
            <button className="font-medium text-accent hover:underline" onClick={() => setSelected(new Set(available.map((t) => t.key)))}>
              Select all
            </button>
            <button className="text-ink-3 hover:underline" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={selected.size === 0}
              onClick={() => {
                const n = applyChecklistTemplate(bundle.building.id, [...selected], activeDeal?.id);
                toast({ title: `${n} checklist item${n === 1 ? "" : "s"} added`, description: "New items start as Not Requested." });
                onOpenChange(false);
              }}
            >
              Add {selected.size} item{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
