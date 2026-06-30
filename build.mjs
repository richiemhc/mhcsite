// Assemble final HTML pages from src/layout.html + src/pages/*.html
import fs from "node:fs";
import path from "node:path";

const R = process.cwd();
const layout = fs.readFileSync(path.join(R, "src/layout.html"), "utf8");

const PAGES = [
  { file: "home.html",      out: "index.html",                              active: "",          canon: "/",
    title: "Merit Hill Capital - Real Estate Investment Firm in New York",
    desc: "Merit Hill Capital is a woman-owned real estate investment firm focused on acquiring, owning, and managing self-storage facilities across the U.S." },
  { file: "about.html",     out: "about/index.html",                        active: "about",     canon: "/about/",
    title: "About - Merit Hill Capital",
    desc: "Founded in 2016 by Liz Raun Schlesinger, Merit Hill Capital is a leading institutional self-storage investor." },
  { file: "expertise.html", out: "expertise/index.html",                    active: "expertise", canon: "/expertise/",
    title: "Expertise - Merit Hill Capital",
    desc: "Setting the standard in self-storage: a needs-based business in a fragmented, inefficient industry." },
  { file: "team.html",      out: "team/index.html",                         active: "team",      canon: "/team/",
    title: "Team - Merit Hill Capital",
    desc: "The Merit Hill advantage: an experienced team dedicated to integrity, perseverance, and the success of our partners.",
    scripts: '<script src="@/assets/js/team-data.js"></script>' },
  { file: "portfolio.html", out: "portfolio/index.html",                    active: "portfolio", canon: "/portfolio/",
    title: "Portfolio - Merit Hill Capital",
    desc: "National reach, local expertise: a diverse portfolio of self-storage assets across the United States." },
  { file: "contact.html",   out: "contact/index.html",                      active: "contact",   canon: "/contact/",
    title: "Contact - Merit Hill Capital",
    desc: "Questions? Interested in selling your facility? Contact Merit Hill Capital." },
  { file: "terms.html",     out: "terms-and-conditions-of-use/index.html",  active: "",          canon: "/terms-and-conditions-of-use/",
    title: "Terms and Conditions of Use - Merit Hill Capital",
    desc: "Terms and Conditions of Use for the Merit Hill Capital website." },
];

// Build the team grid markup from the generated team data (keeps names/titles/photos in sync).
function buildTeamGrid() {
  const js = fs.readFileSync(path.join(R, "assets/js/team-data.js"), "utf8");
  const json = js.replace(/^[\s\S]*?=\s*/, "").replace(/;\s*$/, "");
  const data = JSON.parse(json);
  return Object.entries(data).map(([id, d]) =>
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
const ORIGIN = "https://merithillcapital.com";
const urls = PAGES.map((p) =>
  `  <url><loc>${ORIGIN}${p.canon}</loc><changefreq>monthly</changefreq><priority>${p.canon === "/" ? "1.0" : "0.7"}</priority></url>`
).join("\n");
fs.writeFileSync(path.join(R, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log("sitemap.xml written");
