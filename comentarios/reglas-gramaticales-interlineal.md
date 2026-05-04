# Reglas Gramaticales Del Interlineal

Este documento concentra en un solo lugar las reglas gramaticales que hoy maneja el sistema interlineal en código, sin moverlas del runtime ni cambiar el comportamiento actual.

Objetivo:
- servir como referencia única;
- separar la documentación de la lógica viva;
- evitar refactors riesgosos en `interlinear-view.js`.

Archivo principal de implementación:
- [interlinear-view.js](/C:/Users/pik_y/Documents/GitHub/Local-consults/estudio/angelos/interlinear-view.js)

Documento fuente complementario:
- [reglas gramaticales.txt](/C:/Users/pik_y/Documents/GitHub/Local-consults/estudio/angelos/reglas%20gramaticales.txt)

## Flujo General

La palabra hebrea pasa por este orden general:

1. normalización del token;
2. detección de partículas léxicas y excepciones;
3. detección de `אֵת`;
4. análisis de prefijos (`ו`, artículo, `מ`, `ב/כ/ל`);
5. almacenamiento de raíz/resto;
6. estado constructo;
7. género y número;
8. sufijos pronominales;
9. análisis verbal;
10. construcción de claves de lookup;
11. aplicación de rasgos gramaticales a la glosa española.

Funciones orquestadoras:
- `analyzeHebrewToken`
- `mapHebrewTokenToSpanish`
- `applyGlossFeatures`

## Reglas Implementadas

### 1. Vav

Función:
- `analyzeVavPrefix`

Casos implementados:
- `VAV_CONSECUTIVA`
  `וַ` + dagesh en la siguiente consonante.
- `VAV_CONSECUTIVA_ALEPH`
  `וָא` ante alef.
- `VAV_CONJUNCION_SHURUQ`
  `וּ` ante labial o sheva.
- `VAV_CONJUNCION_CHATEF`
  vav ante gutural con chatef.
- `VAV_CONJUNCION`
  conjunción estándar `וְ`.

Efectos:
- marca `isConsecutive` cuando aplica;
- añade prefijo español `y`;
- influye en la lectura verbal de `WAYYIQTOL`.

### 2. Artículo Definido Explícito

Funciones:
- `analyzeArticle`
- `analyzeGuturalArticle`

Casos implementados:
- `ARTICULO_DEFINIDO`
  `הַ` o `הָ` con patrón compatible.
- `ARTICULO_GUTURAL_SEGOL`
  `הֶ` ante gutural.

Efectos:
- marca `isDefinite = true`;
- agrega prefijo tipo `ARTICULO`;
- luego `applyGlossFeatures` puede insertar artículo español.

### 3. Artículo Oculto Con B/K/L

Función:
- `analyzeBKLPrefix`

Casos implementados:
- `SINCOPE_ARTICULO`
  cuando `ב/כ/ל` absorbe el artículo.
- `REGLA_CHATEF`
  gutural con chatef.
- `REGLA_CHATEF_ELOHIM`
  caso especial `אֱלֹהִים`.
- `REGLA_YOD_QUIESCENTE`
  yod inicial con sheva.
- `REGLA_DOS_SHEVAS`
  colisión de shevas.
- `REG_01_DEFAULT`
  caso regular.

Efectos:
- añade prefijo español `en`, `como`, `a/para`;
- si hay síncope de artículo, marca `isDefinite = true`.

### 4. Prefijo Min

Función:
- `analyzeMinPrefix`

Casos implementados:
- `ASIMILACION_FUERTE`
- `DUPLICACION_VIRTUAL`
- `ALARGAMIENTO_COMPENSATORIO`

Efectos:
- añade valor español `de/desde`.

### 5. Estado Constructo

Función:
- `analyzeConstructState`

Casos implementados:
- femenino singular `-ַת`
- masculino plural `-ֵי`

Notas:
- hoy detecta estos dos patrones explícitos;
- el plural femenino constructo no se resuelve de forma plena por contexto;
- el constructo no marca artículo definido;
- en glosa, `applyGlossFeatures` quita artículo base cuando entra a constructo.

### 6. Género Y Número

Función:
- `analyzeGenderNumber`

Casos implementados:
- dual `-ַיִם / -ָיִם`
- masculino plural `-ִים`
- femenino plural `-וֹת / ות`
- femenino singular `-ָה / -ֶת`
- fallback masculino singular

Notas:
- esta función trabaja por forma superficial;
- puede entrar en tensión con un constructo detectado por otra regla;
- si hay conflicto, el documento de análisis debe revisar ambos campos:
  `constructState` y `genderNumber`.

### 7. Binyanim

Función:
- `analyzeBinyan`

Modelos implementados:
- `HITPAEL`
- `HIFIL`
- `NIFAL`
- `PIEL`
- `QAL` como fallback

### 8. Tiempos Verbales Básicos

Función:
- `analyzeVerbalForm`

Casos implementados:
- `WAYYIQTOL`
- `QATAL`
- `YIQTOL`

Datos usados:
- prefijos verbales;
- sufijos qatal;
- efecto de `VAV_CONSECUTIVA`.

### 9. Reduplicación

Función:
- `detectReduplication`

Uso:
- marca raíces con reduplicación poética o intensiva.

### 10. Sufijos Pronominales

Función:
- `analyzePronominalSuffix`

Cobertura:
- sufijos de posesión singular;
- sufijos de posesión plural;
- varios casos poéticos/arcaicos;
- algunos objetos directos reforzados.

Efectos:
- altera la glosa española en `applyGlossFeatures`;
- distingue posesión y objeto cuando la regla lo detecta.

### 11. Partículas Léxicas Y Excepciones

Tablas internas:
- `LEXICAL_PARTICLES`
- `LEXICAL_EXPANSION`
- `CRITICAL_VERBAL_EXCEPTIONS`
- `PRECISE_GLOSSES`

Uso:
- atajos léxico-gramaticales para formas que no deben resolverse solo por regla general.

### 12. Marcador Et

Función:
- `detectEtMarker`

Efecto:
- marca `isEt = true`;
- evita traducirlo como sustantivo;
- devuelve `[obj]` o comportamiento equivalente en la capa de glosa.

## Aplicación De Las Reglas A La Glosa Española

Función principal:
- `applyGlossFeatures`

Transformaciones activas:
- pluralización;
- inserción de artículo si `isDefinite = true`;
- aplicación de sufijos pronominales;
- supresión de artículo en constructo;
- agregado de prefijos españoles (`y`, `en`, `de/desde`, etc.).

Este es el punto donde una detección morfológica sí impacta el español visible.

## Lookup Y Resolución De Glosa

Funciones:
- `_buildLookupKeys`
- `lookupInMaps`
- `mapHebrewTokenToSpanish`

Fuentes:
- mapa interlineal hebreo por libro;
- fallback de [diccionario_unificado.min.json](/C:/Users/pik_y/Documents/GitHub/Local-consults/estudio/angelos/diccionario/diccionario_unificado.min.json)

## Reglas Especiales De Verificación

Funciones:
- `verifySystemForms`
- `verifySystemFormsV25`

Objetivo:
- meter correcciones puntuales sin romper la ruta base;
- cubrir formas críticas como:
  - nun energética;
  - formas apocopadas de `היה`;
  - sufijos poéticos;
  - excepciones verbales sensibles.

## Estructura Morfológica Disponible En Los Tokens

Fuente principal:
- [IdiomaORIGEN/interlineal](/C:/Users/pik_y/Documents/GitHub/Local-consults/estudio/angelos/IdiomaORIGEN/interlineal)

Campos frecuentes:
- `orig`
- `strongs`
- `morphs`
- `es`
- `added`
- `notrans`

Ejemplos reales:
- `XD`
  artículo definido separado.
- `CC`
  conjunción.
- `NCcPMC`
  sustantivo común, constructo, plural, masculino.
- `NCcPFN`
  sustantivo común, plural, femenino, absoluto.
- `NCcSFN`
  sustantivo común, singular, femenino, absoluto.

Nota:
- el motor actual no depende exclusivamente de `morphs`;
- mezcla `morphs`, vocalización, prefijos visibles, sufijos y tablas de excepción.

## Qué No Se Ha Extraído A Un Módulo Separado

Aún no se hizo:
- mover reglas a JSON consumido en runtime;
- reemplazar `interlinear-view.js` por un motor declarativo externo;
- reescribir análisis desde `morphs` como fuente única.

Razón:
- evitar romper funciones ya estables.

## Recomendación Segura

Si más adelante se quiere separar también la lógica ejecutable sin riesgo, el camino más seguro es:

1. mantener `interlinear-view.js` como orquestador;
2. extraer solo constantes/reglas declarativas a un archivo nuevo;
3. dejar pruebas sobre tokens críticos antes de cambiar el cableado.

## Archivo De Referencia

Este documento fue creado como referencia unificada y no altera el runtime.
