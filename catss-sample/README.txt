Prueba CATSS / CCAT — texto paralelo hebreo // griego
=====================================================

Criterios del proyecto (angelos):

- Solo libros donde ya tenemos **interlineal hebreo** local; el LXX se toma de la edición Rahlfs en `LXX/chapters/...`, **sin añadir apócrifos** como fuente de pistas MT⇄LXX.
- Josué y Jueces: paralelo CATSS **`JoshB`** y **`JudgesB`** (“edición B”); ediciones **`JoshB`**, **`JudgB`** en carpeta LXX.

1) Descarga local del .par (no incluido en git por tamaño y licencia):

   Génesis:
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/01.Genesis.par" -o catss-sample/01.Genesis.par

   Éxodo y Levítico (dos en dos):
   mkdir -p catss-par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/02.Exodus.par" -o catss-par/02.Exodus.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/03.Lev.par" -o catss-par/03.Lev.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/04.Num.par" -o catss-par/04.Num.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/05.Deut.par" -o catss-par/05.Deut.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/06.JoshB.par" -o catss-par/06.JoshB.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/08.JudgesB.par" -o catss-par/08.JudgesB.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/10.Ruth.par" -o catss-par/10.Ruth.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/11.1Sam.par" -o catss-par/11.1Sam.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/12.2Sam.par" -o catss-par/12.2Sam.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/13.1Kings.par" -o catss-par/13.1Kings.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/14.2Kings.par" -o catss-par/14.2Kings.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/15.1Chron.par" -o catss-par/15.1Chron.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/16.2Chron.par" -o catss-par/16.2Chron.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/17.1Esdras.par" -o catss-par/17.1Esdras.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/18.Esther.par" -o catss-par/18.Esther.par

2) Documentación del proyecto:
   https://ccat.sas.upenn.edu/rak/catss.html

3) Parser de prueba (prefijo corto).

   El marcador de versiculo puede ser `Gen 1:1`, `Ruth 2:1`, `1Sam/K 3:15`, etc. (`scripts/parse-catss-par.js`).

   node scripts/parse-catss-par.js catss-sample/01.Genesis.par --maxVerses 5 --out catss-sample/parsed-genesis-1-5.json

4) Libro completo → JSON grande (omitido del git como `*.full.json`):
   node scripts/parse-catss-par.js catss-par/02.Exodus.par --out catss-parsed/exodus.full.json
   node scripts/parse-catss-par.js catss-par/03.Lev.par --out catss-parsed/leviticus.full.json
   node scripts/parse-catss-par.js catss-par/04.Num.par --out catss-parsed/numeros.full.json
   node scripts/parse-catss-par.js catss-par/05.Deut.par --out catss-parsed/deuteronomio.full.json
   node scripts/parse-catss-par.js catss-par/06.JoshB.par --out catss-parsed/josue-joshb.full.json
   node scripts/parse-catss-par.js catss-par/08.JudgesB.par --out catss-parsed/jueces-judgb.full.json
   node scripts/parse-catss-par.js catss-par/10.Ruth.par --out catss-parsed/ruth.full.json
   node scripts/parse-catss-par.js catss-par/11.1Sam.par --out catss-parsed/1samuel.full.json
   node scripts/parse-catss-par.js catss-par/12.2Sam.par --out catss-parsed/2samuel.full.json
   node scripts/parse-catss-par.js catss-par/13.1Kings.par --out catss-parsed/1reyes.full.json
   node scripts/parse-catss-par.js catss-par/14.2Kings.par --out catss-parsed/2reyes.full.json
   node scripts/parse-catss-par.js catss-par/15.1Chron.par --out catss-parsed/1cronicas.full.json
   node scripts/parse-catss-par.js catss-par/16.2Chron.par --out catss-parsed/2cronicas.full.json
   node scripts/parse-catss-par.js catss-par/17.1Esdras.par --out catss-parsed/esdras.full.json
   node scripts/parse-catss-par.js catss-par/18.Esther.par --out catss-parsed/ester.full.json

5) Pistas `lxx-mt-word-hints` a partir de CATSS:

   El script por lotes que generaba hints desde `.full.json` ya no está en este repo.
   Puedes crear plantillas por capítulo con `node scripts/scaffold-lxx-word-hints-chapter.js <slug> <cap>`
   o recuperar la herramienta antigua desde el historial de Git si la necesitas.

   (Referencia histórica — comandos que antes llamaban a `batch-catss-hints-book.js`: se omiten aquí.)

Antes de publicar o redistribuir datos derivados, revisa las condiciones de uso en CCAT / Oxford Text Archive según corresponda.
