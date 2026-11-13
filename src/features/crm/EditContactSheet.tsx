import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { Contact } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label, Separator, Switch, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/store/DataProvider";
import { US_STATES } from "@/lib/labels";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ContactPhoto, ImagePicker, TagEditor } from "./components";

const NONE = "__none";
export const ROSTER_ROLES = ["Decision maker", "Transactions", "Finance", "Asset management", "Operations", "Real estate", "Legal", "Lending", "Other"];

export type ContactSheetTarget = { mode: "edit"; contactId: string } | { mode: "new"; organizationId: string } | null;

const EMPTY = (organizationId: string): Contact => ({
  id: "",
  name: "",
  title: "",
  organizationId,
  email: "",
  phone: "",
  mailingAddress: { street: "", city: "", state: "", zip: "" },
  tags: [],
});

export function EditContactSheet({ target, onOpenChange }: { target: ContactSheetTarget; onOpenChange: (o: boolean) => void }) {
  const { state, updateContact, addContact, updateOrganization } = useData();
  const toast = useToast();
  const [f, setF] = useState<Contact | null>(null);
  const [primary, setPrimary] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setTouched(false);
    if (!target) return;
    if (target.mode === "edit") {
      const c = state.contacts.find((x) => x.id === target.contactId);
      if (c) {
        setF({ ...c, mailingAddress: c.mailingAddress ?? { street: "", city: "", state: "", zip: "" }, tags: c.tags ?? [] });
        setPrimary(state.organizations.find((o) => o.id === c.organizationId)?.primaryContactId === c.id);
      }
    } else {
      setF(EMPTY(target.organizationId));
      setPrimary(!state.organizations.find((o) => o.id === target.organizationId)?.primaryContactId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setF((x) => (x ? { ...x, [k]: v } : x));
  const setAddr = (k: "street" | "street2" | "city" | "state" | "zip", v: string) => setF((x) => (x ? { ...x, mailingAddress: { ...x.mailingAddress!, [k]: v } } : x));
  const org = f ? state.organizations.find((o) => o.id === f.organizationId) : undefined;
  const nameError = touched && !f?.name.trim();

  const save = () => {
    if (!f) return;
    if (!f.name.trim()) {
      setTouched(true);
      return;
    }
    const clean: Contact = { ...f, name: f.name.trim(), mailingAddress: f.mailingAddress?.street || f.mailingAddress?.city ? f.mailingAddress : undefined };
    let id = f.id;
    if (target?.mode === "new") {
      const { id: _omit, ...rest } = clean;
      void _omit;
      id = addContact(rest);
    } else updateContact(f.id, clean);
    if (org && primary && org.primaryContactId !== id) updateOrganization(org.id, { primaryContactId: id });
    toast({ title: target?.mode === "new" ? "Contact added" : "Contact saved", description: `${clean.name}${org ? ` · ${org.name}` : ""}` });
    onOpenChange(false);
  };

  return (
    <Sheet open={!!target && !!f} onOpenChange={onOpenChange}>
      <SheetContent width="max-w-[600px]">
        {f && (
          <>
            <div className="border-b border-border px-5 py-4 pr-12">
              <SheetTitle className="text-[15px] font-semibold">{target?.mode === "new" ? "Add contact" : "Edit contact"}</SheetTitle>
              <SheetDescription className="text-[13px] text-ink-3">{org?.name}</SheetDescription>
            </div>
            <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="flex items-center gap-3">
                <ContactPhoto name={f.name || "?"} dataUrl={f.photoDataUrl} size={56} />
                <ImagePicker maxDim={320} onPick={([img]) => set("photoDataUrl", img.dataUrl)}>
                  {(open) => (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={open}>
                        {f.photoDataUrl ? "Replace photo" : "Upload photo"}
                      </Button>
                      {f.photoDataUrl && (
                        <Button variant="ghost" size="sm" onClick={() => set("photoDataUrl", undefined)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </ImagePicker>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="text-[13px] font-semibold sm:col-span-2">Contact information</div>
                <div>
                  <Label>Name *</Label>
                  <Input autoFocus={target?.mode === "new"} className={cn("mt-1", nameError && "border-danger/60")} value={f.name} onChange={(e) => set("name", e.target.value)} />
                  {nameError && <p className="mt-1 text-[11.5px] text-danger">Name is required.</p>}
                </div>
                <div>
                  <Label>Title</Label>
                  <Input className="mt-1" value={f.title} onChange={(e) => set("title", e.target.value)} />
                </div>
                <div>
                  <Label>Work email</Label>
                  <Input type="email" className="mt-1" value={f.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div>
                  <Label>Mobile phone</Label>
                  <Input className="mt-1" value={f.mobilePhone ?? ""} onChange={(e) => set("mobilePhone", e.target.value || undefined)} />
                </div>
                <div>
                  <Label>Office phone</Label>
                  <Input className="mt-1" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div>
                  <Label>LinkedIn</Label>
                  <Input className="mt-1" value={f.linkedIn ?? ""} onChange={(e) => set("linkedIn", e.target.value || undefined)} placeholder="linkedin.com/in/…" />
                </div>
              </div>

              <Separator />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold sm:col-span-6">
                  Personal information <Lock className="size-3.5 text-ink-4" />
                  <span className="text-[11.5px] font-normal text-ink-4">Visibility controls by role are planned</span>
                </div>
                <div className="sm:col-span-2">
                  <Label>Date of birth</Label>
                  <Input type="date" className="mt-1" value={f.dob ?? ""} onChange={(e) => set("dob", e.target.value || undefined)} />
                </div>
                <div className="sm:col-span-4">
                  <Label>Personal email</Label>
                  <Input type="email" className="mt-1" value={f.personalEmail ?? ""} onChange={(e) => set("personalEmail", e.target.value || undefined)} />
                </div>
                <div className="sm:col-span-6">
                  <Label>Mail address</Label>
                  <Input className="mt-1" value={f.mailingAddress!.street} onChange={(e) => setAddr("street", e.target.value)} />
                </div>
                <div className="sm:col-span-6">
                  <Label>Mail address 2</Label>
                  <Input className="mt-1" value={f.mailingAddress!.street2 ?? ""} onChange={(e) => setAddr("street2", e.target.value)} />
                </div>
                <div className="sm:col-span-3">
                  <Label>Mail city</Label>
                  <Input className="mt-1" value={f.mailingAddress!.city} onChange={(e) => setAddr("city", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Mail state</Label>
                  <Select value={f.mailingAddress!.state || NONE} onValueChange={(v) => setAddr("state", v === NONE ? "" : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {Object.entries(US_STATES).map(([c, n]) => (
                        <SelectItem key={c} value={c}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-1">
                  <Label>Mail zip</Label>
                  <Input className="mt-1" value={f.mailingAddress!.zip} onChange={(e) => setAddr("zip", e.target.value)} />
                </div>
              </div>

              <Separator />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="text-[13px] font-semibold sm:col-span-2">Corporate roster</div>
                <div>
                  <Label>Role</Label>
                  <Select value={f.rosterRole ?? NONE} onValueChange={(v) => set("rosterRole", v === NONE ? undefined : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not set</SelectItem>
                      {ROSTER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-end justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <span>
                    <span className="block text-[12px] font-medium text-ink-2">Primary contact</span>
                    <span className="block text-[11px] text-ink-4">Shown first for this company</span>
                  </span>
                  <Switch checked={primary} onCheckedChange={setPrimary} />
                </label>
                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea className="mt-1" rows={2} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value || undefined)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Tags</Label>
                  <div className="mt-1">
                    <TagEditor tags={f.tags ?? []} onChange={(t) => set("tags", t)} suggestions={["Decision maker", "Warm relationship", "Gatekeeper", "Do not contact"]} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-canvas/60 px-5 py-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={save}>{target?.mode === "new" ? "Add contact" : "Save contact"}</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
