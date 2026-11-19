const { chromium } = require("playwright");
const OUT = require("path").join(__dirname, "output");
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL || "http://localhost:5173";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1480, height: 1000 } });
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  const step = (s) => console.log("✓", s);
  const overall = async () => (await p.locator("text=/checklist items complete/").first().innerText()).trim();
  const pct = async () => (await p.locator("text=Overall deal progress").locator("xpath=following-sibling::div[1]/span[1]").innerText());
  const row = (title) => p.locator(`li[id^=ci-]:has(> button span:text-is("${title}"))`);
  const actAs = async (name) => { await p.click("[aria-label='Account menu']"); await p.click(`[role=menuitemradio]:has-text("${name}")`); await p.waitForTimeout(150); };
  const openItem = async (title) => { const r = row(title); if (!(await r.locator("div:text-is('Sign-off')").count())) await r.locator("> button").click(); return r; };

  // Migration v8 -> v9
  await p.goto(BASE + "/deals"); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector("h1");
  await p.evaluate(() => { const k = "owner-docket:prototype-state"; const s = JSON.parse(localStorage.getItem(k)); s.version = 8; s.deals = s.deals.map(({ checklist, phaseOverrides, ...d }) => d); s.deals[2].name += " (edited)"; localStorage.setItem(k, JSON.stringify(s)); });
  await p.reload(); await p.waitForSelector("h1");
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem("owner-docket:prototype-state")));
  step(`Migration v${st.version}: edit kept=${st.deals[2].name.endsWith("(edited)")}; checklist items GL=${st.deals.find((d) => d.id === "deal_greatlakes").checklist.length}`);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector("h1");

  // Riverside: Deal Sourced auto
  await p.goto(BASE + "/deals/deal_riverside/progress"); await p.waitForSelector("text=Overall deal progress");
  step(`Riverside start: ${await pct()} · ${await overall()}`);
  let r = await openItem("Deal Sourced");
  step(`Deal Sourced stages: ${(await r.locator("ol > li").allInnerTexts()).map((t) => t.split("\n")[0]).join(" | ")}`);
  await p.screenshot({ path: `${OUT}/p1-dealsourced.png` });
  await r.locator("input[placeholder^='Paste the data room link']").fill("https://odacquisitions.sharepoint.example/sites/deals/OD-2026-027");
  await r.locator("button:has-text('Link')").click();
  await p.waitForTimeout(400);
  step(`After data room link: row says "${(await r.locator("> button").innerText()).split("\n").slice(1, 3).join(" — ")}" · overall ${await pct()}`);
  // Upload doc + approve
  const fs = require("fs"); fs.writeFileSync(OUT + "/Datatape_OD-2026-027.xlsx", "mock");
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), r.locator("button:has-text('Upload documentation')").click()]);
  await fc.setFiles(OUT + "/Datatape_OD-2026-027.xlsx");
  await p.waitForTimeout(200);
  step(`Doc submitted: ${await r.locator("text=Awaiting approval").count() > 0}`);
  await actAs("Marcus Holloway");
  await r.locator("button:has-text('Approve & file')").click();
  await p.waitForTimeout(200);
  await actAs("Jordan Ellis");
  step(`Deal Sourced: ${(await r.locator("> button").innerText()).split("\n").slice(1, 3).join(" — ")} · overall ${await pct()}`);

  // Sub-items complete a stage (Capital Structuring stage 1)
  r = await openItem("Capital Structuring");
  const subs = r.locator("button[aria-label$=': todo']");
  const n = await subs.count();
  for (let i = 0; i < n; i++) { const nb = r.locator("button[aria-label$=': todo']").first(); const lbl = await nb.getAttribute("aria-label"); if (lbl.startsWith("Seller Debt") || lbl.startsWith("Earnout")) await r.locator(`button[aria-label="${lbl}"]`).locator("xpath=following-sibling::button").click(); else await nb.click(); }
  await p.waitForTimeout(150);
  step(`Capital: ${(await r.locator("> button").innerText()).split("\n").slice(1, 3).join(" — ")}`);

  // Skip a stage + bypass + restore
  r = await openItem("NDA");
  await r.locator("button:has-text('Skip stage')").click();
  await p.fill("[role=dialog] textarea", "Seller provided an executed NDA directly.");
  await p.click("[role=dialog] button:has-text('Skip stage')");
  await p.waitForTimeout(150);
  step(`NDA after skip: ${(await r.locator("> button").innerText()).split("\n").slice(1, 3).join(" — ")}`);
  const before = await pct();
  r = await openItem("Lease Term Sheet");
  await r.locator("button:has-text('Not needed for this deal')").click();
  await p.fill("[role=dialog] textarea", "Operator stays in place; no new lease.");
  await p.click("[role=dialog] button:has-text('Mark not needed')");
  await p.waitForTimeout(150);
  step(`Bypass Lease Term Sheet: overall ${before} → ${await pct()} · ${await overall()}`);
  await r.locator("button:has-text('Restore')").click();
  await p.waitForTimeout(150);
  step(`Restored: overall ${await pct()}`);

  // Phase panel manual item
  await p.click("button[aria-label='Critical Dates Set: not done']");
  step(`Phase override: ${await p.locator("button[aria-label='Critical Dates Set: done']").count()}`);
  await p.setViewportSize({ width: 1480, height: 2600 });
  await p.screenshot({ path: `${OUT}/p2-riverside.png` });
  await p.setViewportSize({ width: 1480, height: 1000 });

  // Third-party auto: assign a vendor on Overview
  await p.goto(BASE + "/deals/deal_riverside");
  await p.click("[aria-label='Assign Environmental']"); await p.keyboard.type("william"); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  await p.goto(BASE + "/deals/deal_riverside/progress"); await p.waitForSelector("text=Overall deal progress");
  r = await openItem("Order Third-Party Reports");
  step(`Engage auto after vendor assigned: ${(await r.locator("ol > li").nth(1).innerText()).split("\n").slice(0, 3).join(" ")}`);

  // Great Lakes: approve awaiting item; documents tab
  await p.goto(BASE + "/deals/deal_greatlakes/documents"); await p.waitForSelector("text=Deal file.");
  const filedBefore = await p.locator("tbody tr").count();
  await p.goto(BASE + "/deals/deal_greatlakes/progress"); await p.waitForSelector("text=Overall deal progress");
  step(`Great Lakes: ${await pct()} · ${await overall()}`);
  await p.click("button:has-text('Awaiting approval')");
  r = await openItem("Due Diligence Requests");
  await r.locator("button:has-text('Approve & file')").click(); await p.waitForTimeout(150);
  await actAs("Natalie Brooks");
  r = await openItem("Capital Structuring");
  await r.locator("textarea").fill("Need the signed term sheet, not the draft.");
  await r.locator("button:has-text('Request changes')").click(); await p.waitForTimeout(150);
  await actAs("Jordan Ellis");
  step(`After approve+request changes: ${await pct()} · ${await overall()}; Capital doc: ${await r.locator("text=Changes requested").count() > 0}`);
  await p.goto(BASE + "/deals/deal_greatlakes/documents"); await p.waitForSelector("text=Deal file.");
  step(`Filed docs ${filedBefore} → ${await p.locator("tbody tr").count()}`);
  await p.click("tbody tr >> nth=0 >> a:has-text('Due Diligence Requests')").catch(() => {});

  // PSA LOI on Bluegrass: approval completes the filing stage
  await p.goto(BASE + "/deals/deal_bluegrass/progress?item=psa_loi"); await p.waitForSelector("text=Overall deal progress"); await p.waitForTimeout(200);
  r = row("PSA LOI");
  for (let i = 0; i < 3; i++) { await r.locator("button:has-text('Complete stage')").first().click(); await p.waitForTimeout(80); }
  step(`PSA LOI before approval: ${(await r.locator("> button").innerText()).split("\n").slice(1, 3).join(" — ")}`);
  await actAs("Priya Raman");
  await r.getByRole("button", { name: "Approve", exact: true }).click(); await p.waitForTimeout(150);
  await actAs("Jordan Ellis");
  step(`PSA LOI after approval: ${(await r.locator("> button").innerText()).split("\n").slice(1, 3).join(" — ")}; filing stage: ${(await r.locator("ol > li").last().innerText()).split("\n").slice(0, 2).join(" ")}`);

  // Sunbelt: bypassed items + hand-off auto on AM
  await p.goto(BASE + "/deals/deal_sunbelt/progress"); await p.waitForSelector("text=Overall deal progress");
  step(`Sunbelt: ${await overall()}`);
  await p.click("button:has-text('Change stage')"); await p.click("[role=menuitem]:has-text('Transitioned to Asset Management')"); await p.waitForTimeout(400);
  r = await openItem("Hand Off to Asset Management");
  step(`Hand-off stage: ${(await r.locator("ol > li").first().innerText()).split("\n").slice(0, 3).join(" ")}`);
  await p.setViewportSize({ width: 1480, height: 1600 });
  await p.screenshot({ path: `${OUT}/p3-sunbelt.png` });

  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/deals/deal_greatlakes/progress?item=capital"); await m.waitForSelector("text=Overall deal progress"); await m.waitForTimeout(300);
  await m.screenshot({ path: `${OUT}/p4-mobile.png`, fullPage: true });
  step(`Mobile overflow: ${await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)}`);
  console.log("\nConsole errors:", errors.length ? errors : "none");
  await b.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n").slice(0, 6).join("\n")); process.exit(1); });
