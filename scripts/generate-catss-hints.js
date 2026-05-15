#!/usr/bin/env node
'use strict';

/**
 * Genera modulos editorial lxx-mt-word-hints usando alineaciones CATSS (CCAT/Michigan).
 *
 * Punto importante: la transliteracion hebrea de CATSS es solo puente consonantico
 * hacia tokens/morfemas del interlineal local (IdiomaORIGEN/interlineal), que siguen la
 * morfologia y maquetacion ya implementadas en admin-morfologia.js.
 *
 * Uso ejemplo (PowerShell):
 *   node scripts/generate-catss-hints.js `
 *     --catss catss-sample/parsed-genesis-1-5.json `
 *     --interlinear "IdiomaORIGEN/interlineal/chapters/01_Génesis/1.json" `
 *     --lxx LXX/chapters/Gen/1.json `
 *     --slug genesis --chapter 1 `
 *     --shift IdiomaORIGEN/lxx-mt-verse-shift.min.json `
 *     --out IdiomaORIGEN/lxx-mt-word-hints/chapters/genesis/1.json
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function readJson(p){
  const abs = path.isAbsolute(p) ? p : path.join(ROOT, p);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function ensureDir(p){
  fs.mkdirSync(p, { recursive: true });
}

function loadBrowserGlobal(scriptPath){
  const code = fs.readFileSync(path.join(ROOT, scriptPath), 'utf8');
  vm.runInThisContext(code, { filename: scriptPath });
}

loadBrowserGlobal('hebrew-grammar-rules.js');
loadBrowserGlobal('admin-interlinear-engine.js');
loadBrowserGlobal('admin-lxx-layer.js');

const Engine = global.AdminHebrewInterlinearEngine;
const LxxLayer = global.AdminOtLxxLayer;

if(!Engine?.buildAdminVersePlan || !LxxLayer?.targetLxxVerseFromShiftTable){
  console.error('Falta AdminHebrewInterlinearEngine / AdminOtLxxLayer despues de cargar scripts.');
  process.exit(1);
}

const { normalizeHebrew } = Engine;

/** === Maquetacion de morfemas como admin-morfologia (merge visible) === */

function isNiqqudOnlySurface(value){
  return /^[\u0591-\u05BD\u05BF-\u05C7]+$/.test(String(value || '').trim());
}

function isMaqafOnlySurface(value){
  return /^[\u05BE]+$/.test(String(value || '').trim());
}

function isArticleOnlyMorphemeRow(morphemes){
  const items = Array.isArray(morphemes) ? morphemes : [];
  return items.length > 0 && items.every((morpheme) => String(morpheme?.label || '').trim().toUpperCase() === 'ART');
}

function countHebrewLetters(value){
  const match = String(value || '').match(/[\u05D0-\u05EA]/g);
  return match ? match.length : 0;
}

function canDisplayMaqafOnRow(token, morphemes){
  const items = Array.isArray(morphemes) ? morphemes : [];
  if(!items.length) return false;
  if(isArticleOnlyMorphemeRow(items)) return false;

  const baseMorphemes = items.filter((morpheme) => String(morpheme?.type || '').trim().toLowerCase() === 'base');
  if(!baseMorphemes.length) return false;

  const baseLabels = baseMorphemes.map((morpheme) => String(morpheme?.label || '').trim().toUpperCase());
  const strong = String(token?.strong || token?.strongs || '').trim().toUpperCase();
  const surface = String(token?.orig || '');
  const letterCount = countHebrewLetters(surface);

  if(strong){
    if(letterCount <= 1 && baseLabels.every((label) => /^(PREP|CONJ|REL|ART)$/.test(label))) return false;
    return true;
  }

  if(baseLabels.every((label) => /^(ART|CONJ)$/.test(label))) return false;
  if(letterCount <= 1 && baseLabels.every((label) => /^(PREP|CONJ|REL|ART)$/.test(label))) return false;

  return true;
}

function appendVisibleMaqafToRow(token, morphemes){
  const tokenSurface = String(token?.orig || '');
  if(!tokenSurface.includes('\u05BE')) return morphemes;
  if(!canDisplayMaqafOnRow(token, morphemes)) return morphemes;
  const cloned = (Array.isArray(morphemes) ? morphemes : []).map((morpheme) => ({ ...morpheme }));
  if(!cloned.length) return cloned;
  if(cloned.some((morpheme) => String(morpheme?.surface || '').includes('\u05BE'))){
    return cloned;
  }
  const lastMorpheme = cloned[cloned.length - 1];
  lastMorpheme.surface = `${lastMorpheme.surface || ''}\u05BE`;
  return cloned;
}

function mergeDisplayMorphemes(items){
  const merged = [];
  items.forEach((item) => {
    const current = {
      token: item.token,
      morphemes: (Array.isArray(item.morphemes) ? item.morphemes : []).map((morpheme) => ({ ...morpheme }))
    };
    if(
      current.morphemes.length === 1 &&
      isNiqqudOnlySurface(current.morphemes[0]?.surface) &&
      merged.length
    ){
      const previous = merged[merged.length - 1];
      const lastMorpheme = previous.morphemes[previous.morphemes.length - 1];
      if(lastMorpheme){
        lastMorpheme.surface = `${lastMorpheme.surface || ''}${current.morphemes[0].surface || ''}`;
        const extraLabel = String(current.morphemes[0].label || '').trim();
        const extraGloss = String(current.morphemes[0].gloss || '').trim();
        if(extraLabel){
          lastMorpheme.label = lastMorpheme.label && lastMorpheme.label !== extraLabel
            ? `${lastMorpheme.label}+${extraLabel}`
            : (lastMorpheme.label || extraLabel);
        }
        if(extraGloss){
          lastMorpheme.gloss = lastMorpheme.gloss && lastMorpheme.gloss !== extraGloss
            ? `${lastMorpheme.gloss} ${extraGloss}`.trim()
            : (lastMorpheme.gloss || extraGloss);
        }
      }
      return;
    }
    if(
      current.morphemes.length === 1 &&
      isMaqafOnlySurface(current.morphemes[0]?.surface) &&
      merged.length
    ){
      const previous = merged[merged.length - 1];
      const lastMorpheme = previous.morphemes[merged.length - 1];
      if(lastMorpheme){
        lastMorpheme.surface = `${lastMorpheme.surface || ''}${current.morphemes[0].surface || ''}`;
      }
      return;
    }
    merged.push(current);
  });
  return merged;
}

function normalizeTokenNumKey(token){
  const n = token && token.num;
  if(Array.isArray(n)){ return n.map((x) => String(x)).join(','); }
  return String(n ?? '');
}

/** Mapa consonantico CCAT (Genesis sample; amplia si encuentras grafemas omitidos). */
const CCAT_CONS = Object.assign(Object.create(null), {
  A: '',
  '+': '\u05D8', /** tet en betacódigo CCAT; p.ej. +WB ↔ טוב */
  ')': '\u05D0', '(': '\u05E2',
  B: '\u05D1', G: '\u05D2', D: '\u05D3', H: '\u05D4', W: '\u05D5', Z: '\u05D6',
  X: '\u05D7', V: '\u05D8', /** V raro; Genesis no lo usa tanto */
  J: '\u05D9', Y: '\u05D9', /** yod frecuente como Y en CCAT */
  K: '\u05DB', L: '\u05DC', M: '\u05DE', N: '\u05E0', /** nun no-final en interior de palabra */
  S: '\u05E1', // samekh
  P: '\u05E4',
  C: '\u05E6',
  Q: '\u05E7', R: '\u05E8',
  '$': '\u05E9',
  T: '\u05EA',
  '[': '', ']': ''
});

function ccatToLocalConsonants(ccatFrag){
  const u = [];
  const s = String(ccatFrag || '').replace(/\//g, '');
  for(let i = 0; i < s.length; i += 1){
    const ch = s[i];
    const m = CCAT_CONS[ch];
    if(m !== '' && m != null){ u.push(m); }
  }
  return normalizeHebrew(u.join(''), false);
}

function localColumnsConsonants(columns, from, Span){
  const parts = [];
  for(let i = 0; i < Span; i += 1){
    parts.push(normalizeHebrew(columns[from + i].hebrew || '', false));
  }
  return normalizeHebrew(parts.join(''), false);
}

/** TLG betacode CATSS paralelo Michigan: aqui X equivale casi siempre a χ (p.ej. A)RXH=|). */
const TLG_GK = Object.assign(Object.create(null), {
  A: 'α', B: 'β', G: 'γ', D: 'δ', E: 'ε', Z: 'ζ', H: 'η', Q: 'θ',
  I: 'ι', K: 'κ', L: 'λ', M: 'μ', N: 'ν', X: 'χ', O: 'ο', P: 'π',
  R: 'ρ', S: 'σ', T: 'τ', U: 'υ', F: 'φ', C: 'ξ', Y: 'ψ', W: 'ω', V: 'ϝ'
});

function stripTlgMarks(s){
  return String(s || '').replace(/\^+/g, '');
}

/** Articulos / monosilabos muy frecuentes en muestra Genesis CATSS */
function tlgLettersToRough(sRaw){
  const normKey = stripTlgMarks(String(sRaw || '').trim()).toUpperCase().replace(/\s+/g, '');
  /** `\)=` en betacódigo CCAT marca circumflejo + siguiente cons.; `H`=η. */
  if(normKey === 'H)=N'){ return normalizeGreekRough('ἦν'); }

  const s01 = stripTlgMarks(String(sRaw || '').trim());
  let s = s01;
  let prefix = '';

  while(true){
    if(/^A\)/.test(s)){
      prefix += 'ἀ'; s = s.slice(2); continue;
    }
    if(/^E\)/.test(s)){
      prefix += 'ἐ'; s = s.slice(2); continue;
    }
    if(/^O\(/.test(s)){
      prefix += 'ὁ'; s = s.slice(2); continue;
    }
    if(/^H\(/.test(s)){
      prefix += 'ἡ'; s = s.slice(2); continue;
    }
    if(/^AI\(/.test(s)){
      prefix += 'αἱ'; s = s.slice(3); continue;
    }
    if(/^TO\\N$/i.test(s) || /^TON$/i.test(s)){
      prefix += 'τόν'; s = ''; break;
    }
    if(/^TO=$/i.test(s) || /^THN$/i.test(s) || /^TH=$/i.test(s)){
      prefix += 'τήν'; s = ''; break;
    }
    if(/^TW=$/i.test(s)) { prefix += 'τῇ'; s = ''; break; }
    if(/^TH=S$/i.test(s) || /^THS$/i.test(s)){ prefix += 'τῆς'; s = ''; break; }
    if(/^TOU=$/i.test(s) || /^TOU$/i.test(s)){ prefix += 'τοῦ'; s = ''; break; }
    break;
  }

  s = String(s || '').replace(/\//g, '');
  const letters = s.replace(/[^A-Za-z]/g, '').toUpperCase();
  let tail = '';
  for(let i = 0; i < letters.length; i += 1){
    tail += TLG_GK[letters[i]] || '';
  }
  return normalizeGreekRough(prefix + tail);
}

function normalizeGreekRough(s){
  let t = String(s || '').normalize('NFD');
  t = t.replace(/\u0390/g, '\u03B9\u0308').replace(/\u03B0/g, '\u03C5\u0308').replace(/\u0386/g, '\u03AC');
  t = t.replace(/[\u0300-\u036f\u0342]/g, '');
  return t.replace(/\u03C2/g, '\u03C3').toLowerCase();
}

function splitCatssHebrewAtoms(he, gCount){
  const spaceParts = String(he || '').trim().split(/\s+/).filter(Boolean);
  if(spaceParts.length === gCount){ return spaceParts; }
  if(spaceParts.length === 1 && gCount >= 2){
    const slashParts = spaceParts[0].split('/').filter(Boolean);
    if(slashParts.length === gCount){ return slashParts; }
  }
  if(spaceParts.length > 0){ return spaceParts; }
  return [];
}

function splitCatssGreek(grRaw){
  return String(grRaw || '')
    .trim()
    /** En el .par aparece `H( ^ DE\\` (^ entre palabras, no forma parte del betacódigo). */
    .replace(/\s+\^\s+/g, ' ')
    .split(/\s+/)
    .map(stripTlgMarks)
    .map((s) => String(s || '').trim())
    .filter((s) => s && !/^[!?;:.,·]+$/.test(s));
}

/** Encuentra indice Rahlf desde start; refina con prefijos comunes TLG cortos */
function resolveLxxIdx(gTokens, startIdx, tlgAtom){
  const want = normalizeGreekRough(tlgLettersToRough(tlgAtom));
  const wantBare = normalizeGreekRough(tlgLettersToRough(tlgAtom.replace(/^[)\]]/,'')));
  let bestIdx = -1;
  let bestScore = Infinity;
  const windowEnd = Math.min(gTokens.length, startIdx + 18);
  for(let i = startIdx; i < windowEnd; i += 1){
    const cand = normalizeGreekRough(gTokens[i]?.w || '');
    const candLem = normalizeGreekRough(gTokens[i]?.lemma || '');
    const eq = cand === want || candLem === want || cand === wantBare || candLem === wantBare;
    if(eq){
      bestIdx = i; bestScore = 0; break;
    }
    const prefix = cand.startsWith(want) || want.startsWith(cand);
    if(prefix && cand.length){
      bestIdx = i; bestScore = Math.abs(cand.length - want.length); if(bestScore === 0) break;
    }
  }
  return bestIdx;
}

function flattenColumnsMerged(mergedRows){
  const columns = [];
  mergedRows.forEach(({ token, morphemes }) => {
    const tkKey = normalizeTokenNumKey(token);
    const strongs = String(token?.strongs || '').trim();
    (morphemes || []).forEach((m, morphemeIdx) => {
      columns.push({
        tokenNum: tkKey,
        morphemeIdx,
        strongs,
        hebrew: String(m.surface || ''),
        gloss: String(m.gloss || ''),
        label: String(m.label || '')
      });
    });
  });
  return columns;
}

function buildMergedRowsForVerse(verseNode){
  const plan = Engine.buildAdminVersePlan(verseNode, null);
  const rawRows = plan.items.map((entry, posIndex) => {
    const token = entry.token || {};
    const parsedNum = Number(token?.num);
    const tokenIndex = Number.isInteger(parsedNum) && parsedNum >= 1
      ? parsedNum - 1
      : posIndex;
    const fallbackMorphLabel = String(token?.morphs || '').trim() || '-';
    const morphemes = Array.isArray(entry?.layer?.morphemes) && entry.layer.morphemes.length
      ? entry.layer.morphemes
      : [{
          surface: token.orig || '',
          label: fallbackMorphLabel,
          type: 'base',
          gloss: entry?.baseGloss || ''
        }];
    const maqafByToken = appendVisibleMaqafToRow(token, morphemes);
    return { token, morphemes: maqafByToken };
  });
  return mergeDisplayMorphemes(rawRows);
}

/** Una unidad CATSS (fragmento consonantico) puede cubrir uno o mas morfemas locales concatenados */
function unifyFinalSofritForMatch(s){
  return String(s || '')
    /** CCAT usa grafemas "no finales"; el interlineal OSHB usa sofrít (final). */
    .replace(/\u05DA/g, '\u05DB').replace(/\u05DD/g, '\u05DE').replace(/\u05DF/g, '\u05E0')
    .replace(/\u05E3/g, '\u05E4').replace(/\u05E5/g, '\u05E6');
}

function matchOneCatssAtom(columns, colCursor, atomFrag){
  const want = unifyFinalSofritForMatch(normalizeHebrew(ccatToLocalConsonants(atomFrag), false));
  const maxSpan = Math.min(10, columns.length - colCursor);
  for(let span = 1; span <= maxSpan; span += 1){
    const got = unifyFinalSofritForMatch(normalizeHebrew(localColumnsConsonants(columns, colCursor, span), false));
    if(got === want){
      return { ok: true, span };
    }
  }
  return { ok: false, span: 0 };
}

/** Una sola corrida consonantica (CATSS pegado sin / ni espacio) solo para hacer avanzar el cursor cuando el reparto CATSS diverge del interlineal. */
function fuseCatssHebrewRun(heRaw){
  return String(heRaw || '')
    .replace(/\s+/g, '')
    .replace(/\//g, '');
}

function tryAdvanceColCursorHeOnly(columns, colCursor, heRaw){
  const fused = fuseCatssHebrewRun(heRaw);
  if(!fused){ return null; }
  const m = matchOneCatssAtom(columns, colCursor, fused);
  if(!m.ok){ return null; }
  return colCursor + m.span;
}

/** Esqueleto consonantico (una letra util) para partir articulo HA vs lexical. */
function morphemeConsonantSkeleton(surface){
  return unifyFinalSofritForMatch(normalizeHebrew(String(surface || ''), false));
}

/** Resuelve tres átomos TLG CATSS en orden ascendente dentro del verso Rahlf (ventana habitual). */
function resolveTripleGreek(gTokens, gCursor, ga0, ga1, ga2){
  const li0 = resolveLxxIdx(gTokens, gCursor, ga0);
  if(li0 < 0){ return { li0: -1, li1: -1, li2: -1 }; }
  const li1 = resolveLxxIdx(gTokens, li0 + 1, ga1);
  if(li1 < 0){ return { li0, li1: -1, li2: -1 }; }
  const li2 = resolveLxxIdx(gTokens, li1 + 1, ga2);
  return { li0, li1, li2 };
}

function hintRow(col, li, gTokens, extras){
  return {
    tokenNum: col.tokenNum,
    morphemeIdx: col.morphemeIdx,
    lxxIdx: li,
    surface: String(gTokens[li]?.w || ''),
    ...(col.strongs ? { strong: col.strongs } : {}),
    tier: 'hint',
    source: 'catss',
    ...(extras || {})
  };
}

function parseArgs(argv){
  const o = {};
  for(let i = 2; i < argv.length; i += 2){
    const k = argv[i];
    const v = argv[i + 1];
    if(!k || k[0] !== '-') break;
    o[k.replace(/^--/, '')] = v;
  }
  return o;
}

function main(){
  const args = parseArgs(process.argv);
  const catssPath = args.catss;
  const interPath = args.interlinear;
  const lxxPath = args.lxx;
  const slug = args.slug || 'genesis';
  const chapter = Number(args.chapter || 1);
  const outPath = args.out || `IdiomaORIGEN/lxx-mt-word-hints/chapters/${slug}/${chapter}.json`;
  const shiftPath = args.shift || 'IdiomaORIGEN/lxx-mt-verse-shift.min.json';

  if(!catssPath || !interPath || !lxxPath){
    console.error('Uso: node scripts/generate-catss-hints.js --catss <parsed.json> --interlinear <Capitulo.json> --lxx <LXX/Gen/N.json> [--slug genesis] [--chapter 1] [--shift ...] [--out ...]');
    process.exit(1);
  }

  const catss = readJson(catssPath);
  const inter = readJson(interPath);
  const lxxCh = readJson(lxxPath);
  let shiftCfg = { chapters: {} };
  try{
    shiftCfg = readJson(shiftPath);
  }catch(_e){
    shiftCfg = { chapters: {} };
  }

  const versesOut = {};
  const report = { matchedPairs: 0, totalPairs: 0, skipped: [] };

  for(const vdef of catss.verses || []){
    const mtV = Number(vdef.verse);
    if(!Number.isFinite(mtV)) continue;
    const lxxV = LxxLayer.targetLxxVerseFromShiftTable(slug, chapter, mtV, shiftCfg);
    const gTokens = lxxCh?.verses?.[String(lxxV)];
    if(!Array.isArray(gTokens) || !gTokens.length){
      report.skipped.push({ ref: vdef.ref, reason: 'sin tokens LXX' });
      continue;
    }

    const verseNode = inter[String(mtV)];
    if(!verseNode){
      report.skipped.push({ ref: vdef.ref, reason: 'sin verso interlineal' });
      continue;
    }

    const mergedRows = buildMergedRowsForVerse(verseNode);
    const columns = flattenColumnsMerged(mergedRows);

    const hints = [];
    let colCursor = 0;
    let gCursor = 0;

    for(const pair of vdef.pairs || []){
      if(pair.kind && pair.kind !== 'align') continue;
      if(pair.isGreekOmitted) continue;
      const he = String(pair.he || '').trim();
      const gr = String(pair.gr || '').trim();
      if(!he || !gr) continue;
      report.totalPairs += 1;

      const gAtoms = splitCatssGreek(gr);
      let hAtoms = splitCatssHebrewAtoms(he, gAtoms.length);
      if(!hAtoms.length){ hAtoms = [he.replace(/\//g, '')]; }

      /** Caso muy frecuente: dos consonantes hebreas (ej. על + פני), un solo sintagma griego (ἐπάνω). */
      if(gAtoms.length === 1 && hAtoms.length >= 2){
        let ptr = colCursor;
        let matched = true;
        const blk = [];
        for(const atom of hAtoms){
          const m = matchOneCatssAtom(columns, ptr, atom);
          if(!m.ok){ matched = false; break; }
          blk.push(...columns.slice(ptr, ptr + m.span));
          ptr += m.span;
        }
        const li = resolveLxxIdx(gTokens, gCursor, gAtoms[0]);
        if(matched && blk.length && li >= 0){
          blk.forEach((col) => {
            hints.push({
              tokenNum: col.tokenNum,
              morphemeIdx: col.morphemeIdx,
              lxxIdx: li,
              surface: String(gTokens[li]?.w || ''),
              ...(col.strongs ? { strong: col.strongs } : {}),
              tier: 'hint',
              source: 'catss'
            });
          });
          colCursor = ptr;
          gCursor = li + 1;
          report.matchedPairs += 1;
        }else{
          report.skipped.push({ ref: vdef.ref, he, gr, reason: '(N he / 1 gr) sin puente consonantico o griego' });
        }
        continue;
      }

      /** Una palabra lexica MT con articulo+griego CATSS articulo+sust.: una pista substantive al morfema local. */
      if(gAtoms.length === 2 && hAtoms.length === 1){
        const m = matchOneCatssAtom(columns, colCursor, hAtoms[0]);
        let ptrEnd = null;
        if(m.ok){ ptrEnd = colCursor + m.span; }
        if(ptrEnd == null){
          const alt = matchOneCatssAtom(columns, colCursor, fuseCatssHebrewRun(he));
          if(alt.ok){ ptrEnd = colCursor + alt.span; }
        }
        let liArt = resolveLxxIdx(gTokens, gCursor, gAtoms[0]);
        const scanSub = liArt >= 0 ? Math.max(liArt + 1, gCursor) : gCursor;
        let liSub = resolveLxxIdx(gTokens, scanSub, gAtoms[1]);
        if(liSub < 0){ liSub = resolveLxxIdx(gTokens, gCursor, gAtoms[1]); }
        /** Si no hay segunda resolución, usar la primera (raro) */
        const liChosen = liSub >= 0 ? liSub : liArt;

        if(ptrEnd != null && liChosen >= 0){
          const blockCols = columns.slice(colCursor, ptrEnd);
          blockCols.forEach((col) => {
            hints.push({
              tokenNum: col.tokenNum,
              morphemeIdx: col.morphemeIdx,
              lxxIdx: liChosen,
              surface: String(gTokens[liChosen]?.w || ''),
              ...(col.strongs ? { strong: col.strongs } : {}),
              tier: 'hint',
              source: 'catss',
              catssNote: gAtoms.length > 1 && liChosen === liSub
                ? 'CATSS dio artic.+sustantivo; solo el sustantivo enlaza al morfema local.'
                : undefined
            });
          });
          const lastIdx = Math.max(liArt >= 0 ? liArt : -1, liSub >= 0 ? liSub : -1);
          if(lastIdx >= 0){ gCursor = lastIdx + 1; }
          colCursor = ptrEnd;
          report.matchedPairs += 1;
        }else{
          const advOnly = tryAdvanceColCursorHeOnly(columns, colCursor, he);
          if(advOnly != null){
            colCursor = advOnly;
            report.skipped.push({ ref: vdef.ref, he, gr, reason: '1 he / 2 gr: sólo puente consonantico hacia siguiente par' });
          }else{
            report.skipped.push({ ref: vdef.ref, he, gr, reason: `conteo/sin match (1 he / ${gAtoms.length} gr)` });
          }
        }
        continue;
      }

      /** CATSS 2 he / 3 gr: primer hebreo ↔ kai; segundo bloque HA+lexical ↔ artículo+último sintagma griego. */
      if(gAtoms.length === 3 && hAtoms.length === 2){
        let ptr = colCursor;
        const mA = matchOneCatssAtom(columns, ptr, hAtoms[0]);
        if(mA.ok){
          const blockA = columns.slice(ptr, ptr + mA.span);
          ptr += mA.span;
          const mB = matchOneCatssAtom(columns, ptr, hAtoms[1]);
          if(mB.ok){
            const blockB = columns.slice(ptr, ptr + mB.span);
            const { li0: liKai, li1: liThn, li2: liGhn } =
              resolveTripleGreek(gTokens, gCursor, gAtoms[0], gAtoms[1], gAtoms[2]);
            if(liKai >= 0 && liThn >= 0 && liGhn >= 0){
              blockA.forEach((col) => hints.push(hintRow(col, liKai, gTokens, {})));
              blockB.forEach((col) => {
                const liChosen = morphemeConsonantSkeleton(col.hebrew) === '\u05D4' ? liThn : liGhn;
                hints.push(hintRow(col, liChosen, gTokens, {
                  catssNote:
                    morphemeConsonantSkeleton(col.hebrew) === '\u05D4'
                      ? 'CATSS 2×he/3×gr: morfema artículo (ה) ↔ 2º token griego.'
                      : 'CATSS 2×he/3×gr: morfema lexical ↔ 3er token griego.'
                }));
              });
              colCursor = ptr + mB.span;
              gCursor = liGhn + 1;
              report.matchedPairs += 1;
              continue;
            }
          }
        }
      }

      /** CATSS 1 he / 3 gr: kai + (ἀνὰ) + μέσον ↔ vav+(בין): primer morfema=caí; ἀνὰ sin par MT; μέσων↔BYN. */
      if(gAtoms.length === 3 && hAtoms.length === 1){
        let mBlk = matchOneCatssAtom(columns, colCursor, hAtoms[0]);
        let ptrSpan = null;
        if(mBlk.ok){ ptrSpan = mBlk.span; }
        else{
          const ff = fuseCatssHebrewRun(he);
          if(ff){
            const alt = matchOneCatssAtom(columns, colCursor, ff);
            if(alt.ok){ mBlk = alt; ptrSpan = alt.span; }
          }
        }
        if(ptrSpan != null && mBlk.ok){
          const blk = columns.slice(colCursor, colCursor + ptrSpan);
          const { li0: liK, li2: liMes } = resolveTripleGreek(gTokens, gCursor, gAtoms[0], gAtoms[1], gAtoms[2]);
          if(liK >= 0 && liMes >= 0 && blk.length){
            blk.forEach((col) => {
              const mono = morphemeConsonantSkeleton(col.hebrew);
              const chosen = mono === '\u05D5' ? liK : liMes;
              hints.push(hintRow(col, chosen, gTokens, mono === '\u05D5' ? {} : {
                catssNote: 'CATSS 1×he/3×gr: μέσον (último token) enlaza בין; el 2º griego ἀνὰ queda implicito.'
              }));
            });
            colCursor += ptrSpan;
            gCursor = liMes + 1;
            report.matchedPairs += 1;
            continue;
          }
        }
      }

      if(gAtoms.length !== hAtoms.length){
        const adv = tryAdvanceColCursorHeOnly(columns, colCursor, he);
        if(adv != null){
          colCursor = adv;
          report.skipped.push({ ref: vdef.ref, he, gr, reason: `conteo CATSS (${hAtoms.length} he / ${gAtoms.length} gr): avanzó hebreo sin hint LXX` });
        }else{
          report.skipped.push({ ref: vdef.ref, he, gr, reason: `conteo CATSS (${hAtoms.length} he / ${gAtoms.length} gr)` });
        }
        continue;
      }

      let ptr = colCursor;
      let okAll = true;
      const stagedBlocks = []; // { cols: column[], li: number }

      for(let ai = 0; ai < hAtoms.length; ai += 1){
        const m = matchOneCatssAtom(columns, ptr, hAtoms[ai]);
        if(!m.ok){
          okAll = false; break;
        }
        const blockCols = columns.slice(ptr, ptr + m.span);
        ptr += m.span;

        const li = resolveLxxIdx(gTokens, gCursor, gAtoms[ai]);
        if(li < 0){ okAll = false; break; }
        stagedBlocks.push({ cols: blockCols, li });
        gCursor = li + 1;
      }

      if(!okAll){
        const advFail = tryAdvanceColCursorHeOnly(columns, colCursor, he);
        if(advFail != null){
          colCursor = advFail;
          report.skipped.push({ ref: vdef.ref, he, gr, reason: 'griego CATSS sin match Rahlf; avanzó solo hebreo' });
        }else{
          report.skipped.push({ ref: vdef.ref, he, gr, reason: 'puente consonantico o griego CATSS sin match Rahlf' });
        }
        continue;
      }

      stagedBlocks.forEach(({ cols, li }) => {
        cols.forEach((col) => {
          hints.push({
            tokenNum: col.tokenNum,
            morphemeIdx: col.morphemeIdx,
            lxxIdx: li,
            surface: String(gTokens[li]?.w || ''),
            ...(col.strongs ? { strong: col.strongs } : {}),
            tier: 'hint',
            source: 'catss'
          });
        });
      });

      colCursor = ptr;
      report.matchedPairs += 1;
    }

    if(hints.length){
      versesOut[String(mtV)] = hints;
    }
  }

  const chapterDoc = `Generado desde CATSS (${catss._file || catssPath}) como puente hacia tokens locales + LXX Rahlf. Revisar \`skipped\` en reporte.`,
    outAbs = path.isAbsolute(outPath) ? outPath : path.join(ROOT, outPath),
    chapterJson = {
      _schema: 'lxx-mt-word-hints-chapter-v1',
      _doc: chapterDoc,
      slug,
      chapter,
      verses: versesOut,
      _catss_generator: {
        catssSource: catss._file || path.basename(catssPath),
        interlinear: path.basename(interPath),
        lxx: path.basename(lxxPath),
        report,
        warnings: [
          'El hebreo CCAT solo se uso para ubicar consonantes locales; glosses y etiquetas siguen siendo los del proyecto.',
          'Las pistas con propiedad extra `source: \"catss\"` son consumibles igual que `tier: hint`; el UI ignora props desconocidas.'
        ]
      }
    };

  ensureDir(path.dirname(outAbs));
  fs.writeFileSync(outAbs, JSON.stringify(chapterJson, null, 2), 'utf8');
  console.log(`Escrito: ${outAbs}`);
  console.log(`Pares emparejados: ${report.matchedPairs}/${report.totalPairs}`);
  if(report.skipped.length){
    console.log(`Saltados (${report.skipped.length} muestra hasta 15):`);
    console.log(report.skipped.slice(0, 15));
  }
}

main();
