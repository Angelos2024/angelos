/**
 * Puente editorial AT hebreo (slugs angelos) <-> texto LXX Rahlfs 1935.
 * Morphologia griega: codigos compactos en los JSON (`morph`). No se combina ni
 * reutiliza el decodificador hebreo.Reglas pedagogicas KOINE/resumen:`IdiomaORIGEN/greek-exegesis-rules.min.json`.
 * Ajuste MT->LXX verso mismo capitulo:`IdiomaORIGEN/lxx-mt-verse-shift.min.json`.
 */
(function(global){
  'use strict';

  const PRIMARY_LXX_BY_OT_SLUG = {
    // Archivos instalados en LXX/: JoshB/JudgB/DanTh (sin JoshA/JudgA/DanOG).
    josue: 'JoshB',
    jueces: 'JudgB',
    daniel: 'DanTh'
  };

  const LXX_FILES = [
    'lxx_rahlfs_1935_1Chr.json',
    'lxx_rahlfs_1935_1Esdr.json',
    'lxx_rahlfs_1935_1Kgs.json',
    'lxx_rahlfs_1935_1Macc.json',
    'lxx_rahlfs_1935_1Sam.json',
    'lxx_rahlfs_1935_2Chr.json',
    'lxx_rahlfs_1935_2Esdr.json',
    'lxx_rahlfs_1935_2Kgs.json',
    'lxx_rahlfs_1935_2Macc.json',
    'lxx_rahlfs_1935_2Sam.json',
    'lxx_rahlfs_1935_3Macc.json',
    'lxx_rahlfs_1935_4Macc.json',
    'lxx_rahlfs_1935_Amos.json',
    'lxx_rahlfs_1935_Bar.json',
    'lxx_rahlfs_1935_BelOG.json',
    'lxx_rahlfs_1935_BelTh.json',
    'lxx_rahlfs_1935_DanOG.json',
    'lxx_rahlfs_1935_DanTh.json',
    'lxx_rahlfs_1935_Deut.json',
    'lxx_rahlfs_1935_Eccl.json',
    'lxx_rahlfs_1935_EpJer.json',
    'lxx_rahlfs_1935_Esth.json',
    'lxx_rahlfs_1935_Exod.json',
    'lxx_rahlfs_1935_Ezek.json',
    'lxx_rahlfs_1935_Gen.json',
    'lxx_rahlfs_1935_Hab.json',
    'lxx_rahlfs_1935_Hag.json',
    'lxx_rahlfs_1935_Hos.json',
    'lxx_rahlfs_1935_Isa.json',
    'lxx_rahlfs_1935_Jdt.json',
    'lxx_rahlfs_1935_Jer.json',
    'lxx_rahlfs_1935_Job.json',
    'lxx_rahlfs_1935_Joel.json',
    'lxx_rahlfs_1935_Jonah.json',
    'lxx_rahlfs_1935_JoshA.json',
    'lxx_rahlfs_1935_JoshB.json',
    'lxx_rahlfs_1935_JudgA.json',
    'lxx_rahlfs_1935_JudgB.json',
    'lxx_rahlfs_1935_Lam.json',
    'lxx_rahlfs_1935_Lev.json',
    'lxx_rahlfs_1935_Mal.json',
    'lxx_rahlfs_1935_Mic.json',
    'lxx_rahlfs_1935_Nah.json',
    'lxx_rahlfs_1935_Num.json',
    'lxx_rahlfs_1935_Obad.json',
    'lxx_rahlfs_1935_Odes.json',
    'lxx_rahlfs_1935_Prov.json',
    'lxx_rahlfs_1935_Ps.json',
    'lxx_rahlfs_1935_PsSol.json',
    'lxx_rahlfs_1935_Ruth.json',
    'lxx_rahlfs_1935_Sir.json',
    'lxx_rahlfs_1935_Song.json',
    'lxx_rahlfs_1935_SusOG.json',
    'lxx_rahlfs_1935_SusTh.json',
    'lxx_rahlfs_1935_TobBA.json',
    'lxx_rahlfs_1935_TobS.json',
    'lxx_rahlfs_1935_Wis.json',
    'lxx_rahlfs_1935_Zech.json',
    'lxx_rahlfs_1935_Zeph.json'
  ];

  const LXX_FILE_BY_BOOK = LXX_FILES.reduce((acc, file) => {
    const match = /^lxx_rahlfs_1935_(.+)\.json$/i.exec(file);
    if(match && match[1]) acc[match[1]] = file;
    return acc;
  }, {});

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

  const HEBREW_SLUG_TO_LXX_CODES = {};
  Object.entries(LXX_TO_HEBREW_SLUG).forEach(([code, slug]) => {
    if(!HEBREW_SLUG_TO_LXX_CODES[slug]) HEBREW_SLUG_TO_LXX_CODES[slug] = [];
    if(!HEBREW_SLUG_TO_LXX_CODES[slug].includes(code)){
      HEBREW_SLUG_TO_LXX_CODES[slug].push(code);
    }
  });

  /** Mapa ROBINSON 3-letra ( tiempo / voz / modo ) frecuentes en LXX. */
  const TVM_EXPAND = {
    PAI: 'pres.act.ind.', PNI: 'pres.med./pas.ind.', PDI: 'pres.pas.ind.',
    PMI: 'pres.med.ind.', PAM: 'pres.act.impv.', PMA: 'pres.med.impv.',
    PAN: 'pres.act.inf.', PMN: 'pres.med.inf.',
    PAP: 'pres.act.ptc.', PMP: 'pres.med.ptc.', PPP: 'pres.pas.ptc.',
    PMS: 'pres.med.subj.', PPS: 'pres.pas.subj.', PAS: 'pres.act.subj.',
    FAI: 'fut.act.ind.', FMI: 'fut.med.ind.', FAN: 'fut.act.inf.', FAP: 'fut.act.ptc.',
    IAI: 'impf.act.ind.', IMI: 'impf.med.ind.',
    AAI: 'aor.act.ind.', AAO: 'aor.act.opt.', AMI: 'aor.mid.ind.',
    API: 'aor.pas.ind.', AAS: 'aor.act.subj.', AAD: 'aor.act.impv.',
    AAN: 'aor.act.inf.', AAP: 'aor.act.ptc.', AMP: 'aor.med.ptc.',
    APP: 'aor.pas.ptc.', YAI: 'per.act.ind.'
  };

  const CASE_NUM_GEN = {
    NSM: 'nom.sg.m.', NSF: 'nom.sg.f.', NSN: 'nom.sg.n.',
    NPM: 'nom.pl.m.', NPF: 'nom.pl.f.', NPN: 'nom.pl.n.',
    GSM: 'gen.sg.m.', GSF: 'gen.sg.f.', GSN: 'gen.sg.n.',
    GPM: 'gen.pl.m.', GPF: 'gen.pl.f.', GPN: 'gen.pl.n.',
    DSM: 'dat.sg.m.', DSF: 'dat.sg.f.', DSN: 'dat.sg.n.',
    DPM: 'dat.pl.m.', DPF: 'dat.pl.f.', DPN: 'dat.pl.n.',
    ASM: 'ac.sg.m.', ASF: 'ac.sg.f.', ASN: 'ac.sg.n.',
    APM: 'ac.pl.m.', APF: 'ac.pl.f.', APN: 'ac.pl.n.',
    VSM: 'voc.sg.m.', VSF: 'voc.sg.f.'
  };

  const NOUN_SUFFIX = /(NSM|NSF|NSN|NPM|NPF|NPN|GSM|GSF|GSN|GPM|GPF|GPN|DSM|DSF|DSN|DPM|DPF|DPN|ASM|ASF|ASN|APM|APF|APN|VSM|VSF)$/i;

  /** Sufijos de caso/número en pronombres RP.RR.RD cuando no hay género marcado */
  const PRON_TAIL = {
    NS: 'nom.sg.', NP: 'nom.pl.', GS: 'gen.sg.', GP: 'gen.pl.', DS: 'dat.sg.', DP: 'dat.pl.',
    AS: 'ac.sg.', AP: 'ac.pl.'
  };

  const SIMPLE_POS = {
    P: 'prep.',
    C: 'conj.',
    D: 'part./adv.(neg.? )',
    X: 'particula enfatica',
    I: 'interj.'
  };

  const TYPE_PREFIX_NOMINAL = {
    N: 'sust.', A: 'adj.', RA: 'art.', RR: 'pron.rel.', RP: 'pron.pers.', RD: 'pron.dems.',
    RI: 'pron.interrog.'
  };

  function pickEdition(slug){
    const overrides = PRIMARY_LXX_BY_OT_SLUG[slug];
    if(overrides){
      const file = LXX_FILE_BY_BOOK[overrides];
      if(file) return { code: overrides, file };
    }
    const candidates = HEBREW_SLUG_TO_LXX_CODES[slug] || [];
    for(let i = 0; i < candidates.length; i += 1){
      const code = candidates[i];
      const file = LXX_FILE_BY_BOOK[code];
      if(file) return { code, file };
    }
    return null;
  }

  /** Convierte verso masoretico a verso dentro del mismo capitulo Rahlfs. */
  function targetLxxVerseFromShiftTable(slug, chapter, verseHebNum, cfg){
    const n = Number(verseHebNum);
    if(!Number.isFinite(n) || n < 1) return n;
    if(!cfg || !cfg.chapters) return n;
    const chapterKey = `${slug}::${chapter}`;
    const rule = cfg.chapters[chapterKey];
    if(!rule || !Number.isFinite(Number(rule.delta))) return n;
    const fromVerse = Number(rule.fromVerse);
    const delta = Number(rule.delta);
    if(Number.isFinite(fromVerse) && n >= fromVerse) return Math.max(1, n + delta);
    return n;
  }

  function splitVerbCoreAndNominal(mid){
    const m = mid.match(NOUN_SUFFIX);
    if(!m || m.index <= 2) return { core: mid, nominalKey: '', nominalLabel: '' };
    const nominalKey = m[1].toUpperCase();
    const nominalLabel = CASE_NUM_GEN[nominalKey] || '';
    const core = mid.slice(0, m.index);
    return { core, nominalKey, nominalLabel };
  }

  function expandTvmCore(coreRaw){
    const core = String(coreRaw || '').toUpperCase();
    for(let span = Math.min(core.length, 5); span >= 2; span -= 1){
      const pref = core.slice(0, span);
      if(TVM_EXPAND[pref]){
        let tail = core.slice(span);
        tail = tail ? ` · ${tail.toLowerCase()}` : '';
        return `${TVM_EXPAND[pref]}${tail}`;
      }
    }
    return `forma verbal ${coreRaw}`;
  }

  function decodeVerbFragment(mid){
    const personMatch = /(\d)([SPD])$/i.exec(mid);
    if(personMatch){
      const body = mid.slice(0, -2);
      const { core, nominalLabel } = splitVerbCoreAndNominal(body);
      const tvm = expandTvmCore(core);
      const extras = nominalLabel ? ` · ${nominalLabel}` : '';
      const person = `${personMatch[1]}ª ${personMatch[2].toUpperCase() === 'S' ? 'sg.' : personMatch[2].toUpperCase() === 'P' ? 'pl.' : 'du.'}`;
      return `${tvm}${extras} · pers. ${person}`;
    }

    const { core, nominalLabel } = splitVerbCoreAndNominal(mid);
    const tvm = expandTvmCore(core);
    const extras = nominalLabel ? ` · ${nominalLabel}` : '';
    return `${tvm}${extras}`;
  }

  /** Decodificador heuristico ROBINSON/LXX corto → glosa tecnica española. */
  function decodeMorphAbbrev(raw){
    const code = String(raw || '').trim();
    if(!code) return '';
    if(/^INTJ|^INJ|^HEB/i.test(code)) return 'interj.';
    const simple = SIMPLE_POS[code];
    if(simple) return simple;

    if(/^V\./i.test(code)){
      return decodeVerbFragment(code.slice(2));
    }

    const nominalLoose = /^([A-Za-z]{1,3})\.([NGDAV])([SPD])([MNF])$/i.exec(code);
    if(nominalLoose){
      const typ = nominalLoose[1].toUpperCase();
      const key = `${nominalLoose[2]}${nominalLoose[3]}${nominalLoose[4]}`.toUpperCase();
      const caseBit = CASE_NUM_GEN[key];
      const typeBit = TYPE_PREFIX_NOMINAL[typ] || `${typ}.`;
      if(caseBit) return `${typeBit} ${caseBit}`;
    }

    if(/^(RP|RR|RD|RI)\./i.test(code)){
      const tail = code.slice(code.indexOf('.') + 1).toUpperCase().replace(/\./g, '');
      if(PRON_TAIL[tail]) return `pronombre · ${PRON_TAIL[tail]}`;
    }

    const dotted = /\.([NGDAV])([SPD])([MNF]?)$/i.exec(code);
    if(dotted){
      const key = `${dotted[1]}${dotted[2]}${dotted[3] || ''}`.toUpperCase();
      const head = code.split(/\./)[0];
      const typeBit = TYPE_PREFIX_NOMINAL[head.toUpperCase()] || `${head}.`;
      if(CASE_NUM_GEN[key]) return `${typeBit} ${CASE_NUM_GEN[key]}`;
    }

    return code;
  }

  global.AdminOtLxxLayer = {
    schema: 'angelos.ot-lxx.bridge.v1',
    pickEdition,
    targetLxxVerseFromShiftTable,
    decodeMorphAbbrev,
    LXX_FILES,
    fileForCode(bookCode){ return LXX_FILE_BY_BOOK[bookCode] || ''; }
  };

})(typeof window !== 'undefined' ? window : globalThis);

