// Assemble final HTML pages from src/layout.html + src/pages/*.html
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const R = process.cwd();
const layout = fs.readFileSync(path.join(R, "src/layout.html"), "utf8");

// asset version (content hash of css+js) for cache-busting
const hashSrc = fs.readFileSync(path.join(R, "assets/css/styles.css")) + fs.readFileSync(path.join(R, "assets/js/main.js"));
const V = crypto.createHash("sha1").update(hashSrc).digest("hex").slice(0, 8);

// LCP hero image to preload per page (relative to site root via @/)
const HERO_PRELOAD = {
  "home.html": "assets/img/storage_hallways.jpeg",
  "about.html": "assets/img/23-web-or-mls-DJI_20250107154046_0427_D-1024x576.jpg",
  "expertise.html": "assets/img/banner_expertise.jpg",
  "team.html": "assets/img/39-web-or-mls-DSC_1675-1536x1023.jpg",
  "portfolio.html": "assets/img/23-web-or-mls-DJI_20250107154046_0427_D-1024x576.jpg",
  "contact.html": "assets/img/contact-bg.jpg",
  "terms.html": "assets/img/blue_bricks-lg.png",
};

const PAGES = [
  { file: "home.html",      out: "index.html",                              active: "",          canon: "/",
    title: "Merit Hill Capital - Real Estate Investment Firm in New York",
    desc: "Merit Hill Capital is a woman-owned real estate investment firm focused on acquiring, owning, and managing self-storage facilities across the U.S." },
  { file: "about.html",     out: "about/index.html",                        active: "about",     canon: "/about/",
    title: "About Merit Hill Capital — Institutional Self-Storage Investor",
    desc: "Founded in 2016 by Liz Raun Schlesinger, Merit Hill Capital is a leading institutional self-storage investor with a disciplined, value-add approach." },
  { file: "expertise.html", out: "expertise/index.html",                    active: "expertise", canon: "/expertise/",
    title: "Self-Storage Investment Expertise — Merit Hill Capital",
    desc: "Why self-storage and how Merit Hill drives value: a needs-based asset class in a fragmented industry, with a proprietary evaluation and value-add process." },
  { file: "team.html",      out: "team/index.html",                         active: "team",      canon: "/team/",
    title: "Our Team — Merit Hill Capital Self-Storage",
    desc: "Meet the Merit Hill Capital team: experienced self-storage professionals dedicated to integrity, perseverance, and the success of our partners.",
    scripts: '<script src="@/assets/js/team-data.js"></script>' },
  { file: "portfolio.html", out: "portfolio/index.html",                    active: "portfolio", canon: "/portfolio/",
    title: "Self-Storage Portfolio — Merit Hill Capital",
    desc: "National reach, local expertise: Merit Hill Capital operates a diverse portfolio of 400+ self-storage properties across 39 states in the United States." },
  { file: "contact.html",   out: "contact/index.html",                      active: "contact",   canon: "/contact/",
    title: "Contact Merit Hill Capital — Self-Storage Investment",
    desc: "Contact Merit Hill Capital with questions or to sell your self-storage facility. Reach our Brooklyn, NY and Dallas, TX teams or email IR@merithillcapital.com." },
  { file: "terms.html",     out: "terms-and-conditions-of-use/index.html",  active: "",          canon: "/terms-and-conditions-of-use/",
    title: "Terms and Conditions of Use - Merit Hill Capital",
    desc: "Terms and Conditions of Use for the Merit Hill Capital website." },
];

// Display order of team members (matches the original merithillcapital.com/team grid).
// Integer-like object keys can't preserve order, so order is driven explicitly here.
const TEAM_ORDER = ["37","372","46","61","49","361","59","1163","1762","2249","2250","1637","2035","1760","2246","1725","1506","1505","1721","1507","2233","1131","2039","1129","294","363","1617","1503","1160","969","1729"];

// Build the team grid markup from the generated team data (keeps names/titles/photos in sync).
function buildTeamGrid() {
  const js = fs.readFileSync(path.join(R, "assets/js/team-data.js"), "utf8");
  const json = js.replace(/^[\s\S]*?=\s*/, "").replace(/;\s*$/, "");
  const data = JSON.parse(json);
  const ids = [...TEAM_ORDER.filter((id) => data[id]), ...Object.keys(data).filter((id) => !TEAM_ORDER.includes(id))];
  return ids.map((id) => [id, data[id]]).map(([id, d]) =>
    `        <button class="team-card reveal" data-member="${id}">
          <img class="team-card__photo" src="${d.thumb}" alt="${(d.name || "").replace(/"/g, "&quot;")}" loading="lazy" width="220" height="220">
          <span class="team-card__name">${d.name || ""}</span>
          <span class="team-card__title">${d.title || ""}</span>
        </button>`).join("\n");
}

let built = 0;
for (const pg of PAGES) {
  const depth = pg.out.split("/").length - 1;
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  let main = fs.readFileSync(path.join(R, "src/pages", pg.file), "utf8");
  if (pg.file === "team.html") main = main.replace("{{TEAM_GRID}}", buildTeamGrid());

  let html = layout
    .replace("{{MAIN}}", main)
    .replace(/\{\{TITLE\}\}/g, pg.title)
    .replace(/\{\{DESC\}\}/g, pg.desc)
    .replace(/\{\{CANON\}\}/g, pg.canon)
    .replace(/\{\{V\}\}/g, V)
    .replace("{{HEROPRELOAD}}", HERO_PRELOAD[pg.file]
      ? `  <link rel="preload" as="image" href="@/${HERO_PRELOAD[pg.file]}" fetchpriority="high">\n` : "")
    .replace("{{BODYSCRIPTS}}", pg.scripts || "");

  // active nav state
  if (pg.active) html = html.replace(`data-nav="${pg.active}"`, `data-nav="${pg.active}" aria-current="page"`);

  // resolve root-relative token
  html = html.split("@/").join(prefix);

  fs.mkdirSync(path.dirname(path.join(R, pg.out)), { recursive: true });
  fs.writeFileSync(path.join(R, pg.out), html);
  built++;
  console.log("built", pg.out);
}
console.log(`\n${built} pages built.`);

// sitemap.xml (canonical production domain)
const ORIGIN = "https://richiemhc.github.io/mhcsite";
const LASTMOD = new Date().toISOString().slice(0, 10);
const urls = PAGES.map((p) =>
  `  <url><loc>${ORIGIN}${p.canon}</loc><lastmod>${LASTMOD}</lastmod><changefreq>monthly</changefreq><priority>${p.canon === "/" ? "1.0" : "0.7"}</priority></url>`
).join("\n");
fs.writeFileSync(path.join(R, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log("sitemap.xml written");
