#!/usr/bin/env node
/*
 * Exporta un congelado del laboratorio admin-interlinear (misma pipeline que admin-morfologia.js):
 * hebreo punktado + morfología impresa + glosa española + griego LXX alineado (tier firm/soft/hint/auto).
 *
 * Uso:
 *   node scripts/export-interlinear-snapshot.js --all --out IdiomaORIGEN/interlinear-snapshot
 *   node scripts/export-interlinear-snapshot.js --book genesis --chapter 1 --out exports/snap
 *
 * Opciones:
 *   --write-jsonl              Genera tokens.jsonl (>100MB; no subir a GitHub sin LFS). Por defecto NO.
 *   --no-verse-shards          No escribe by-verse/ (por defecto SÍ: un JSON pequeño por versículo).
 *
 * Salida:
 *   <out>/manifest.json
 *   <out>/chapters/<slug>/<n>.json     — panel admin estático (una petición por capítulo)
 *   <out>/by-verse/<slug>/<n>/<v>.json — mismo contenido por versículo (CDN, workers, uploads por lotes)
 *   <out>/by-verse/<slug>/<n>/_index.json — lista de números de versículo en el capítulo
 *   <out>/tokens.jsonl          — solo si pasas --write-jsonl
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ADMIN_DATA_VERSION = '2026-05-17';

const OT_BOOKS = [
  ['genesis', 'Genesis', '01_Génesis.json'],
  ['exodo', 'Exodo', '02_Éxodo.json'],
  ['levitico', 'Levitico', '03_Levítico.json'],
  ['numeros', 'Numeros', '04_Números.json'],
  ['deuteronomio', 'Deuteronomio', '05_Deuteronomio.json'],
  ['josue', 'Josue', '06_Josué.json'],
  ['jueces', 'Jueces', '07_Jueces.json'],
  ['rut', 'Rut', '08_Rut.json'],
  ['1_samuel', '1 Samuel', '09_1_Samuel.json'],
  ['2_samuel', '2 Samuel', '10_2_Samuel.json'],
  ['1_reyes', '1 Reyes', '11_1_Reyes.json'],
  ['2_reyes', '2 Reyes', '12_2_Reyes.json'],
  ['1_cronicas', '1 Cronicas', '13_1_Crónicas.json'],
  ['2_cronicas', '2 Cronicas', '14_2_Crónicas.json'],
  ['esdras', 'Esdras', '15_Esdras.json'],
  ['ezra', 'Ezra', '15_Esdras.json'],
  ['nehemias', 'Nehemias', '16_Nehemías.json'],
  ['ester', 'Ester', '17_Ester.json'],
  ['job', 'Job', '18_Job.json'],
  ['salmos', 'Salmos', '19_Salmos.json'],
  ['proverbios', 'Proverbios', '20_Proverbios.json'],
  ['eclesiastes', 'Eclesiastes', '21_Eclesiastés.json'],
  ['cantares', 'Cantares', '22_Cantares.json'],
  ['isaias', 'Isaias', '23_Isaías.json'],
  ['jeremias', 'Jeremias', '24_Jeremías.json'],
  ['lamentaciones', 'Lamentaciones', '25_Lamentaciones.json'],
  ['ezequiel', 'Ezequiel', '26_Ezequiel.json'],
  ['daniel', 'Daniel', '27_Daniel.json'],
  ['oseas', 'Oseas', '28_Oseas.json'],
  ['joel', 'Joel', '29_Joel.json'],
  ['amos', 'Amos', '30_Amós.json'],
  ['abdias', 'Abdias', '31_Abdías.json'],
  ['jonas', 'Jonas', '32_Jonás.json'],
  ['miqueas', 'Miqueas', '33_Miqueas.json'],
  ['nahum', 'Nahum', '34_Nahúm.json'],
  ['habacuc', 'Habacuc', '35_Habacuc.json'],
  ['sofonias', 'Sofonias', '36_Sofonías.json'],
  ['hageo', 'Hageo', '37_Hageo.json'],
  ['zacarias', 'Zacarias', '38_Zacarías.json'],
  ['malaquias', 'Malaquias', '39_Malaquías.json']
];

const BOOK_MAP = new Map(OT_BOOKS.map(([slug, label, file]) => [slug, { slug, label, file }]));

function readJson(absPath){
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function ensureDir(p){
  fs.mkdirSync(p, { recursive: true });
}

function loadBrowserGlobals(){
  globalThis.window = globalThis;
  const stubs = `
    var document = { getElementById: function() { return null; } };
  `;
  const files = [
    'hebrew-grammar-rules.js',
    'admin-interlinear-engine.js',
    'admin-lxx-layer.js',
    'admin-lxx-word-hints.js',
    'admin-lxx-align.js',
    'admin-lxx-auto-strong.js',
    'admin-lxx-global-policy.js'
  ];
  vm.runInThisContext(stubs, { filename: 'stubs.js' });
  for(const f of files){
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInThisContext(src, { filename: f });
  }
}

async function loadJsonFromDisk(rel){
  const clean = String(rel || '').split('?')[0].replace(/^\.\//, '');
  const abs = path.join(ROOT, clean);
  const raw = await fs.promises.readFile(abs, 'utf8');
  return JSON.parse(raw);
}

/** === Morfología contextual (copiado de admin-morfologia.js, índice síncrono) === */

const VERBAL_FORM_MAP = {
  s: 'PERF',
  m: 'WAYYIQT',
  f: 'SEQ.PERF',
  p: 'PTCA',
  v: 'PTCA',
  t: 'PTCP',
  r: 'PTCP',
  S: 'PERF',
  M: 'IMPF',
  F: 'IMPF',
  C: 'COHORT',
  J: 'JUSS',
  I: 'IMPV',
  T: 'INFC',
  A: 'INFA',
  P: 'PTCA',
  R: 'PTCP'
};

function decodeHebrewMorphCode(rawCode){
  const code = String(rawCode || '').trim();
  if(!code) return '';
  const upper = code.toUpperCase();
  if(/^INTJ\./.test(upper)) return 'INTJ';
  if(code.includes('.')) return code;

  const exact = {
    PB: 'PREP', PM: 'PREP', PA: 'PART.OBJ.DIR', CC: 'CONJ', CS: 'CONJ', CO: 'CONJ',
    AA: 'ADJ', AC: 'ADJ', AV: 'ADV', RD: 'ART', RI: 'INTERR', RP: 'PRON', RR: 'REL',
    TD: 'ART', TI: 'INTERR', TN: 'NEG', TP: 'PRON', TR: 'REL', XC: 'CONJ', XD: 'ART',
    XN: 'NEG', XP: 'PART', XR: 'REL', XT: 'PART'
  };
  if(exact[upper]) return exact[upper];

  const stemMap = { Q: 'QAL', N: 'NIF', P: 'PIEL', H: 'HIF', T: 'HIT', V: 'HOF', O: 'POLEL', M: 'POAL' };
  const numberMap = { S: 'SG', P: 'PL', D: 'DU' };
  const genderMap = { M: 'M', F: 'F', C: 'C', U: 'U' };

  const simpleVerb = code.match(/^V([A-Za-z])A([A-Za-z])([SPDspd])([MFCUmfcu])([123])$/);
  if(simpleVerb){
    const [, stemCode, formCode, numberCode, genderCode, personCode] = simpleVerb;
    const stemKey = stemCode.toUpperCase();
    const stem = stemMap[stemKey] || stemKey;
    const form = VERBAL_FORM_MAP[formCode] || VERBAL_FORM_MAP[formCode.toUpperCase()] || formCode.toUpperCase();
    const number = numberMap[numberCode.toUpperCase()] || numberCode.toUpperCase();
    const gender = genderMap[genderCode.toUpperCase()] || genderCode.toUpperCase();
    return `VERBO.${stem}.${form}.P${personCode}.${gender}.${number}`;
  }
  return upper;
}

function hydrateMorphIndexFromPrecomputed(precomputed){
  if(!precomputed || typeof precomputed !== 'object') return null;
  const sourcePointed = precomputed.byPointed || precomputed.pointed;
  const sourcePlain = precomputed.byPlain || precomputed.plain;
  const sourceStrong = precomputed.byStrong;
  if(!sourcePointed || !sourcePlain || !sourceStrong) return null;
  const toMap = (obj) => {
    const result = new Map();
    if(!obj) return result;
    for(const key of Object.keys(obj)){
      const value = obj[key];
      if(Array.isArray(value)) result.set(key, value);
    }
    return result;
  };
  return {
    pointed: toMap(sourcePointed),
    plain: toMap(sourcePlain),
    byStrong: toMap(sourceStrong)
  };
}

function pickMorphCandidate(candidates, token, normalizeHebrew){
  if(!Array.isArray(candidates) || !candidates.length) return '';
  const tokenPointed = normalizeHebrew(token?.orig || '', true);
  const tokenPlain = normalizeHebrew(token?.orig || '', false);
  const exactPointed = candidates.find((candidate) => normalizeHebrew(candidate?.form || '', true) === tokenPointed && candidate?.morph);
  if(exactPointed) return exactPointed.morph;
  const exactPlain = candidates.find((candidate) => normalizeHebrew(candidate?.form || '', false) === tokenPlain && candidate?.morph);
  if(exactPlain) return exactPlain.morph;
  return candidates.find((candidate) => candidate?.morph)?.morph || '';
}

function pickStrongMorphCandidate(entries, token, normalizeHebrew){
  if(!Array.isArray(entries) || !entries.length) return '';
  const firstEntry = entries[0] || null;
  const tokenPointed = normalizeHebrew(token?.orig || '', true);
  const tokenPlain = normalizeHebrew(token?.orig || '', false);
  const forms = Array.isArray(firstEntry?.formas) ? firstEntry.formas : [];
  const morphs = Array.isArray(firstEntry?.morfs) ? firstEntry.morfs : [];

  for(let i = 0; i < forms.length; i += 1){
    const formPointed = normalizeHebrew(forms[i], true);
    const formPlain = normalizeHebrew(forms[i], false);
    const morph = String(morphs[i] || '').trim();
    if(!morph) continue;
    if((formPointed && formPointed === tokenPointed) || (formPlain && formPlain === tokenPlain)){
      return /^INTJ\./i.test(morph) ? 'INTJ' : morph;
    }
  }
  const fallbackMorph = String(morphs[0] || '').trim();
  return /^INTJ\./i.test(fallbackMorph) ? 'INTJ' : fallbackMorph;
}

function resolveMorphLabelSync(token, context, morphIndex, Engine){
  const normalizeHebrew = Engine.normalizeHebrew;
  const normalizeStrong = Engine.normalizeStrong;

  const oshbLabel = Engine.getOshbMorphAt(context.oshbVerseNode, token, context.tokenIndex ?? -1);
  if(oshbLabel) return oshbLabel;

  const strongKey = normalizeStrong(token?.strongs);
  const decodedTokenMorph = decodeHebrewMorphCode(token?.morphs);

  if(/^VERBO\./.test(decodedTokenMorph) || /^PART\.OBJ\.DIR$/.test(decodedTokenMorph)){
    return decodedTokenMorph;
  }

  if(morphIndex){
    if(strongKey){
      const strongLabel = pickStrongMorphCandidate(morphIndex.byStrong.get(strongKey), token, normalizeHebrew);
      if(strongLabel) return strongLabel;
    }

    if(!strongKey && decodedTokenMorph && decodedTokenMorph !== String(token?.morphs || '').trim().toUpperCase()){
      return decodedTokenMorph;
    }

    const pointedKey = normalizeHebrew(token?.orig || '', true);
    const plainKey = normalizeHebrew(token?.orig || '', false);
    const label = pickMorphCandidate(morphIndex.pointed.get(pointedKey), token, normalizeHebrew)
      || pickMorphCandidate(morphIndex.plain.get(plainKey), token, normalizeHebrew);
    if(label) return label;
  }

  if(decodedTokenMorph) return decodedTokenMorph;
  return String(token?.morphs || '').trim();
}

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

function resolveOshbFormIndex(token, tokenIndex, oshbVerseNode, normalizeHebrew){
  const forms = Array.isArray(oshbVerseNode?.forms) ? oshbVerseNode.forms : [];
  if(!forms.length) return -1;

  const tokenPointed = normalizeHebrew(token?.orig || '', true);
  const tokenPlain = normalizeHebrew(token?.orig || '', false);
  const matchesToken = (form) => {
    const pointed = normalizeHebrew(form, true);
    const plain = normalizeHebrew(form, false);
    return (tokenPointed && pointed === tokenPointed) || (tokenPlain && plain === tokenPlain);
  };

  if(Number.isInteger(tokenIndex) && tokenIndex >= 0 && tokenIndex < forms.length && matchesToken(forms[tokenIndex])){
    return tokenIndex;
  }

  const start = Math.max(0, tokenIndex - 2);
  const end = Math.min(forms.length - 1, tokenIndex + 2);
  for(let index = start; index <= end; index += 1){
    if(matchesToken(forms[index])) return index;
  }

  for(let index = 0; index < forms.length; index += 1){
    if(matchesToken(forms[index])) return index;
  }

  return -1;
}

function appendVisibleMaqafFromOshb(token, tokenIndex, oshbVerseNode, morphemes, normalizeHebrew){
  const forms = Array.isArray(oshbVerseNode?.forms) ? oshbVerseNode.forms : [];
  if(!forms.length || !Number.isInteger(tokenIndex) || tokenIndex < 0) return morphemes;
  if(!canDisplayMaqafOnRow(token, morphemes)) return morphemes;
  const currentIndex = resolveOshbFormIndex(token, tokenIndex, oshbVerseNode, normalizeHebrew);
  if(currentIndex < 0) return morphemes;
  const currentForm = String(forms[currentIndex] || '');
  const nextForm = String(forms[currentIndex + 1] || '');
  const maqafOnCurrentLeft = currentForm.includes('\u05BE') && !currentForm.startsWith('\u05BE');
  const maqafOnNextRight = nextForm.startsWith('\u05BE');
  const shouldShowMaqaf = maqafOnCurrentLeft || maqafOnNextRight;
  if(!shouldShowMaqaf) return morphemes;

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
      const lastMorpheme = previous.morphemes[previous.morphemes.length - 1];
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

function hasHebrewConsonantSurf(str){
  return /[\u05D0-\u05EA]/.test(String(str || ''));
}

function buildMergedRows(versePlan, oshbVerseNode, morphIndex, Engine){
  const normalizeHebrew = Engine.normalizeHebrew;
  const rawRows = versePlan.items.map((entry, posIndex) => {
    const token = entry.token || {};
    const parsedNum = Number(token?.num);
    const tokenIndex = Number.isInteger(parsedNum) && parsedNum >= 1
      ? parsedNum - 1
      : posIndex;
    const fallbackMorphLabel = resolveMorphLabelSync(token, {
      oshbVerseNode,
      tokenIndex
    }, morphIndex, Engine);
    const morphemes = Array.isArray(entry?.layer?.morphemes) && entry.layer.morphemes.length
      ? entry.layer.morphemes
      : [{
          surface: token.orig || '',
          label: fallbackMorphLabel || '-',
          type: 'base',
          gloss: entry?.baseGloss || ''
        }];
    const maqafByToken = appendVisibleMaqafToRow(token, morphemes);
    const maqafByOshb = appendVisibleMaqafFromOshb(token, tokenIndex, oshbVerseNode, maqafByToken, normalizeHebrew);
    return { token, morphemes: maqafByOshb };
  });
  return mergeDisplayMorphemes(rawRows);
}

function alignLxxToMergedRows(mergedRows, gTok, wordHintsVerse, Align, Hints, AutoStrong, Policy, policyObj){
  const columns = [];
  mergedRows.forEach(({ token, morphemes }) => {
    const tkKey = Hints ? Hints.normalizeTokenNumKey(token) : normalizeTokenNumKey(token);
    const strongs = String(token?.strongs || '').trim();
    (morphemes || []).forEach((m, morphemeIdx) => {
      columns.push({
        gloss: String(m.gloss || ''),
        label: String(m.label || ''),
        hebrew: String(m.surface || ''),
        tokenNum: tkKey,
        morphemeIdx,
        strongs
      });
    });
  });
  const pack = Align.pairColumnsToGreek(columns, gTok);
  const lxxSurfaces = pack.surfaces;
  const lxxTiers = pack.tiers;
  const verseHints = Array.isArray(wordHintsVerse) ? wordHintsVerse : [];
  if(verseHints.length && Hints){
    Hints.applyHintsToAlignment(columns, lxxSurfaces, lxxTiers, gTok, verseHints);
  }
  if(AutoStrong){
    AutoStrong.fillVerifiedByStrong(columns, lxxSurfaces, lxxTiers, gTok);
  }
  if(Policy && policyObj){
    Policy.apply(columns, lxxSurfaces, lxxTiers, gTok, policyObj);
  }
  return { lxxSurfaces, lxxTiers };
}

function segmentsFromMerged(mergedRows, lxxSurfaces, lxxTiers){
  const segments = [];
  let greekCol = 0;
  for(const { token, morphemes } of mergedRows){
    const tkKey = normalizeTokenNumKey(token);
    const strongs = String(token?.strongs || '').trim();
    for(let mi = 0; mi < (morphemes || []).length; mi += 1){
      const morpheme = morphemes[mi];
      let greekSurf = '';
      let tier = '';
      if(lxxSurfaces){
        greekSurf = String(lxxSurfaces[greekCol] || '').trim();
        tier = lxxTiers && lxxTiers[greekCol] ? String(lxxTiers[greekCol]) : '';
        greekCol += 1;
      }
      const hebrewSurface = String(morpheme.surface || '').trim();
      const gloss = String(morpheme.gloss || '').trim();
      const hasRealGreek = greekSurf && greekSurf !== '—';
      const visibleInAdminUi = hasHebrewConsonantSurf(hebrewSurface) || Boolean(gloss) || hasRealGreek;

      segments.push({
        token_num: tkKey,
        morpheme_index: mi,
        morpheme_type: String(morpheme.type || 'base'),
        hebrew: hebrewSurface,
        morphology: String(morpheme.label || '-'),
        spanish: gloss,
        greek_lxx: greekSurf,
        lxx_tier: tier,
        strongs,
        visible_in_admin_ui: visibleInAdminUi
      });
    }
  }
  return segments;
}

function getBookManifestInfo(manifest, slug){
  return manifest && manifest.books ? manifest.books[slug] : null;
}

const interlinearBookMem = new Map();
const oshbBookMem = new Map();

function readInterlinearChapter(slug, chapter, manifest){
  const book = BOOK_MAP.get(slug);
  if(!book) throw new Error(`Libro desconocido: ${slug}`);
  const info = getBookManifestInfo(manifest, slug);
  const baseName = (info && info.base) || book.file.replace(/\.json$/i, '');

  if(info && info.hasInterlinearChapters){
    const rel = path.join('IdiomaORIGEN', 'interlineal', 'chapters', baseName, `${chapter}.json`);
    const abs = path.join(ROOT, rel);
    if(fs.existsSync(abs)) return readJson(abs);
  }

  if(!interlinearBookMem.has(slug)){
    interlinearBookMem.set(slug, readJson(path.join(ROOT, 'IdiomaORIGEN', 'interlineal', book.file)));
  }
  const full = interlinearBookMem.get(slug);
  return full?.chapters?.[String(chapter)] || null;
}

function readOshbChapter(slug, chapter, manifest){
  const book = BOOK_MAP.get(slug);
  if(!book) return null;
  const info = getBookManifestInfo(manifest, slug);
  const baseName = (info && info.base) || book.file.replace(/\.json$/i, '');

  if(info && info.hasOshbChapters){
    const rel = path.join('IdiomaORIGEN', 'oshb-morph', 'chapters', baseName, `${chapter}.json`);
    const abs = path.join(ROOT, rel);
    if(fs.existsSync(abs)) return readJson(abs);
  }

  if(!oshbBookMem.has(slug)){
    const p = path.join(ROOT, 'IdiomaORIGEN', 'oshb-morph', book.file);
    if(fs.existsSync(p)) oshbBookMem.set(slug, readJson(p));
    else oshbBookMem.set(slug, null);
  }
  const full = oshbBookMem.get(slug);
  if(!full) return null;
  return full?.chapters?.[String(chapter)] || null;
}

function readLxxBundle(slug, chapterNum){
  const Layer = globalThis.AdminOtLxxLayer;
  if(!Layer) return null;
  const picked = Layer.pickEdition(slug);
  if(!picked) return null;
  const atomRel = path.join('LXX', 'chapters', picked.code, `${chapterNum}.json`);
  const atomAbs = path.join(ROOT, atomRel);
  try {
    if(fs.existsSync(atomAbs)){
      const chunk = readJson(atomAbs);
      const versesFromChunk = chunk?.verses;
      const ec = chunk?.edition ? String(chunk.edition) : picked.code;
      if(versesFromChunk && typeof versesFromChunk === 'object' && Object.keys(versesFromChunk).length){
        return { edition: ec, verses: versesFromChunk, source: 'atom' };
      }
    }
  }catch(_e){ /* fallback */ }

  const wholePath = path.join(ROOT, 'LXX', picked.file);
  if(!fs.existsSync(wholePath)) return null;
  const data = readJson(wholePath);
  const verses = data?.text?.[picked.code]?.[String(chapterNum)];
  if(!verses || typeof verses !== 'object') return null;
  return { edition: picked.code, verses, source: 'whole' };
}

function parseArgs(argv){
  const out = {
    all: false,
    book: '',
    chapter: 0,
    outDir: path.join(ROOT, 'IdiomaORIGEN', 'interlinear-snapshot'),
    writeJsonl: false,
    verseShards: true
  };
  for(let i = 2; i < argv.length; i += 1){
    const a = argv[i];
    if(a === '--all') out.all = true;
    else if(a === '--book' && argv[i + 1]){ out.book = argv[++i]; }
    else if(a === '--chapter' && argv[i + 1]){ out.chapter = Number(argv[++i]); }
    else if(a === '--out' && argv[i + 1]){ out.outDir = path.resolve(argv[++i]); }
    else if(a === '--write-jsonl') out.writeJsonl = true;
    else if(a === '--no-verse-shards') out.verseShards = false;
  }
  return out;
}

async function preloadAlignDeps(loadJsonFn){
  await Promise.all([
    globalThis.AdminLxxAlign.ensureMaps(loadJsonFn),
    globalThis.AdminLxxAutoStrong.ensureMap(loadJsonFn)
  ]);
  globalAlignPolicy = await globalThis.AdminLxxGlobalPolicy.ensurePolicy(loadJsonFn).catch(() => (
    globalThis.AdminLxxGlobalPolicy.getDefaultPolicy()
  ));
}

function exportChapter(slug, chapterNum, manifest, morphIndex, shiftCfg, Engine, jsonlStream, exportOpts){
  const verseShards = exportOpts?.verseShards !== false;
  const book = BOOK_MAP.get(slug);
  const bookLabel = book.label;
  const manifestBook = getBookManifestInfo(manifest, slug);
  const labelCanonical = manifestBook?.label || bookLabel;

  const interlinearVerses = readInterlinearChapter(slug, chapterNum, manifest);
  if(!interlinearVerses || typeof interlinearVerses !== 'object'){
    return { verses: 0, segments: 0, skipped: true };
  }

  const oshbChapter = readOshbChapter(slug, chapterNum, manifest);
  const lxxBundle = readLxxBundle(slug, chapterNum);
  let wordHintsChapter = null;
  const hintsPath = path.join(ROOT, 'IdiomaORIGEN', 'lxx-mt-word-hints', 'chapters', slug, `${chapterNum}.json`);
  if(fs.existsSync(hintsPath)){
    try { wordHintsChapter = readJson(hintsPath); }
    catch(_e){ wordHintsChapter = null; }
  }

  const verseNumbers = Object.keys(interlinearVerses).sort((a, b) => Number(a) - Number(b));
  let verseShardDir = null;
  if(verseShards){
    verseShardDir = path.join(outDirEffective, 'by-verse', slug, String(chapterNum));
    ensureDir(verseShardDir);
  }

  const chapterJson = {
    schema: 'interlinear-snapshot-chapter-v1',
    book_slug: slug,
    book_label: labelCanonical,
    book_label_admin_en: bookLabel,
    chapter: chapterNum,
    verses: {}
  };

  let segmentTotal = 0;

  const Align = globalThis.AdminLxxAlign;
  const Hints = globalThis.AdminLxxWordHints;
  const AutoStrong = globalThis.AdminLxxAutoStrong;
  const Policy = globalThis.AdminLxxGlobalPolicy;

  for(const vKey of verseNumbers){
    const hv = Number(vKey);
    if(!Number.isFinite(hv) || hv < 1) continue;

    const verseNode = interlinearVerses[vKey];
    const oshbVerseNode = oshbChapter && typeof oshbChapter === 'object' ? (oshbChapter[vKey] || null) : null;
    const plan = Engine.buildAdminVersePlan(verseNode, oshbVerseNode);
    const mergedRows = buildMergedRows(plan, oshbVerseNode, morphIndex, Engine);

    let lxxSurfaces = null;
    let lxxTiers = null;
    let lxxVerseNum = hv;
    let lxxEdition = '';

    if(lxxBundle?.verses && Align){
      const LxxLayer = globalThis.AdminOtLxxLayer;
      lxxVerseNum = LxxLayer.targetLxxVerseFromShiftTable(slug, chapterNum, hv, shiftCfg || { chapters: {} });
      const gTok = lxxBundle.verses[String(lxxVerseNum)];
      if(Array.isArray(gTok) && gTok.length){
        lxxEdition = String(lxxBundle.edition || '');
        const verseHints = wordHintsChapter?.verses && Array.isArray(wordHintsChapter.verses[String(hv)])
          ? wordHintsChapter.verses[String(hv)]
          : [];
        const aligned = alignLxxToMergedRows(
          mergedRows,
          gTok,
          verseHints,
          Align,
          Hints,
          AutoStrong,
          Policy,
          globalAlignPolicy
        );
        lxxSurfaces = aligned.lxxSurfaces;
        lxxTiers = aligned.lxxTiers;
      }
    }

    const segments = segmentsFromMerged(mergedRows, lxxSurfaces, lxxTiers);
    segmentTotal += segments.length;

    const versePayload = {
      mt_book_slug: slug,
      mt_book_label: labelCanonical,
      mt_chapter: chapterNum,
      mt_verse: hv,
      lxx_edition: lxxEdition,
      lxx_verse: lxxVerseNum,
      mt_lxx_verse_shifted: lxxVerseNum !== hv,
      segments
    };
    chapterJson.verses[String(hv)] = versePayload;

    if(verseShardDir){
      const verseDoc = {
        schema: 'interlinear-snapshot-verse-v1',
        ...versePayload
      };
      fs.writeFileSync(path.join(verseShardDir, `${hv}.json`), JSON.stringify(verseDoc));
    }

    if(jsonlStream){
      let idx = 0;
      for(const seg of segments){
        const row = {
          ref: `${slug}|${chapterNum}|${hv}`,
          ord: idx++,
          ...seg,
          mt_book_slug: slug,
          mt_book_label: labelCanonical,
          mt_chapter: chapterNum,
          mt_verse: hv,
          lxx_edition: lxxEdition,
          lxx_verse: lxxVerseNum
        };
        jsonlStream.write(`${JSON.stringify(row)}\n`);
      }
    }
  }

  const chapterDir = path.join(outDirEffective, 'chapters', slug);
  ensureDir(chapterDir);
  fs.writeFileSync(path.join(chapterDir, `${chapterNum}.json`), JSON.stringify(chapterJson));

  if(verseShardDir && verseNumbers.length){
    const idxPayload = {
      schema: 'interlinear-snapshot-chapter-index-v1',
      book_slug: slug,
      book_label: labelCanonical,
      chapter: chapterNum,
      verses: verseNumbers.map((k) => Number(k)).filter((n) => Number.isFinite(n) && n >= 1)
    };
    fs.writeFileSync(path.join(verseShardDir, '_index.json'), JSON.stringify(idxPayload));
  }

  return { verses: verseNumbers.length, segments: segmentTotal, skipped: false };
}

let outDirEffective = '';
let globalAlignPolicy = null;

async function main(){
  const args = parseArgs(process.argv);
  outDirEffective = args.outDir;

  loadBrowserGlobals();
  const Engine = globalThis.AdminHebrewInterlinearEngine;
  if(!Engine?.buildAdminVersePlan){
    console.error('No se pudo cargar AdminHebrewInterlinearEngine.');
    process.exit(2);
  }

  await preloadAlignDeps(loadJsonFromDisk);

  const morphPre = readJson(path.join(ROOT, 'IdiomaORIGEN', 'morph-index.min.json'));
  const morphIndex = hydrateMorphIndexFromPrecomputed(morphPre);
  if(!morphIndex){
    console.warn('Advertencia: morph-index.min.json no hidrato; etiquetas pueden ser menos ricas.');
  }

  let shiftCfg = { chapters: {} };
  try {
    shiftCfg = readJson(path.join(ROOT, 'IdiomaORIGEN', 'lxx-mt-verse-shift.min.json'));
  }catch(_e){ /* ok */ }

  const manifest = readJson(path.join(ROOT, 'IdiomaORIGEN', 'manifest.json'));

  ensureDir(outDirEffective);
  ensureDir(path.join(outDirEffective, 'chapters'));
  if(args.verseShards){
    ensureDir(path.join(outDirEffective, 'by-verse'));
  }

  let jsonlStream = null;
  if(args.writeJsonl){
    const jsonlPath = path.join(outDirEffective, 'tokens.jsonl');
    jsonlStream = fs.createWriteStream(jsonlPath, { encoding: 'utf8' });
  }

  const exportOpts = { verseShards: args.verseShards };

  let booksToRun = [];
  if(args.all){
    booksToRun = Array.isArray(manifest.bookOrder) && manifest.bookOrder.length
      ? manifest.bookOrder.slice()
      : [...BOOK_MAP.keys()];
  }else if(args.book){
    booksToRun = [args.book];
    if(!BOOK_MAP.has(args.book)){
      console.error(`Slug de libro no válido: ${args.book}`);
      process.exit(1);
    }
    if(!args.chapter || args.chapter < 1){
      console.error('Indica --chapter N cuando no usas --all');
      process.exit(1);
    }
  }else{
    console.error('Usa --all o bien --book <slug> --chapter <n> [--out dir]');
    process.exit(1);
  }

  const snapManifest = {
    schema: 'interlinear-snapshot-bundle-v1',
    exportedAt: new Date().toISOString(),
    adminLaboratorioDataVersion: ADMIN_DATA_VERSION,
    sourceManifestVersion: manifest.version || '',
    layouts: {
      chapters: 'chapters/<slug>/<chapter>.json — una petición por capítulo (admin estático)',
      byVerse: args.verseShards
        ? 'by-verse/<slug>/<chapter>/<verse>.json — consultas por verso, uploads por lote; _index.json lista versículos'
        : '(omitido; sin --verse-shards)'
    },
    tokensJsonl: args.writeJsonl ? 'tokens.jsonl generado (opcional; muy grande)' : 'tokens.jsonl no generado (usar --write-jsonl si lo necesitas)',
    note: 'Segmentos = morfología visible tras merge (admin-interlinear). visible_in_admin_ui replica el filtro HTML.'
  };
  fs.writeFileSync(path.join(outDirEffective, 'manifest.json'), JSON.stringify(snapManifest, null, 2));

  let chaptersDone = 0;
  let versesDone = 0;
  let segmentsDone = 0;

  for(const slug of booksToRun){
    if(!BOOK_MAP.has(slug)) continue;
    const info = getBookManifestInfo(manifest, slug);
    const chapterTotal = info && Number.isInteger(info.chapters) && info.chapters > 0
      ? info.chapters
      : null;

    if(args.all){
      if(!chapterTotal){
        console.warn(`Sin total de capítulos en manifest para ${slug}, se omite.`);
        continue;
      }
      for(let ch = 1; ch <= chapterTotal; ch += 1){
        const r = exportChapter(slug, ch, manifest, morphIndex, shiftCfg, Engine, jsonlStream, exportOpts);
        if(!r.skipped){
          chaptersDone += 1;
          versesDone += r.verses;
          segmentsDone += r.segments;
        }
        if(ch % 5 === 0) console.error(`  ${slug} cap ${ch}/${chapterTotal}…`);
      }
    }else{
      const r = exportChapter(slug, args.chapter, manifest, morphIndex, shiftCfg, Engine, jsonlStream, exportOpts);
      if(r.skipped){
        console.error(`Sin datos interlineales para ${slug} ${args.chapter}`);
      }else{
        chaptersDone += 1;
        versesDone += r.verses;
        segmentsDone += r.segments;
      }
    }
  }

  if(jsonlStream){
    jsonlStream.end();
    await new Promise((resolve, reject) => {
      jsonlStream.on('finish', resolve);
      jsonlStream.on('error', reject);
    });
  }

  fs.writeFileSync(
    path.join(outDirEffective, 'stats.json'),
    JSON.stringify({ chapters: chaptersDone, verses: versesDone, segments: segmentsDone }, null, 2)
  );

  console.error(`Listo: ${outDirEffective}`);
  console.error(`Capítulos escritos: ${chaptersDone}, versículos: ${versesDone}, segmentos: ${segmentsDone}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
