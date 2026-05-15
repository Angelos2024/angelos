Prueba CATSS / CCAT — texto paralelo hebreo // griego
=====================================================

Criterios del proyecto (angelos):

- Solo libros donde ya tenemos **interlineal hebreo** local; el LXX se toma de la edición Rahlfs que usa el admin (`LXX/chapters/...`), **sin añadir apócrifos** como fuente de pistas MT⇄LXX.
- Josué y Jueces: paralelo CATSS **`JoshB`** y **`JudgesB`** (“edición B”), alineado con `admin-lxx-layer.js` (`JoshB`, `JudgB`).

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

5) Generar todas las pistas `lxx-mt-word-hints` por capítulo (requiere pars parseados):
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/exodus.full.json --slug exodo --lxxBook Exod --interlinearDir "IdiomaORIGEN/interlineal/chapters/02_Éxodo"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/leviticus.full.json --slug levitico --lxxBook Lev --interlinearDir "IdiomaORIGEN/interlineal/chapters/03_Levítico"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/numeros.full.json --slug numeros --lxxBook Num --interlinearDir "IdiomaORIGEN/interlineal/chapters/04_Números"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/deuteronomio.full.json --slug deuteronomio --lxxBook Deut --interlinearDir "IdiomaORIGEN/interlineal/chapters/05_Deuteronomio"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/josue-joshb.full.json --slug josue --lxxBook JoshB --interlinearDir "IdiomaORIGEN/interlineal/chapters/06_Josué"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/jueces-judgb.full.json --slug jueces --lxxBook JudgB --interlinearDir "IdiomaORIGEN/interlineal/chapters/07_Jueces"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/ruth.full.json --slug rut --lxxBook Ruth --interlinearDir "IdiomaORIGEN/interlineal/chapters/08_Rut"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/1samuel.full.json --slug 1_samuel --lxxBook 1Sam --interlinearDir "IdiomaORIGEN/interlineal/chapters/09_1_Samuel"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/2samuel.full.json --slug 2_samuel --lxxBook 2Sam --interlinearDir "IdiomaORIGEN/interlineal/chapters/10_2_Samuel"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/1reyes.full.json --slug 1_reyes --lxxBook 1Kgs --interlinearDir "IdiomaORIGEN/interlineal/chapters/11_1_Reyes"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/2reyes.full.json --slug 2_reyes --lxxBook 2Kgs --interlinearDir "IdiomaORIGEN/interlineal/chapters/12_2_Reyes"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/1cronicas.full.json --slug 1_cronicas --lxxBook 1Chr --interlinearDir "IdiomaORIGEN/interlineal/chapters/13_1_Crónicas"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/2cronicas.full.json --slug 2_cronicas --lxxBook 2Chr --interlinearDir "IdiomaORIGEN/interlineal/chapters/14_2_Crónicas"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/esdras.full.json --slug esdras --lxxBook 1Esdr --interlinearDir "IdiomaORIGEN/interlineal/chapters/15_Esdras"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/ester.full.json --slug ester --lxxBook Esth --interlinearDir "IdiomaORIGEN/interlineal/chapters/17_Ester"

Antes de publicar o redistribuir datos derivados, revisa las condiciones de uso en CCAT / Oxford Text Archive según corresponda.
