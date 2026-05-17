/**
 * Gloss policy for H998 (בִּינָה / בֵּין family as tagged) and H1901 (הֲגִיג):
 *   - Imperative בִּינָה → entiende
 *   - Nominal / other listed glosses → discernimiento / discernir… (see map)
 *   - הֲגִיגִי etc.: mi susurro with 1cs possessive (י), else susurro
 *
 * Usage: node scripts/snapshot-patch-binah-hagig-glosses.js
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

/** @returns {string|null} new spanish or null if unchanged */
function patchH998(seg) {
  const st = seg.strongs != null ? String(seg.strongs).trim() : "";
  if (st !== "H998") return null;
  const hebrew = seg.hebrew != null ? String(seg.hebrew) : "";
  const m = seg.morphology != null ? String(seg.morphology) : "";
  const sp0 = seg.spanish != null ? String(seg.spanish) : "";

  if ((m === "VQAISM2" || m === "VHAISM2") && /ב/.test(hebrew) && /ינ/.test(hebrew)) {
    return "entiende";
  }

  const map = {
    considera: "entiende",
    inteligencia: "discernimiento",
    entendimiento: "discernimiento",
    "vuestra inteligencia": "vuestro discernimiento",
    "mi inteligencia": "mi discernimiento",
    "tu sabiduría, Y": "tu discernimiento",
    "tu propia prudencia": "tu propio discernimiento",
    prudentes: "discernimiento",
    prudencia: "discernimiento",
    prudente: "discernidor",
    entendido: "discernido",
    comprenderla: "discernirla",
    comprendas: "disciernas",
    cordura: "discernimiento",
    entenderéis: "discerniréis",
  };

  if (map[sp0] != null) return map[sp0];
  if (sp0 === "") return "discernimiento";
  return null;
}

/** 1cs possessive on noun (yod as suffix marker in snapshot lemmas) */
function hasFirstPersonPossessiveYod(hebrew) {
  const h = String(hebrew || "");
  return /י$/.test(h) || /ִי/.test(h);
}

function patchH1901(seg) {
  const st = seg.strongs != null ? String(seg.strongs).trim() : "";
  if (st !== "H1901") return null;
  const hebrew = seg.hebrew != null ? String(seg.hebrew) : "";
  if (hasFirstPersonPossessiveYod(hebrew)) return "mi susurro";
  return "susurro";
}

function main() {
  const files = [];
  walkJsonFiles(CHAPTERS_DIR, files);
  let chapters = 0;
  let n998 = 0;
  let n1901 = 0;

  for (const fp of files.sort()) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fp, "utf8"));
    } catch {
      continue;
    }
    if (!data.verses) continue;
    let dirty = false;
    for (const verse of Object.values(data.verses)) {
      const segs = verse.segments;
      if (!Array.isArray(segs)) continue;
      for (const seg of segs) {
        const u998 = patchH998(seg);
        if (u998 != null && seg.spanish !== u998) {
          seg.spanish = u998;
          dirty = true;
          n998++;
        }
        const u1901 = patchH1901(seg);
        if (u1901 != null && seg.spanish !== u1901) {
          seg.spanish = u1901;
          dirty = true;
          n1901++;
        }
      }
    }
    if (dirty) {
      fs.writeFileSync(fp, JSON.stringify(data), "utf8");
      chapters++;
    }
  }

  console.log(
    JSON.stringify(
      { chaptersWritten: chapters, h998SegmentsUpdated: n998, h1901SegmentsUpdated: n1901 },
      null,
      2
    )
  );
}

main();
