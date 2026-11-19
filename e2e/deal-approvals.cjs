const { chromium } = require("playwright");
const OUT = require("path").join(__dirname, "output");
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL || "http://localhost:5173";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1480, height: 1100 } });
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  const step = (s) => console.log("✓", s);
  const row = (t) => p.locator(`li[id^=ci-]:has(> button span:text-is("${t}"))`);
  const openItem = async (t) => { const r = row(t); if (!(await r.locator("div:text-is('Sign-off')").count())) await r.locator("> button").click(); return r; };
  const stageBadges = async () => (await p.locator("h1 + div").innerText()).replace(/\n/g, " ");
  const actAs = async (name) => { await p.click("[aria-label='Account menu']"); await p.click(`[role=menuitemradio]:has-text("${name}")`); await p.waitForTimeout(150); };

  // Migration v9 -> v10
  await p.goto(BASE + "/deals"); await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForSelector("h1");
  await p.evaluate(() => { const k = "owner-docket:prototype-state"; const s = JSON.parse(localStorage.getItem(k)); s.version = 9; s.deals = s.deals.map(({ dealApproverContactId, milestoneFloor, ...d }) => ({ ...d, checklist: d.checklist?.map((i) => ({ ...i, approverContactId: i.approverContactId ?? (d.contacts.find((c) => c.side === "buyer" && c.role === "team_lead") || {}).contactId })) })); s.deals[0].name += " (edited)"; localStorage.setItem(k, JSON.stringify(s)); });
  await p.reload(); await p.waitForSelector("h1");
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem("owner-docket:prototype-state")));
  const gl = st.deals.find((d) => d.id === "deal_greatlakes");
  step(`Migration v${st.version}: edit kept=${st.deals[0].name.endsWith("(edited)")}; GL deal approver=${gl.dealApproverContactId}; item overrides=${gl.checklist.filter((i) => i.approverContactId).map((i) => i.key).join(",")}; stages unchanged=${st.deals.find((d) => d.id === "deal_riverside").stage}`);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector("h1");

  // Approval restricted to assigned approver
  await p.goto(BASE + "/deals/deal_greatlakes/progress"); await p.waitForSelector("text=Deal approver");
  let r = await openItem("Capital Structuring");
  step(`Capital as Jordan: ${(await r.locator("text=/Only the assigned approver/").innerText()).slice(0, 90)}…`);
  await p.screenshot({ path: `${OUT}/a1-blocked.png` });
  await actAs("Natalie Brooks");
  r = await openItem("Capital Structuring");
  step(`Capital as Natalie: approve button=${await r.locator("button:has-text('Approve & file')").count()}`);
  await r.locator("button:has-text('Approve & file')").click(); await p.waitForTimeout(150);
  step(`Capital: ${(await r.locator("> button").innerText()).split("\n").slice(1, 3).join(" — ")}`);
  await actAs("Jordan Ellis");

  // Deal approver change + item override + apply to all (Riverside)
  await p.goto(BASE + "/deals/deal_riverside/progress"); await p.waitForSelector("text=Deal approver");
  step(`Riverside deal approver: ${await p.locator("[aria-label='Deal approver']").innerText()}`);
  r = await openItem("NDA");
  await r.locator("button:has-text('Deal approver')").click(); await p.keyboard.type("priya"); await p.keyboard.press("Enter"); await p.waitForTimeout(150);
  step(`NDA approver now: ${(await r.locator("text=Item-specific approver").count()) ? "item-specific" : "deal"}`);
  await p.click("[aria-label='Deal approver']"); await p.keyboard.type("jordan"); await p.keyboard.press("Enter"); await p.waitForTimeout(150);
  await p.click("button:has-text('Apply to all items')"); await p.waitForTimeout(150);
  step(`After apply to all: NDA uses deal approver=${await r.locator("text=/Uses the deal approver \\(Jordan Ellis\\)/").count() > 0}`);
  await p.setViewportSize({ width: 1480, height: 1500 });
  await p.screenshot({ path: `${OUT}/a2-approver.png` });
  await p.setViewportSize({ width: 1480, height: 1100 });

  // Auto-advance: complete BOE Review on Riverside (HLR → LOI Signed)
  await p.goto(BASE + "/deals/deal_riverside"); await p.waitForSelector("h1");
  await p.click("[aria-label='Assign Buyer Transaction Counsel']"); await p.keyboard.type("david morgan"); await p.keyboard.press("Enter"); await p.waitForTimeout(150);
  await p.goto(BASE + "/deals/deal_riverside/progress"); await p.waitForSelector("text=Deal approver");
  r = await openItem("PSA LOI");
  for (let i = 0; i < 2; i++) { await r.locator("button:has-text('Complete stage')").first().click(); await p.waitForTimeout(80); }
  r = await openItem("Capital Structuring");
  for (let i = 0; i < 5; i++) { const nb = r.locator("button[aria-label$=': todo']").first(); if (await nb.count()) await nb.click(); await p.waitForTimeout(60); }
  step(`Before last BOE item: ${await stageBadges()}`);
  await p.click("button[aria-label='Critical Dates Set: not done']"); await p.waitForTimeout(400);
  step(`After BOE complete: ${await stageBadges()}`);
  step(`Banner: ${(await p.locator("text=/automatically —/").innerText())}`);
  await p.screenshot({ path: `${OUT}/a3-advanced.png` });
  await p.click("button:has-text('Undo')"); await p.waitForTimeout(400);
  step(`After Undo: ${await stageBadges()} (no re-advance)`);

  // Skip LOI: Seaside — complete Full DD via overrides
  await p.goto(BASE + "/deals/deal_seaside/progress"); await p.waitForSelector("text=Deal approver");
  for (const t of ["Produce PSA and Other Key Docs", "Order Third Parties", "Funding Term Sheet Signed"]) { await p.click(`button[aria-label='${t}: not done']`); await p.waitForTimeout(120); }
  await p.waitForTimeout(300);
  step(`Seaside after Full DD: ${await stageBadges()}`);
  // Manual move back doesn't re-advance
  await p.click("button:has-text('Change stage')"); await p.click("[role=menuitem]:has-text('High-Level Review')"); await p.waitForTimeout(400);
  step(`Seaside after manual move back: ${await stageBadges()}`);

  // Auto-advance off
  await p.goto(BASE + "/deals/deal_bluegrass/progress"); await p.waitForSelector("text=Deal approver");
  await p.click("[aria-label='Auto-advance milestones']");
  for (const t of ["Produce PSA and Other Key Docs", "Order Third Parties", "Funding Term Sheet Signed"]) { const bt = p.locator(`button[aria-label='${t}: not done']`); if (await bt.count()) { await bt.click(); await p.waitForTimeout(100); } }
  await p.waitForTimeout(300);
  step(`Bluegrass with auto-advance off: ${await stageBadges()}`);

  // Closed → AM via Post Closing
  await p.goto(BASE + "/deals/deal_sunbelt/progress"); await p.waitForSelector("text=Deal approver");
  await p.click("button:has-text('Change stage')"); await p.click("[role=menuitem]:has-text('Deal Closed')"); await p.waitForTimeout(300);
  r = await openItem("Post Closing Follow Up");
  await r.locator("button:has-text('Not needed for this deal')").click();
  await p.fill("[role=dialog] textarea", "Handled by operator directly."); await p.click("[role=dialog] button:has-text('Mark not needed')"); await p.waitForTimeout(500);
  step(`Sunbelt after Post Closing resolved: ${await stageBadges()}`);

  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/deals/deal_greatlakes/progress?item=capital"); await m.waitForSelector("text=Deal approver"); await m.waitForTimeout(300);
  step(`Mobile overflow: ${await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)}`);
  console.log("\nConsole errors:", errors.length ? errors : "none");
  await b.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n").slice(0, 6).join("\n")); process.exit(1); });
