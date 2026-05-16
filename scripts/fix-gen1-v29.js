/**
 * Fix Génesis 1:29 — desglose por morfema de los chips prep+sufijo y verbo+prep+sufijo,
 * limpieza del segundo עֵץ (notrans + glosas espurias) y artículo הָ vacío.
 *
 * Aplica de forma idempotente sobre el archivo interlineal 01_Génesis/1.json.
 * Las comparaciones se hacen por número de token (num) y/o Strong's para evitar
 * problemas de normalización Unicode entre este archivo y el JSON fuente.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'IdiomaORIGEN', 'interlineal', 'chapters', '01_Génesis', '1.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const v29 = data['29'];
if(!v29 || !Array.isArray(v29.tokens)) throw new Error('Gen 1:29 no encontrado');

function nums(t){ return Array.isArray(t.num) ? t.num.join(',') : String(t.num || ''); }
function findByNum(n){ return v29.tokens.find((t) => nums(t) === n); }

// 1) Chip H5414 «נָתַתִּי + לָ + כֶם»  (num 5,6,7) →  es: ["he dado","a","vosotros"]
const t5to7 = findByNum('5,6,7');
if(t5to7){
  t5to7.es = ['he dado', 'a', 'vosotros'];
  delete t5to7.added;
  t5to7.marks = '›';
}

// 2) עֵשֶׂב (token 10) «planta que» → «planta»; la «que» pasa a זֹרֵעַ siguiente
const tEsev = findByNum('10');
if(tEsev && Array.isArray(tEsev.es)){
  tEsev.es = 'planta';
}
const tZorea1 = findByNum('11');
if(tZorea1){
  tZorea1.es = ['que', 'da'];
}

// 3) Segundo אֲשֶׁר token 24 («que hay» → «que»; «hay» lo absorbe el chip בּוֹ)
const tAsher24 = findByNum('24');
if(tAsher24 && Array.isArray(tAsher24.es)){
  tAsher24.es = 'que';
}

// 4) Chip בּ + ֹו (num 25,26)  →  es: ["en", "él"]
const tBo = findByNum('25,26');
if(tBo){
  tBo.es = ['en', 'él'];
  tBo.marks = '›';
}

// 5) הָ token 22 vacío  →  «el» (artículo del segundo עֵץ)
const tHaSecond = findByNum('22');
if(tHaSecond){
  tHaSecond.es = 'el';
  delete tHaSecond.notrans;
}

// 6) Segundo עֵץ (token 28) con notrans s/t y glosas espurias  →  «árbol» limpio
const tEtsSecond = findByNum('28');
if(tEtsSecond){
  tEtsSecond.es = 'árbol';
  delete tEtsSecond.notrans;
}

// 7) זֹרֵעַ token 29 («da» → «que da», para acompañar la frase relativa)
const tZorea2 = findByNum('29');
if(tZorea2){
  tZorea2.es = ['que', 'da'];
}

// 8) Chip לָ + כֶם segundo (num 31,32)  →  es: ["a", "vosotros"]
const tLakhem = findByNum('31,32');
if(tLakhem){
  tLakhem.es = ['a', 'vosotros'];
  tLakhem.marks = '›';
}

fs.writeFileSync(FILE, JSON.stringify(data) + '\n', 'utf8');
console.log('OK – Gen 1:29 actualizado');
