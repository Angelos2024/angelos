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
    },
    logica_preposicion_MIN: {
      prefijo_aislado: 'מִן',
      prefijo_unido: 'מִ',
      arbol_de_decision: [
        {
          caso: 'ASIMILACION_FUERTE',
          condicion: 'Consonante inicial NO es gutural ni Resh',
          resultado: 'Prefijo מִ + Dagesh Forte en la siguiente letra (compensando la Nun perdida)',
          ejemplo: 'מִמֶּלֶךְ (De un rey)'
        },
        {
          caso: 'ALARGAMIENTO_COMPENSATORIO',
          condicion: 'Consonante inicial es Gutural (א, ה, ע) o Resh (ר)',
          resultado: 'La vocal del prefijo cambia de Hireq (ִ) a Tsere (ֵ) para compensar que no puede haber Dagesh',
          ejemplo: 'מֵאִישׁ (De un hombre), מֵרֹאשׁ (Desde el principio)'
        },
        {
          caso: 'DUPLICACION_VIRTUAL',
          condicion: 'Consonante inicial es Het (ח) o a veces He (ה)',
          resultado: 'Se mantiene Hireq (ִ) pero NO hay dagesh. Se asume que la letra esta duplicada virtualmente',
          ejemplo: 'מִחוּץ (Desde fuera)'
        }
      ]
    },
    logica_especial_VAV_CONJUNCION: {
      nota: 'Aunque es conjuncion (y), sigue logica de prefijos',
      reglas: {
        shurek: 'Ante labiales (B, M, P) o cualquier consonante con Sheva, la Vav se convierte en Shurek (וּ)',
        chatef: 'Ante gutural con Chatef, toma la vocal corta del Chatef (igual que BKL)',
        tonica: 'Ante palabra con acento en la primera silaba, puede tomar Qamets (וָ)'
      }
    },
    guia_de_errores_comunes_lectura: {
      error_01: 'Confundir Sheva mudo con vocal tras preposicion (En REG_02, la segunda es muda).',
      error_02: 'No identificar el articulo definido oculto tras la vocal de la preposicion (Crucial para exegesis).',
      error_03: 'Pronunciar la Yod en casos de quiescencia (B-Yehudah es incorrecto, es Bi-hudah).'
    },
    casos_depuracion: [
      {
        palabra_texto: 'בְּרֵאשִׁית',
        componentes: 'בְּ + רֵאשִׁית',
        regla: 'REG_01_DEFAULT',
        explicacion: 'La palabra empieza con ר (Resh) con vocal larga. La preposicion mantiene su Sheva estandar.',
        traduccion: 'En [un] principio (Indefinido).'
      },
      {
        palabra_texto: 'הַשָּׁמַיִם',
        componentes: 'הַ + שָׁמַיִם',
        regla: 'SINCOPE_ARTICULO',
        explicacion: 'Base para la siguiente regla. El articulo pone un Dagesh Forte en la שׁ.',
        traduccion: 'Los cielos.'
      },
      {
        palabra_texto: 'וְהָאָרֶץ',
        componentes: 'וְ + הָאָרֶץ',
        regla: 'REG_01_DEFAULT',
        explicacion: 'La conjuncion Vav (y) se une a una gutural con vocal plena. Se queda como וְ.',
        traduccion: 'Y la tierra.'
      },
      {
        palabra_texto: 'וְחֹשֶׁךְ',
        componentes: 'וְ + חֹשֶׁךְ',
        regla: 'REG_01_DEFAULT',
        explicacion: 'Vav ante una ח (gutural) con vocal plena.',
        traduccion: 'Y [la] oscuridad.'
      },
      {
        palabra_texto: 'עַל-פְּנֵי',
        componentes: 'עַל + פְּנֵי',
        regla: 'REG_02_SHEVA',
        explicacion: 'Contexto. Si pusieramos una preposicion aqui, chocaria con la Sheva de la פּ.',
        traduccion: 'Sobre la faz de...'
      },
      {
        palabra_texto: 'וְרוּחַ',
        componentes: 'וְ + רוּחַ',
        regla: 'REG_01_DEFAULT',
        explicacion: 'Vav ante ר.',
        traduccion: 'Y [el] espiritu.'
      },
      {
        palabra_texto: 'מֵרַחֶפֶת',
        componentes: 'מִ + רַחֶפֶת',
        regla: 'ALARGAMIENTO',
        explicacion: 'מִן + ר (Resh). Como la Resh no acepta Dagesh, el Hireq sube a Tsere.',
        traduccion: '...se movia desde/sobre...'
      }
    ],
    edge_case_articulo_oculto: {
      titulo: 'El articulo oculto',
      escenario: 'Si en Genesis 1:1 dijera בַּרֵאשִׁית en lugar de בְּרֵאשִׁית',
      input: 'בַּרֵאשִׁית',
      trigger: 'SINCOPE_ARTICULO',
      analisis: 'La preposicion robo la vocal del articulo הַ.',
      resultado_exegetico: 'No significaria En un principio, sino En EL principio.',
      debugger_biblico: 'En el hebreo masoretico, la falta del articulo en la primera palabra de la Biblia es un tema de debate teologico milenario que se detecta gracias a esta regla de vocalizacion.'
    },
    interlinear_expansion: {
      version: '2.1_Interlinear_Expansion',
      descripcion: 'Modulos faltantes para el analisis de sustantivos (flexion/posesion) y verbos (binyanim)',
      logica_estado_constructo_smikhut: {
        concepto: 'Relacion X de Y donde el primer sustantivo (Regente) cambia su forma',
        reglas_de_cambio: [
          {
            tipo: 'Masculino Singular',
            cambio: 'Reduccion de vocales largas a breves o Sheva',
            ejemplo: 'Davar (Palabra) -> Devar [ha-melekh] (La palabra del [rey])'
          },
          {
            tipo: 'Femenino Singular',
            terminacion_original: 'ָה (-ah)',
            terminacion_constructo: 'ַת (-at)',
            ejemplo: 'Torah (Ley) -> Torat [Mosheh] (La ley de [Moises])'
          },
          {
            tipo: 'Masculino Plural',
            terminacion_original: 'ִים (-im)',
            terminacion_constructo: 'ֵי (-ei)',
            ejemplo: 'Banim (Hijos) -> Bnei [Yisrael] (Hijos de [Israel])'
          }
        ]
      },
      logica_sufijos_pronominales_sustantivos: {
        nota: 'Se anaden al final del sustantivo para indicar posesion',
        tabla_sufijos_singular: {
          '1cs_mio': '-i',
          '2ms_tuyo_m': '-kha',
          '2fs_tuyo_f': '-ekh',
          '3ms_suyo_m': '-o',
          '3fs_suyo_f': '-ah',
          '1cp_nuestro': '-enu',
          '2mp_vuestro_m': '-khem',
          '2fp_vuestro_f': '-khen',
          '3mp_suyo_pl_m': '-am',
          '3fp_suyo_pl_f': '-an'
        }
      },
      logica_genero_y_numero: {
        identificadores_finales: [
          { forma: 'Sustantivo base', genero: 'M', numero: 'Singular' },
          { forma: 'ָה / ֶת (-ah / -et)', genero: 'F', numero: 'Singular' },
          { forma: 'ִים (-im)', genero: 'M', numero: 'Plural' },
          { forma: 'ֺות (-ot)', genero: 'F', numero: 'Plural' },
          { forma: 'ַיִם (-ayim)', numero: 'Dual', descripcion: 'Pares: ojos, manos, oidos' }
        ]
      },
      logica_sistemas_verbales_binyanim: {
        descripcion: 'Moldes que cambian el sentido de la raiz (3 letras)',
        modelos: [
          { nombre: 'QAL (Paal)', funcion: 'Accion simple activa', ejemplo: 'El escribio' },
          { nombre: 'NIFAL', funcion: 'Pasiva o reflexiva de Qal', identificador: 'Prefijo Nun (נ)', ejemplo: 'Fue escrito' },
          { nombre: 'PIEL', funcion: 'Accion intensiva', identificador: 'Dagesh en la 2da letra', ejemplo: 'El hizo anicos' },
          { nombre: 'HIFIL', funcion: 'Accion causativa', identificador: 'Prefijo He (ה) + Yod interna', ejemplo: 'El hizo escribir (dicto)' },
          { nombre: 'HITPAEL', funcion: 'Reflexiva intensiva', identificador: 'Prefijo Hit (הת)', ejemplo: 'El se justifico' }
        ]
      },
      guia_diagnostico_interlinear: {
        paso_01: 'Identificar Prefijos BKL/Vav/Min usando reglas_oro.',
        paso_02: 'Verificar si hay Articulo Oculto por vocalizacion.',
        paso_03: 'Analizar terminacion para Genero/Numero o Sufijo Pronominal.',
        paso_04: 'Si la palabra termina en -at o -ei, buscar sustantivo siguiente (Estado Constructo).',
        paso_05: 'Aislar la raiz de 3 letras y aplicar modelo de Binyan.'
      }
    },
    advanced_exegesis: {
      version: '3.0_Biblical_Exegesis_Advanced',
      descripcion: 'Modulos avanzados: Vav Consecutiva, Flexiones Verbales, Sufijos Plurales y Sintaxis',
      logica_especial_VAV_CONSECUTIVA: {
        concepto: 'Invierte el tiempo del verbo (Pasado -> Futuro, o Futuro -> Pasado)',
        reglas: [
          {
            caso: 'FUTURO_A_PASADO',
            condicion: 'Se une a un verbo en Yiqtol (Imperfecto)',
            resultado: 'Prefijo Vav + Pathach (ַ) + Dagesh Forte en la letra siguiente (וַיּ)',
            excepcion: 'Si la letra siguiente es Aleph (א), el Pathach se alarga a Qamets (וָא) por rechazo al Dagesh',
            ejemplo: 'וַיֹּאמֶר (Vayomer) - Y el dijo (Vav + Futuro = Pasado)'
          },
          {
            caso: 'PASADO_A_FUTURO',
            condicion: 'Se une a un verbo en Qatal (Perfecto)',
            resultado: 'Se vocaliza como la Vav Conjuncion estandar (וְ / וּ)',
            nota_fonetica: 'Suele desplazar el acento a la ultima silaba',
            ejemplo: 'וְשָׁמַרְתָּ (Veshamarta) - Y tu guardaras (Vav + Pasado = Futuro)'
          }
        ]
      },
      logica_flexiones_verbales_basicas: {
        nota: 'Afijos que determinan la persona, genero y numero (Tiempo QAL)',
        tiempo_qatal_perfecto: {
          concepto: 'Accion completada (Pasado). Se conjuga mediante SUFIJOS.',
          terminaciones: {
            '1cs_yo': 'תִּי (-ti)',
            '2ms_tu_m': 'תָּ (-ta)',
            '2fs_tu_f': 'תְּ (-t)',
            '3ms_el': '(Raiz pura, sin sufijo)',
            '3fs_ella': 'ָה (-ah)',
            '1cp_nosotros': 'נוּ (-nu)',
            '2mp_vosotros_m': 'תֶּם (-tem)',
            '2fp_vosotros_f': 'תֶּן (-ten)',
            '3cp_ellos_ellas': 'וּ (-u)'
          }
        },
        tiempo_yiqtol_imperfecto: {
          concepto: 'Accion incompleta (Futuro/Presente). Se conjuga principalmente mediante PREFIJOS.',
          identificadores: {
            '1cs_yo': 'Prefijo Aleph (א)',
            '2ms_tu_m': 'Prefijo Tav (ת)',
            '3ms_el': 'Prefijo Yod (י)',
            '1cp_nosotros': 'Prefijo Nun (נ)'
          }
        }
      }
    },
    full_exegesis: {
      version: '4.0_Full_Exegesis',
      descripcion: 'Compendio de modulos faltantes para pronombres, particulas de existencia, formas nominales, verbos debiles, concordancia y fonetica avanzada',
      logica_sufijos_pronominales_plurales: {
        nota: 'Se anaden a sustantivos plurales. Se distinguen por la Yod intercalada.',
        tabla_sufijos: {
          '1cs_mis': 'ַי (-ai)',
          '2ms_tus_m': 'ֶיךָ (-ekha)',
          '2fs_tus_f': 'ַיִךְ (-ayikh)',
          '3ms_sus_m': 'ָיו (-av)',
          '3fs_sus_f': 'ֶיהָ (-eyha)',
          '1cp_nuestros': 'ֵינוּ (-einu)',
          '2mp_vuestros_m': 'ֵיכֶם (-eikhem)',
          '2fp_vuestros_f': 'ֵיכֶן (-eikhen)',
          '3mp_sus_pl_m': 'ֵיהֶם (-eihem)',
          '3fp_sus_pl_f': 'ֵיהֶן (-eihen)'
        },
        ejemplo_diagnostico: 'סוּס (Caballo) -> סוּסוֹ (Su caballo) vs סוּסָיו (Sus caballos)'
      },
      logica_declinacion_preposiciones: {
        concepto: 'Preposiciones inseparables (B, L) + Sufijos Pronominales',
        ejemplo_lamed: {
          a_mi: 'לִי (Li)',
          a_ti_m: 'לְךָ (Lekha)',
          a_el: 'לוֹ (Lo)',
          a_nosotros: 'לָנוּ (Lanu)',
          a_ellos: 'לָהֶם (Lahem)'
        }
      },
      sintaxis_particulas_criticas: {
        marcador_objeto_directo: {
          particula: 'אֵת / אֶת־ (Et)',
          funcion: 'Senala quien o que recibe la accion del verbo. No tiene traduccion al espanol.',
          regla_de_uso: 'Aparece solo antes de sustantivos definidos (con articulo, nombres propios o con sufijos pronominales).',
          ejemplo: 'Bara Elohim ET ha-shamayim (Creo Dios [marcador] los cielos)'
        }
      },
      guia_diagnostico_interlinear_actualizada: {
        paso_01: 'Identificar si la primera palabra es Vav. Evaluar vocalizacion para determinar si es Conjuncion (y) o Consecutiva (cambio de tiempo).',
        paso_02: 'Separar prefijos preposicionales (B, K, L, Min) verificando si hay Articulo Oculto.',
        paso_03: 'Separar sufijos al final de la palabra. Si hay una Yod (י) antes del sufijo, el objeto poseido es Plural.',
        paso_04: 'Con la raiz aislada, verificar si es un Verbo analizando los prefijos/sufijos de Qatal o Yiqtol.',
        paso_05: 'Identificar particulas sintacticas como Et para mapear la accion del Sujeto hacia el Objeto.'
      },
      modulo_4_pronombres_y_existencia: {
        descripcion: 'Permite identificar sujetos en oraciones nominales.',
        pronombres_personales: ['אֲנִי', 'אַתָּה', 'הוּא', 'הִיא', 'אֲנַחְנוּ', 'הֵם'],
        demostrativos: ['זֶה', 'זֹאת', 'אֵלֶּה'],
        existencia: ['יֵשׁ'],
        inexistencia: ['אֵין', 'אַיִן']
      },
      modulo_5_formas_nominales_y_volitivas: {
        logica_formas_nominales: {
          Participio_Activo: {
            identificador: 'Vocal Cholem (ֹ) tras la 1ra radical',
            uso: 'Funciona como presente continuo o sustantivo (El que hace).'
          },
          Infinitivo_Constructo: {
            identificador: 'Prefijo לְ + Raiz pura',
            uso: 'Indica proposito o inicio de accion (Al ver, para ir).'
          },
          Infinitivo_Absoluto: {
            identificador: 'Vocalizacion Qamets-Cholem (ָ ֹ)',
            uso: 'Enfasis gramatical: Ciertamente verbo.'
          }
        },
        logica_volitiva_ordenes: {
          Imperativo: 'Raiz pura (sin prefijos de persona). Solo en 2da persona.',
          Cohortativo: 'Prefijo א + terminacion ָה. Expresa deseo: Hagamos.',
          Yusivo: 'Forma corta del futuro (Yiqtol). Expresa ruego: Que sea.'
        }
      },
      modulo_6_verbos_debiles: {
        guturales: 'Como א, ה, ח, ע y ר no aceptan Dagesh Forte, el sistema debe buscar un alargamiento compensatorio en la vocal precedente.',
        pe_nun: {
          regla: 'Si la raiz empieza con נ, esta desaparece y pone un Dagesh Forte en la siguiente letra.',
          ejemplo: 'נָתַן -> יִתֵּן'
        },
        lamed_he: 'Si la raiz termina en ה, esta suele desaparecer en el futuro o convertirse en י ante sufijos.'
      },
      modulo_7_adjetivos_y_concordancia_sintactica: {
        concordancia_obligatoria: 'El adjetivo debe coincidir en Genero y Numero con el sustantivo.',
        atributivo: {
          regla: 'Si el sustantivo tiene articulo (הַ), el adjetivo tambien debe tenerlo.',
          ejemplo: 'הָאִישׁ הַטּוֹב'
        },
        predicativo: {
          regla: 'Si el sustantivo tiene articulo pero el adjetivo no, se traduce con el verbo ser.',
          ejemplo: 'טּוֹב הָאִישׁ'
        }
      },
      modulo_8_fonetica_avanzada_y_particulas_criticas: {
        interrogacion_he: {
          prefijo: 'הֲ (He con Chatef-Pathach)',
          regla: 'Inicia una pregunta. A diferencia del articulo הַ, no suele poner Dagesh Forte.'
        },
        formas_de_pausa: {
          condicion: 'Final de versiculo o acento mayor (Silluq / Atnaj)',
          efecto: 'Las vocales breves se alargan.'
        },
        uniones_maqqeph: {
          simbolo: 'Guion alto (־)',
          efecto: 'Une palabras en una sola unidad tonica. La palabra anterior pierde su acento y puede acortar su vocal.'
        }
      }
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
