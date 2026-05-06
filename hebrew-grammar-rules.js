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
      },
      modulo_9_sintaxis_particulas_negacion: {
        lo: {
          particula: 'לֹא',
          funcion: 'Negacion permanente o de hechos',
          uso: 'No es, No fue'
        },
        al: {
          particula: 'אַל',
          funcion: 'Negacion volitiva o inmediata',
          uso: 'Se usa exclusivamente con el futuro y el yusivo'
        }
      },
      debugger_vav_consecutiva: {
        instruccion: 'Cuando proceses una Vav Consecutiva (וַ), busca Dagesh Forte en la letra siguiente para confirmar que es tiempo invertido.',
        fallback: 'Si no hay Dagesh ni alargamiento compensatorio, tratarla como Vav Conjuncion simple.'
      }
    },
    full_exegesis_complement: {
      version: '4.0_Full_Exegesis_Complement',
      descripcion: 'Modulos faltantes: Dagesh, Sufijos Verbales, Qere-Ketiv, Particulas Relativas, Preposiciones Declinadas, Numeros, Silabacion y Arameo Biblico',
      modulo_dagesh_lene_vs_forte: {
        concepto: 'El punto dentro de una consonante puede ser Lene (suavizador) o Forte (duplicador). Son foneticamente distintos.',
        dagesh_lene: {
          definicion: 'Endurece la pronunciacion de la consonante. No duplica.',
          letras_validas: ['בּ', 'גּ', 'דּ', 'כּ', 'פּ', 'תּ'],
          nombre_grupo: 'BeGaD KeFaT',
          condicion: 'Aparece cuando la letra esta al inicio de silaba y la silaba anterior termina en consonante (o es inicio de palabra)',
          condicion_negativa: 'No aparece si la letra sigue directamente a una vocal (silaba abierta previa)',
          ejemplo_con: 'בַּיִת (Bayit) - La בּ lleva Dagesh Lene porque esta al inicio absoluto',
          ejemplo_sin: 'אֲבִי (Avi) - La בּ no lleva Dagesh porque sigue a una vocal'
        },
        dagesh_forte: {
          definicion: 'Duplica la consonante. La letra se pronuncia dos veces (cierra la silaba anterior y abre la siguiente).',
          letras_validas: 'Todas excepto guturales (א, ה, ח, ע) y Resh (ר)',
          origenes_comunes: [
            'Asimilacion de Nun (ן/נ) en preposicion MIN o Pe-Nun',
            'Articulo definido הַ ante consonantes no guturales',
            'Binyanim intensivos (PIEL, PUAL, HITPAEL) en la 2da radical'
          ],
          regla_de_diagnostico: 'Si ves Dagesh en una letra que no es BeGaD KeFaT, es siempre Forte. Si es BeGaD KeFaT, analizar contexto vocalico para distinguir.',
          ejemplo: 'הַמֶּלֶךְ - El Dagesh en מּ es Forte (viene del articulo). שִׁמֵּר - El Dagesh en מּ es Forte (PIEL, duplica la 2da radical)'
        }
      },
      modulo_sufijos_pronominales_sobre_verbos: {
        concepto: 'El objeto directo puede pegarse al verbo como sufijo, eliminando la necesidad de la particula אֵת',
        nota: 'Distinto a los sufijos sobre sustantivos (posesion). Aqui expresan objeto de la accion.',
        regla_de_fusion_vocalica: 'La vocal final del verbo generalmente se reduce o se alarga para recibir el sufijo. Sheva vocal suele aparecer como puente.',
        tabla_sufijos_objeto: {
          '1cs_me': 'נִי (-ni) ej. שְׁמָרַנִי (El me guardo)',
          '2ms_te_m': 'ךָ (-kha) ej. אֶשְׁמָרְךָ (Yo te guardare)',
          '2fs_te_f': 'ךְ (-kh)',
          '3ms_lo': 'הוּ / וֹ (-hu / -o) ej. שְׁלָחוֹ (El lo envio)',
          '3fs_la': 'הָ (-ha)',
          '1cp_nos': 'נוּ (-nu)',
          '2mp_os_m': 'כֶם (-khem)',
          '2fp_os_f': 'כֶן (-khen)',
          '3mp_los': 'ם (-m) ej. שְׁמָרָם (El los guardo)',
          '3fp_las': 'ן (-n)'
        },
        regla_diagnostico: 'Si un verbo tiene una consonante final inesperada (נ, ה, ו, ם) que no corresponde al paradigma verbal, verificar si es sufijo de objeto.',
        diferencia_clave: 'Sustantivo + sufijo = posesion (סוּסוֹ = su caballo). Verbo + sufijo = objeto directo (שְׁמָרוֹ = el lo guardo).'
      },
      modulo_qere_ketiv: {
        concepto: 'En el texto masoretico, la consonante escrita (Ketiv) y la palabra que debe leerse (Qere) pueden diferir.',
        ketiv: 'Lo que esta escrito en las consonantes del texto.',
        qere: 'Lo que debe leerse segun la nota marginal de los masoretas. La vocalizacion del Qere se coloca sobre las consonantes del Ketiv.',
        casos_frecuentes: [
          {
            caso: 'Qere Perpetuo',
            descripcion: 'Palabras cuyo Qere nunca se escribe porque es conocido universalmente',
            ejemplo_principal: 'יהוה (YHWH) - Se vocaliza con las vocales de אֲדֹנָי (Adonai) pero se lee siempre Adonai.',
            otros: ['הִוא escrito, pero se lee הִיא (Ella) en muchos pasajes del Pentateuco']
          },
          {
            caso: 'Qere Normal',
            descripcion: 'Correccion de escribas anotada al margen',
            regla_parser: 'Si la morfologia de la forma escrita no resuelve, intentar la lectura alternativa del Qere antes de marcar como desconocido.'
          }
        ],
        impacto_en_parser: 'Una forma escrita puede no coincidir con ningun paradigma morfologico conocido porque sus vocales pertenecen a una palabra diferente. El Qere explica la disonancia.'
      },
      modulo_particula_relativa: {
        concepto: 'Equivalente hebreo de que / quien / el cual. Existe en dos formas con comportamiento sintactico distinto.',
        forma_independiente: {
          particula: 'אֲשֶׁר',
          tipo: 'Palabra separada, invariable (no cambia por genero ni numero)',
          uso: 'Introduce una clausula relativa. Puede funcionar tambien como donde, cuando, porque segun contexto.',
          ejemplo: 'הָאִישׁ אֲשֶׁר בָּא (El hombre que vino)'
        },
        forma_prefijada: {
          particula: 'שֶׁ / שׁ',
          tipo: 'Prefijo inseparable, se comporta como BKL',
          vocalizacion_estandar: 'Sheva (ְ)',
          vocalizacion_ante_sheva: 'Hireq (ִ), igual que BKL en REGLA_DOS_SHEVAS',
          uso: 'Mas frecuente en poesia y textos tardios (Eclesiastes, Cantar de Cantares)',
          ejemplo: 'שֶׁאָהַבְתִּי (Que yo ame - Cantar 1:7)'
        },
        regla_diagnostico: 'Si aparece שׁ o ש pegado al inicio de una palabra que no es el verbo שׁוּב ni raiz similar, evaluar si es el prefijo relativo antes de analizar como raiz.'
      },
      modulo_preposiciones_el_vs_lamed: {
        concepto: 'אֶל y לְ ambas significan a / hacia pero con matices distintos que afectan la exegesis.',
        preposicion_el: {
          forma: 'אֶל',
          tipo: 'Separable (palabra independiente)',
          matiz: 'Movimiento fisico direccional hacia un punto. Indica llegada o acercamiento.',
          ejemplo: 'וַיָּבֹא אֶל הַבַּיִת (Y el llego a la casa - movimiento fisico)',
          sufijos: {
            '1cs': 'אֵלַי (Elai - hacia mi)',
            '2ms': 'אֵלֶיךָ (Elekha - hacia ti)',
            '3ms': 'אֵלָיו (Elav - hacia el)',
            '3fs': 'אֵלֶיהָ (Eleyha - hacia ella)',
            '1cp': 'אֵלֵינוּ (Eleinu - hacia nosotros)',
            '3mp': 'אֲלֵיהֶם (Aleihem - hacia ellos)'
          }
        },
        preposicion_lamed: {
          forma: 'לְ',
          tipo: 'Inseparable (prefijo)',
          matiz: 'Destino, beneficio, proposito o referencia. No implica movimiento fisico necesariamente.',
          ejemplo: 'נָתַן לוֹ (Le dio a el - beneficiario, no direccion fisica)'
        },
        diferencia_exegetica: 'Genesis 3:24: וַיְשַׁלְּחֵהוּ יהוה אֱלֹהִים מִגַּן עֵדֶן. Usar אֶל o לְ cambiaria si Adan llego a un lugar especifico o fue enviado con un proposito.'
      },
      modulo_preposiciones_separables_declinadas: {
        concepto: 'Las preposiciones separables (אֶל, עַל, בֵּין, תַּחַת, עִם, לִפְנֵי) se declinan con sufijos pronominales propios. Cada una tiene paradigma irregular.',
        preposicion_al_sobre: {
          base: 'עַל',
          sufijos: {
            '1cs': 'עָלַי (sobre mi)',
            '2ms': 'עָלֶיךָ (sobre ti)',
            '3ms': 'עָלָיו (sobre el)',
            '3fs': 'עָלֶיהָ (sobre ella)',
            '1cp': 'עָלֵינוּ (sobre nosotros)',
            '2mp': 'עֲלֵיכֶם (sobre vosotros)',
            '3mp': 'עֲלֵיהֶם (sobre ellos)'
          }
        },
        preposicion_im_con: {
          base: 'עִם',
          sufijos: {
            '1cs': 'עִמִּי (conmigo)',
            '2ms': 'עִמְּךָ (contigo)',
            '3ms': 'עִמּוֹ (con el)',
            '1cp': 'עִמָּנוּ (con nosotros)',
            '3mp': 'עִמָּהֶם (con ellos)'
          }
        },
        preposicion_tachat_bajo: {
          base: 'תַּחַת',
          sufijos: {
            '1cs': 'תַּחְתַּי (bajo mi)',
            '3ms': 'תַּחְתָּיו (bajo el)',
            '3mp': 'תַּחְתֵּיהֶם (bajo ellos)'
          }
        },
        preposicion_ben_entre: {
          base: 'בֵּין',
          nota: 'Casi siempre aparece repetida para indicar entre A y B: בֵּין X וּבֵין Y',
          sufijos: {
            '1cp': 'בֵּינֵינוּ (entre nosotros)',
            '3mp': 'בֵּינֵיהֶם (entre ellos)'
          }
        },
        preposicion_lifney_delante: {
          base: 'לִפְנֵי (literalmente: a la cara de)',
          sufijos: {
            '1cs': 'לְפָנַי (delante de mi)',
            '2ms': 'לְפָנֶיךָ (delante de ti)',
            '3ms': 'לְפָנָיו (delante de el)',
            '1cp': 'לְפָנֵינוּ (delante de nosotros)',
            '3mp': 'לִפְנֵיהֶם (delante de ellos)'
          }
        },
        regla_diagnostico: 'Si una preposicion conocida termina con una consonante inesperada seguida de vocal, probablemente lleva sufijo pronominal. Aislar la base y buscar en la tabla.'
      },
      modulo_numeros_cardinales: {
        concepto: 'Los cardinales hebreos tienen genero invertido respecto al sustantivo que modifican.',
        regla_genero_invertido: {
          descripcion: 'El numeral masculino se usa con sustantivos femeninos y el numeral femenino con sustantivos masculinos. Aplica del 3 al 10.',
          ejemplo: 'שְׁלֹשָׁה אֲנָשִׁים (Tres hombres) - אֲנָשִׁים es masculino pero שְׁלֹשָׁה tiene la terminacion femenina ָה',
          ejemplo2: 'שָׁלֹשׁ נָשִׁים (Tres mujeres) - נָשִׁים es femenino pero שָׁלֹשׁ es la forma sin terminacion (masculina)'
        },
        rangos: [
          {
            rango: '1-2',
            comportamiento: 'Concuerdan normalmente con el sustantivo (sin inversion)'
          },
          {
            rango: '3-10',
            comportamiento: 'Genero invertido (ver regla arriba)'
          },
          {
            rango: '11-19',
            comportamiento: 'Compuestos. La unidad sigue la regla de inversion; el 10 (עָשָׂר/עֶשְׂרֵה) concuerda normalmente.',
            ejemplo: 'אַחַד עָשָׂר (Once, con sust. masc.) vs אַחַת עֶשְׂרֵה (Once, con sust. fem.)'
          },
          {
            rango: '20-90 (decenas)',
            comportamiento: 'Forma unica invariable (plural del numeral de unidad). Sin distincion de genero.',
            ejemplo: 'עֶשְׂרִים (Veinte), שְׁלֹשִׁים (Treinta)'
          },
          {
            rango: '100+',
            comportamiento: 'מֵאָה (100), אֶלֶף (1000). Invariables en genero. Se combinan en aposicion.'
          }
        ],
        posicion_sintactica: 'Los cardinales pueden ir antes o despues del sustantivo. Antes: funcion atributiva directa. Despues: funcion mas enfatica.',
        regla_diagnostico: 'Si ves una forma con terminacion ָה que morfologicamente parece femenino pero el sustantivo asociado es masculino, verificar si es un numeral antes de marcar como error de concordancia.'
      },
      modulo_silabacion_y_acento: {
        concepto: 'Las reglas de silabacion determinan que vocales pueden aparecer donde. Son la base mecanica de todos los cambios vocalicos.',
        tipos_de_silaba: {
          abierta: {
            estructura: 'Consonante + Vocal (CV)',
            descripcion: 'Termina en vocal. Puede tener vocal larga o breve.',
            regla_acentuada: 'En silaba abierta acentuada, la vocal tiende a ser larga',
            ejemplo: 'בָּ en בָּרָא (primera silaba abierta acentuada, Qamets largo)'
          },
          cerrada: {
            estructura: 'Consonante + Vocal + Consonante (CVC)',
            descripcion: 'Termina en consonante.',
            regla: 'La vocal en silaba cerrada no acentuada tiende a ser breve',
            ejemplo: 'מֶל en מֶלֶךְ (silaba cerrada, Segol breve)'
          },
          semiabierta_sheva: {
            estructura: 'Consonante + Sheva vocal',
            descripcion: 'El Sheva vocal abre una silaba muy breve (semi-vocal)',
            regla: 'Solo puede aparecer en posicion pre-tonica (antes del acento), nunca al final de palabra ni dos seguidos al inicio'
          }
        },
        reglas_de_cambio_vocalico: [
          {
            nombre: 'REDUCCION',
            condicion: 'Una vocal larga en silaba abierta pierde el acento al anadir sufijo',
            resultado: 'La vocal larga se reduce a Sheva o a Chatef (guturales)',
            ejemplo: 'דָּבָר (Palabra) -> דְּבַר (Palabra-de, en constructo)'
          },
          {
            nombre: 'ALARGAMIENTO_COMPENSATORIO',
            condicion: 'Una consonante que deberia duplicarse (Dagesh Forte) no puede porque es gutural o Resh',
            resultado: 'La vocal precedente se alarga un grado (Pathach->Qamets, Hireq->Tsere)',
            ejemplo: 'מִן + ר = מֵרֹאשׁ (Tsere compensa la Nun asimilada)'
          },
          {
            nombre: 'FORMA_PAUSA',
            condicion: 'Palabra en posicion de pausa (acento Silluq o Atnaj, al final de versiculo o hemistiquio)',
            resultado: 'Vocal breve en silaba acentuada se alarga: Pathach->Qamets, Segol->Tsere, Hireq->Tsere',
            ejemplo: 'יֶלֶד (Nino) -> יָלֶד en pausa'
          }
        ],
        posicion_del_acento: {
          regla_general: 'El acento hebreo es oxitono por defecto (cae en la ultima silaba - Milra)',
          excepcion_paroxtona: 'Muchas formas verbales y sustantivos en constructo son paroxitonos (acento en penultima silaba - Milel)',
          impacto: 'Cambiar la posicion del acento puede cambiar el significado morfologico. La Vav Consecutiva suele desplazar el acento a la ultima silaba.'
        }
      },
      modulo_arameo_biblico: {
        concepto: 'Partes de Daniel (2:4b-7:28) y Esdras (4:8-6:18, 7:12-26) estan en arameo biblico, no hebreo. Comparte alfabeto pero tiene diferencias morfologicas que producen falsos positivos en el parser hebreo.',
        diferencias_criticas: [
          {
            categoria: 'Estado Determinado',
            hebreo: 'Usa el articulo prefijado הַ para definir',
            arameo: 'Usa el sufijo postpuesto אָ / אַ / יָא para definir',
            riesgo_parser: 'La terminacion אָ en arameo no es estado constructo femenino hebreo. Es el equivalente a el/la (determinado).',
            ejemplo: 'מַלְכָּא (El rey, determinado arameo) vs מַלְכַּת (Reina, constructo hebreo)'
          },
          {
            categoria: 'Plural Masculino',
            hebreo: 'Termina en ִים (-im)',
            arameo: 'Termina en ִין (-in) en estado absoluto',
            ejemplo: 'מַלְכִין (Reyes, arameo) ≠ paradigma hebreo'
          },
          {
            categoria: 'Prefijos Verbales',
            hebreo: 'Imperfecto 3ms: יִ- (Yod + Hireq)',
            arameo: 'Imperfecto 3ms: יְ- (Yod + Sheva) o לְ- en algunos binyanim arameos',
            binyanim_arameos: ['PEAL (= Qal)', 'PAEL (= Piel)', 'APHEL (= Hifil)', 'HITPEEL (= Hitpael)']
          },
          {
            categoria: 'Pronombres',
            diferencias: 'אֲנָה (Yo, arameo) vs אֲנִי (Yo, hebreo). הִמּוֹ (Ellos, arameo) vs הֵם (hebreo).'
          }
        ],
        regla_diagnostico: 'Si el parser no resuelve una forma en los libros de Daniel o Esdras y la palabra termina en א o ין, intentar analisis arameo antes de marcar como desconocido.'
      },
      guia_diagnostico_v4_completa: {
        paso_01: 'Verificar si el texto pertenece a una seccion aramea (Daniel 2:4b-7:28 o Esdras 4:8-6:18). Si es asi, aplicar modulo_arameo_biblico.',
        paso_02: 'Identificar Dagesh: Es BeGaD KeFaT al inicio de silaba? -> Lene. Es otra consonante o el contexto indica duplicacion? -> Forte. El Forte indica asimilacion, articulo o binyan intensivo.',
        paso_03: 'Separar prefijos BKL/Vav/Min/שׁ-relativo usando reglas_oro. Verificar Articulo Oculto (SINCOPE_ARTICULO).',
        paso_04: 'Evaluar si la Vav es Conjuncion o Consecutiva (buscar Pathach+Dagesh Forte para confirmar inversion temporal).',
        paso_05: 'Aislar sufijos. Si hay Yod antes del sufijo en sustantivo -> objeto plural poseido. Si el sufijo esta sobre un verbo -> objeto directo (modulo_sufijos_pronominales_sobre_verbos).',
        paso_06: 'Analizar terminacion nominal: -at/-ei = Estado Constructo. Sufijo postpuesto -א = Determinado arameo.',
        paso_07: 'Con la raiz aislada: verificar si es numeral (aplicar regla de genero invertido). Verificar si el adjetivo tiene articulo para decidir Atributivo vs Predicativo.',
        paso_08: 'Si la forma no resuelve en ningun paradigma, verificar si existe una lectura Qere diferente a las consonantes Ketiv escritas.',
        paso_09: 'Para la preposicion encontrada: si es inseparable (B/K/L/שׁ), verificar tabla BKL. Si es separable (אֶל/עַל/עִם/בֵּין/תַּחַת), buscar en modulo_preposiciones_separables_declinadas.',
        paso_10: 'Verificar si la palabra esta en posicion de pausa (final de versiculo o bajo acento Atnaj). Si es asi, la vocal puede estar alargada respecto a la forma normal.'
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

  const MORPHEME_GLOSS_HINTS = {
    CONJ: 'y',
    PREP: 'prep',
    ART: 'el/la',
    REL: 'que',
    INTJ: 'he aqui',
    PART: 'part',
    'PART.OBJ.DIR': '',
    RBSC1: 'mi',
    RBSC2: 'tu',
    RBSF2: 'tu',
    RBSM3: 'su',
    RBSF3: 'su',
    RBPM2: 'vuestro',
    RBPF2: 'vuestra',
    RBPM3: 'su',
    RBPF3: 'su'
  };

  function resolveMorphemeSpanishGloss(morpheme, baseGloss = ''){
    const label = String(morpheme?.label || '').trim().toUpperCase();
    const surface = normalizeHebrew(morpheme?.surface || '', true);

    if(morpheme?.type === 'base'){
      return String(baseGloss || '').trim();
    }

    if(label === 'CONJ') return 'y';
    if(label === 'ART') return 'el/la';
    if(label === 'REL') return 'que';
    if(label === 'INTJ') return 'he aqui';
    if(label === 'PART.OBJ.DIR') return '';

    if(label === 'PREP'){
      if(/^ב/.test(surface)) return 'en';
      if(/^ל/.test(surface)) return 'a';
      if(/^מ/.test(surface)) return 'de';
      if(/^כ/.test(surface)) return 'como';
      return 'prep';
    }

    if(label === 'RBSC1') return 'mi';
    if(label === 'RBSC2' || label === 'RBSF2') return 'tu';
    if(label === 'RBSM3' || label === 'RBSF3' || label === 'RBPM3' || label === 'RBPF3') return 'su';
    if(label === 'RBPM2') return 'vuestro';
    if(label === 'RBPF2') return 'vuestra';

    return morpheme?.glossHint ?? MORPHEME_GLOSS_HINTS[label] ?? '';
  }

  function firstHebrewLetter(word){
    const match = String(word || '').match(/[\u05D0-\u05EA]/);
    return match ? match[0] : '';
  }

  function niqqudClusterAfterFirst(word){
    const match = String(word || '').match(/[\u05D0-\u05EA]([\u05B0-\u05C7]*)/);
    return match ? match[1] : '';
  }

  function advancePastFirstCluster(word){
    const match = String(word || '').match(/^([\u05D0-\u05EA][\u05B0-\u05C7]*)(.*)$/s);
    return match ? match[2] : '';
  }

  function createMorpheme(surface, label, type, extra = {}){
    return {
      surface,
      label,
      type,
      glossHint: MORPHEME_GLOSS_HINTS[label] ?? '',
      ...extra
    };
  }

  function analyzeVavPrefixSegment(word){
    const normalized = normalizeHebrew(word, true);
    if(firstHebrewLetter(normalized) !== 'ו') return null;
    const niqqud = niqqudClusterAfterFirst(normalized);
    const nextCluster = advancePastFirstCluster(normalized);
    const nextNiqqud = niqqudClusterAfterFirst(nextCluster);
    const nextLetter = firstHebrewLetter(nextCluster);
    const nextHasDagesh = nextNiqqud.includes('\u05BC');

    if(niqqud.includes('\u05B7') && nextHasDagesh){
      return createMorpheme(normalized.slice(0, 1 + niqqud.length), 'CONJ', 'prefix', {
        rule: 'FUTURO_A_PASADO',
        subtype: 'VAV_CONSECUTIVA',
        note: 'Vav consecutiva con Pathach + Dagesh Forte'
      });
    }
    if(niqqud.includes('\u05B8') && nextLetter === 'א'){
      return createMorpheme(normalized.slice(0, 1 + niqqud.length), 'CONJ', 'prefix', {
        rule: 'FUTURO_A_PASADO',
        subtype: 'VAV_CONSECUTIVA_ALEPH',
        note: 'Vav consecutiva con compensacion ante Aleph'
      });
    }
    if(niqqud.includes('\u05BC')){
      return createMorpheme(normalized.slice(0, 1 + niqqud.length), 'CONJ', 'prefix', {
        rule: 'VAV_CONJUNCION_SHURUQ',
        subtype: 'VAV_CONJUNCION',
        note: 'Vav con Shureq'
      });
    }
    return createMorpheme(normalized.slice(0, 1 + niqqud.length), 'CONJ', 'prefix', {
      rule: 'VAV_CONJUNCION',
      subtype: 'VAV_CONJUNCION',
      note: 'Vav conjuntiva'
    });
  }

  function analyzeArticleSegment(word){
    const normalized = normalizeHebrew(word, true);
    const first = firstHebrewLetter(normalized);
    const niqqud = niqqudClusterAfterFirst(normalized);
    if(first !== 'ה') return null;
    if(!(niqqud.includes('\u05B7') || niqqud.includes('\u05B8') || niqqud.includes('\u05B6'))){
      return null;
    }
    return createMorpheme(normalized.slice(0, 1 + niqqud.length), 'ART', 'prefix', {
      rule: 'ARTICULO_EXPLICITO'
    });
  }

  function analyzeMinSegment(word){
    const normalized = normalizeHebrew(word, true);
    const first = firstHebrewLetter(normalized);
    const niqqud = niqqudClusterAfterFirst(normalized);
    if(first !== 'מ') return null;
    if(!niqqud.includes('\u05B4') && !niqqud.includes('\u05B5')) return null;
    const nextCluster = advancePastFirstCluster(normalized);
    const nextLetter = firstHebrewLetter(nextCluster);
    if(EXEGESIS_PROFILE.configuracion_fonetica.clases_letras.guturales.includes(nextLetter) || nextLetter === 'ר'){
      return createMorpheme(normalized.slice(0, 1 + niqqud.length), 'PREP', 'prefix', {
        rule: 'ALARGAMIENTO_COMPENSATORIO',
        note: 'Prefijo Min con compensacion fonetica'
      });
    }
    return createMorpheme(normalized.slice(0, 1 + niqqud.length), 'PREP', 'prefix', {
      rule: 'ASIMILACION_FUERTE',
      note: 'Prefijo Min'
    });
  }

  function analyzeRelativePrefixSegment(word){
    const normalized = normalizeHebrew(word, true);
    const first = firstHebrewLetter(normalized);
    if(first !== 'ש') return null;
    const niqqud = niqqudClusterAfterFirst(normalized);
    if(!(niqqud.includes('\u05B0') || niqqud.includes('\u05B4') || niqqud.includes('\u05B6'))){
      return null;
    }
    return createMorpheme(normalized.slice(0, 1 + niqqud.length), 'REL', 'prefix', {
      rule: 'PARTICULA_RELATIVA_PREFIJADA'
    });
  }

  function analyzeBklPrefixSegment(word){
    const normalized = normalizeHebrew(word, true);
    const first = firstHebrewLetter(normalized);
    if(!['ב', 'כ', 'ל'].includes(first)) return null;
    const niqqud = niqqudClusterAfterFirst(normalized);
    if(!(niqqud.includes('\u05B0') || niqqud.includes('\u05B4') || niqqud.includes('\u05B6') || niqqud.includes('\u05B7') || niqqud.includes('\u05B8'))){
      return null;
    }
    const nextCluster = advancePastFirstCluster(normalized);
    const nextLetter = firstHebrewLetter(nextCluster);
    const nextNiqqud = niqqudClusterAfterFirst(nextCluster);
    const hasArticleSignal = (niqqud.includes('\u05B7') || niqqud.includes('\u05B8')) && nextNiqqud.includes('\u05BC');
    const hasChatef = ['\u05B1', '\u05B2', '\u05B3'].some((mark) => nextNiqqud.includes(mark));
    const startsWithSheva = nextNiqqud.includes('\u05B0');
    let rule = 'ESTANDAR';
    if(hasArticleSignal){
      rule = 'SINCOPE_ARTICULO';
    }else if(hasChatef){
      rule = 'REGLA_CHATEF';
    }else if(startsWithSheva){
      rule = nextLetter === 'י' ? 'REGLA_YOD_QUIESCENTE' : 'REGLA_DOS_SHEVAS';
    }
    return createMorpheme(normalized.slice(0, 1 + niqqud.length), 'PREP', 'prefix', {
      rule,
      hasHiddenArticle: hasArticleSignal
    });
  }

  function analyzePrefixLayer(form){
    let remainder = normalizeHebrew(form, true);
    const morphemes = [];
    let keepScanning = true;

    while(keepScanning && remainder){
      keepScanning = false;
      const detector = analyzeVavPrefixSegment(remainder)
        || analyzeArticleSegment(remainder)
        || analyzeMinSegment(remainder)
        || analyzeBklPrefixSegment(remainder)
        || analyzeRelativePrefixSegment(remainder);

      if(detector){
        morphemes.push(detector);
        remainder = remainder.slice(detector.surface.length);
        keepScanning = true;
      }
    }

    return { morphemes, remainder };
  }

  function shouldAnalyzePrefixes(baseLabel = '', options = {}){
    if(options.enablePrefixAnalysis === true) return true;
    if(options.enablePrefixAnalysis === false) return false;
    const label = String(baseLabel || '').trim().toUpperCase();
    if(!label) return false;
    if(/^(PREP|CONJ|ART|REL|INTJ|PART)(?:\.|$)/.test(label)) return false;
    if(/^(VERBO|SUBS|ADJ|NPROP)(?:\.|$)/.test(label)) return false;
    return false;
  }

  function analyzeSuffixLayer(form){
    const suffixResult = detectSuffixSegment(form);
    if(!suffixResult.suffix){
      return { base: suffixResult.base, suffixes: [] };
    }
    return {
      base: suffixResult.base,
      suffixes: [createMorpheme(suffixResult.suffix.form, suffixResult.suffix.label, 'suffix', {
        rule: 'SUFIJO_PRONOMINAL'
      })]
    };
  }

  function analyzeWordLayers(form, baseLabel = '', options = {}){
    const normalized = normalizeHebrew(form, true);
    const prefixLayer = shouldAnalyzePrefixes(baseLabel, options)
      ? analyzePrefixLayer(normalized)
      : { morphemes: [], remainder: normalized };
    const suffixLayer = analyzeSuffixLayer(prefixLayer.remainder);
    const forcedBaseLabel = forceConstructState(baseLabel, {
      ...options,
      hasPronominalSuffix: suffixLayer.suffixes.length > 0
    });

    const morphemes = [
      ...prefixLayer.morphemes,
      createMorpheme(suffixLayer.base, forcedBaseLabel || baseLabel || '', 'base', {
        rule: 'BASE'
      }),
      ...suffixLayer.suffixes
    ].filter((item) => item.surface);

    return {
      original: normalized,
      morphemes,
      base: suffixLayer.base,
      baseLabel: forcedBaseLabel || baseLabel || '',
      hasConstructBase: /\.C(?:$|\.)/.test(forcedBaseLabel || ''),
      hasPronominalSuffix: suffixLayer.suffixes.length > 0
    };
  }

  function buildSpanishInterlinearPlan(form, baseLabel = '', baseGloss = '', options = {}){
    const analysis = analyzeWordLayers(form, baseLabel, options);
    const morphemes = analysis.morphemes.map((morpheme) => ({
      ...morpheme,
      gloss: resolveMorphemeSpanishGloss(morpheme, baseGloss)
    }));
    return {
      ...analysis,
      morphemes
    };
  }

  function extractMorphFeatures(label){
    const upper = String(label || '').trim().toUpperCase();
    return {
      isPlural: /\.PL(?:$|\.)/.test(upper),
      isDual: /\.DU(?:$|\.)/.test(upper),
      isFeminine: /\.F(?:$|\.)/.test(upper),
      isMasculine: /\.M(?:$|\.)/.test(upper),
      isConstruct: /\.C(?:$|\.)/.test(upper)
    };
  }

  function resolveSpanishArticle(baseLabel){
    const features = extractMorphFeatures(baseLabel);
    if(features.isPlural || features.isDual){
      return features.isFeminine ? 'las' : 'los';
    }
    return features.isFeminine ? 'la' : 'el';
  }

  function resolvePossessiveArticle(baseLabel, suffixGloss){
    const features = extractMorphFeatures(baseLabel);
    const gloss = String(suffixGloss || '').trim().toLowerCase();
    if(!gloss) return '';

    if(gloss === 'mi') return features.isPlural || features.isDual ? 'mis' : 'mi';
    if(gloss === 'tu') return features.isPlural || features.isDual ? 'tus' : 'tu';
    if(gloss === 'su') return features.isPlural || features.isDual ? 'sus' : 'su';
    if(gloss === 'nuestro'){
      return features.isFeminine ? (features.isPlural || features.isDual ? 'nuestras' : 'nuestra') : (features.isPlural || features.isDual ? 'nuestros' : 'nuestro');
    }
    if(gloss === 'vuestro'){
      return features.isFeminine ? (features.isPlural || features.isDual ? 'vuestras' : 'vuestra') : (features.isPlural || features.isDual ? 'vuestros' : 'vuestro');
    }
    if(gloss === 'vuestra'){
      return features.isPlural || features.isDual ? 'vuestras' : 'vuestra';
    }
    return gloss;
  }

  function composeSpanishTokenGloss(plan){
    const morphemes = Array.isArray(plan?.morphemes) ? plan.morphemes : [];
    if(!morphemes.length) return '';

    const prefixGlosses = [];
    const suffixGlosses = [];
    let articlePresent = false;
    let baseGloss = '';
    let baseLabel = '';

    for(const morpheme of morphemes){
      const gloss = String(morpheme?.gloss || '').trim();
      if(morpheme.type === 'base'){
        baseGloss = gloss;
        baseLabel = String(morpheme?.label || '').trim();
        continue;
      }
      if(morpheme.type === 'suffix'){
        if(!gloss) continue;
        suffixGlosses.push(gloss);
        continue;
      }
      if(morpheme.label === 'ART'){
        articlePresent = true;
        continue;
      }
      if(!gloss) continue;
      prefixGlosses.push(gloss);
    }

    let phrase = baseGloss;
    const possessiveGloss = suffixGlosses[0] || '';
    const articleGloss = articlePresent ? resolveSpanishArticle(baseLabel) : '';
    const possessiveArticle = resolvePossessiveArticle(baseLabel, possessiveGloss);

    if(baseGloss){
      if(possessiveArticle){
        phrase = `${possessiveArticle} ${baseGloss}`.trim();
      }else if(articleGloss){
        phrase = `${articleGloss} ${baseGloss}`.trim();
      }
      if(suffixGlosses.length > 1){
        phrase = `${suffixGlosses.slice(1).join(' ')} ${phrase}`.trim();
      }
      if(prefixGlosses.length){
        phrase = `${prefixGlosses.join(' ')} ${phrase}`.trim();
      }
    }else{
      phrase = [...prefixGlosses, articlePresent ? resolveSpanishArticle(baseLabel) : '', ...suffixGlosses].filter(Boolean).join(' ').trim();
    }

    return phrase.replace(/\s+/g, ' ').trim();
  }

  function createInterlinearLayer1Adapter(){
    return {
      analyzeWordLayers,
      buildSpanishInterlinearPlan
    };
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
    analyzePrefixLayer,
    analyzeSuffixLayer,
    analyzeWordLayers,
    buildSpanishInterlinearPlan,
    composeSpanishTokenGloss,
    createInterlinearLayer1Adapter,
    explainRuleSet
  };
})(typeof window !== 'undefined' ? window : globalThis);
