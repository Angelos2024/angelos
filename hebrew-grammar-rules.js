(function(global){
  const PREFIX_RULES = {
    'ו': 'CONJ',
    'וְ': 'CONJ',
    'וַ': 'CONJ',
    'ה': 'ART',
    'הַ': 'ART',
    'הָ': 'ART',
    'ב': 'PREP',
    'בְּ': 'PREP',
    'בַּ': 'PREP',
    'ל': 'PREP',
    'לְ': 'PREP',
    'לַ': 'PREP',
    'מ': 'PREP',
    'מִ': 'PREP'
  };

  const SUFFIX_RULES = {
    'ִי': 'RBSC1',
    'ִיךָ': 'RBSC2',
    'ֵךְ': 'RBSF2',
    'וֹ': 'RBSM3',
    'ָהּ': 'RBSF3',
    'ֵנוּ': 'RBSC1',
    'ְכֶם': 'RBPM2',
    'ְכֶן': 'RBPF2',
    'ָם': 'RBPM3',
    'ָן': 'RBPF3'
  };

  const EXEGESIS_PROFILE = {
    version: '2.0_Biblical_Exegesis',
    descripcion: 'Logica exhaustiva de preposiciones inseparables (BKL), Min y la Conjuncion Vav',
    configuracion_fonetica: {
      clases_letras: {
        guturales: ['א', 'ה', 'ח', 'ע'],
        resh: ['ר'],
        labiales: ['ב', 'מ', 'פ'],
        quiescentes_potenciales: ['א', 'י'],
        sibilantes: ['ז', 'ס', 'צ', 'שׁ', 'שׂ']
      },
      reglas_oro: [
        'No pueden existir dos Shevas seguidos al inicio de palabra',
        'Las guturales y la Resh no aceptan Dagesh Forte',
        'El articulo definido (He) desaparece si se le antepone B, K o L'
      ]
    },
    logica_preposiciones_BKL: {
      prefijos: ['בְּ', 'כְּ', 'לְ'],
      arbol_de_decision: [
        {
          caso: 'ESTANDAR',
          condicion: 'Consonante inicial con vocal plena (no reducida)',
          resultado: 'Prefijo + Sheva Vocal',
          ejemplo: 'בְּמֶלֶךְ (En un rey)'
        },
        {
          caso: 'REGLA_DOS_SHEVAS',
          condicion: 'Palabra comienza con Sheva (Cְ)',
          resultado: 'Prefijo toma Hireq (ִ). La segunda Sheva se vuelve muda',
          excepcion: 'Si la consonante es Yod (יְ), ver REGLA_YOD',
          ejemplo: 'לִשְׁמוּאֵל (A Samuel)'
        },
        {
          caso: 'REGLA_YOD_QUIESCENTE',
          condicion: 'Palabra comienza con Yod + Sheva (יְ)',
          resultado: 'Prefijo toma Hireq (ִ) + Yod pierde su Sheva y se vuelve Quiescente (vocal larga i)',
          ejemplo: 'בִּיהוּדָה (En Juda - No se pronuncia la Y como consonante)'
        },
        {
          caso: 'REGLA_CHATEF',
          condicion: 'La gutural inicial tiene vocal reducida (Chatef)',
          resultado: 'El prefijo toma la vocal corta correspondiente al Chatef',
          subcasos: [
            { si: 'Chatef Pathach (ֲ)', entonces: 'Prefijo toma Pathach (ַ)' },
            { si: 'Chatef Segol (ֱ)', entonces: 'Prefijo toma Segol (ֶ)' },
            { si: 'Chatef Qamets (ֳ)', entonces: 'Prefijo toma Qamets-Chatuf (ָ)' }
          ],
          excepcion_Elohim: 'En אֱלֹהִים, el prefijo toma Tsere (ֵ) y el Alef queda quiescente: לֵאלֹהִים'
        },
        {
          caso: 'SINCOPE_ARTICULO',
          condicion: 'La palabra tiene articulo definido (הַ / הָ)',
          resultado: 'La preposicion elimina a la letra He y roba su vocalizacion',
          importancia_exegetica: 'Si ves una preposicion con Pathach/Qamets y Dagesh despues, el articulo esta escondido alli',
          ejemplo: 'כַּמֶּלֶךְ (Como EL rey, no como UN rey)'
        }
      ]
    }
  };

  function normalizeHebrew(value, preservePoints = true){
    let clean = String(value || '')
      .replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
      .replace(/[\u0591-\u05AF]/g, '')
      .replace(/[\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4]/g, '')
      .trim();
    if(!preservePoints){
      clean = clean.replace(/[\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/g, '');
    }
    return clean;
  }

  function detectPrefixSegments(form){
    const normalized = normalizeHebrew(form, true);
    const segments = [];
    let remainder = normalized;

    let matched = true;
    while(matched && remainder){
      matched = false;
      const prefix = Object.keys(PREFIX_RULES)
        .sort((left, right) => right.length - left.length)
        .find((candidate) => remainder.startsWith(candidate));
      if(prefix){
        segments.push({
          form: prefix,
          label: PREFIX_RULES[prefix],
          type: 'prefix'
        });
        remainder = remainder.slice(prefix.length);
        matched = true;
      }
    }

    return { segments, remainder };
  }

  function detectSuffixSegment(form){
    const normalized = normalizeHebrew(form, true);
    const suffix = Object.keys(SUFFIX_RULES)
      .sort((left, right) => right.length - left.length)
      .find((candidate) => normalized.endsWith(candidate));

    if(!suffix){
      return {
        base: normalized,
        suffix: null
      };
    }

    return {
      base: normalized.slice(0, normalized.length - suffix.length),
      suffix: {
        form: suffix,
        label: SUFFIX_RULES[suffix],
        type: 'suffix'
      }
    };
  }

  function forceConstructState(baseLabel, options = {}){
    const label = String(baseLabel || '').trim().toUpperCase();
    if(!label) return '';
    if(!options.hasPronominalSuffix) return label;
    if(!/^SUBS\.|^ADJ\.|^NPROP\./.test(label)) return label;
    if(/\.C(?:$|\.)/.test(label)) return label;
    if(/\.A(?:$|\.)/.test(label)) return label.replace(/\.A(?=$|\.)/, '.C');
    return `${label}.C`;
  }

  function splitAffixes(form, baseLabel = '', options = {}){
    const prefixResult = detectPrefixSegments(form);
    const suffixResult = detectSuffixSegment(prefixResult.remainder);
    const items = [...prefixResult.segments];

    if(suffixResult.base){
      items.push({
        form: suffixResult.base,
        label: forceConstructState(baseLabel, {
          ...options,
          hasPronominalSuffix: Boolean(suffixResult.suffix)
        }),
        type: 'base'
      });
    }

    if(suffixResult.suffix){
      items.push(suffixResult.suffix);
    }

    return items;
  }

  function explainRuleSet(){
    return {
      profile: EXEGESIS_PROFILE,
      prefixes: PREFIX_RULES,
      suffixes: SUFFIX_RULES,
      principles: [
        'Separar prefijos, base y sufijos en morfemas independientes.',
        'Si una base nominal lleva sufijo pronominal, forzar estado constructo.',
        'La persona reside en el sufijo, no en la base.',
        'No unir dos raices distintas en una sola entrada.',
        'Validar singular, plural o dual antes de confirmar la etiqueta.'
      ]
    };
  }

  global.HebrewGrammarRules = {
    EXEGESIS_PROFILE,
    PREFIX_RULES,
    SUFFIX_RULES,
    normalizeHebrew,
    detectPrefixSegments,
    detectSuffixSegment,
    forceConstructState,
    splitAffixes,
    explainRuleSet
  };
})(typeof window !== 'undefined' ? window : globalThis);
