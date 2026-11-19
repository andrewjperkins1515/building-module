const { chromium } = require("playwright");
const OUT = require("path").join(__dirname, "output");
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL || "http://localhost:5173";
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1480, height: 1000 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  const step = (s) => console.log("✓", s);

  // Migration v6 -> v7 keeps user edits
  await page.goto(BASE + "/deals");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("text=Acquisition pipeline");
  await page.evaluate(() => {
    const k = "owner-docket:prototype-state";
    const s = JSON.parse(localStorage.getItem(k));
    s.version = 6;
    s.deals = s.deals.map(({ dealKind, assetClass, sourceOrgId, sourceContactId, newOperatorOrgId, jvPartnerOrgId, jvPct, dataRoomUrl, contacts, buyerDistribution, sellerDistribution, reports, progress, ...d }) => d);
    s.contacts = s.contacts.filter((c) => !["ct_jellis", "ct_ahartwell", "ct_rbenson"].includes(c.id));
    s.deals[0].name = s.deals[0].name + " (edited)";
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForSelector("text=Acquisition pipeline");
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("owner-docket:prototype-state")));
  const gl = st.deals.find((d) => d.id === "deal_greatlakes");
  step(`Migration v${st.version}: edit kept=${st.deals[0].name.endsWith("(edited)")}, GL contacts=${gl.contacts.length}, reports=${gl.reports.length}, progress=${gl.progress.length}, Jordan contact restored=${st.contacts.some((c) => c.id === "ct_jellis")}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("text=Acquisition pipeline");

  step(`Board cards: ${await page.locator("a[href^='/deals/deal_']").count()}`);
  await page.screenshot({ path: `${OUT}/d1-board.png` });
  await page.click("[aria-label='Table view']");
  await page.waitForTimeout(150);
  step(`Table rows (active): ${await page.locator("tbody tr").count()}`);
  await page.click("button[role=switch]");
  await page.click("button:has-text('Status')");
  for (const s of ["Closed", "Dead", "Abandoned"]) await page.click(`[role=menuitemcheckbox]:has-text('${s}')`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  step(`All deals incl. comps: ${await page.locator("tbody tr").count()}`);
  await page.screenshot({ path: `${OUT}/d2-table.png` });

  // Open Great Lakes
  await page.goto(BASE + "/deals/deal_greatlakes");
  await page.waitForSelector("h1:has-text('Great Lakes Portfolio')");
  await page.setViewportSize({ width: 1480, height: 3000 });
  await page.screenshot({ path: `${OUT}/d3-overview.png` });
  await page.setViewportSize({ width: 1480, height: 1000 });
  const pctBefore = await page.locator("text=Deal progress").locator("..").innerText();
  step(`Progress card: ${pctBefore.replace(/\n/g, " ")}`);
  step(`Summary price/bed: ${await page.locator("dt:has-text('Asking price per bed') + dd").innerText()} | beds ${await page.locator("dt:has-text('Total licensed beds') + dd").innerText()} | states ${(await page.locator("dt:has-text('State(s)') + dd").innerText()).replace(/\n/g, ",")}`);
  step(`Buildings rows: ${await page.locator("section:has(h3:text-is('Buildings')) tbody tr").count()}`);

  // Links: source contact, building
  await page.click("dd >> a:has-text('Helen Walsh')");
  await page.waitForSelector("h1:has-text('Helen Walsh')");
  step("Source contact links to contact record");
  await page.goBack();
  await page.click("section:has(h3:text-is('Buildings')) >> a:has-text('Maple Grove')");
  await page.waitForSelector("h1:has-text('Maple Grove')");
  step("Building links to building record");
  await page.goBack();
  await page.waitForSelector("h1:has-text('Great Lakes')");

  // Assign buyer support (contact picker) on Riverside (HLR)
  await page.goto(BASE + "/deals/deal_riverside");
  await page.waitForSelector("h1:has-text('Riverside')");
  await page.click("[aria-label='Assign Buyer In-House Counsel']");
  await page.keyboard.type("natalie");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const row = page.locator("tr:has-text('Buyer In-House Counsel')");
  step(`Autofill: ${(await row.innerText()).replace(/\s+/g, " ")}`);
  // Report status edit
  await page.locator("[aria-label='Environmental status']").click();
  await page.getByRole("option", { name: "Ordered", exact: true }).click();
  await page.waitForTimeout(100);
  step(`Report status now: ${await page.locator("[aria-label='Environmental status']").innerText()}`);
  // Distribution list
  await page.locator("section:has(h3:has-text('Deal contacts (Buyer)')) textarea").fill("ic@odacquisitions.example; bad-address");
  await page.locator("h1").click();
  step(`Distribution validation: ${await page.locator("section:has(h3:has-text('Deal contacts (Buyer)')) >> text=/invalid/").innerText()}`);

  // Progress roll-up
  await page.getByRole("button", { name: /Deal progress/ }).click();
  await page.waitForSelector("text=Overall deal progress");
  step(`Progress tab: ${await page.locator("text=/checklist items complete/").first().innerText()}`);
  await page.setViewportSize({ width: 1480, height: 1700 });
  await page.screenshot({ path: `${OUT}/d4-progress.png` });
  await page.setViewportSize({ width: 1480, height: 1000 });

  // Stage change
  await page.click("button:has-text('Change stage')");
  await page.click("[role=menuitem]:has-text('LOI Signed')");
  await page.waitForTimeout(150);
  step(`Stage after move: ${await page.locator("h1 + div").innerText().then((t) => t.replace(/\n/g, " "))}`);

  // New deal
  await page.goto(BASE + "/deals");
  await page.click("button:has-text('New Deal')");
  await page.click("[role=dialog] button:has-text('Create deal')");
  step(`Validation: ${await page.locator("text=Deal name is required.").count()}`);
  await page.fill("[role=dialog] input[placeholder='e.g. Hoosier Two-Pack']", "Prairie View REO");
  await page.fill("[role=dialog] input[placeholder^='Search buildings']", "prairie");
  await page.click("[role=dialog] label:has-text('Prairie View Nursing Home')");
  await page.waitForTimeout(100);
  step(`Seller defaulted: ${await page.locator("[role=dialog] label:has-text('Seller (current owner)') + button").innerText()}`);
  await page.click("[role=dialog] button:has-text('Create deal')");
  await page.waitForSelector("h1:has-text('Prairie View REO')");
  step(`Created ${await page.locator("h1 >> xpath=preceding-sibling::div").innerText().then((t) => t.split("·")[0].trim())}; progress ${await page.locator("text=Deal progress").locator("..").innerText().then((t) => t.split("\n")[1])}`);
  await page.reload();
  await page.waitForSelector("h1:has-text('Prairie View REO')");
  step("New deal persists after reload");

  // Building page → deal preview → open record
  await page.goto(BASE + "/buildings/bld_bluegrass");
  await page.click("table >> text=Bluegrass Trio");
  await page.click("text=Open deal record");
  await page.waitForSelector("h1:has-text('Bluegrass Trio')");
  step("Building → deal preview → deal record");

  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/deals/deal_greatlakes");
  await m.waitForSelector("h1");
  await m.screenshot({ path: `${OUT}/d5-mobile.png` });
  const ov1 = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await m.goto(BASE + "/deals");
  await m.waitForSelector("h1");
  step(`Mobile overflow: record=${ov1} list=${await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)}`);
  console.log("\nConsole errors:", errors.length ? errors : "none");
  await b.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n").slice(0, 6).join("\n")); process.exit(1); });
