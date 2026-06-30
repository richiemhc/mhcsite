// Mirror merithillcapital.com to a local static site.
// Usage: node mirror.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, posix } from "node:path";

const ORIGIN = "https://merithillcapital.com";
const HOST = "merithillcapital.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const ROOT = process.cwd();

// page slug -> local file path
const PAGES = [
  ["", "index.html"],
  ["about", "about/index.html"],
  ["expertise", "expertise/index.html"],
  ["team", "team/index.html"],
  ["portfolio", "portfolio/index.html"],
  ["contact", "contact/index.html"],
  ["terms-and-conditions-of-use", "terms-and-conditions-of-use/index.html"],
];

// nav / internal links that appear root-relative or bare
const NAV_MAP = {
  "/about": "about/index.html",
  "/expertise": "expertise/index.html",
  "/team": "team/index.html",
  "/portfolio": "portfolio/index.html",
  "/contact": "contact/index.html",
  "/terms-and-conditions-of-use/": "terms-and-conditions-of-use/index.html",
  "/terms-and-conditions-of-use": "terms-and-conditions-of-use/index.html",
};

const ASSET_EXT =
  /\.(css|js|mjs|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|otf|mp4|webm|ogg|json|map)$/i;

function curl(url, binary) {
  const args = [
    "-sL",
    "--compressed",
    "-A", UA,
    "-H", `Referer: ${ORIGIN}/`,
    "-w", "\n__HTTP__%{http_code}",
    url,
  ];
  const out = execFileSync("curl", args, {
    maxBuffer: 1024 * 1024 * 512,
    encoding: binary ? "buffer" : "utf8",
  });
  if (binary) {
    // split off the trailing status marker
    const marker = Buffer.from("\n__HTTP__");
    const idx = out.lastIndexOf(marker);
    const code = out.slice(idx + marker.length).toString().trim();
    return { code, buf: out.slice(0, idx) };
  } else {
    const m = out.match(/\n__HTTP__(\d+)\s*$/);
    const code = m ? m[1] : "000";
    return { code, buf: out.replace(/\n__HTTP__\d+\s*$/, "") };
  }
}

function fetchBuf(url, binary = true) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = curl(url, binary);
      if (r.code === "200" || r.code === "206") return r.buf;
      console.warn(`  [${r.code}] ${url}`);
    } catch (e) {
      console.warn(`  [err] ${url}: ${e.message}`);
    }
  }
  return null;
}

function save(localPath, buf) {
  const full = posix.join(ROOT.replace(/\\/g, "/"), localPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, buf);
}

// --- URL helpers ---
function toRemote(raw) {
  let u = raw.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
  u = u.split("#")[0];
  if (u.startsWith("//")) u = "https:" + u;
  else if (u.startsWith("/")) u = ORIGIN + u;
  else if (u.startsWith("http://" + HOST)) u = "https://" + HOST + u.slice(("http://" + HOST).length);
  if (!u.startsWith(ORIGIN + "/")) return null;
  try {
    const url = new URL(u);
    if (url.host !== HOST) return null;
    return url;
  } catch {
    return null;
  }
}

// remote URL -> local path (no query)
function localPathFor(url) {
  let p = url.pathname.replace(/^\//, "");
  if (p === "" || p.endsWith("/")) p += "index.html";
  return p;
}

const downloaded = new Set();
const cssToProcess = [];

function queueAsset(remoteUrl) {
  const lp = localPathFor(remoteUrl);
  if (downloaded.has(lp)) return lp;
  downloaded.add(lp);
  const buf = fetchBuf(remoteUrl.href, true);
  if (!buf) return lp;
  save(lp, buf);
  if (/\.css$/i.test(lp)) cssToProcess.push({ lp, base: remoteUrl });
  return lp;
}

// Find candidate asset URLs in a text blob (HTML or CSS)
function discover(text) {
  const scan = text.replace(/\\\//g, "/"); // de-escape JSON slashes
  const urls = new Set();
  const patterns = [
    /https?:\/\/merithillcapital\.com\/[^"'\s),<>]*/g,
    /\/\/merithillcapital\.com\/[^"'\s),<>]*/g,
    /["'(]\/(?:wp-content|wp-includes|cdn-cgi)\/[^"'\s),<>]*/g,
    /url\(\s*([^)'"]+)\s*\)/g, // relative css url()
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(scan))) {
      let cand = m[1] || m[0];
      cand = cand.replace(/^["'(]/, "");
      cand = cand.split("&quot")[0].split("&#")[0];
      urls.add(cand);
    }
  }
  return [...urls];
}

function processCssFile(entry) {
  const fullPath = posix.join(ROOT.replace(/\\/g, "/"), entry.lp);
  let css;
  try {
    css = execFileSync("node", ["-e", `process.stdout.write(require('fs').readFileSync(process.argv[1]))`, fullPath], { encoding: "utf8", maxBuffer: 1 << 28 });
  } catch {
    return;
  }
  // discover url() targets (absolute + relative), download, rewrite to relative
  const re = /url\(\s*(['"]?)([^)'"]+)\1\s*\)/g;
  let m;
  let out = css;
  const replacements = [];
  while ((m = re.exec(css))) {
    const ref = m[2].trim();
    if (ref.startsWith("data:")) continue;
    let remote;
    if (/^https?:\/\//.test(ref) || ref.startsWith("//") || ref.startsWith("/")) {
      remote = toRemote(ref);
    } else {
      // relative to css file URL
      try { remote = new URL(ref, entry.base.href); } catch { remote = null; }
      if (remote && remote.host !== HOST) remote = null;
    }
    if (!remote) continue;
    const lp = queueAsset(remote);
    const rel = relPath(entry.lp, lp);
    replacements.push([m[0], `url(${m[1]}${rel}${m[1]})`]);
  }
  for (const [from, to] of replacements) out = out.split(from).join(to);
  if (out !== css) save(entry.lp, Buffer.from(out, "utf8"));
}

// relative path from a file to a target local path
function relPath(fromFile, toFile) {
  const fromDir = posix.dirname("/" + fromFile);
  let rel = posix.relative(fromDir, "/" + toFile);
  return rel || posix.basename(toFile);
}

function cfDecode(hex) {
  const key = parseInt(hex.substr(0, 2), 16);
  let s = "";
  for (let i = 2; i < hex.length; i += 2)
    s += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ key);
  return s;
}

function rewriteHtml(html, localFile) {
  const depth = localFile.split("/").length - 1;
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  const prefixEsc = prefix.replace(/\//g, "\\/");

  const prefixEsc2 = prefix.replace(/\//g, "\\\\/");

  let out = html;
  // double-escaped (nested JSON) variants first
  out = out.split("https:\\\\/\\\\/merithillcapital.com\\\\/").join(prefixEsc2);
  out = out.split("\\\\/\\\\/merithillcapital.com\\\\/").join(prefixEsc2);
  // escaped (JSON) variants
  out = out.split("https:\\/\\/merithillcapital.com\\/").join(prefixEsc);
  out = out.split("\\/\\/merithillcapital.com\\/").join(prefixEsc);
  // plain absolute
  out = out.split(ORIGIN + "/").join(prefix);
  out = out.split("http://" + HOST + "/").join(prefix);
  out = out.split("//" + HOST + "/").join(prefix);
  // bare origin (logo link, no trailing slash)
  out = out.replace(new RegExp("https?://" + HOST.replace(/\./g, "\\.") + "(?=[\"'<\\s])", "g"), prefix + "index.html");

  // nav / internal root-relative links
  for (const [from, to] of Object.entries(NAV_MAP)) {
    out = out.split(`href="${from}"`).join(`href="${prefix}${to}"`);
    out = out.split(`href='${from}'`).join(`href='${prefix}${to}'`);
  }
  // root-relative asset dirs that remained
  out = out.replace(/(["'(])\/(wp-content|wp-includes|cdn-cgi)\//g, `$1${prefix}$2/`);

  // strip ?ver= cache-buster queries on local asset refs so they match saved files
  out = out.replace(/(\.(?:css|js|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|otf|mp4|webm|json))\?[^"'\s),<>]*/gi, "$1");

  // decode Cloudflare-obfuscated emails (3 forms):
  // 1) inline anchor carrying data-cfemail itself, plain text inside
  out = out.replace(/<a\b[^>]*\bdata-cfemail="([0-9a-fA-F]+)"[^>]*>[^<]*<\/a>/g,
    (_, hex) => `<a href="mailto:${cfDecode(hex)}">${cfDecode(hex)}</a>`);
  // 2) footer icon-list anchor href with #HEX fragment (slash-agnostic)
  out = out.replace(/href="[^"]*cdn-cgi\/l\/email-protection#([0-9a-fA-F]+)"/g,
    (_, hex) => `href="mailto:${cfDecode(hex)}"`);
  // 3) span carrying data-cfemail (visible text)
  out = out.replace(/<span class="__cf_email__" data-cfemail="([0-9a-fA-F]+)">[^<]*<\/span>/g,
    (_, hex) => `<span>${cfDecode(hex)}</span>`);

  // remove Cloudflare email-decode script + challenge IIFE
  out = out.replace(/<script[^>]*cdn-cgi\/scripts\/[^>]*email-decode\.min\.js[^>]*><\/script>/g, "");
  out = out.replace(/<script>\(function\(\)\{function c\(\)[\s\S]*?\}\)\(\);<\/script>/g, "");

  return out;
}

// ---- main ----
console.log("== Fetching pages ==");
const pageHtml = {};
for (const [slug, file] of PAGES) {
  const url = ORIGIN + "/" + (slug ? slug + "/" : "");
  console.log(`page: ${url}`);
  const html = fetchBuf(url, false);
  if (!html) { console.error(`  FAILED ${url}`); continue; }
  pageHtml[file] = html;
}

console.log("== Discovering & downloading assets ==");
const assetUrls = new Set();
for (const html of Object.values(pageHtml)) {
  for (const cand of discover(html)) {
    const r = toRemote(cand);
    if (!r) continue;
    const path = r.pathname;
    if (ASSET_EXT.test(path) || /^\/(wp-content|wp-includes)\//.test(path)) {
      assetUrls.add(r.href.split("?")[0].split("#")[0]);
    }
  }
}
console.log(`  ${assetUrls.size} top-level asset URLs`);
for (const a of assetUrls) {
  const r = toRemote(a);
  if (r) queueAsset(r);
}

// process CSS (may enqueue more assets/css)
console.log("== Processing CSS url() refs ==");
while (cssToProcess.length) {
  const entry = cssToProcess.shift();
  processCssFile(entry);
}

console.log("== Rewriting & saving HTML ==");
for (const [file, html] of Object.entries(pageHtml)) {
  const out = rewriteHtml(html, file);
  save(file, Buffer.from(out, "utf8"));
  console.log(`  saved ${file}`);
}

console.log(`Done. ${downloaded.size} assets downloaded.`);
