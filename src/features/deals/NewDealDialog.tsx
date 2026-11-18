import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import type { AssetClass, Deal, DealKind, DealStage } from "@/types";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/store/DataProvider";
import { ASSET_CLASSES, ASSET_CLASS_LABEL, CURRENT_USER, DEAL_KINDS, DEAL_KIND_LABEL, DEAL_STAGE_LABEL } from "@/lib/labels";
import { useToast } from "@/components/ui/toast";
import { uid } from "@/lib/utils";
import { assetClassFor } from "@/data/dealDetails";
import { buildChecklist } from "@/lib/checklist";
import { BuildingMultiSelect } from "./AddBuildingsDialog";
import { SearchPicker, useContactItems, useOrgItems } from "./SearchPicker";

const AUTO = "__auto";

export function NewDealDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { state, addDeal } = useData();
  const toast = useToast();
  const orgItems = useOrgItems();
  const internal = useContactItems(["org_od_holdings"]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DealKind>("acquisition");
  const [asset, setAsset] = useState<string>(AUTO);
  const [stage, setStage] = useState<DealStage>("high_level_review");
  const [skippedLoi, setSkippedLoi] = useState(false);
  const [seller, setSeller] = useState<string | undefined>();
  const [lead, setLead] = useState<string | undefined>("ct_jellis");
  const [price, setPrice] = useState("");
  const [close, setClose] = useState("");
  const [buildingIds, setBuildingIds] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setKind("acquisition");
      setAsset(AUTO);
      setStage("high_level_review");
      setSkippedLoi(false);
      setSeller(undefined);
      setLead("ct_jellis");
      setPrice("");
      setClose("");
      setBuildingIds([]);
      setTouched(false);
    }
  }, [open]);

  // Default the seller to the current owner of the first selected building.
  useEffect(() => {
    if (seller || !buildingIds.length) return;
    const own = state.ownerships.find((o) => o.buildingId === buildingIds[0] && o.isCurrent && o.role === "property_owner");
    if (own) setSeller(own.organizationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingIds]);

  const create = () => {
    if (!name.trim()) {
      setTouched(true);
      return;
    }
    const blds = state.buildings.filter((b) => buildingIds.includes(b.id));
    const leadContact = state.contacts.find((c) => c.id === lead);
    const newId = uid("deal");
    const contacts: Deal["contacts"] = lead ? [{ side: "buyer", role: "team_lead", contactId: lead }] : [];
    const draft = { id: newId, code: "", contacts } as Deal;
    const id = addDeal(
      {
        id: newId,
        name: name.trim(),
        type: buildingIds.length > 1 ? "portfolio" : "single_asset",
        stage,
        status: "active",
        skippedLoi: stage === "psa_signed" && skippedLoi,
        sellerOrgId: seller,
        buyerEntity: "TBD",
        buyerOrgId: "org_od_holdings",
        askingPrice: price ? Number(price.replace(/[^0-9]/g, "")) : undefined,
        projectedCloseDate: close || undefined,
        leadName: leadContact?.name ?? CURRENT_USER.name,
        summary: "",
        dealKind: kind,
        assetClass: asset === AUTO ? assetClassFor(blds) : (asset as AssetClass),
        contacts,
        reports: [],
        progress: [],
        checklist: buildChecklist(draft, skippedLoi && stage === "psa_signed" ? { psa_loi: { bypass: "Went directly to PSA — no LOI." } } : {}),
        buyerDistribution: "",
        sellerDistribution: "",
      },
      buildingIds,
    );
    toast({ title: "Deal created", description: name.trim() });
    onOpenChange(false);
    onCreated(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader icon={<Briefcase />} title="New deal" description="Create the deal record. Contacts, vendors and reports can be added on the record." />
        <DialogBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Deal name *</Label>
            <Input autoFocus className={touched && !name.trim() ? "mt-1 border-danger/60" : "mt-1"} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hoosier Two-Pack" />
            {touched && !name.trim() && <p className="mt-1 text-[11.5px] text-danger">Deal name is required.</p>}
          </div>
          <div>
            <Label>Deal type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as DealKind)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>From selected buildings</SelectItem>
                {ASSET_CLASSES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {ASSET_CLASS_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Buildings</Label>
            <div className="mt-1">
              <BuildingMultiSelect value={buildingIds} onChange={setBuildingIds} />
            </div>
          </div>
          <div>
            <Label>Seller (current owner)</Label>
            <SearchPicker className="mt-1" items={orgItems} value={seller} onChange={setSeller} emptyLabel="Select company" />
          </div>
          <div>
            <Label>Buyer team lead</Label>
            <SearchPicker className="mt-1" items={internal} value={lead} onChange={setLead} emptyLabel="Select contact" />
          </div>
          <div>
            <Label>Asking price</Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-4">$</span>
              <Input className="tabular pl-5" inputMode="numeric" value={price ? Number(price.replace(/[^0-9]/g, "")).toLocaleString("en-US") : ""} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} />
            </div>
          </div>
          <div>
            <Label>Projected closing date</Label>
            <Input type="date" className="mt-1" value={close} onChange={(e) => setClose(e.target.value)} />
          </div>
          <div>
            <Label>Starting stage</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["high_level_review", "loi_signed", "psa_signed"] as DealStage[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {DEAL_STAGE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {stage === "psa_signed" && (
            <label className="flex items-end gap-2 pb-2 text-[13px] text-ink-2">
              <Checkbox checked={skippedLoi} onCheckedChange={(c) => setSkippedLoi(!!c)} /> Skipped LOI (went direct to PSA)
            </label>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={create}>
            Create deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
