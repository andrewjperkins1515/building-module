import { useEffect, useState } from "react";
import type { Building, BuildingIdentifier, FacilityType, SourceMeta, Tracked, VerificationStatus } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label, Separator } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SourceIndicator } from "@/components/shared/badges";
import { useData } from "@/store/DataProvider";
import { CURRENT_USER, FACILITY_TYPES, FACILITY_TYPE_LABEL, SOURCE_LABEL, US_STATES, VERIFICATION_LABEL, VERIFICATION_STATUSES } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { todayIso, uid } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useBuildingPage } from "../context";

type TrackedKey = "certifiedBeds" | "licensedBeds" | "averageDailyCensus" | "yearBuilt" | "squareFeet";

const TRACKED: { key: TrackedKey; label: string }[] = [
  { key: "certifiedBeds", label: "Certified beds" },
  { key: "licensedBeds", label: "Licensed beds" },
  { key: "averageDailyCensus", label: "Average daily census" },
  { key: "yearBuilt", label: "Year built" },
  { key: "squareFeet", label: "Square footage" },
];

interface Form {
  name: string;
  alternateNames: string;
  facilityType: FacilityType;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  ccn: string;
  stories: string;
  acreage: string;
  verificationStatus: VerificationStatus;
  tracked: Record<TrackedKey, { value: string; verification: VerificationStatus }>;
}

function toForm(b: Building): Form {
  const t = {} as Form["tracked"];
  TRACKED.forEach(({ key }) => {
    const f = b[key] as Tracked<number | null>;
    t[key] = { value: f.value === null ? "" : String(f.value), verification: f.meta.verification };
  });
  return {
    name: b.name,
    alternateNames: b.alternateNames.join(", "),
    facilityType: b.facilityType,
    street: b.address.street,
    city: b.address.city,
    state: b.address.state,
    zip: b.address.zip,
    county: b.address.county,
    ccn: b.identifiers.find((i) => i.type === "cms_ccn" && i.isCurrent)?.value ?? "",
    stories: b.stories?.toString() ?? "",
    acreage: b.acreage?.toString() ?? "",
    verificationStatus: b.verificationStatus,
    tracked: t,
  };
}

export function EditBuildingSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { bundle } = useBuildingPage();
  const { updateBuilding } = useData();
  const toast = useToast();
  const b = bundle.building;
  const [form, setForm] = useState<Form>(() => toForm(b));

  useEffect(() => {
    if (open) setForm(toForm(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setTracked = (k: TrackedKey, patch: Partial<Form["tracked"][TrackedKey]>) => setForm((f) => ({ ...f, tracked: { ...f.tracked, [k]: { ...f.tracked[k], ...patch } } }));

  const valid = form.name.trim() && form.city.trim() && Number(form.tracked.certifiedBeds.value) > 0;

  const save = () => {
    const changed: string[] = [];
    const patch: Partial<Building> = {};
    const today = todayIso();

    if (form.name.trim() !== b.name) changed.push("name");
    if (form.facilityType !== b.facilityType) changed.push("facility type");
    const alt = form.alternateNames.split(",").map((s) => s.trim()).filter(Boolean);
    if (alt.join("|") !== b.alternateNames.join("|")) changed.push("alternate names");
    const address = { ...b.address, street: form.street.trim(), city: form.city.trim(), state: form.state, zip: form.zip.trim(), county: form.county.trim() };
    if (JSON.stringify(address) !== JSON.stringify(b.address)) changed.push("address");

    TRACKED.forEach(({ key, label }) => {
      const cur = b[key] as Tracked<number | null>;
      const raw = form.tracked[key].value.trim();
      const val = raw === "" ? null : Number(raw);
      const verification = form.tracked[key].verification;
      const valueChanged = val !== cur.value;
      if (valueChanged || verification !== cur.meta.verification) {
        const meta: SourceMeta = valueChanged
          ? { source: "manual", asOf: today, verification, verifiedBy: verification === "verified" ? CURRENT_USER.name : undefined }
          : { ...cur.meta, verification, verifiedBy: verification === "verified" ? CURRENT_USER.name : cur.meta.verifiedBy, asOf: verification === "verified" ? today : cur.meta.asOf };
        (patch as Record<string, unknown>)[key] = { value: key === "yearBuilt" || key === "squareFeet" ? val : (val ?? 0), meta };
        changed.push(valueChanged ? label.toLowerCase() : `${label.toLowerCase()} verification`);
      }
    });

    // Provider number: retire the current CCN and add a new dated identifier, rather than overwriting.
    let identifiers: BuildingIdentifier[] = b.identifiers;
    const curCcn = b.identifiers.find((i) => i.type === "cms_ccn" && i.isCurrent);
    const newCcn = form.ccn.trim();
    if ((curCcn?.value ?? "") !== newCcn) {
      identifiers = b.identifiers.map((i) => (i.id === curCcn?.id ? { ...i, isCurrent: false, effectiveTo: today, note: "Superseded via manual edit." } : i));
      if (newCcn) identifiers = [...identifiers, { id: uid("bid"), type: "cms_ccn", value: newCcn, issuer: "CMS", effectiveFrom: today, isCurrent: true }];
      changed.push("CMS provider number");
    }

    Object.assign(patch, {
      name: form.name.trim(),
      alternateNames: alt,
      facilityType: form.facilityType,
      address,
      identifiers,
      stories: form.stories ? Number(form.stories) : null,
      acreage: form.acreage ? Number(form.acreage) : null,
      verificationStatus: form.verificationStatus,
      lastVerifiedAt: form.verificationStatus === "verified" && b.verificationStatus !== "verified" ? today : b.lastVerifiedAt,
    });
    if ((form.stories || null) !== (b.stories?.toString() || null) || (form.acreage || null) !== (b.acreage?.toString() || null)) changed.push("site details");

    updateBuilding(b.id, patch, changed.length ? { title: "Building details updated", description: `Changed ${changed.join(", ")}.` } : undefined);
    toast({ title: "Building saved", description: changed.length ? `Updated ${changed.length} field${changed.length > 1 ? "s" : ""}.` : "No changes." });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="max-w-[560px]">
        <div className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-[15px] font-semibold">Edit building</SheetTitle>
          <SheetDescription className="text-[13px] text-ink-3">Permanent facility attributes. Deal-specific values are edited on the deal.</SheetDescription>
        </div>
        <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Facility name *</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Alternate names</Label>
              <Input className="mt-1" value={form.alternateNames} onChange={(e) => set("alternateNames", e.target.value)} placeholder="Comma-separated" />
            </div>
            <div>
              <Label>Facility type</Label>
              <Select value={form.facilityType} onValueChange={(v) => set("facilityType", v as FacilityType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {FACILITY_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CMS provider number</Label>
              <Input className="mt-1 font-mono" value={form.ccn} onChange={(e) => set("ccn", e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 6))} />
              <p className="mt-1 text-[11px] text-ink-4">Changing it retires the current number into history.</p>
            </div>
          </section>

          <Separator />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="text-[13px] font-semibold sm:col-span-6">Address</div>
            <div className="sm:col-span-6">
              <Label>Street</Label>
              <Input className="mt-1" value={form.street} onChange={(e) => set("street", e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <Label>City *</Label>
              <Input className="mt-1" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <Label>State</Label>
              <Select value={form.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(US_STATES).map(([k, n]) => (
                    <SelectItem key={k} value={k}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>ZIP</Label>
              <Input className="mt-1" value={form.zip} onChange={(e) => set("zip", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>County</Label>
              <Input className="mt-1" value={form.county} onChange={(e) => set("county", e.target.value)} />
            </div>
            <div className="sm:col-span-1">
              <Label>Stories</Label>
              <Input className="mt-1" type="number" value={form.stories} onChange={(e) => set("stories", e.target.value)} />
            </div>
            <div className="sm:col-span-1">
              <Label>Acres</Label>
              <Input className="mt-1" type="number" step="0.1" value={form.acreage} onChange={(e) => set("acreage", e.target.value)} />
            </div>
          </section>

          <Separator />

          <section>
            <div className="text-[13px] font-semibold">Key facts & verification</div>
            <p className="text-xs text-ink-3">Changed values are recorded as manual entries. Mark a value verified once confirmed against a source document.</p>
            <div className="mt-3 overflow-hidden rounded-md border border-border">
              {TRACKED.map(({ key, label }) => {
                const cur = b[key] as Tracked<number | null>;
                return (
                  <div key={key} className="grid grid-cols-[1fr_96px_150px] items-center gap-2 border-b border-border/70 px-3 py-2 last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[13px] text-ink">
                        {label}
                        <SourceIndicator meta={cur.meta} />
                      </div>
                      <div className="truncate text-[11px] text-ink-4">
                        {SOURCE_LABEL[cur.meta.source]} · {fmtDate(cur.meta.asOf)}
                      </div>
                    </div>
                    <Input type="number" value={form.tracked[key].value} onChange={(e) => setTracked(key, { value: e.target.value })} className="tabular text-right" />
                    <Select value={form.tracked[key].verification} onValueChange={(v) => setTracked(key, { verification: v as VerificationStatus })}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VERIFICATION_STATUSES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {VERIFICATION_LABEL[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-canvas px-3 py-2.5">
              <div>
                <div className="text-[13px] font-medium">Building verification status</div>
                <div className="text-[11.5px] text-ink-3">Overall status shown in the directory</div>
              </div>
              <Select value={form.verificationStatus} onValueChange={(v) => set("verificationStatus", v as VerificationStatus)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VERIFICATION_STATUSES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {VERIFICATION_LABEL[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-canvas/60 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid}>
            Save changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
