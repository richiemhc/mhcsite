// Production-readiness audit of the built site.
import fs from "node:fs";
import path from "node:path";

const R = process.cwd();
const PAGES = ["index.html","about/index.html","expertise/index.html","team/index.html","portfolio/index.html","contact/index.html","terms-and-conditions-of-use/index.html"];
let problems = [];
const flag = (p, m) => problems.push(`[${p}] ${m}`);

for (const pg of PAGES) {
  const h = fs.readFileSync(path.join(R, pg), "utf8");
  // leftover build tokens / dead refs
  if (h.includes("@/")) flag(pg, "leftover @/ token");
  if (/\{\{[A-Z_]+\}\}/.test(h)) flag(pg, "leftover {{TOKEN}}");
  if (/merithillcapital\.com\/wp-|wp-content|wp-includes/.test(h)) flag(pg, "reference to old wp- path");
  // head essentials
  if (!/<html lang="en-US">/.test(h)) flag(pg, "missing/incorrect lang");
  if (!/<title>[^<]{5,}<\/title>/.test(h)) flag(pg, "missing title");
  const desc = h.match(/<meta name="description" content="([^"]*)"/);
  if (!desc || desc[1].length < 30) flag(pg, "weak/missing meta description");
  if (!/rel="canonical"/.test(h)) flag(pg, "missing canonical");
  if (!/<h1[ >]/.test(h) && pg !== "index.html") { /* some pages use h1 */ }
  // images missing alt
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
  imgs.forEach((img) => { if (!/\balt=/.test(img)) flag(pg, "img without alt: " + img.slice(0, 70)); });
  // multiple <main>?
  if ((h.match(/<main\b/g) || []).length !== 1) flag(pg, "expected exactly one <main>");
  // nav active state
  if (pg !== "index.html" && pg !== "terms-and-conditions-of-use/index.html" && !/aria-current="page"/.test(h)) flag(pg, "no active nav state");
  // heading order sanity: exactly one h1 on interior pages
  const h1s = (h.match(/<h1[ >]/g) || []).length;
  if (h1s !== 1) flag(pg, `h1 count = ${h1s} (expected 1)`);
}

// asset existence for css/js
for (const a of ["assets/css/styles.css","assets/js/main.js","assets/js/team-data.js","assets/img/us-map.svg"]) {
  if (!fs.existsSync(path.join(R, a))) flag("assets", "missing " + a);
}

// team data integrity
const tj = fs.readFileSync(path.join(R, "assets/js/team-data.js"), "utf8").replace(/^[\s\S]*?=\s*/, "").replace(/;\s*$/, "");
const team = JSON.parse(tj);
let teamN = Object.keys(team).length, photoMiss = 0;
for (const id in team) {
  for (const k of ["photo", "thumb"]) {
    const rel = (team[id][k] || "").replace(/^\.\.\//, "");
    if (rel && !fs.existsSync(path.join(R, rel))) { photoMiss++; flag("team", `missing ${k} for ${team[id].name}: ${rel}`); }
  }
}

console.log(`Pages audited: ${PAGES.length} | team members: ${teamN} | team photos missing: ${photoMiss}`);
console.log(`Problems: ${problems.length}`);
problems.forEach((p) => console.log("  - " + p));
if (!problems.length) console.log("  (none)");
