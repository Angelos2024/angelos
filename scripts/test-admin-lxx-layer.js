#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'admin-lxx-layer.js'), 'utf8'), sandbox);
const Layer = sandbox.window.AdminOtLxxLayer;

if(!Layer) throw new Error('AdminOtLxxLayer no expuesto');

function assert(cond, msg){
  if(!cond) throw new Error(msg || 'fallo');
}

const d = Layer.decodeMorphAbbrev;
assert(d('P') === 'prep.', 'P');
assert(String(d('V.AAI2S')).includes('aor.act.ind.'), 'AAI2S');
assert(String(d('N.ASF')).includes('sust.'), 'N.ASF');
assert(String(d('RA.NSM')).includes('art.'), 'RA.NSM');
assert(String(d('RP.GS')).includes('gen.sg.'), 'RP.GS');

const sal = Layer.pickEdition('salmos');
assert(sal && sal.code === 'Ps', 'edicion salmos');

assert(Layer.targetLxxVerseFromShiftTable('salmos', 4, 8, { chapters: { 'salmos::4': { fromVerse: 2, delta: 1 } } }) === 9, 'shift Ps4');

console.log('scripts/test-admin-lxx-layer.js OK');
