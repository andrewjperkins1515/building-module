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

  // Migration v5 -> v6 keeps edits
  await page.goto(BASE + "/contacts");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("tbody tr");
  await page.evaluate(() => {
    const k = "owner-docket:prototype-state";
    const s = JSON.parse(localStorage.getItem(k));
    s.version = 5; delete s.communications;
    s.contacts[0].title = s.contacts[0].title + " (edited)";
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForSelector("tbody tr");
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("owner-docket:prototype-state")));
  step(`Migration: v${st.version}, comms=${st.communications.length}, edit kept=${st.contacts[0].title.endsWith("(edited)")}`);
  const per = {}; st.communications.forEach((m) => m.contactIds.forEach((id) => (per[id] = (per[id] || 0) + 1)));
  step(`Contacts with no communications: ${st.contacts.filter((c) => !per[c.id]).length} of ${st.contacts.length}`);

  await page.goto(BASE + "/contacts/ct_hwalsh");
  await page.waitForSelector("h1:has-text('Helen Walsh')");
  step(`Header: ${await page.locator("text=/Last contacted/").innerText()}`);
  await page.click("[role=tab]:has-text('Communications')");
  await page.waitForSelector("text=Simulated sync");
  step(`URL: ${page.url()}`);
  await page.setViewportSize({ width: 1480, height: 1300 });
  await page.screenshot({ path: `${OUT}/m1-comms.png` });
  await page.setViewportSize({ width: 1480, height: 1000 });
  const threads = await page.locator("ul.divide-y > li > button").count();
  step(`Threads listed: ${threads}`);
  // Select second thread
  await page.locator("ul.divide-y > li > button").nth(1).click();
  step(`Reading: ${await page.locator("h2").first().innerText()} (${await page.locator("article").count()} messages)`);
  // Filters
  await page.click("button:has-text('Calls')");
  step(`Calls filter → ${await page.locator("ul.divide-y > li > button").count()}`);
  await page.click("button:has-text('All')");
  await page.fill("input[placeholder^='Search subject']", "offering");
  await page.waitForTimeout(150);
  step(`Search 'offering' → ${await page.locator("ul.divide-y > li > button").count()}`);
  await page.fill("input[placeholder^='Search subject']", "");

  // Log a call
  await page.click("button:has-text('Log communication')");
  await page.fill("[role=dialog] input[placeholder^='e.g. Call']", "Call — Great Lakes timing");
  await page.fill("[role=dialog] textarea", "Helen expects final bids next week; seller still focused on certainty.");
  await page.click("[role=dialog] button:has-text('Log call')");
  await page.waitForTimeout(300);
  step(`After log, first thread: ${await page.locator("ul.divide-y > li > button").first().innerText().then((t) => t.split("\n").slice(0, 3).join(" | "))}`);
  await page.reload();
  await page.waitForSelector("text=Simulated sync");
  step(`Logged call persists: ${await page.locator("text=Call — Great Lakes timing").count() > 0}`);

  // Contact with no deals/buildings still has emails
  await page.goto(BASE + "/contacts/ct_ebrooks/communications");
  await page.waitForSelector("text=Simulated sync");
  step(`Erin Brooks threads: ${await page.locator("ul.divide-y > li > button").count()}`);

  // Mobile
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/contacts/ct_rcole/communications");
  await m.waitForSelector("text=Simulated sync");
  await m.locator("ul.divide-y > li > button").first().click();
  await m.waitForSelector("text=All communications");
  await m.screenshot({ path: `${OUT}/m2-mobile.png`, fullPage: true });
  step(`Mobile reading pane; overflow=${await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)}`);
  console.log("\nConsole errors:", errors.length ? errors : "none");
  await b.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n").slice(0, 5).join("\n")); process.exit(1); });
