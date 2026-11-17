import { useEffect, useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";
import type { Building, Deal } from "@/types";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/primitives";
import { useData } from "@/store/DataProvider";
import { FACILITY_TYPE_LABEL } from "@/lib/labels";
import { useToast } from "@/components/ui/toast";

/** Multi-select list of buildings from the repository. */
export function BuildingMultiSelect({ value, onChange, exclude = [] }: { value: string[]; onChange: (ids: string[]) => void; exclude?: string[] }) {
  const { state } = useData();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.buildings
      .filter((b) => !exclude.includes(b.id))
      .filter((b) => !t || [b.name, b.address.city, b.address.state, ...b.identifiers.map((i) => i.value)].join(" ").toLowerCase().includes(t))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.buildings, q, exclude]);
  const toggle = (b: Building) => onChange(value.includes(b.id) ? value.filter((x) => x !== b.id) : [...value, b.id]);
  return (
    <div className="rounded-md border border-border">
      <div className="relative border-b border-border">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search buildings by name, city, state or CCN" className="h-9 w-full bg-transparent pl-8 pr-3 text-[13px] outline-none placeholder:text-ink-4" />
      </div>
      <ul className="scrollbar-thin max-h-60 divide-y divide-border/70 overflow-y-auto">
        {list.length === 0 && <li className="px-3 py-5 text-center text-[12.5px] text-ink-3">No buildings match</li>}
        {list.map((b) => (
          <li key={b.id}>
            <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-canvas">
              <Checkbox checked={value.includes(b.id)} onCheckedChange={() => toggle(b)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-ink">{b.name}</span>
                <span className="block text-[11.5px] text-ink-3">
                  {b.address.city}, {b.address.state} · {FACILITY_TYPE_LABEL[b.facilityType]} · {b.licensedBeds.value} licensed beds
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="border-t border-border px-3 py-1.5 text-[11.5px] text-ink-4">{value.length} selected</div>
    </div>
  );
}

export function AddBuildingsDialog({ deal, open, onOpenChange }: { deal: Deal; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, addDealAssociation } = useData();
  const toast = useToast();
  const [ids, setIds] = useState<string[]>([]);
  const existing = state.dealBuildings.filter((r) => r.dealId === deal.id).map((r) => r.buildingId);
  useEffect(() => {
    if (open) setIds([]);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader icon={<Building2 />} title="Add buildings to deal" description={`Link buildings from the repository to ${deal.name}.`} />
        <DialogBody>
          <BuildingMultiSelect value={ids} onChange={setIds} exclude={existing} />
          <p className="mt-2 text-[11.5px] text-ink-4">Not listed? Add it first from Buildings → Add Building.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            disabled={!ids.length}
            onClick={() => {
              ids.forEach((buildingId) => addDealAssociation({ dealId: deal.id, buildingId, role: existing.length + ids.length > 1 ? "portfolio_asset" : "primary_asset" }));
              toast({ title: `${ids.length} building${ids.length === 1 ? "" : "s"} added`, description: deal.name });
              onOpenChange(false);
            }}
          >
            Add {ids.length || ""} building{ids.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
