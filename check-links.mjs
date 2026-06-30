import fs from "node:fs";
import path from "node:path";

const pages = [
  "index.html", "about/index.html", "expertise/index.html",
  "team/index.html", "portfolio/index.html", "contact/index.html",
  "terms-and-conditions-of-use/index.html",
];
const missing = new Set();
let checked = 0;
for (const pg of pages) {
  const h = fs.readFileSync(pg, "utf8").replace(/\\\//g, "/");
  const dir = path.posix.dirname(pg);
  const re = /(?:src|href)=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(h))) {
    let u = m[1];
    if (/^(https?:|mailto:|tel:|#|data:|\/\/|javascript:)/.test(u)) continue;
    u = u.split("?")[0].split("#")[0];
    if (!u) continue;
    let local = u.startsWith("/") ? u.slice(1) : path.posix.normalize(path.posix.join(dir, u));
    if (local.endsWith("/")) local += "index.html";
    checked++;
    if (!fs.existsSync(local)) missing.add(local + "   (in " + pg + ")");
  }
}
console.log("checked refs:", checked);
console.log("missing local files:", missing.size);
[...missing].sort().forEach((x) => console.log("  MISS", x));
