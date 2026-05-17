#!/usr/bin/env node
/**
 * Exporta un DOCX con el texto español concatenado de Génesis desde el snapshot interlineal.
 * Sin datos de código: solo capítulos, referencias y párrafos editables.
 */

const fs = require("fs/promises");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");

const ROOT = path.join(__dirname, "..");
const GENESIS_DIR = path.join(
  ROOT,
  "IdiomaORIGEN",
  "interlinear-snapshot",
  "chapters",
  "genesis"
);
const OUT_FILE = path.join(ROOT, "export", "Genesis-compendio-textos.docx");

function verseSpanish(segments) {
  if (!Array.isArray(segments)) return "";
  const sorted = segments.filter((s) => s.visible_in_admin_ui !== false);
  sorted.sort((a, b) => {
    const tn = (x) => parseInt(String(x.token_num ?? "0"), 10) || 0;
    const mi = (x) => Number(x.morpheme_index ?? 0);
    const c = tn(a) - tn(b);
    return c !== 0 ? c : mi(a) - mi(b);
  });
  const parts = sorted
    .map((s) => (typeof s.spanish === "string" ? s.spanish.trim() : ""))
    .filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

async function main() {
  const names = (await fs.readdir(GENESIS_DIR)).filter((f) => /^\d+\.json$/.test(f));
  names.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const children = [];
  let bookLabel = "Génesis";

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun("Compendio de textos — Génesis")],
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun(
          "Texto en español reunido a partir de las glosas interlineales del snapshot (solo segmentos visibles en la interfaz de administración). Puedes editar este documento y devolver correcciones para integrarlas en el proyecto."
        ),
      ],
    })
  );
  children.push(new Paragraph({ children: [new TextRun("")] }));

  for (const file of names) {
    const chapNum = parseInt(file.replace(/\.json$/, ""), 10);
    const raw = JSON.parse(await fs.readFile(path.join(GENESIS_DIR, file), "utf8"));
    if (typeof raw.book_label === "string" && raw.book_label) bookLabel = raw.book_label;

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
      const text = verseSpanish(v.segments);
      const ref = `${chapNum}:${vNum}`;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${ref} — `, bold: true }),
            new TextRun(text || "(sin glosas visibles en UI)"),
          ],
        })
      );
    }

    children.push(new Paragraph({ children: [new TextRun("")] }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  const buf = await Packer.toBuffer(doc);
  await fs.writeFile(OUT_FILE, buf);
  console.log("Wrote", OUT_FILE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
