import { useEffect, useState } from "react";
import type { CompanyType, Organization } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label, Separator, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/store/DataProvider";
import { ACUITY_OPTIONS, COMPANY_TYPES, COMPANY_TYPE_LABEL, REGION_OPTIONS, US_STATES } from "@/lib/labels";
import { useToast } from "@/components/ui/toast";
import { ChipMultiSelect, CompanyLogo, ImagePicker, TagEditor } from "./components";

const NONE = "__none";

export function EditCompanySheet({ orgId, buildingId, onOpenChange }: { orgId: string | null; buildingId?: string; onOpenChange: (o: boolean) => void }) {
  const { state, updateOrganization } = useData();
  const toast = useToast();
  const org = state.organizations.find((o) => o.id === orgId);
  const [f, setF] = useState<Organization | null>(null);

  useEffect(() => {
    if (org) setF({ ...org, officeAddress: org.officeAddress ?? { street: "", city: org.hqCity, state: org.hqState, zip: "" } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const set = <K extends keyof Organization>(k: K, v: Organization[K]) => setF((x) => (x ? { ...x, [k]: v } : x));
  const setAddr = (k: "street" | "street2" | "city" | "state" | "zip", v: string) => setF((x) => (x ? { ...x, officeAddress: { ...x.officeAddress!, [k]: v } } : x));
  const parents = state.organizations.filter((o) => o.id !== orgId);
  const stateCodes = Object.keys(US_STATES);

  return (
    <Sheet open={!!org} onOpenChange={onOpenChange}>
      <SheetContent width="max-w-[560px]">
        {f && (
          <>
            <div className="border-b border-border px-5 py-4 pr-12">
              <SheetTitle className="text-[15px] font-semibold">Edit company</SheetTitle>
              <SheetDescription className="text-[13px] text-ink-3">Company information shared everywhere this company appears.</SheetDescription>
            </div>
            <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="flex items-center gap-3">
                <CompanyLogo org={f} size={56} />
                <ImagePicker maxDim={256} onPick={([img]) => set("logoDataUrl", img.dataUrl)}>
                  {(open) => (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={open}>
                        {f.logoDataUrl ? "Replace logo" : "Upload logo"}
                      </Button>
                      {f.logoDataUrl && (
                        <Button variant="ghost" size="sm" onClick={() => set("logoDataUrl", undefined)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </ImagePicker>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Company name *</Label>
                  <Input className="mt-1" value={f.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div>
                  <Label>Company type</Label>
                  <Select value={f.companyType ?? NONE} onValueChange={(v) => set("companyType", v === NONE ? undefined : (v as CompanyType))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not set</SelectItem>
                      {COMPANY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {COMPANY_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parent company</Label>
                  <Select value={f.parentOrgId ?? NONE} onValueChange={(v) => set("parentOrgId", v === NONE ? undefined : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {parents.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Website</Label>
                  <Input className="mt-1" value={f.website ?? ""} onChange={(e) => set("website", e.target.value || undefined)} />
                </div>
              </div>

              <Separator />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                <div className="text-[13px] font-semibold sm:col-span-6">Office address</div>
                <div className="sm:col-span-6">
                  <Label>Office address</Label>
                  <Input className="mt-1" value={f.officeAddress!.street} onChange={(e) => setAddr("street", e.target.value)} />
                </div>
                <div className="sm:col-span-6">
                  <Label>Office address 2</Label>
                  <Input className="mt-1" value={f.officeAddress!.street2 ?? ""} onChange={(e) => setAddr("street2", e.target.value)} />
                </div>
                <div className="sm:col-span-3">
                  <Label>Office city</Label>
                  <Input className="mt-1" value={f.officeAddress!.city} onChange={(e) => setAddr("city", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Office state</Label>
                  <Select value={f.officeAddress!.state || NONE} onValueChange={(v) => setAddr("state", v === NONE ? "" : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {stateCodes.map((c) => (
                        <SelectItem key={c} value={c}>
                          {US_STATES[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-1">
                  <Label>Office zip</Label>
                  <Input className="mt-1" value={f.officeAddress!.zip} onChange={(e) => setAddr("zip", e.target.value)} />
                </div>
              </div>

              <Separator />
              <div className="space-y-3">
                <div className="text-[13px] font-semibold">Investment focus</div>
                <div>
                  <Label>Acuity focus</Label>
                  <div className="mt-1">
                    <ChipMultiSelect value={f.acuityFocus ?? []} onChange={(v) => set("acuityFocus", v)} options={ACUITY_OPTIONS} />
                  </div>
                </div>
                <div>
                  <Label>Regional focus</Label>
                  <div className="mt-1">
                    <ChipMultiSelect value={f.regionalFocus ?? []} onChange={(v) => set("regionalFocus", v)} options={REGION_OPTIONS} />
                  </div>
                </div>
                <div>
                  <Label>State focus</Label>
                  <div className="mt-1">
                    <ChipMultiSelect value={f.stateFocus ?? []} onChange={(v) => set("stateFocus", v)} options={stateCodes} labelFor={(c) => `${US_STATES[c]} (${c})`} />
                  </div>
                </div>
                <div>
                  <Label>Tags</Label>
                  <div className="mt-1">
                    <TagEditor tags={f.tags ?? []} onChange={(t) => set("tags", t)} suggestions={["Seller", "Buyer", "Repeat counterparty", "Motivated seller", "REO owner"]} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea className="mt-1" rows={2} value={f.description ?? ""} onChange={(e) => set("description", e.target.value || undefined)} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-canvas/60 px-5 py-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={!f.name.trim()}
                onClick={() => {
                  updateOrganization(f.id, { ...f, name: f.name.trim(), hqCity: f.officeAddress?.city || f.hqCity, hqState: f.officeAddress?.state || f.hqState }, buildingId ? { buildingId, title: `Company profile updated: ${f.name.trim()}` } : undefined);
                  toast({ title: "Company saved", description: f.name });
                  onOpenChange(false);
                }}
              >
                Save company
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
