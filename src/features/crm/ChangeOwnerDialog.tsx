import { useEffect, useMemo, useState } from "react";
import { Landmark, Plus, Search } from "lucide-react";
import type { CompanyType } from "@/types";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/store/DataProvider";
import { COMPANY_TYPES, COMPANY_TYPE_LABEL, ORG_TYPE_LABEL } from "@/lib/labels";
import { cn, todayIso } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { CompanyLogo, CompanyTypeBadge } from "./components";

/** Set or change a building's current property owner; the previous owner moves to ownership history. */
export function ChangeOwnerDialog({ buildingId, currentOwnerId, open, onOpenChange }: { buildingId: string; currentOwnerId?: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, changeOwner, addOrganization } = useData();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CompanyType>("private");
  const [date, setDate] = useState(todayIso());

  useEffect(() => {
    if (open) {
      setQ("");
      setSelected(null);
      setCreating(false);
      setNewName("");
      setNewType("private");
      setDate(todayIso());
    }
  }, [open]);

  const candidates = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.organizations
      .filter((o) => o.id !== currentOwnerId)
      .filter((o) => !t || o.name.toLowerCase().includes(t))
      .sort((a, b) => Number(b.type === "owner") - Number(a.type === "owner") || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [q, state.organizations, currentOwnerId]);

  const confirm = () => {
    let orgId = selected;
    if (creating) {
      orgId = addOrganization({ name: newName.trim(), type: "owner", companyType: newType, hqCity: "", hqState: "" });
    }
    if (!orgId) return;
    changeOwner(buildingId, orgId, date);
    toast({ title: "Current owner updated", description: creating ? newName.trim() : state.organizations.find((o) => o.id === orgId)?.name });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader icon={<Landmark />} title={currentOwnerId ? "Change current owner" : "Set current owner"} description="The company that owns the real estate. The previous owner is kept in ownership history." />
        <DialogBody className="space-y-4">
          {!creating ? (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
                <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies" className="pl-8" />
              </div>
              <div className="space-y-1.5">
                {candidates.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelected(o.id)}
                    className={cn("flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors", selected === o.id ? "border-accent bg-accent-soft/60 ring-1 ring-accent" : "border-border hover:bg-canvas")}
                  >
                    <CompanyLogo org={o} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">{o.name}</div>
                      <div className="text-[11.5px] text-ink-3">
                        {ORG_TYPE_LABEL[o.type]}
                        {o.hqCity ? ` · ${o.hqCity}, ${o.hqState}` : ""}
                      </div>
                    </div>
                    <CompanyTypeBadge type={o.companyType} />
                  </button>
                ))}
                {candidates.length === 0 && <div className="py-3 text-center text-[13px] text-ink-3">No companies match “{q}”.</div>}
              </div>
              <button
                onClick={() => {
                  setCreating(true);
                  setNewName(q);
                }}
                className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
              >
                <Plus className="size-3.5" /> Create a new company{q ? ` “${q}”` : ""}
              </button>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-canvas/60 p-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Company name *</Label>
                <Input autoFocus className="mt-1 bg-background" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <Label>Company type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as CompanyType)}>
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {COMPANY_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                  Choose existing instead
                </Button>
              </div>
            </div>
          )}
          <div className="w-48">
            <Label>Ownership effective date</Label>
            <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="accent" disabled={!date || (creating ? !newName.trim() : !selected)} onClick={confirm}>
            {currentOwnerId ? "Change owner" : "Set owner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
