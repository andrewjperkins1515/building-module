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

  // Migration: simulate a saved v4 state with a user edit and no contact types
  await page.goto(BASE + "/buildings");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("text=Centralized facility intelligence");
  await page.evaluate(() => {
    const k = "owner-docket:prototype-state";
    const s = JSON.parse(localStorage.getItem(k));
    s.version = 4;
    s.contacts = s.contacts.map(({ contactType, sectors, ...c }) => c);
    s.buildings[0].name = s.buildings[0].name + " (edited)";
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.goto(BASE + "/contacts");
  await page.waitForSelector("h1:has-text('Contacts')");
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("owner-docket:prototype-state")));
  step(`Migration: version=${kept.version}, edit kept=${kept.buildings[0].name.endsWith("(edited)")}, all typed=${kept.contacts.every((c) => c.contactType && c.sectors?.length)}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("tbody tr");

  step(`Contacts listed: ${await page.locator("tbody tr").count()}`);
  await page.screenshot({ path: `${OUT}/k1-contacts.png` });

  // Filters
  await page.click("button:has-text('Contact type')");
  await page.click("[role=menuitemcheckbox]:has-text('Broker')");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  step(`Type=Broker → ${await page.locator("tbody tr").count()}`);
  await page.click("text=Clear all");
  await page.click("button:has-text('Sector')");
  await page.click("[role=menuitemcheckbox]:has-text('Memory Care Facility')");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  step(`Sector=Memory Care → ${await page.locator("tbody tr").count()}`);
  await page.click("text=Clear all");
  await page.fill("input[placeholder^='Search name, company']", "meridian");
  await page.waitForTimeout(150);
  step(`Search 'meridian' → ${await page.locator("tbody tr").count()}`);

  // Open record
  await page.click("tbody tr:has-text('Robert Cole')");
  await page.waitForSelector("h1:has-text('Robert Cole')");
  await page.setViewportSize({ width: 1480, height: 1900 });
  await page.screenshot({ path: `${OUT}/k2-contact-detail.png` });
  await page.setViewportSize({ width: 1480, height: 1000 });
  step(`Detail: active deals ${await page.locator("section:has(h3:text-is('Active deals')) tbody tr").count()}, past ${await page.locator("section:has(h3:text-is('Past deals')) tbody tr").count()}, colleagues ${await page.locator("section:has(h3:text-is('Associated people')) li").count()}, buildings ${await page.locator("section:has(h3:text-is('Related buildings')) li").count()}`);

  // Colleague navigation
  await page.click("section:has(h3:text-is('Associated people')) >> text=Linda Park");
  await page.waitForSelector("h1:has-text('Linda Park')");
  step("Navigated to colleague");

  // Edit: contact type + sector
  await page.click("button:has-text('Edit contact')");
  await page.waitForSelector("[role=dialog] >> text=Classification");
  await page.screenshot({ path: `${OUT}/k3-edit.png` });
  await page.locator("[role=dialog] label:has-text('Contact type') + button").click();
  await page.click("[role=option]:has-text('Vendor (Operating)')");
  await page.click("[role=dialog] label:has-text('Independent Living')");
  await page.click("[role=dialog] button:has-text('Save contact')");
  await page.waitForTimeout(250);
  step(`After edit badges: ${(await page.locator("h1 >> xpath=../../div[2]").innerText()).replace(/\n/g, " | ")}`);

  // Tags inline
  await page.click("button:has-text('Add tags'), button:has-text('Edit tags')");
  await page.fill("input[placeholder='Add tag']", "Conference contact");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  step(`Tag added: ${await page.locator("text=Conference contact").count() > 0}`);

  // New contact with new company
  await page.goto(BASE + "/contacts");
  await page.click("button:has-text('Add Contact')");
  await page.click("[role=dialog] button:has-text('Add contact')");
  step(`Validation: name=${await page.locator("text=Name is required.").count()} company=${await page.locator("text=Choose or create a company.").count()}`);
  await page.locator("[role=dialog] label:has-text('Company *') + button").click();
  await page.click("[role=option]:has-text('+ New company')");
  await page.fill("[role=dialog] input[placeholder='New company name']", "Granite Peak Capital");
  await page.locator("[role=dialog] label:has-text('Name *') + input").fill("Owen Price");
  await page.locator("[role=dialog] label:has-text('Title') + input").fill("Partner");
  await page.click("[role=dialog] button:has-text('Add contact')");
  await page.waitForSelector("h1:has-text('Owen Price')");
  step("Created contact + new company → on record page");
  await page.reload();
  await page.waitForSelector("h1:has-text('Owen Price')");
  step("New contact persists after reload");

  // Delete
  await page.click("[aria-label='More actions']");
  await page.click("text=Delete contact");
  await page.click("[role=dialog] button:has-text('Delete contact')");
  await page.waitForSelector("h1:has-text('Contacts')");
  step(`Deleted; Owen present: ${await page.locator("text=Owen Price").count()}`);

  // Links from building owner tab + global search
  await page.goto(BASE + "/buildings/bld_maplegrove/owner");
  await page.click("section:has(h3:text-is('Corporate roster')) >> text=Jason Simmons");
  await page.waitForSelector("h1:has-text('Jason Simmons')");
  step("Roster link opens contact record");
  await page.click("input[placeholder^='Search buildings']");
  await page.keyboard.type("Helen");
  await page.waitForTimeout(200);
  await page.keyboard.press("Enter");
  await page.waitForSelector("h1:has-text('Helen Walsh')");
  step(`Global search → Helen Walsh (broker) deals: ${await page.locator("section:has(h3:text-is('Active deals')) tbody tr").count()} active`);

  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/contacts/ct_rcole");
  await m.waitForSelector("h1");
  await m.screenshot({ path: `${OUT}/k4-mobile.png`, fullPage: true });
  await m.goto(BASE + "/contacts");
  step(`Mobile overflow: ${await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)}`);
  console.log("\nConsole errors:", errors.length ? errors : "none");
  await b.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n").slice(0, 6).join("\n")); process.exit(1); });
