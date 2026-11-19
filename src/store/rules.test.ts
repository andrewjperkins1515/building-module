/**
 * Executable specification for calculated fields, CRM roll-ups, seed-data integrity and
 * saved-data migrations. See docs/handoff/06-business-rules.md.
 */
import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import { buildSeedState, STATE_VERSION } from "@/data/seed";
import { attentionItems, companyDeals, dealView, docStats, occupancy } from "./selectors";
import { migrate } from "./DataProvider";

const seed = buildSeedState();
const deal = (id: string) => seed.deals.find((d) => d.id === id)!;

describe("seed data integrity", () => {
  it("has the expected dataset size", () => {
    expect(seed.version).toBe(STATE_VERSION);
    expect(seed.buildings).toHaveLength(15);
    expect(seed.deals.length).toBeGreaterThanOrEqual(12);
  });

  it("uses unique ids", () => {
    for (const list of [seed.buildings, seed.organizations, seed.contacts, seed.deals, seed.dealBuildings, seed.documentRequests]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("has no dangling references", () => {
    const b = new Set(seed.buildings.map((x) => x.id));
    const o = new Set(seed.organizations.map((x) => x.id));
    const c = new Set(seed.contacts.map((x) => x.id));
    const d = new Set(seed.deals.map((x) => x.id));
    seed.dealBuildings.forEach((r) => (expect(b.has(r.buildingId)).toBe(true), expect(d.has(r.dealId)).toBe(true)));
    seed.ownerships.forEach((r) => (expect(b.has(r.buildingId)).toBe(true), expect(o.has(r.organizationId)).toBe(true)));
    seed.contacts.forEach((x) => expect(o.has(x.organizationId)).toBe(true));
    seed.deals.forEach((x) => (x.contacts ?? []).forEach((a) => expect(c.has(a.contactId)).toBe(true)));
    seed.communications.forEach((m) => m.contactIds.forEach((id) => expect(c.has(id)).toBe(true)));
  });

  it("gives every building the two baseline document placeholders", () => {
    seed.buildings.forEach((bl) => {
      const names = seed.documentRequests.filter((r) => r.buildingId === bl.id && r.isBaseline).map((r) => r.name);
      expect(names).toEqual(expect.arrayContaining(["Current facility license", "Floor plan"]));
    });
  });

  it("keeps deal-specific values off the building (a building can be in several deals)", () => {
    const seaside = seed.dealBuildings.filter((r) => r.buildingId === "bld_seaside");
    expect(seaside.length).toBeGreaterThan(1);
    expect(Object.keys(seed.buildings[0])).not.toContain("priceAllocation");
  });

  it("keeps CCN history as dated identifiers", () => {
    const brook = seed.buildings.find((x) => x.id === "bld_brookhaven")!;
    const ccns = brook.identifiers.filter((i) => i.type === "cms_ccn");
    expect(ccns.filter((i) => i.isCurrent)).toHaveLength(1);
    expect(ccns.some((i) => !i.isCurrent && i.effectiveTo)).toBe(true);
  });
});

describe("calculated fields", () => {
  it("occupancy = average daily census ÷ certified beds", () => {
    const b = seed.buildings.find((x) => x.id === "bld_maplegrove")!;
    expect(occupancy(b)).toBeCloseTo((b.averageDailyCensus.value / b.certifiedBeds.value) * 100);
  });

  it("deal price per bed = asking price ÷ total licensed beds; states and totals derive from buildings", () => {
    const v = dealView(seed, deal("deal_greatlakes"));
    const licensed = v.buildings.reduce((a, x) => a + x.building.licensedBeds.value, 0);
    expect(v.totalLicBeds).toBe(licensed);
    expect(v.totalBuildings).toBe(4);
    expect(v.pricePerBed).toBeCloseTo(deal("deal_greatlakes").askingPrice! / licensed);
    expect(v.states).toEqual(["IN", "MI", "OH"]);
  });

  it("manual overrides replace calculated states, buildings and beds", () => {
    const v = dealView(seed, { ...deal("deal_greatlakes"), statesOverride: ["TX"], totalBuildingsOverride: 9, totalLicBedsOverride: 900 });
    expect(v.states).toEqual(["TX"]);
    expect(v.totalBuildings).toBe(9);
    expect(v.pricePerBed).toBeCloseTo(deal("deal_greatlakes").askingPrice! / 900);
    expect(v.overridden).toEqual({ states: true, buildings: true, beds: true });
  });

  it("document completion counts only required items; missing = required and not yet received", () => {
    const docs = seed.documentRequests.filter((r) => r.buildingId === "bld_maplegrove");
    const s = docStats(docs);
    expect(s.required).toBe(docs.filter((d) => d.required).length);
    expect(s.missing).toBe(docs.filter((d) => d.required && ["not_requested", "requested", "rejected"].includes(d.status)).length);
    expect(s.pct).toBe(Math.round((s.requiredApproved / s.required) * 100));
  });

  it("attention items surface the missing baseline floor plan first among high priority", () => {
    const items = attentionItems(seed, "bld_maplegrove");
    expect(items.some((i) => i.title === "Missing: Floor plan" && i.severity === "high")).toBe(true);
    const order = { high: 0, medium: 1, low: 2 };
    expect(items.map((i) => order[i.severity])).toEqual([...items.map((i) => order[i.severity])].sort());
  });
});

describe("CRM roll-ups", () => {
  it("company deals include seller, buyer, broker and lender roles with $/bed", () => {
    const meridian = companyDeals(seed, "org_meridian");
    expect(meridian.find((r) => r.deal.id === "deal_greatlakes")!.role).toBe("Seller");
    expect(meridian.some((r) => r.role === "Buyer")).toBe(true);
    const calloway = companyDeals(seed, "org_calloway");
    expect(calloway.every((r) => r.role.includes("Broker"))).toBe(true);
    const gl = meridian.find((r) => r.deal.id === "deal_greatlakes")!;
    expect(gl.perBed).toBeCloseTo(gl.amount! / gl.beds);
  });
});

describe("saved-data migrations", () => {
  it("upgrades a version 9 save to the current version without losing edits", () => {
    const v9: AppState = JSON.parse(JSON.stringify(seed));
    v9.version = 9;
    v9.deals = v9.deals.map(({ dealApproverContactId: _a, milestoneFloor: _f, ...d }) => d);
    v9.buildings[0].name = "Edited name";
    const out = migrate(v9)!;
    expect(out.version).toBe(STATE_VERSION);
    expect(out.buildings[0].name).toBe("Edited name");
    expect(out.deals.find((d) => d.id === "deal_greatlakes")!.dealApproverContactId).toBe("ct_jellis");
  });

  it("refuses saves older than version 4 (they are reseeded)", () => {
    expect(migrate({ ...seed, version: 3 })).toBeNull();
  });
});
