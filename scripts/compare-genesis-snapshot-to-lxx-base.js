#!/usr/bin/env node
/**
 * Compara el griego alineado en interlinear-snapshot (origen del DOCX export)
 * con la base LXX por capítulo (Rahlfs): LXX/chapters/Gen/N.json
 *
 * Uso:
 *   node scripts/compare-genesis-snapshot-to-lxx-base.js [capítulo]
 *   node scripts/compare-genesis-snapshot-to-lxx-base.js 1
 *   node scripts/compare-genesis-snapshot-to-lxx-base.js 1 --fold-accents
 *
 * Salida: discrepancias por versículo (palabras de más / de menos respecto al multiset
 * de tokens LXX). El orden hebreo ≠ orden griego, por eso no se exige igualdad de cadena.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SNAP_GEN = path.join(
  ROOT,
  "IdiomaORIGEN",
  "interlinear-snapshot",
  "chapters",
  "genesis"
);
const LXX_GEN = path.join(ROOT, "LXX", "chapters", "Gen");

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

function splitGreekTokens(g) {
  if (!g || g === "—") return [];
  return String(g)
    .trim()
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Palabras “reales” para contar (sin marcas vacías) */
function snapshotVerseGreekWords(segments) {
  const words = [];
  const visible = (Array.isArray(segments) ? segments : []).filter(segmentVisibleInAdmin);
  for (const seg of visible) {
    if (!passesMorphCard(seg)) continue;
    const g = String(seg.greek_lxx || "").trim();
    if (!g || g === "—") continue;
    words.push(...splitGreekTokens(g));
  }
  return words;
}

/** Comparación por superficie “sin diacríticos” (menos ruido θεός/θεὸς, etc.) */
function foldGreekSurface(w) {
  return String(w)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function multiset(words, fold) {
  const m = new Map();
  for (const w of words) {
    const k = fold ? foldGreekSurface(w) : w;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function multisetDiff(baseM, snapM) {
  const onlyBase = [];
  const onlySnap = [];
  const keys = new Set([...baseM.keys(), ...snapM.keys()]);
  for (const k of keys) {
    const b = baseM.get(k) || 0;
    const s = snapM.get(k) || 0;
    const d = b - s;
    if (d > 0) for (let i = 0; i < d; i++) onlyBase.push(k);
    if (d < 0) for (let i = 0; i < -d; i++) onlySnap.push(k);
  }
  return { onlyBase, onlySnap };
}

function baseVerseWords(lxxChapterJson, verseKey) {
  const verses = lxxChapterJson.verses || {};
  const tokList = verses[String(verseKey)];
  if (!Array.isArray(tokList)) return [];
  return tokList.map((t) => String(t.w || "").trim()).filter(Boolean);
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--fold-accents");
  const foldAccents = process.argv.includes("--fold-accents");
  const chapArg = args[0];
  const chapter = chapArg ? parseInt(chapArg, 10) : 1;
  if (!Number.isFinite(chapter) || chapter < 1) {
    console.error("Capítulo inválido");
    process.exit(1);
  }

  const snapPath = path.join(SNAP_GEN, `${chapter}.json`);
  const lxxPath = path.join(LXX_GEN, `${chapter}.json`);

  if (!fs.existsSync(snapPath)) {
    console.error("No existe snapshot:", snapPath);
    process.exit(1);
  }
  if (!fs.existsSync(lxxPath)) {
    console.error("No existe LXX base:", lxxPath);
    process.exit(1);
  }

  const snapRaw = JSON.parse(fs.readFileSync(snapPath, "utf8"));
  const lxxRaw = JSON.parse(fs.readFileSync(lxxPath, "utf8"));

  const edition = lxxRaw.edition || "?";
  const sourceFile = lxxRaw.sourceFile || "?";

  console.log(
    `Génesis ${chapter} — LXX base: ${edition} (${sourceFile}) vs interlinear-snapshot${
      foldAccents ? " [comparación sin diacríticos griegos]" : ""
    }\n`
  );

  const versesObj = snapRaw.verses || {};
  const vKeys = Object.keys(versesObj).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  let mismatchVerses = 0;

  for (const vk of vKeys) {
    const v = versesObj[vk];
    const mtV = v.mt_verse != null ? Number(v.mt_verse) : parseInt(vk, 10);
    const lxxV = v.lxx_verse != null ? Number(v.lxx_verse) : mtV;
    const shifted = Boolean(v.mt_lxx_verse_shifted);
    const verseKeyForLxx = String(lxxV);

    const baseWords = baseVerseWords(lxxRaw, verseKeyForLxx);
    const snapWords = snapshotVerseGreekWords(v.segments);

    const baseM = multiset(baseWords, foldAccents);
    const snapM = multiset(snapWords, foldAccents);
    const { onlyBase, onlySnap } = multisetDiff(baseM, snapM);

    if (onlyBase.length === 0 && onlySnap.length === 0) continue;

    mismatchVerses++;
    const shiftNote = shifted ? ` [MT ${mtV} → LXX v${lxxV}]` : "";
    console.log(`--- ${chapter}:${vk}${shiftNote}`);
    if (onlyBase.length) {
      console.log(`  Faltan en snapshot/DOCX (en LXX base): ${onlyBase.join(", ")}`);
    }
    if (onlySnap.length) {
      console.log(`  Sobran en snapshot/DOCX (no en LXX base v${lxxV}): ${onlySnap.join(", ")}`);
    }
    console.log(`  (tokens LXX base: ${baseWords.length}, palabras griegas en snapshot: ${snapWords.length})\n`);
  }

  if (mismatchVerses === 0) {
    console.log(
      "Sin discrepancias de multiset por versículo (palabras del LXX base todas presentes en snapshot, sin sobras)."
    );
  } else {
    console.log(`\nVersículos con diferencias de multiset: ${mismatchVerses}`);
  }
}

main();
