#!/usr/bin/env node
/**
 * Exporta Génesis interlineal (vista morfología admin) en DOCX separados por capítulo.
 * Mismo contenido que antes en un solo archivo: versículo en negrita, línea LXX, tabla por versículo.
 * Salida: export/Genesis-interlinear-admin-cap-01.docx … cap-50.docx (sin archivo único ni anexos).
 */

const fs = require("fs/promises");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  PageOrientation,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const GENESIS_DIR = path.join(
  ROOT,
  "IdiomaORIGEN",
  "interlinear-snapshot",
  "chapters",
  "genesis"
);
const EXPORT_DIR = path.join(ROOT, "export");

function hasHebrewConsonantSurf(str) {
  return /[\u05D0-\u05EA]/.test(String(str || ""));
}

function segmentVisibleInAdmin(seg) {
  return seg && seg.visible_in_admin_ui !== false;
}

function passesMorphCard(seg) {
  const hebrewSurface = String(seg.hebrew || "").trim();
  const gloss = String(seg.spanish || "").trim();
  const greekSurf = String(seg.greek_lxx || "").trim();
  const hasRealGreek = greekSurf && greekSurf !== "—";
  return hasHebrewConsonantSurf(hebrewSurface) || Boolean(gloss) || hasRealGreek;
}

function groupSegmentsForVerse(segments) {
  const visible = (Array.isArray(segments) ? segments : []).filter(segmentVisibleInAdmin);
  const rows = [];
  let cur = null;
  for (const seg of visible) {
    const tk = String(seg.token_num ?? "");
    if (!cur || cur.token_num !== tk) {
      cur = { token_num: tk, morphemes: [] };
      rows.push(cur);
    }
    cur.morphemes.push(seg);
  }
  return rows;
}

function flattenMorphRows(segments) {
  const merged = groupSegmentsForVerse(segments);
  const out = [];
  for (const { token_num: tkNum, morphemes } of merged) {
    for (const morpheme of morphemes) {
      if (!passesMorphCard(morpheme)) continue;
      out.push({ token_num: tkNum, seg: morpheme });
    }
  }
  return out;
}

function formatMorphStrong(seg) {
  const st = String(seg.strongs || "").trim();
  const morph = String(seg.morphology || "").trim() || "—";
  return st ? `${st} · ${morph}` : morph;
}

function formatGreekLxx(seg) {
  const g = String(seg.greek_lxx || "").trim();
  const tier = String(seg.lxx_tier || "").trim();
  if (g === "—") return tier ? `— (${tier})` : "—";
  if (!g) return tier ? `(${tier})` : "";
  return tier ? `${g} (${tier})` : g;
}

function cellParagraph(text, opts = {}) {
  const t = text === undefined || text === null ? "" : String(text);
  return new Paragraph({
    alignment: opts.alignment,
    bidirectional: opts.bidirectional,
    children: [
      opts.bold ? new TextRun({ text: t || " ", bold: true }) : new TextRun(t || " "),
    ],
  });
}

function headerCell(label) {
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    children: [cellParagraph(label, { bold: true })],
  });
}

function verseInterlinearTable(rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Token / índ."),
      headerCell("Tipo"),
      headerCell("Hebreo"),
      headerCell("Morfología · Strong"),
      headerCell("Español"),
      headerCell("Griego (LXX)"),
    ],
  });

  if (!rows.length) {
    const emptyRow = new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [
                new TextRun(
                  "(Sin filas en la vista morfología del admin para este versículo: ningún segmento visible cumple la regla de contenido.)"
                ),
              ],
            }),
          ],
        }),
      ],
    });
    return new Table({
      columnWidths: [900, 720, 2160, 3200, 2600, 3200],
      rows: [headerRow, emptyRow],
    });
  }

  const dataRows = rows.map(({ token_num: tkNum, seg }) => {
    const idx = seg.morpheme_index ?? 0;
    const ref = `${tkNum}/${idx}`;
    const tipo = String(seg.morpheme_type || "base").trim() || "base";
    const he = String(seg.hebrew || "").trim() || "·";

    return new TableRow({
      children: [
        new TableCell({
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [cellParagraph(ref)],
        }),
        new TableCell({
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [cellParagraph(tipo)],
        }),
        new TableCell({
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [
            cellParagraph(he, {
              bidirectional: true,
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
        new TableCell({
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [cellParagraph(formatMorphStrong(seg))],
        }),
        new TableCell({
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [cellParagraph(String(seg.spanish || "").trim())],
        }),
        new TableCell({
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [cellParagraph(formatGreekLxx(seg))],
        }),
      ],
    });
  });

  return new Table({
    columnWidths: [900, 720, 2160, 3200, 2600, 3200],
    rows: [headerRow, ...dataRows],
  });
}

function lxxChipParagraph(verse) {
  const edition = String(verse?.lxx_edition || "").trim();
  const lxxV = verse?.lxx_verse;
  const mtCh = verse?.mt_chapter;
  const shifted = Boolean(verse?.mt_lxx_verse_shifted);
  const mtV = verse?.mt_verse;
  if (!edition || !Number.isFinite(Number(lxxV))) {
    return null;
  }
  const shiftNote =
    shifted && Number.isFinite(Number(mtV)) ? ` · Masora v${mtV}→LXX v${lxxV}` : "";
  const line = `LXX (${edition}) ${mtCh}:${lxxV}${shiftNote}`;
  return new Paragraph({
    children: [new TextRun({ text: line, italics: true })],
  });
}

function buildChapterChildren(bookLabel, chapNum, raw) {
  const children = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(`${bookLabel} — Capítulo ${chapNum}`)],
    })
  );

  const verses = raw.verses || {};
  const vKeys = Object.keys(verses).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  for (const vk of vKeys) {
    const v = verses[vk];
    const vNum = parseInt(vk, 10);
    const refLine = `${bookLabel} ${chapNum}:${vNum}`;

    children.push(
      new Paragraph({
        spacing: { before: 200, after: 120 },
        children: [new TextRun({ text: refLine, bold: true })],
      })
    );

    const lxxPara = lxxChipParagraph(v);
    if (lxxPara) children.push(lxxPara);

    const morphRows = flattenMorphRows(v.segments);
    children.push(verseInterlinearTable(morphRows));
    children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun("")] }));
  }

  return children;
}

async function purgePreviousGenesisExports() {
  const candidates = [
    path.join(EXPORT_DIR, "Genesis-interlinear-admin.docx"),
    path.join(EXPORT_DIR, "Genesis-interlineal-admin.docx"),
  ];
  for (const p of candidates) {
    try {
      await fs.unlink(p);
    } catch (_) {
      /* */
    }
  }
  try {
    const names = await fs.readdir(EXPORT_DIR);
    for (const n of names) {
      if (/^Genesis-interlinear-admin-cap-\d{2}\.docx$/.test(n)) {
        await fs.unlink(path.join(EXPORT_DIR, n));
      }
    }
  } catch (_) {
    /* */
  }
}

async function main() {
  await purgePreviousGenesisExports();

  const names = (await fs.readdir(GENESIS_DIR)).filter((f) => /^\d+\.json$/.test(f));
  names.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  let bookLabel = "Génesis";

  await fs.mkdir(EXPORT_DIR, { recursive: true });

  for (const file of names) {
    const chapNum = parseInt(file.replace(/\.json$/, ""), 10);
    const raw = JSON.parse(await fs.readFile(path.join(GENESIS_DIR, file), "utf8"));
    if (typeof raw.book_label === "string" && raw.book_label) bookLabel = raw.book_label;

    const children = buildChapterChildren(bookLabel, chapNum, raw);
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

    const outName = `Genesis-interlinear-admin-cap-${String(chapNum).padStart(2, "0")}.docx`;
    const outPath = path.join(EXPORT_DIR, outName);
    const buf = await Packer.toBuffer(doc);
    await fs.writeFile(outPath, buf);
    console.log("Wrote", outPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
