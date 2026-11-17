import { useEffect, useState } from "react";
import type { AssetClass, Deal, DealKind } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label, Separator, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/store/DataProvider";
import { dealView } from "@/store/selectors";
import { ASSET_CLASSES, ASSET_CLASS_LABEL, DEAL_KINDS, DEAL_KIND_LABEL, US_STATES } from "@/lib/labels";
import { useToast } from "@/components/ui/toast";
import { ChipMultiSelect } from "@/features/crm/components";
import { SearchPicker, useContactItems, useOrgItems } from "./SearchPicker";

const NONE = "__none";

export function EditDealSheet({ deal, open, onOpenChange }: { deal: Deal; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, updateDeal } = useData();
  const toast = useToast();
  const [f, setF] = useState<Deal>(deal);
  const orgItems = useOrgItems();
  const contactItems = useContactItems([f.sourceOrgId]);
  const v = dealView(state, deal);

  useEffect(() => {
    if (open) setF(deal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof Deal>(k: K, val: Deal[K]) => setF((x) => ({ ...x, [k]: val }));
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(/[^0-9.]/g, "")));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="max-w-[600px]">
        <div className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-[15px] font-semibold">Edit deal</SheetTitle>
          <SheetDescription className="text-[13px] text-ink-3">
            {deal.code} · Companies and contacts are chosen from the CRM.
          </SheetDescription>
        </div>
        <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Deal name *</Label>
              <Input className="mt-1" value={f.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label>Deal type</Label>
              <Select value={f.dealKind ?? NONE} onValueChange={(x) => set("dealKind", x === NONE ? undefined : (x as DealKind))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {DEAL_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {DEAL_KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Primary asset class</Label>
              <Select value={f.assetClass ?? NONE} onValueChange={(x) => set("assetClass", x === NONE ? undefined : (x as AssetClass))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {ASSET_CLASSES.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ASSET_CLASS_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="text-[13px] font-semibold sm:col-span-2">Source</div>
            <div>
              <Label>Source company</Label>
              <SearchPicker className="mt-1" items={orgItems} value={f.sourceOrgId} onChange={(id) => set("sourceOrgId", id)} emptyLabel="Select company" />
            </div>
            <div>
              <Label>Source contact</Label>
              <SearchPicker
                className="mt-1"
                items={contactItems}
                value={f.sourceContactId}
                onChange={(id) => {
                  const c = state.contacts.find((x) => x.id === id);
                  setF((x) => ({ ...x, sourceContactId: id, sourceOrgId: c ? c.organizationId : x.sourceOrgId }));
                }}
                emptyLabel="Select contact"
              />
              <p className="mt-1 text-[11px] text-ink-4">Name and email fill in from the contact record.</p>
            </div>
          </div>

          <Separator />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="text-[13px] font-semibold sm:col-span-2">Pricing & size</div>
            <div>
              <Label>Asking price</Label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-4">$</span>
                <Input className="tabular pl-5" inputMode="numeric" value={f.askingPrice?.toLocaleString("en-US") ?? ""} onChange={(e) => set("askingPrice", num(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Projected closing date</Label>
              <Input type="date" className="mt-1" value={f.projectedCloseDate ?? ""} onChange={(e) => set("projectedCloseDate", e.target.value || undefined)} />
            </div>
            <div className="sm:col-span-2">
              <Label>State(s)</Label>
              <div className="mt-1">
                <ChipMultiSelect value={f.statesOverride ?? []} onChange={(s) => set("statesOverride", s.length ? s : undefined)} options={Object.keys(US_STATES)} labelFor={(c) => `${US_STATES[c]} (${c})`} placeholder={`Calculated: ${v.states.join(", ") || "none"}`} />
              </div>
            </div>
            <div>
              <Label>Total buildings</Label>
              <Input className="tabular mt-1" inputMode="numeric" value={f.totalBuildingsOverride ?? ""} placeholder={`Calculated: ${v.buildings.length}`} onChange={(e) => set("totalBuildingsOverride", num(e.target.value))} />
            </div>
            <div>
              <Label>Total licensed beds</Label>
              <Input className="tabular mt-1" inputMode="numeric" value={f.totalLicBedsOverride ?? ""} placeholder={`Calculated: ${v.buildings.reduce((a, x) => a + x.building.licensedBeds.value, 0)}`} onChange={(e) => set("totalLicBedsOverride", num(e.target.value))} />
            </div>
            <p className="text-[11px] text-ink-4 sm:col-span-2">Leave states, buildings and beds blank to calculate them from the deal's buildings; enter values when some buildings aren't in Owner Docket yet.</p>
          </div>

          <Separator />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="text-[13px] font-semibold sm:col-span-2">Parties</div>
            <div>
              <Label>Current operator</Label>
              <SearchPicker className="mt-1" items={orgItems} value={f.currentOperatorOrgId} onChange={(id) => set("currentOperatorOrgId", id)} emptyLabel={v.currentOperators.length ? `From buildings: ${v.currentOperators.map((o) => o.name).join(", ")}` : "Select company"} />
            </div>
            <div>
              <Label>Seller (current owner)</Label>
              <SearchPicker className="mt-1" items={orgItems} value={f.sellerOrgId} onChange={(id) => set("sellerOrgId", id)} emptyLabel="Select company" />
            </div>
            <div>
              <Label>New operator</Label>
              <SearchPicker className="mt-1" items={orgItems} value={f.newOperatorOrgId} onChange={(id) => set("newOperatorOrgId", id)} emptyLabel="Select company" />
            </div>
            <div>
              <Label>JV partner</Label>
              <SearchPicker className="mt-1" items={orgItems} value={f.jvPartnerOrgId} onChange={(id) => set("jvPartnerOrgId", id)} emptyLabel="Select company" />
            </div>
            <div>
              <Label>JV %</Label>
              <div className="relative mt-1">
                <Input className="tabular pr-6" inputMode="decimal" value={f.jvPct ?? ""} onChange={(e) => set("jvPct", num(e.target.value))} />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-4">%</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Link to data room</Label>
              <Input className="mt-1" value={f.dataRoomUrl ?? ""} onChange={(e) => set("dataRoomUrl", e.target.value || undefined)} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Summary</Label>
              <Textarea className="mt-1" rows={3} value={f.summary} onChange={(e) => set("summary", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-canvas/60 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!f.name.trim() || (f.jvPct !== undefined && (f.jvPct < 0 || f.jvPct > 100))}
            onClick={() => {
              updateDeal(deal.id, { ...f, name: f.name.trim() }, "Deal details updated");
              toast({ title: "Deal saved", description: f.name });
              onOpenChange(false);
            }}
          >
            Save deal
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
