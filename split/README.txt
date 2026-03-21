Cómo aplicar este fix (Punto 1: resaltado de 'Dios' al cambiar a Hebreo/Griego)

1) Copia estos 7 archivos dentro de tu carpeta /split/ (reemplazando los actuales):
   - busquedax.bootstrap.js
   - busquedax.core.js
   - busquedax.gr.js
   - busquedax.he.js
   - busquedax.es.js
   - busquedax.filter.js
   - busquedax.main.js

2) Sustituye tu busqueda.html por busqueda.split.html (o copia solo el bloque de <script>).

Qué corrige:
- getEquivalenceSearchTerms devuelve Sets. Antes el resaltado intentaba equivalenceTerms.he[0] y fallaba => caía en hebrewCandidate.word (ej: 'וַיֹּאמֶר').
- Ahora el resaltado convierte los Sets a arrays y elige un hebreo preferido (prioriza יהוה/אלהים/etc),
  y en griego usa prefijo común (ej: 'θεο') para cubrir declinaciones.
