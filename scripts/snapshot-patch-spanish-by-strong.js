/**
 * Bulk-set snapshot segment Spanish gloss by Strong number using index.by-strongs.json.
 *
 * Usage:
 *   node scripts/snapshot-patch-spanish-by-strong.js H5329 victorioso
 *   node scripts/snapshot-patch-spanish-by-strong.js H5329 victorioso --dry-run
 *
 * After edits, regenerate the index:
 *   node scripts/build-interlinear-snapshot-index.js
 */
const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const INDEX_PATH = path.join(
  REPO,
  "IdiomaORIGEN",
  "interlinear-snapshot",
  "index.by-strongs.json"
);
const CHAPTERS_DIR = path.join(
  REPO,
  "IdiomaORIGEN",
  "interlinear-snapshot",
  "chapters"
);

function parseRef(ref) {
  const parts = ref.split("/");
  if (parts.length !== 4) return null;
  const [book, chStr, vKey, siStr] = parts;
  const chapter = parseInt(chStr, 10);
  const segmentIndex = parseInt(siStr, 10);
  if (!book || !Number.isFinite(chapter) || !Number.isFinite(segmentIndex))
    return null;
  return { book, chapter, vKey, segmentIndex };
}

function normalizeStrong(arg) {
  const s = String(arg).trim().toUpperCase();
  if (/^\d+$/.test(s)) return `H${s}`;
  if (/^[HG]\d+$/.test(s)) return s;
  return s.replace(/^H/i, "H");
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--dry-run");
  const dryRun = process.argv.includes("--dry-run");

  if (args[0] == null || args[1] === undefined) {
    console.error(
      "Usage: node scripts/snapshot-patch-spanish-by-strong.js <H####|G####> <spanish> [--dry-run]"
    );
    process.exit(1);
  }

  const strongNorm = normalizeStrong(args[0]);
  const newSpanish = args[1];

  if (!strongNorm) {
    console.error("Invalid Strong number:", args[0]);
    process.exit(1);
  }

  let index;
  try {
    index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  } catch (e) {
    console.error("Cannot read index:", INDEX_PATH, e.message);
    process.exit(1);
  }

  const refs = index.refsByStrongs && index.refsByStrongs[strongNorm];
  if (!refs || !refs.length) {
    console.error("No refs for", strongNorm);
    process.exit(2);
  }

  /** @type {Map<string, Array<{vKey:string,segmentIndex:number}>>} */
  const byChapterPath = new Map();
  for (const ref of refs) {
    const p = parseRef(ref);
    if (!p) continue;
    const fp = path.join(CHAPTERS_DIR, p.book, `${p.chapter}.json`);
    if (!byChapterPath.has(fp)) byChapterPath.set(fp, []);
    byChapterPath.get(fp).push({ vKey: p.vKey, segmentIndex: p.segmentIndex });
  }

  let updatedSegments = 0;
  let skippedMismatch = 0;

  for (const [fp, locations] of byChapterPath) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fp, "utf8"));
    } catch {
      console.error("skip (parse)", fp);
      continue;
    }
    let chapterDirty = false;
    for (const loc of locations) {
      const verse = data.verses && data.verses[loc.vKey];
      const seg =
        verse && verse.segments && verse.segments[loc.segmentIndex];
      if (!seg) continue;
      const st =
        seg.strongs != null ? String(seg.strongs).trim().toUpperCase() : "";
      if (st !== strongNorm) {
        skippedMismatch++;
        continue;
      }
      if (seg.spanish !== newSpanish) {
        seg.spanish = newSpanish;
        chapterDirty = true;
        updatedSegments++;
      }
    }
    if (chapterDirty && !dryRun) {
      fs.writeFileSync(fp, JSON.stringify(data), "utf8");
      console.log("wrote", fp);
    }
  }

  console.log(
    dryRun ? "[dry-run] would update segments:" : "Updated segments:",
    updatedSegments,
    "| skipped strong mismatch:",
    skippedMismatch
  );
  if (!dryRun && updatedSegments > 0) {
    console.log("Regenerate index: node scripts/build-interlinear-snapshot-index.js");
  }
}

main();
