import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import type { DealBuildingRole } from "@/types";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { DealStageBadge } from "@/components/shared/badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/store/DataProvider";
import { DEAL_ROLE_LABEL } from "@/lib/labels";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useBuildingPage } from "../context";

export function AddToDealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { bundle } = useBuildingPage();
  const { state, addDealAssociation } = useData();
  const toast = useToast();
  const linked = new Set(bundle.deals.map((d) => d.deal.id));
  const candidates = state.deals.filter((d) => d.status === "active");
  const [dealId, setDealId] = useState<string | null>(null);
  const [role, setRole] = useState<DealBuildingRole>("portfolio_asset");
  const [alloc, setAlloc] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setDealId(null);
      setRole("portfolio_asset");
      setAlloc("");
      setNotes("");
    }
  }, [open]);

  const deal = state.deals.find((d) => d.id === dealId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader icon={<Briefcase />} title="Add to deal" description={`Link ${bundle.building.name} to an active transaction. Price allocation and role are stored on the deal, not the building.`} />
        <DialogBody className="space-y-4">
          <div>
            <Label>Active deals</Label>
            <div className="mt-1.5 space-y-1.5">
              {candidates.map((d) => {
                const already = linked.has(d.id);
                const count = state.dealBuildings.filter((x) => x.dealId === d.id).length;
                return (
                  <button
                    key={d.id}
                    disabled={already}
                    onClick={() => {
                      setDealId(d.id);
                      setRole(d.type === "portfolio" ? "add_on" : "primary_asset");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55",
                      dealId === d.id ? "border-accent bg-accent-soft/60 ring-1 ring-accent" : "border-border hover:bg-canvas",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-ink">{d.name}</div>
                      <div className="text-[11.5px] text-ink-3">
                        {d.code} · {count} building{count === 1 ? "" : "s"} · {d.askingPrice ? `${fmtCurrency(d.askingPrice, { compact: true })} ask` : "No ask"}
                        {already && " · Already linked"}
                      </div>
                    </div>
                    <DealStageBadge stage={d.stage} status={d.status} />
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px] text-ink-4">Creating new deals will be available in the Deals module.</p>
          </div>
          {deal && (
            <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-canvas/60 p-3 sm:grid-cols-2">
              <div>
                <Label>Building role in deal</Label>
                <Select value={role} onValueChange={(v) => setRole(v as DealBuildingRole)}>
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DEAL_ROLE_LABEL) as DealBuildingRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {DEAL_ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price allocation (optional)</Label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-4">$</span>
                  <Input className="bg-background pl-5 tabular" inputMode="numeric" value={alloc} onChange={(e) => setAlloc(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea className="mt-1 bg-background" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this building being added?" />
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            disabled={!deal}
            onClick={() => {
              addDealAssociation({ dealId: deal!.id, buildingId: bundle.building.id, role, priceAllocation: alloc ? Number(alloc) : undefined, allocationBasis: alloc ? "Manual entry" : undefined, notes: notes || undefined });
              toast({ title: `Added to ${deal!.name}`, description: DEAL_ROLE_LABEL[role] });
              onOpenChange(false);
            }}
          >
            Add to deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
