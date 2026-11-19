const { chromium } = require("playwright");
const OUT = require("path").join(__dirname, "output");
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL || "http://localhost:5173";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  const shot = (n, full = false) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
  const step = (s) => console.log("✓", s);

  await page.goto(BASE + "/buildings");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("text=Centralized facility intelligence");
  await shot("01-directory");
  const rowCount = await page.locator("tbody tr").count();
  step(`Directory loaded with ${rowCount} rows`);

  // Search
  await page.fill('input[placeholder^="Search name"]', "Maple");
  await page.waitForTimeout(200);
  step(`Search 'Maple' → ${await page.locator("tbody tr").count()} rows`);
  await page.fill('input[placeholder^="Search name"]', "");

  // Filter by state = KY
  await page.click("button:has-text('State')");
  await page.click("[role=menuitemcheckbox]:has-text('Kentucky')");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  step(`Filter KY → ${await page.locator("tbody tr").count()} rows`);
  await shot("02-directory-filtered");
  await page.click("text=Clear all");

  // Card view
  await page.click("[aria-label='Card view']");
  await page.waitForTimeout(200);
  await shot("03-directory-cards");
  await page.click("[aria-label='Table view']");

  // Open building
  await page.fill('input[placeholder^="Search name"]', "Maple");
  await page.click("tbody tr >> nth=0");
  await page.waitForSelector("h1:has-text('Maple Grove')");
  await page.fill; // noop
  await shot("04-overview", true);
  const docsBefore = await page.locator("text=required approved").first().locator("..").innerText();
  step(`Overview opened. Docs: ${docsBefore.replace(/\n/g, " ")}`);

  // Deal drawer
  await page.click("table >> text=Great Lakes Portfolio");
  await page.waitForSelector("[role=dialog] >> text=Buildings in this deal");
  await shot("05-deal-drawer");
  step("Deal preview drawer opened");
  await page.keyboard.press("Escape");

  // Tabs
  for (const [label, n] of [["CMS & Regulatory", "06-cms"], ["Property & Condition", "07-property"], ["Financials", "08-financials"], ["Site Visits", "09-site-visits"], ["Relationships", "10-relationships"], ["Activity", "11-activity"]]) {
    await page.click(`[role=tab]:has-text('${label}')`);
    await page.waitForTimeout(250);
    await shot(n, true);
    step(`Tab ${label}`);
  }

  // Documents: missing view, then review & approve PCA
  await page.click("[role=tab]:has-text('Documents')");
  await page.waitForSelector("text=required documents approved");
  await shot("12-documents", true);
  const progressBefore = await page.locator("text=required documents approved").locator("..").innerText();
  const allRows = await page.locator("tr[id^=doc-row]").count();
  await page.getByRole("button", { name: /^Missing\s*\d+$/ }).last().click();
  await page.waitForTimeout(200);
  step(`Missing view rows: ${await page.locator("tr[id^=doc-row]").count()} of ${allRows}; url=${page.url()}`);
  await page.getByRole("button", { name: /^All\s*\d+$/ }).click();
  await page.locator("#doc-row-bld_maplegrove_doc_pca").getByRole("button", { name: "Review", exact: true }).click();
  await page.waitForSelector("[role=dialog] >> text=Review decision");
  await shot("13-review-sheet");
  await page.fill("[role=dialog] textarea[placeholder^='Review comment']", "PCA reviewed; reserve table aligns with underwriting.");
  await page.click("[role=dialog] button:has-text('Approve')");
  await page.waitForSelector("[role=dialog] >> text=Approved by");
  step("Approved PCA");
  await shot("14-approved");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const progressAfter = await page.locator("text=required documents approved").locator("..").innerText();
  step(`Progress: '${progressBefore.split("\n")[0]}' → '${progressAfter.split("\n")[0]}'`);

  // Upload a file on a requested doc (floor plan)
  const fs = require("fs");
  const tmpFile = OUT + "/Maple_Grove_Floor_Plan.pdf";
  fs.writeFileSync(tmpFile, "%PDF-1.4\n%mock\n");
  await page.locator('#doc-row-bld_maplegrove_doc_floor_plan').click();
  await page.waitForSelector("[role=dialog] >> text=No file received");
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("[role=dialog] button:has-text('Upload file') >> nth=0")]);
  await chooser.setFiles(tmpFile);
  await page.waitForSelector("[role=dialog] >> text=Review decision");
  step("Uploaded floor plan → received, review panel shown");
  await page.keyboard.press("Escape");

  // Add document request
  await page.click("button:has-text('Add request')");
  await page.fill("input[placeholder^=\"e.g. Workers\"]", "Workers' compensation loss runs");
  await page.click("[role=dialog] button:has-text('Create request')");
  await page.waitForSelector("tr:has-text(\"Workers' compensation loss runs\")");
  step("Document request created");

  // Data room sync
  await page.click("button:has-text('Sync now')");
  await page.waitForTimeout(1500);
  step("Data room synced");

  // Back to overview — verify updated info
  await page.click("[role=tab]:has-text('Overview')");
  await page.waitForTimeout(300);
  const docsAfter = await page.locator("text=required approved").first().locator("..").innerText();
  step(`Overview docs now: ${docsAfter.replace(/\n/g, " ")}`);
  await shot("15-overview-after", true);

  // Add site visit
  await page.click("[role=tab]:has-text('Site Visits')");
  await page.click("button:has-text('Add site visit')");
  await page.fill("[role=dialog] textarea", "Follow-up walkthrough of east wing PTACs with operator maintenance lead.");
  await page.click("[role=dialog] button:has-text('Add observation')");
  await page.fill("[role=dialog] input[placeholder='What did you observe?']", "Two PTAC units non-functional in rooms 218 and 220.");
  await page.click("[role=dialog] button:has-text('Add task')");
  await page.fill("[role=dialog] input[placeholder='Task']", "Get replacement timeline from operator");
  await page.click("[role=dialog] button:has-text('Add a placeholder photo')");
  await shot("16-add-visit");
  await page.click("[role=dialog] button:has-text('Save site visit')");
  await page.waitForSelector("text=Follow-up walkthrough of east wing");
  step("Site visit added");

  // Edit building
  await page.click("button:has-text('Edit Building')");
  await page.waitForSelector("[role=dialog] >> text=Key facts & verification");
  await shot("17-edit");
  const adc = page.locator("[role=dialog] input[type=number]").nth(4);
  await adc.fill("108");
  await page.click("[role=dialog] button:has-text('Save changes')");
  await page.waitForTimeout(300);
  step("Edited building ADC");

  // Add to deal
  await page.click("button:has-text('Add to Deal')");
  await page.click("[role=dialog] button:has-text('Bluegrass Trio')");
  await page.click("[role=dialog] button:has-text('Add to deal') >> nth=-1");
  await page.waitForTimeout(300);
  step(`Deals rows on overview: ${await page.locator("text=Bluegrass Trio").count()}`);

  // Add building flow
  await page.goto(BASE + "/buildings");
  await page.click("button:has-text('Add Building')");
  await page.fill("[role=dialog] input[placeholder^='e.g.']", "Gulf");
  await page.click("[role=dialog] button:has-text('Gulf Breeze Post-Acute')");
  await page.click("[role=dialog] button:has-text('Review details')");
  await shot("18-add-review");
  await page.click("[role=dialog] button:has-text('Create building')");
  await page.waitForSelector("h1:has-text('Gulf Breeze Post-Acute')");
  step("New building created");
  await page.reload();
  await page.waitForSelector("h1:has-text('Gulf Breeze Post-Acute')");
  step("New building persists after refresh");
  await shot("19-new-building", true);
  await page.click("[role=tab]:has-text('Documents')");
  await page.waitForTimeout(200);
  step(`New building docs rows: ${await page.locator("tr[id^=doc-row]").count()}`);
  await page.click("[role=tab]:has-text('Financials')");
  await shot("20-empty-financials");

  // Manual add
  await page.goto(BASE + "/buildings");
  await page.click("button:has-text('Add Building')");
  await page.click("[role=dialog] button:has-text('Create manually')");
  await page.fill("[role=dialog] input[placeholder='e.g. Oak Hollow Assisted Living']", "Oak Hollow Assisted Living");
  await page.locator("[role=dialog] label:has-text('City *') + input").fill("Columbus");
  await page.locator("[role=dialog] label:has-text('State *') + button").click();
  await page.click("[role=option]:has-text('Ohio')");
  await page.locator("[role=dialog] label:has-text('Units / beds *') + input").fill("64");
  await page.click("[role=dialog] button:has-text('Review details')");
  await page.click("[role=dialog] button:has-text('Create building')");
  await page.waitForSelector("h1:has-text('Oak Hollow')");
  step("Manual building created");
  await page.click("[role=tab]:has-text('CMS & Regulatory')");
  await shot("21-alf-cms-empty");

  // Global search
  await page.click("input[placeholder^='Search buildings']");
  await page.keyboard.type("155733");
  await page.waitForTimeout(200);
  await shot("22-global-search");
  await page.keyboard.press("Enter");
  await page.waitForSelector("h1:has-text('Brookhaven')");
  step("Global search by CCN works");

  // Placeholder + settings
  await page.click("nav >> text=Organizations");
  await page.waitForSelector("text=Planned module");
  step("Placeholder page");
  await page.goto(BASE + "/buildings/does-not-exist");
  await page.waitForSelector("text=Building not found");
  step("Not found state");

  // Mobile
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  m.on("pageerror", (e) => errors.push("M " + e.message));
  await m.goto(BASE + "/buildings/bld_maplegrove");
  await m.waitForSelector("h1");
  await m.screenshot({ path: `${OUT}/23-mobile-overview.png`, fullPage: true });
  await m.goto(BASE + "/buildings");
  await m.screenshot({ path: `${OUT}/24-mobile-directory.png` });
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  step(`Mobile horizontal overflow: ${overflow}`);

  console.log("\nConsole errors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
