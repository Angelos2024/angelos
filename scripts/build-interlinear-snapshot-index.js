/**
 * Builds inverted indexes over IdiomaORIGEN/interlinear-snapshot chapter JSON
 * so bulk edits (e.g. all H5329 glosses) can target files without scanning everything.
 *
 * Usage (from repo root): node scripts/build-interlinear-snapshot-index.js [--pretty]
 *
 * Output:
 *   IdiomaORIGEN/interlinear-snapshot/index.by-strongs.json
 */
const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const SNAPSHOT = path.join(REPO, "IdiomaORIGEN", "interlinear-snapshot");
const CHAPTERS = path.join(SNAPSHOT, "chapters");
const OUT = path.join(SNAPSHOT, "index.by-strongs.json");

function strongSortKey(s) {
  const m = /^([HG])(\d+)$/i.exec(String(s).trim());
  if (!m) return [2, s];
  const n = parseInt(m[2], 10);
  return [0, m[1].toUpperCase() === "G" ? 1 : 0, n];
}

function walkChapterFiles(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkChapterFiles(p, acc);
    else if (ent.name.endsWith(".json")) acc.push(p);
  }
}

function main() {
  const pretty = process.argv.includes("--pretty");
  const files = [];
  walkChapterFiles(CHAPTERS, files);
  /** @type {Record<string, string[]>} */
  const refsByStrongs = {};
  let totalRefs = 0;

  for (const fp of files.sort()) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fp, "utf8"));
    } catch {
      console.error("skip (parse):", fp);
      continue;
    }
    const book = data.book_slug;
    const chapterNum = data.chapter;
    if (!book || chapterNum == null || !data.verses) continue;

    for (const [vKey, verse] of Object.entries(data.verses)) {
      const segs = verse.segments;
      if (!Array.isArray(segs)) continue;
      segs.forEach((seg, segmentIndex) => {
        const st = seg && seg.strongs != null ? String(seg.strongs).trim() : "";
        if (!st) return;
        if (!refsByStrongs[st]) refsByStrongs[st] = [];
        refsByStrongs[st].push(`${book}/${chapterNum}/${vKey}/${segmentIndex}`);
        totalRefs++;
      });
    }
  }

  const sortedStrongs = Object.keys(refsByStrongs).sort((a, b) => {
    const ka = strongSortKey(a);
    const kb = strongSortKey(b);
    for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
      const va = ka[i] ?? 0;
      const vb = kb[i] ?? 0;
      if (va < vb) return -1;
      if (va > vb) return 1;
    }
    return 0;
  });

  /** @type {Record<string, string[]>} */
  const ordered = {};
  for (const k of sortedStrongs) {
    ordered[k] = refsByStrongs[k].slice().sort();
  }

  const payload = {
    schema: "interlinear-snapshot-index-by-strongs-v1",
    generatedAt: new Date().toISOString(),
    sourceRelative: "IdiomaORIGEN/interlinear-snapshot/chapters",
    refFormat:
      "Each ref is book_slug/<chapter>/<verseKey>/<segmentIndex> matching verses[verseKey].segments[segmentIndex] in chapters/<book_slug>/<chapter>.json",
    counts: {
      strongNumbers: sortedStrongs.length,
      totalSegmentRefs: totalRefs,
    },
    refsByStrongs: ordered,
  };

  fs.writeFileSync(
    OUT,
    JSON.stringify(payload, null, pretty ? 2 : 0) + "\n",
    "utf8"
  );
  console.log("Wrote", OUT);
  console.log(
    "Strong numbers:",
    sortedStrongs.length,
    "segment refs:",
    totalRefs
  );
}

main();
