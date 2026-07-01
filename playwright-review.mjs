// Automated UI review with Playwright. Run against the local preview.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:8801";
const SHOT = process.argv[2] || ".";
const PAGES = [
  { path: "/", name: "home" },
  { path: "/about/", name: "about" },
  { path: "/expertise/", name: "expertise" },
  { path: "/team/", name: "team" },
  { path: "/portfolio/", name: "portfolio" },
  { path: "/contact/", name: "contact" },
  { path: "/terms-and-conditions-of-use/", name: "terms" },
];
const results = [];
const log = (s) => { console.log(s); };
let failures = 0;
const check = (cond, label, detail = "") => {
  if (cond) log(`   PASS  ${label}`);
  else { log(`   FAIL  ${label} ${detail}`); failures++; }
  return cond;
};

const browser = await chromium.launch();

// ---- Per-page: console errors, failed requests, structure, screenshots (desktop) ----
for (const pg of PAGES) {
  log(`\n== ${pg.name} (${pg.path}) ==`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const consoleErrors = [], failedReqs = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
  page.on("response", (r) => { if (r.status() >= 400) failedReqs.push(`${r.status()} ${r.url()}`); });

  await page.goto(BASE + pg.path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  check(consoleErrors.length === 0, "no console errors", consoleErrors.join(" | "));
  check(failedReqs.length === 0, "no failed (4xx/5xx) requests", failedReqs.join(" | "));
  const h1 = await page.locator("h1").count();
  check(h1 === 1, `exactly one <h1> (got ${h1})`);
  check(await page.locator("header.site-header").isVisible(), "header visible");
  check(await page.locator("footer.site-footer").isVisible(), "footer visible");
  check(await page.locator('a[href^="mailto:IR@merithillcapital.com"]').count() > 0, "footer email link present");

  // hero video pages
  if (["home", "about", "portfolio"].includes(pg.name)) {
    const v = page.locator("video.hero__media").first();
    const t = await v.evaluate((el) => el.currentTime);
    const paused = await v.evaluate((el) => el.paused);
    check(t > 0 && !paused, `hero video playing under reduced-motion (t=${t.toFixed(2)}, paused=${paused})`);
    check(await page.locator(".hero__videobtn").count() > 0, "hero video has pause control");
  }

  await page.screenshot({ path: `${SHOT}/pw-${pg.name}.png`, fullPage: true });
  await ctx.close();
}

// ---- Home specifics ----
log("\n== home: components ==");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  check(await page.locator(".feature").count() === 5, "5 investment-approach cards");
  check(await page.locator(".carousel--props .prop-card").count() === 3, "3 featured-investment cards");
  await ctx.close();
}

// ---- Team: grid + modal ----
log("\n== team: grid + modal ==");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/team/", { waitUntil: "domcontentloaded" });
  const cards = await page.locator(".team-card").count();
  check(cards === 33, `33 team cards (got ${cards})`);
  check((await page.getByText(/Kaitlyn|Colton/).count()) === 0, "Kaitlyn & Colton removed");
  await page.locator(".team-card").first().click();
  await page.waitForTimeout(500);
  const modal = page.locator("#teamModal");
  check(await modal.evaluate((el) => el.classList.contains("open")), "modal opens on card click");
  check((await page.locator(".modal__name").innerText()).length > 0, "modal shows a name");
  check((await page.locator(".modal__bio").innerText()).length > 20, "modal shows bio text");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check(!(await modal.evaluate((el) => el.classList.contains("open"))), "modal closes on Escape");
  await ctx.close();
}

// ---- Mobile: hamburger menu ----
log("\n== mobile: nav drawer ==");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  check(await page.locator(".nav-toggle").isVisible(), "hamburger visible on mobile");
  check(!(await page.locator("#mobileNav").isVisible()), "drawer hidden initially");
  await page.locator(".nav-toggle").click();
  await page.waitForTimeout(500);
  check(await page.locator("#mobileNav").isVisible(), "drawer opens on tap");
  await page.locator(".mobile-nav__close").click();
  await page.waitForTimeout(500);
  check(!(await page.locator("#mobileNav").isVisible()), "drawer closes");
  await page.screenshot({ path: `${SHOT}/pw-home-mobile.png`, fullPage: true });
  await page.goto(BASE + "/team/", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: `${SHOT}/pw-team-mobile.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
log(`\n================ ${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"} ================`);
process.exit(failures === 0 ? 0 : 1);
