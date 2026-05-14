#!/usr/bin/env node
/** Compara libreria hebreo-masoretica (slug admin OT) contra JSON Rahlfs en LXX/. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LXX_DIR = path.join(ROOT, 'LXX');

const LXX_TO_HEBREW_SLUG = {
  Gen: 'genesis',
  Exod: 'exodo',
  Lev: 'levitico',
  Num: 'numeros',
  Deut: 'deuteronomio',
  JoshA: 'josue',
  JoshB: 'josue',
  JudgA: 'jueces',
  JudgB: 'jueces',
  Ruth: 'rut',
  '1Sam': '1_samuel',
  '2Sam': '2_samuel',
  '1Kgs': '1_reyes',
  '2Kgs': '2_reyes',
  '1Chr': '1_cronicas',
  '2Chr': '2_cronicas',
  '1Esdr': 'esdras',
  '2Esdr': 'nehemias',
  Esth: 'ester',
  Job: 'job',
  Ps: 'salmos',
  Prov: 'proverbios',
  Eccl: 'eclesiastes',
  Song: 'cantares',
  Isa: 'isaias',
  Jer: 'jeremias',
  Lam: 'lamentaciones',
  Ezek: 'ezequiel',
  DanOG: 'daniel',
  DanTh: 'daniel',
  Hos: 'oseas',
  Joel: 'joel',
  Amos: 'amos',
  Obad: 'abdias',
  Jonah: 'jonas',
  Mic: 'miqueas',
  Nah: 'nahum',
  Hab: 'habacuc',
  Zeph: 'sofonias',
  Hag: 'hageo',
  Zech: 'zacarias',
  Mal: 'malaquias'
};

/** Igual PRIMARY_LXX_BY_OT_SLUG en admin-lxx-layer.js (ajustado a los JSON instalados). */
const PREFERRED_EDIT = {
  josue: 'JoshB',
  jueces: 'JudgB',
  daniel: 'DanTh'
};

function labels(){
  const m = new Map([
    ['genesis', 'Génesis'],
    ['exodo', 'Éxodo'],
    ['levitico', 'Levítico'],
    ['numeros', 'Números'],
    ['deuteronomio', 'Deuteronomio'],
    ['josue', 'Josué'],
    ['jueces', 'Jueces'],
    ['rut', 'Rut'],
    ['1_samuel', '1 Samuel'],
    ['2_samuel', '2 Samuel'],
    ['1_reyes', '1 Reyes'],
    ['2_reyes', '2 Reyes'],
    ['1_cronicas', '1 Crónicas'],
    ['2_cronicas', '2 Crónicas'],
    ['esdras', 'Esdras'],
    ['nehemias', 'Nehemías'],
    ['ester', 'Ester'],
    ['job', 'Job'],
    ['salmos', 'Salmos'],
    ['proverbios', 'Proverbios'],
    ['eclesiastes', 'Eclesiastés'],
    ['cantares', 'Cantares'],
    ['isaias', 'Isaías'],
    ['jeremias', 'Jeremías'],
    ['lamentaciones', 'Lamentaciones'],
    ['ezequiel', 'Ezequiel'],
    ['daniel', 'Daniel'],
    ['oseas', 'Oseas'],
    ['joel', 'Joel'],
    ['amos', 'Amós'],
    ['abdias', 'Abdías'],
    ['jonas', 'Jonás'],
    ['miqueas', 'Miqueas'],
    ['nahum', 'Nahúm'],
    ['habacuc', 'Habacuc'],
    ['sofonias', 'Sofonías'],
    ['hageo', 'Hageo'],
    ['zacarias', 'Zacarías'],
    ['malaquias', 'Malaquías']
  ]);
  return m;
}

const bySlug = {};
Object.entries(LXX_TO_HEBREW_SLUG).forEach(([edition, slug]) => {
  if(!bySlug[slug]) bySlug[slug] = [];
  if(!bySlug[slug].includes(edition)) bySlug[slug].push(edition);
});

function main(){
  if(!fs.existsSync(LXX_DIR)){
    console.error('No existe LXX/');
    process.exit(1);
  }

  const onDiskFiles = fs.readdirSync(LXX_DIR).filter((name) =>
    /^lxx_rahlfs_1935_[A-Za-z0-9_-]+\.json$/i.test(name));
  const onDiskEdition = new Set(
    onDiskFiles.map((f) => f.replace(/^lxx_rahlfs_1935_/i, '').replace(/\.json$/i, ''))
  );

  const labelsMap = labels();
  const sinNinguno = [];
  /** Preferencias que apuntan a JSON ausente pero hay otro archivo Rahlfs */
  const preferenciaAusenteHayAlternativa = [];

  for(const [slug, label] of labelsMap.entries()){
    const editions = bySlug[slug] || [];
    const existentes = editions.filter((ed) => onDiskEdition.has(ed));
    if(!existentes.length){
      sinNinguno.push({ slug, masoreticoLabel: label, edicionesCanonMapeadas: editions });
      continue;
    }
    const pref = PREFERRED_EDIT[slug];
    if(pref && editions.includes(pref) && !onDiskEdition.has(pref)){
      const avail = [...existentes].sort();
      preferenciaAusenteHayAlternativa.push({
        slug,
        masoreticoLabel: label,
        preferencia: pref,
        archivoFaltante: `lxx_rahlfs_1935_${pref}.json`,
        enDiscoSirveAlternativa: avail
      });
    }
  }

  console.log(JSON.stringify({
    mensaje: 'Cobertura LXX vs 39 libro AT masoreticos (mapa canon Rahlfs hebreo/protestante habitual)',
    archivosJSONenLXX: onDiskFiles.length,
    libroSinNingunJsonMasoreticoEquivalente: sinNinguno,
    codigoPreferidoApuntaAusenteHayOtraEdicion_en_Disco: preferenciaAusenteHayAlternativa
  }, null, 2));

  /**
   * Apócrifa/deuterocanonica disponible en coleccion Rahlf completa no presente aqui — referencia superficial
   * (solo compara filenames que busqueda en busquedax conocia como lista grande)
   */
  const knownExtra = ['1Macc', '2Macc', '3Macc', '4Macc', 'Bar', 'BelOG', 'BelTh', 'EpJer', 'Jdt', 'Odes', 'PsSol', 'Sir', 'SusOG', 'SusTh', 'TobBA', 'TobS', 'Wis'];
  const faltantesDeuterocanon = knownExtra.filter((ed) =>
    !onDiskEdition.has(ed)
  ).map((ed) => `lxx_rahlfs_1935_${ed}.json (tu repo no tiene; no son parte del mismo AT masoretico 39 libro)`);

  console.log(JSON.stringify({
    notaReferenciasDeuterocanonRahlfsAusentes_delRepo: faltantesDeuterocanon
  }, null, 2));
}

main();

