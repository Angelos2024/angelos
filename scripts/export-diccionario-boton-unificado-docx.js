#!/usr/bin/env node
/**
 * Diccionario botón unificado por capítulo de Génesis → export/*.docx
 * Mismo esquema visual que Genesis-interlinear-admin.docx: solo Heading 1 de capítulo + tabla horizontal.
 * Sin observaciones ni texto introductorio. Borra DOCX previos en dic/Diccionarioboton.
 */

const fs = require("fs/promises");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageOrientation,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const BOTON_DIR = path.join(ROOT, "dic", "Diccionarioboton");
const LEGACY_CAP_DIR = path.join(BOTON_DIR, "por-capitulo-genesis");
const EXPORT_DIR = path.join(ROOT, "export");

const GENESIS_TRILINGUE = path.join(ROOT, "dic", "trilingue", "01genesis.json");
const GENESIS_SNAPSHOT_DIR = path.join(
  ROOT,
  "IdiomaORIGEN",
  "interlinear-snapshot",
  "chapters",
  "genesis"
);

/** Anchos DXA — 6 columnas, mismo orden de magnitud que tablas interlineales admin */
const COL_WIDTHS = [2200, 1600, 2800, 2800, 2600, 2400];

function stripHebrewNiqqud(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripGreekAccents(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normDedup(s) {
  return String(s || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function mergeKeyFromEntry(entry) {
  const raw = String(entry?.texto_hebreo ?? "")
    .normalize("NFKC")
    .trim();
  if (raw) {
    if (/[\u0590-\u05FF]/.test(raw)) {
      return `he:${stripHebrewNiqqud(raw)}`;
    }
    if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(raw)) {
      return `gr:${stripGreekAccents(raw)}`;
    }
    return `surf:${raw.toLowerCase().replace(/\s+/g, " ")}`;
  }
  const tr = normDedup(entry?.transliteracion ?? "");
  return tr ? `trans:${tr}` : `id:${entry?.id ?? Math.random()}`;
}

function mergeKeyFromHebrewSurface(hebrew) {
  const raw = String(hebrew ?? "").normalize("NFKC").trim();
  if (!raw || !/[\u0590-\u05FF]/.test(raw)) return null;
  return `he:${stripHebrewNiqqud(raw)}`;
}

function hasHebrewPointing(t) {
  return /[\u0591-\u05C7]/.test(String(t || ""));
}

function pickBetterSurface(prev, next) {
  if (!prev) return next;
  if (!next) return prev;
  const a = String(prev).normalize("NFKC").trim();
  const b = String(next).normalize("NFKC").trim();
  if (b.length !== a.length) return b.length > a.length ? b : a;
  if (hasHebrewPointing(b) && !hasHebrewPointing(a)) return b;
  return a;
}

function addToMap(map, value) {
  const v = String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!v) return;
  const k = normDedup(v);
  if (!map.has(k)) map.set(k, v);
}

async function listBotonJsonFiles() {
  const names = await fs.readdir(BOTON_DIR);
  return names
    .filter((n) => n.endsWith(".json") && n.toLowerCase().startsWith("diccionario"))
    .map((n) => path.join(BOTON_DIR, n))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

async function loadJsonArray(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function friendlySourceLabel(filePath) {
  const base = path.basename(filePath, ".json");
  if (base === "01genesis") return "Trilingüe Génesis (dic/trilingue)";
  return base.replace(/^diccionario_/i, "").replace(/_/g, " ");
}

async function buildBucketsFromSources() {
  const files = [...(await listBotonJsonFiles()), GENESIS_TRILINGUE];
  const buckets = new Map();

  for (const filePath of files) {
    let entries;
    try {
      entries = await loadJsonArray(filePath);
    } catch (e) {
      console.warn("Omitido (no legible):", filePath, e.message);
      continue;
    }
    const src = friendlySourceLabel(filePath);

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const key = mergeKeyFromEntry(entry);
      let b = buckets.get(key);
      if (!b) {
        b = {
          key,
          surface: "",
          translit: new Map(),
          equivEs: new Map(),
          greek: new Map(),
          candidatos: new Map(),
          fuentes: new Map(),
        };
        buckets.set(key, b);
      }

      b.surface = pickBetterSurface(b.surface, entry.texto_hebreo);
      addToMap(b.translit, entry.transliteracion);
      addToMap(b.equivEs, entry.equivalencia_espanol);
      addToMap(b.greek, entry.equivalencia_griega);

      if (Array.isArray(entry.candidatos)) {
        for (const c of entry.candidatos) addToMap(b.candidatos, c);
      }

      const fk = normDedup(src);
      if (!b.fuentes.has(fk)) b.fuentes.set(fk, src);
    }
  }

  return buckets;
}

async function buildGenesisKeyToChapters() {
  const map = new Map();
  const names = (await fs.readdir(GENESIS_SNAPSHOT_DIR)).filter((f) => /^\d+\.json$/.test(f));
  names.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  for (const file of names) {
    const chap = parseInt(file.replace(/\.json$/, ""), 10);
    if (!Number.isFinite(chap)) continue;
    let raw;
    try {
      raw = JSON.parse(await fs.readFile(path.join(GENESIS_SNAPSHOT_DIR, file), "utf8"));
    } catch {
      continue;
    }
    const verses = raw?.verses || {};
    for (const vk of Object.keys(verses)) {
      const segs = verses[vk]?.segments;
      if (!Array.isArray(segs)) continue;
      for (const seg of segs) {
        if (!seg || seg.visible_in_admin_ui === false) continue;
        const mk = mergeKeyFromHebrewSurface(seg.hebrew);
        if (!mk) continue;
        if (!map.has(mk)) map.set(mk, new Set());
        map.get(mk).add(chap);
      }
    }
  }

  return map;
}

function sortBuckets(list) {
  return [...list].sort((a, b) => {
    const sa = [...a.translit.values()][0] || a.surface || a.key;
    const sb = [...b.translit.values()][0] || b.surface || b.key;
    return String(sa).localeCompare(String(sb), "es", { sensitivity: "base" });
  });
}

/** Márgenes como export-genesis-compendio-docx (interlineal admin) */
function headerCell(label) {
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [new TextRun({ text: label, bold: true })],
      }),
    ],
  });
}

function dataCell(text, opts = {}) {
  const t = text === undefined || text === null ? "" : String(text);
  const display = t.trim() ? t : "—";
  const paraOpts = {
    children: [new TextRun(display)],
  };
  if (opts.hebrew) {
    paraOpts.bidirectional = true;
    paraOpts.alignment = AlignmentType.RIGHT;
  }
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph(paraOpts)],
  });
}

function dictionaryTable(bucketList) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Lexema"),
      headerCell("Transliteración"),
      headerCell("Español"),
      headerCell("Griego (LXX)"),
      headerCell("Candidatos"),
      headerCell("Fuentes"),
    ],
  });

  if (!bucketList.length) {
    const emptyRow = new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [
            new Paragraph({
              children: [new TextRun("(Sin filas.)")],
            }),
          ],
        }),
      ],
    });
    return new Table({
      columnWidths: COL_WIDTHS,
      rows: [headerRow, emptyRow],
    });
  }

  const dataRows = bucketList.map((b) => {
    const lexema = String(b.surface || [...b.translit.values()][0] || b.key || "").trim() || "—";
    const hebrewLex = /[\u0590-\u05FF]/.test(lexema);
    const translit = b.translit.size ? [...b.translit.values()].join(" · ") : "";
    const esp = b.equivEs.size ? [...b.equivEs.values()].join(" · ") : "";
    const gr = b.greek.size ? [...b.greek.values()].join(" · ") : "";
    const cand = b.candidatos.size ? [...b.candidatos.values()].join("; ") : "";
    const fuentes = b.fuentes.size ? [...b.fuentes.values()].sort().join("; ") : "";

    return new TableRow({
      children: [
        dataCell(lexema, { hebrew: hebrewLex }),
        dataCell(translit),
        dataCell(esp),
        dataCell(gr),
        dataCell(cand),
        dataCell(fuentes),
      ],
    });
  });

  return new Table({
    columnWidths: COL_WIDTHS,
    rows: [headerRow, ...dataRows],
  });
}

async function purgeOldDicDocxOutputs() {
  try {
    const names = await fs.readdir(BOTON_DIR);
    for (const n of names) {
      if (n.endsWith(".docx")) {
        await fs.unlink(path.join(BOTON_DIR, n));
      }
    }
  } catch (_) {
    /* */
  }

  try {
    const names = await fs.readdir(LEGACY_CAP_DIR);
    for (const n of names) {
      if (n.endsWith(".docx")) {
        await fs.unlink(path.join(LEGACY_CAP_DIR, n));
      }
    }
    await fs.rmdir(LEGACY_CAP_DIR);
  } catch (_) {
    /* */
  }

  try {
    const names = await fs.readdir(EXPORT_DIR);
    for (const n of names) {
      if (n.startsWith("Diccionarioboton") && n.endsWith(".docx")) {
        await fs.unlink(path.join(EXPORT_DIR, n));
      }
    }
  } catch (_) {
    /* */
  }
}

async function writeExportDoc(headingText, bucketList, fileName) {
  const outPath = path.join(EXPORT_DIR, fileName);
  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(headingText)],
    }),
    dictionaryTable(bucketList),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
          },
        },
        children,
      },
    ],
  });

  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const buf = await Packer.toBuffer(doc);
  await fs.writeFile(outPath, buf);
  console.log("Wrote", outPath, `(${bucketList.length} filas)`);
}

async function main() {
  await purgeOldDicDocxOutputs();

  const buckets = await buildBucketsFromSources();
  const list = sortBuckets([...buckets.values()]);
  const keyToChapters = await buildGenesisKeyToChapters();
  const genesisRelatedKeys = new Set(keyToChapters.keys());

  const chaptersSorted = [...new Set([...keyToChapters.values()].flatMap((s) => [...s]))].sort((a, b) => a - b);

  for (const ch of chaptersSorted) {
    const inChapter = list.filter((b) => keyToChapters.get(b.key)?.has(ch));
    const fname = `Diccionarioboton-Gén-cap-${String(ch).padStart(2, "0")}.docx`;
    await writeExportDoc(`Génesis — Capítulo ${ch}`, inChapter, fname);
  }

  const sinGenesis = list.filter((b) => !genesisRelatedKeys.has(b.key));
  await writeExportDoc(
    "Sin aparición en Génesis (snapshot)",
    sinGenesis,
    "Diccionarioboton-sin-aparicion-en-genesis.docx"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
