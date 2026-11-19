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
  await page.goto(BASE + "/buildings");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Owner type filter
  await page.click("button:has-text('Owner type')");
  await page.click("[role=menuitemcheckbox]:has-text('Bank')");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  step(`Owner type = Bank → ${await page.locator("tbody tr").count()} rows: ${await page.locator("tbody tr a").first().innerText()}`);
  await page.click("text=Clear all");

  await page.goto(BASE + "/buildings/bld_maplegrove");
  await page.waitForSelector("h1");
  step(`Header owner: ${(await page.locator("button:has-text('Owner Meridian')").innerText()).replace(/\n/g, " ")}`);
  await page.screenshot({ path: `${OUT}/c1-overview-top.png` });
  await page.locator("section:has-text('Photos')").first().scrollIntoViewIfNeeded();
  step(`Photos tiles: ${await page.locator("section:has(h3:text-is('Photos')) button.aspect-\\[4\\/3\\]").count()}`);

  // Upload photo
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAAp4AMDp6V0uwAAAABJRU5ErkJggg==", "base64");
  require("fs").writeFileSync(OUT + "/lobby_photo.png", png);
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.click("button:has-text('Add photos')")]);
  await fc.setFiles(OUT + "/lobby_photo.png");
  await page.waitForSelector("text=1 photo added");
  step("Photo uploaded");
  await page.click("text=Show all 8 photos");
  await page.locator("button:has-text('lobby photo')").click();
  await page.waitForSelector("[role=dialog] >> text=Set as cover");
  await page.click("[role=dialog] button:has-text('Set as cover')");
  await page.keyboard.press("Escape");
  step("Set uploaded photo as cover");

  // Owner tab
  await page.click("[role=tab]:has-text('Owner')");
  await page.waitForSelector("text=Current property owner");
  await page.setViewportSize({ width: 1480, height: 2100 });
  await page.screenshot({ path: `${OUT}/c2-owner-tab.png` });
  await page.setViewportSize({ width: 1480, height: 1000 });
  step(`Active deals rows: ${await page.locator("section:has(h3:text-is('Active deals')) tbody tr").count()}`);
  const pastBefore = await page.locator("section:has(h3:text-is('Past deals')) tbody tr").count();
  await page.click("section:has(h3:text-is('Past deals')) >> text=/Show \\d+ more/");
  step(`Past deals ${pastBefore} → ${await page.locator("section:has(h3:text-is('Past deals')) tbody tr").count()} after expand`);

  // Company type dropdown
  await page.click("[aria-label='Company type']");
  await page.click("[role=option]:has-text('REIT')");
  await page.waitForTimeout(200);
  step(`Company type now: ${await page.locator("[aria-label='Company type']").innerText()}`);

  // Edit contact (personal fields) + name required
  await page.click("section:has(h3:text-is('Contact')) button:has-text('Edit')");
  await page.waitForSelector("[role=dialog] >> text=Personal information");
  await page.screenshot({ path: `${OUT}/c3-edit-contact.png` });
  const name = page.locator("[role=dialog] label:has-text('Name *') + input");
  await name.fill("");
  await page.click("[role=dialog] button:has-text('Save contact')");
  await page.waitForSelector("text=Name is required.");
  step("Name validation shown");
  await name.fill("Robert J. Cole");
  await page.locator("[role=dialog] label:has-text('Personal email') + input").fill("rob.cole@personal.example");
  await page.click("[role=dialog] button:has-text('Save contact')");
  await page.waitForSelector("text=rob.cole@personal.example");
  step("Contact edited (personal email shown)");

  // Add roster contact
  await page.click("section:has(h3:text-is('Corporate roster')) button:has-text('Add contact')");
  await page.locator("[role=dialog] label:has-text('Name *') + input").fill("Nina Alvarez");
  await page.locator("[role=dialog] label:has-text('Title') + input").fill("VP, Dispositions");
  await page.click("[role=dialog] button:has-text('Add contact')");
  await page.waitForSelector("section:has(h3:text-is('Corporate roster')) >> text=Nina Alvarez");
  step(`Roster rows: ${await page.locator("section:has(h3:text-is('Corporate roster')) tbody tr").count()}`);

  // Edit company: logo-less, focus
  await page.click("button:has-text('Edit company')");
  await page.waitForSelector("[role=dialog] >> text=Investment focus");
  await page.screenshot({ path: `${OUT}/c4-edit-company.png` });
  await page.click("[role=dialog] button:has-text('Save company')");

  // Change owner → new bank
  await page.click("button:has-text('Change owner')");
  await page.fill("[role=dialog] input[placeholder='Search companies']", "Great Lakes Savings");
  await page.click("[role=dialog] >> text=Create a new company");
  await page.locator("[role=dialog] label:has-text('Company type') + button").click();
  await page.click("[role=option]:has-text('Bank')");
  await page.click("[role=dialog] button:has-text('Change owner')");
  await page.waitForSelector("h2:has-text('Great Lakes Savings')");
  step("Owner changed to new Bank company");
  await page.screenshot({ path: `${OUT}/c5-new-owner.png` });
  await page.reload();
  await page.waitForSelector("h2:has-text('Great Lakes Savings')");
  step("Owner change persists after reload");
  await page.click("[role=tab]:has-text('Overview')");
  await page.waitForTimeout(300);
  step(`Ownership history mentions Meridian: ${await page.locator("text=Meridian Healthcare Properties").count() > 0}`);

  // Building with no owner (manual create) → empty state
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/buildings/bld_prairieview/owner");
  await m.waitForSelector("text=Current property owner");
  await m.screenshot({ path: `${OUT}/c6-mobile-owner.png`, fullPage: true });
  step(`Mobile owner overflow: ${await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)}`);

  console.log("\nConsole errors:", errors.length ? errors : "none");
  await b.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n").slice(0, 6).join("\n")); process.exit(1); });
