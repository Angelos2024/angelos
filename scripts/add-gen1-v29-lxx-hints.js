/**
 * Inserta los hints manuales LXX↔MT para Génesis 1:29.
 * LXX (Rahlf) ordenado por lxxIdx:
 *   0 καὶ · 1 εἶπεν · 2 ὁ · 3 θεός · 4 ἰδοὺ · 5 δέδωκα · 6 ὑμῖν
 *   7 πᾶν · 8 χόρτον · 9 σπόριμον · 10 σπεῖρον · 11 σπέρμα
 *   12 ὅ · 13 ἐστιν · 14 ἐπάνω · 15 πάσης · 16 τῆς · 17 γῆς
 *   18 καὶ · 19 πᾶν · 20 ξύλον · 21 ὃ · 22 ἔχει · 23 ἐν · 24 ἑαυτῷ
 *   25 καρπὸν · 26 σπέρματος · 27 σπορίμου
 *   28 ὑμῖν · 29 ἔσται · 30 εἰς · 31 βρῶσιν
 *
 * Los tokenNum «5,6,7», «25,26», «31,32» mantienen la convención de chips
 * compuestos (mismo criterio que «14,15» de Gn 1:7 con מִתַּחַת → ὑποκάτω + —).
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'IdiomaORIGEN', 'lxx-mt-word-hints', 'chapters', 'genesis', '1.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
if(!data.verses || typeof data.verses !== 'object') throw new Error('Estructura inesperada en hints.');

const NOTE = 'Alineación editorial Gn 1:29 (manual sobre LXX Rahlf 1935).';

const v29 = [
  { tokenNum: '1', morphemeIdx: 0, lxxIdx: 0, surface: 'καὶ', tier: 'hint', source: 'manual', catssNote: NOTE },
  { tokenNum: '2', morphemeIdx: 0, lxxIdx: 1, surface: 'εἶπεν', strong: 'H559', tier: 'hint', source: 'manual' },
  { tokenNum: '3', morphemeIdx: 0, lxxIdx: 3, surface: 'θεός', strong: 'H430', tier: 'hint', source: 'manual',
    catssNote: 'ὁ en lxxIdx=2; θεός enlaza al morfema local.' },
  { tokenNum: '4', morphemeIdx: 0, lxxIdx: 4, surface: 'ἰδοὺ', strong: 'H2009', tier: 'hint', source: 'manual' },

  // Chip H5414 «נָתַתִּי + לָ + כֶם»: verbo + prep + sufijo de 2 pl. m.
  // LXX cubre el binomio prep+sufijo con un único pronombre ὑμῖν.
  { tokenNum: '5,6,7', morphemeIdx: 0, lxxIdx: 5, surface: 'δέδωκα', strong: 'H5414', tier: 'hint', source: 'manual',
    catssNote: 'נָתַתִּי (perfecto 1cs) ↔ δέδωκα (perf. 1sg).' },
  { tokenNum: '5,6,7', morphemeIdx: 1, lxxIdx: 6, surface: 'ὑμῖν', strong: 'H5414', tier: 'hint', source: 'manual',
    catssNote: 'לָ ↔ ὑμῖν (un único pronombre cubre prep+sufijo).' },
  { tokenNum: '5,6,7', morphemeIdx: 2, lxxIdx: 6, surface: '—', strong: 'H5414', tier: 'hint', source: 'manual',
    catssNote: 'כֶם sufijo absorbido por ὑμῖν.' },

  { tokenNum: '8', morphemeIdx: 0, lxxIdx: 6, surface: '—', strong: 'H853', tier: 'hint', source: 'manual',
    catssNote: 'אֵת marca de objeto; sin lexema griego propio.' },
  { tokenNum: '9', morphemeIdx: 0, lxxIdx: 7, surface: 'πᾶν', strong: 'H3605', tier: 'hint', source: 'manual' },
  { tokenNum: '10', morphemeIdx: 0, lxxIdx: 8, surface: 'χόρτον', strong: 'H6212', tier: 'hint', source: 'manual' },
  { tokenNum: '11', morphemeIdx: 0, lxxIdx: 9, surface: 'σπόριμον σπεῖρον', strong: 'H2232', tier: 'hint', source: 'manual',
    catssNote: 'זֹרֵעַ ↔ σπόριμον σπεῖρον (LXX duplica el participio).' },
  { tokenNum: '12', morphemeIdx: 0, lxxIdx: 11, surface: 'σπέρμα', strong: 'H2233', tier: 'hint', source: 'manual' },
  { tokenNum: '13', morphemeIdx: 0, lxxIdx: 12, surface: 'ὅ', strong: 'H834', tier: 'hint', source: 'manual',
    catssNote: 'אֲשֶׁר ↔ ὅ (rel. neutro). ἐστιν (lxxIdx 13) sin contrapartida hebrea.' },
  { tokenNum: '14', morphemeIdx: 0, lxxIdx: 14, surface: 'ἐπάνω', strong: 'H5921', tier: 'hint', source: 'manual',
    catssNote: 'עַל ↔ ἐπάνω (con פְּנֵי omitido en LXX).' },
  { tokenNum: '15', morphemeIdx: 0, lxxIdx: 14, surface: '—', strong: 'H6440', tier: 'hint', source: 'manual',
    catssNote: 'פְּנֵי sin lexema propio: LXX simplifica con ἐπάνω.' },
  { tokenNum: '16', morphemeIdx: 0, lxxIdx: 15, surface: 'πάσης', strong: 'H3605', tier: 'hint', source: 'manual' },
  { tokenNum: '17', morphemeIdx: 0, lxxIdx: 16, surface: 'τῆς', tier: 'hint', source: 'manual',
    catssNote: 'הָ ↔ τῆς ante γῆς (gen.).' },
  { tokenNum: '18', morphemeIdx: 0, lxxIdx: 17, surface: 'γῆς', strong: 'H776', tier: 'hint', source: 'manual' },
  { tokenNum: '19', morphemeIdx: 0, lxxIdx: 18, surface: 'καὶ', tier: 'hint', source: 'manual' },
  { tokenNum: '20', morphemeIdx: 0, lxxIdx: 18, surface: '—', strong: 'H853', tier: 'hint', source: 'manual',
    catssNote: 'אֵת marca de objeto sin lexema griego.' },
  { tokenNum: '21', morphemeIdx: 0, lxxIdx: 19, surface: 'πᾶν', strong: 'H3605', tier: 'hint', source: 'manual' },
  { tokenNum: '22', morphemeIdx: 0, lxxIdx: 19, surface: '—', tier: 'hint', source: 'manual',
    catssNote: 'הָ artículo sin contraparte: LXX usa πᾶν ξύλον anártrico.' },
  { tokenNum: '23', morphemeIdx: 0, lxxIdx: 20, surface: 'ξύλον', strong: 'H6086', tier: 'hint', source: 'manual' },
  { tokenNum: '24', morphemeIdx: 0, lxxIdx: 21, surface: 'ὃ', strong: 'H834', tier: 'hint', source: 'manual',
    catssNote: 'אֲשֶׁר ↔ ὃ (rel.); ἔχει (lxxIdx 22) aparece como verbo añadido al chip בּוֹ.' },

  // Chip בּ + ֹו (num 25,26): «en él» = LXX ἐν ἑαυτῷ con ἔχει añadido al frente.
  { tokenNum: '25,26', morphemeIdx: 0, lxxIdx: 23, surface: 'ἔχει ἐν', strong: 'H0', tier: 'hint', source: 'manual',
    catssNote: 'בּ prep + verbo de existencia añadido en LXX (ἔχει).' },
  { tokenNum: '25,26', morphemeIdx: 1, lxxIdx: 24, surface: 'ἑαυτῷ', tier: 'hint', source: 'manual',
    catssNote: 'ֹו sufijo 3 m. sg. ↔ ἑαυτῷ.' },

  { tokenNum: '27', morphemeIdx: 0, lxxIdx: 25, surface: 'καρπὸν', strong: 'H6529', tier: 'hint', source: 'manual',
    catssNote: 'פְּרִי constructo «fruto de»; la yod final NO es sufijo posesivo.' },
  { tokenNum: '28', morphemeIdx: 0, lxxIdx: 25, surface: '—', strong: 'H6086', tier: 'hint', source: 'manual',
    catssNote: 'עֵץ tras פְּרִי: LXX no lo traduce (καρπὸν σπέρματος σπορίμου).' },
  { tokenNum: '29', morphemeIdx: 0, lxxIdx: 26, surface: 'σπέρματος', strong: 'H2232', tier: 'hint', source: 'manual',
    catssNote: 'LXX reagrupa: זֹרֵעַ ↔ σπέρματος (gen.); זָרַע ↔ σπορίμου.' },
  { tokenNum: '30', morphemeIdx: 0, lxxIdx: 27, surface: 'σπορίμου', strong: 'H2232', tier: 'hint', source: 'manual' },

  // Chip לָ + כֶם (num 31,32): LXX un único ὑμῖν.
  { tokenNum: '31,32', morphemeIdx: 0, lxxIdx: 28, surface: 'ὑμῖν', strong: 'H0', tier: 'hint', source: 'manual',
    catssNote: 'לָ ↔ ὑμῖν (prep+sufijo absorbidos en un solo pronombre).' },
  { tokenNum: '31,32', morphemeIdx: 1, lxxIdx: 28, surface: '—', tier: 'hint', source: 'manual',
    catssNote: 'כֶם sufijo absorbido por ὑμῖν.' },

  { tokenNum: '33', morphemeIdx: 0, lxxIdx: 29, surface: 'ἔσται', strong: 'H1961', tier: 'hint', source: 'manual',
    catssNote: 'יִהְיֶה (impf. 3 m. sg.) ↔ ἔσται (futuro de εἰμί).' },
  { tokenNum: '34', morphemeIdx: 0, lxxIdx: 30, surface: 'εἰς', tier: 'hint', source: 'manual',
    catssNote: 'לְ finalidad: LXX εἰς + acus.' },
  { tokenNum: '35', morphemeIdx: 0, lxxIdx: 31, surface: 'βρῶσιν', strong: 'H402', tier: 'hint', source: 'manual',
    catssNote: 'אָכְלָה ↔ βρῶσις (acus. sg.).' }
];

data.verses['29'] = v29;

if(data._catss_generator && data._catss_generator.report){
  const r = data._catss_generator.report;
  r.matchedPairs = (r.matchedPairs || 0);
  r.totalPairs = (r.totalPairs || 0);
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`OK – hints LXX para Gn 1:29 añadidos (${v29.length} entradas).`);
