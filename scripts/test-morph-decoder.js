#!/usr/bin/env node
/*
 * Prueba de humo para decodeHebrewMorphCode.
 * Extrae la función del IIFE de admin-morfologia.js, la evalúa y la corre
 * contra códigos representativos del corpus.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const src = fs.readFileSync(path.join(__dirname, '..', 'admin-morfologia.js'), 'utf8');

// Reescribe el IIFE para no ejecutar nada del DOM y exportar lo que nos interesa.
const stub = `
const document = { getElementById: () => null, addEventListener: () => {}, documentElement: { setAttribute: () => {} } };
const window = { localStorage: { getItem: () => null, setItem: () => {} }, sessionStorage: { getItem: () => '0', setItem: () => {} }, location: { href: '' }, requestAnimationFrame: () => {}, requestIdleCallback: null, AdminHebrewInterlinearEngine: null };
const localStorage = window.localStorage;
const sessionStorage = window.sessionStorage;
const crypto = { subtle: { digest: async () => new Uint8Array(0) } };
const indexedDB = undefined;
const fetch = async () => { throw new Error('no fetch in test'); };
let __decodeHebrewMorphCode = null;
`;

const exposed = src.replace('void init();', '__decodeHebrewMorphCode = decodeHebrewMorphCode;');

const compiled = `(function(){\n${stub}\n${exposed}\nreturn __decodeHebrewMorphCode;\n})();`;

const decode = new Function(compiled.replace(/^/, 'return ') + '')();

const cases = [
  ['VqAsSM3', 'VERBO.QAL.PERF.P3.M.SG',         'Gen 1:1 "creó" - perfect'],
  ['VqAmSM3', 'VERBO.QAL.WAYYIQT.P3.M.SG',      'Gen 1:3 "dijo" - wayyiqtol'],
  ['VqAMSM3', 'VERBO.QAL.IMPF.P3.M.SG',         'Sal 4:3 "oirá" - imperfect future'],
  ['VqAMSC1', 'VERBO.QAL.IMPF.P1.C.SG',         'Sal 4:8 "dormiré" - imperfect 1cs'],
  ['VqACSC1', 'VERBO.QAL.COHORT.P1.C.SG',       'Sal 4:8 "me acostaré" - cohortative'],
  ['VqACPC1', 'VERBO.QAL.COHORT.P1.C.PL',       'Gen 1:26 "hagamos" - cohortative 1cp'],
  ['VhAMSM2', 'VERBO.HIF.IMPF.P2.M.SG',         'Sal 4:8 "haces vivir" - Hifil imperfect 2ms'],
  ['VqAJSM3', 'VERBO.QAL.JUSS.P3.M.SG',         'Gen 1:3 "haya" - jussive'],
  ['VqAIPM2', 'VERBO.QAL.IMPV.P2.M.PL',         'Gen 1:22 "fructificad" - imperative 2mp'],
  ['VqAISM2', 'VERBO.QAL.IMPV.P2.M.SG',         'Sal 4:1 "respóndeme" - imperative 2ms'],
  ['VqAfPC3', 'VERBO.QAL.SEQ.PERF.P3.C.PL',     'Gen 1:14 "sean" - weqatal'],
  ['VhAsSM2', 'VERBO.HIF.PERF.P2.M.SG',         'Sal 4:1 "hiciste ensanchar" - Hifil perfect 2ms'],
  ['VqAsSC1', 'VERBO.QAL.PERF.P1.C.SG',         'Gen 1:29 "he dado" - perfect 1cs'],
  ['PB', 'PREP',                                'Preposition prefix'],
  ['PA', 'PART.OBJ.DIR',                        'Direct object marker'],
  ['XD', 'ART',                                 'Article prefix']
];

let ok = 0;
let fail = 0;
for(const [input, expected, label] of cases){
  const got = decode(input);
  const pass = got === expected;
  if(pass) ok += 1; else fail += 1;
  console.log(`${pass ? 'OK  ' : 'FAIL'}  ${input.padEnd(10)} → ${got.padEnd(36)} ${pass ? '' : `(expected ${expected})`}   ${label}`);
}
console.log(`\nResumen: ${ok} OK, ${fail} FAIL.`);
process.exit(fail === 0 ? 0 : 1);
