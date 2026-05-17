/**
 * Snapshot gloss fixes aligned with common Hebrew confusions:
 *   אֶל־ (H413) direction vs עַל־ (H5921) upon/on
 *   אִם (H518) conditional vs עִם (H5973) comitative
 *
 * Does NOT bulk-replace every sense of כִּי / לְ / etc. (context-dependent).
 * OCR letter similarities (dalet/resh, he/chet/tav, …) are editorial notes only.
 *
 * Usage: node scripts/snapshot-fix-hebrew-gloss-pairs.js
 * Then:  node scripts/build-interlinear-snapshot-index.js
 */
const fs = require("fs");
const path = require("path");

const CHAPTERS_DIR = path.join(
  __dirname,
  "..",
  "IdiomaORIGEN",
  "interlinear-snapshot",
  "chapters"
);

function walkJsonFiles(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkJsonFiles(p, acc);
    else if (ent.name.endsWith(".json")) acc.push(p);
  }
}

function hasIm(hebrew) {
  const h = String(hebrew || "");
  return h.includes("אִם") || /^אם/.test(h);
}

function hasImWith(hebrew) {
  const h = String(hebrew || "");
  return h.includes("עִם") || /^עם/.test(h);
}

function patchSegment(seg) {
  if (!seg || typeof seg !== "object") return false;
  const st = seg.strongs != null ? String(seg.strongs).trim() : "";
  const sp = seg.spanish != null ? String(seg.spanish) : "";
  const hebrew = seg.hebrew != null ? String(seg.hebrew) : "";

  // אֶל־ confused with עַל־ ("sobre")
  if (st === "H413" && sp === "sobre") {
    seg.spanish = "hacia";
    return true;
  }

  // עַל־ glossed like directional אֶל־
  if (
    st === "H5921" &&
    (sp === "a" || sp === "hacia")
  ) {
    seg.spanish = "sobre";
    return true;
  }

  // אִם as conjunction "y" (wrong; ו is "y")
  if (st === "H518" && sp === "y" && hasIm(hebrew)) {
    seg.spanish = "si";
    return true;
  }

  // עִם glossed like אֶל־ / generic "en"
  if (
    st === "H5973" &&
    (sp === "a" || sp === "en") &&
    hasImWith(hebrew)
  ) {
    seg.spanish = "con";
    return true;
  }

  return false;
}

function main() {
  const files = [];
  walkJsonFiles(CHAPTERS_DIR, files);
  let chaptersWritten = 0;
  let segmentsPatched = 0;

  for (const fp of files.sort()) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fp, "utf8"));
    } catch {
      console.error("skip parse:", fp);
      continue;
    }
    if (!data.verses) continue;

    let dirty = false;
    for (const verse of Object.values(data.verses)) {
      const segs = verse.segments;
      if (!Array.isArray(segs)) continue;
      for (const seg of segs) {
        if (patchSegment(seg)) {
          dirty = true;
          segmentsPatched++;
        }
      }
    }

    if (dirty) {
      fs.writeFileSync(fp, JSON.stringify(data), "utf8");
      chaptersWritten++;
    }
  }

  console.log(
    JSON.stringify(
      {
        chaptersWritten,
        segmentsPatched,
      },
      null,
      2
    )
  );
}

main();
