// Resize + recompress images in place (keeps filenames/refs valid). Dev tool.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const R = process.cwd();
const SKIP = new Set(["logo-color.png", "logo-color-300x153.png", "144x144-01.png", "us-map.svg"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp, out);
    else out.push(fp);
  }
  return out;
}

let before = 0, after = 0, n = 0;
for (const fp of walk(path.join(R, "assets/img"))) {
  const base = path.basename(fp);
  if (SKIP.has(base)) continue;
  const ext = path.extname(fp).toLowerCase();
  const isTeam = fp.replace(/\\/g, "/").includes("/img/team/");
  const maxW = isTeam ? 600 : 1600;
  const sz0 = fs.statSync(fp).size;
  before += sz0;
  const tmp = fp + ".tmp";
  try {
    let img = sharp(fp).rotate().resize({ width: maxW, withoutEnlargement: true });
    if (ext === ".png") img = img.png({ compressionLevel: 9, palette: true });
    else img = img.jpeg({ quality: 80, mozjpeg: true });
    await img.toFile(tmp);
    const sz1 = fs.statSync(tmp).size;
    if (sz1 < sz0) { fs.renameSync(tmp, fp); after += sz1; n++; }
    else { fs.rmSync(tmp); after += sz0; }
  } catch (e) {
    if (fs.existsSync(tmp)) fs.rmSync(tmp);
    after += sz0;
    console.warn("skip", base, e.message);
  }
}
console.log(`optimized ${n} files: ${(before/1048576).toFixed(1)}MB -> ${(after/1048576).toFixed(1)}MB`);
