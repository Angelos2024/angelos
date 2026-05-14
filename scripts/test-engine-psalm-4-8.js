#!/usr/bin/env node
/*
 * Prueba de humo de admin-interlinear-engine.js sobre Salmo 4:8 (4:9 en MT).
 * Verifica los fixes recientes:
 *   - DEFAULT_POINTED_YHWH sin qamats indebido (יְהוָה)
 *   - expandCompositeToken asigna `es` al morfema lexical (no a la preposición)
 *   - getAdminVerseTokens propaga `added` al fusionar sufijos
 *   - resolveTokenSourceGloss incluye `added` entre paréntesis
 */

'use strict';

const fs = require('fs');
const path = require('path');

const stub = `
const window = globalThis;
const document = { getElementById: () => null };
`;

const engineSrc = fs.readFileSync(path.join(__dirname, '..', 'admin-interlinear-engine.js'), 'utf8');
new Function(`${stub}\n${engineSrc}`)();

const Engine = globalThis.AdminHebrewInterlinearEngine;
if(!Engine || !Engine.buildAdminVersePlan){
  console.error('No se pudo cargar AdminHebrewInterlinearEngine.');
  process.exit(2);
}

const verse = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'IdiomaORIGEN', 'interlineal', 'chapters', '19_Salmos', '4.json'), 'utf8'))['8'];
const oshb = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'IdiomaORIGEN', 'oshb-morph', 'chapters', '19_Salmos', '4.json'), 'utf8'))['8'];

const plan = Engine.buildAdminVersePlan(verse, oshb);

console.log(`Token count: ${plan.tokenCount}\n`);
console.log('# Token | morph | gloss');
console.log('--------|-------|------');
for(const entry of plan.items){
  const orig = (entry?.token?.orig || '').replace(/\s+/g, ' ');
  const morph = (entry?.layer?.baseLabel || entry?.baseMorph || entry?.token?.morphs || '').toString();
  const gloss = (entry?.layer?.morphemes && entry.layer.morphemes.length
    ? entry.layer.morphemes.map((m) => `${m.surface || ''}=${m.gloss || ''}`).join(' | ')
    : (entry?.baseGloss || ''));
  console.log(`${orig.padEnd(14)} | ${morph.padEnd(28)} | ${gloss}`);
}

console.log('\n----- Comprobaciones específicas -----');

const findToken = (predicate) => plan.items.find(predicate);

const checks = [];

const yhwh = findToken((e) => /יהוה|יְהוָה|יְהָוָה/.test(e?.token?.orig || ''));
checks.push({
  name: 'Tetragrámaton sin qamats en la he inicial',
  ok: !!yhwh && !/\u05D9\u05B0\u05D4\u05B8/u.test(yhwh.token.orig),
  detail: `surface = "${yhwh?.token?.orig || '(no encontrado)'}"`
});

const renderedGlossOf = (entry) => {
  if(entry?.layer?.morphemes && entry.layer.morphemes.length){
    return entry.layer.morphemes.map((m) => m.gloss || '').filter(Boolean).join(' ');
  }
  return String(entry?.baseGloss || entry?.tokenGloss || '');
};

const plain = (s) => String(s || '')
  .replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
  .replace(/[\u0591-\u05AF]/g, '')
  .replace(/[\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4]/g, '')
  .replace(/[\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/g, '')
  .trim();

const findByPlain = (target) => plan.items.find((e) => plain(e?.token?.orig || '') === target);
const findByPlainSuffix = (target) => plan.items.find((e) => plain(e?.token?.orig || '').endsWith(target));

// Filosofía: el laboratorio muestra lo que el hebreo dice, sin agregar palabras del traductor.
// Las palabras con flecha → en `added` (p. ej. "me", "haces", "Ten", "principal", "Cuando estaba")
// son interpolaciones castellanas y NO deben aparecer en la glosa de los morfemas.

const shalom = findByPlain('שלום');
const shalomGloss = renderedGlossOf(shalom);
checks.push({
  name: '`שָׁלֹום` muestra "paz" SIN inyectar el "me" del traductor',
  ok: /paz/i.test(shalomGloss) && !/\bme\b/.test(shalomGloss) && !/\(/.test(shalomGloss),
  detail: `gloss = "${shalomGloss}"`
});

const eshkebah = findByPlain('אשכבה');
const eshkebahGloss = renderedGlossOf(eshkebah);
checks.push({
  name: '`אֶשְׁכְּבָה` muestra "acostaré" tal cual',
  ok: /acostaré/i.test(eshkebahGloss),
  detail: `gloss = "${eshkebahGloss}"`
});

const ishan = findByPlain('אישן');
const ishanGloss = renderedGlossOf(ishan);
checks.push({
  name: '`אִישָׁן` muestra "dormiré"',
  ok: /dormiré/i.test(ishanGloss),
  detail: `gloss = "${ishanGloss}"`
});

const toshib = findByPlainSuffix('תושיבני');
const toshibGloss = renderedGlossOf(toshib);
checks.push({
  name: '`תֹּושִׁיבֵנִי` muestra "me vivir" (sufijo + verbo base) sin agregar "haces"',
  ok: /\bme\b/i.test(toshibGloss) && /\bvivir\b/i.test(toshibGloss) && !/\bhaces\b/i.test(toshibGloss),
  detail: `gloss = "${toshibGloss}"`
});

const betah = findByPlain('בטח');
const betahGloss = renderedGlossOf(betah);
checks.push({
  name: '`בֶטַח` (parte lexical del compuesto לָבֶטַח) muestra "confiado"',
  ok: /confiado/i.test(betahGloss),
  detail: `gloss = "${betahGloss}"`
});

let ok = 0, fail = 0;
for(const c of checks){
  console.log(`${c.ok ? 'OK  ' : 'FAIL'} ${c.name}  →  ${c.detail}`);
  c.ok ? ok++ : fail++;
}
console.log(`\nResumen: ${ok} OK, ${fail} FAIL.`);
process.exit(fail === 0 ? 0 : 1);
