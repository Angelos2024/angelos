# Trilingüe Builder (ES-HE-GR)

Genera un diccionario trilingüe en formato:

```json
[{"id":1,"es":"padre","he":["אב"],"gr":["πατηρ"]}]
```

Salida: `trilingue_generado_solo_3idiomas.min.json`.

## Uso rápido (offline)
1. Abre `tools/trilingue-builder/index.html` en el navegador.
2. Carga carpetas:
   - `librosRV1960/`
   - `IdiomaORIGEN/`
   - `LXX/`
3. Carga archivo `IdiomaORIGEN/Bgriega.json`.
4. (Opcional) carga `diccionario/masterdiccionario.json`.
5. Ajusta `Top-K`, `minCount`, etc. (para cobertura completa de la Biblia deja `minCount=1`).
6. Pulsa **Generar** y luego **Descargar JSON**.

## Uso con servidor local (modo rutas)
Desde la raíz del repo:

```bash
python -m http.server
```

Luego abre:

- `http://localhost:8000/tools/trilingue-builder/index.html`

Activa “Usar modo rutas HTTP”.

> Nota: este modo requiere índices `index.json` por carpeta (`librosRV1960`, `IdiomaORIGEN`, `LXX`). Si no existen, usa modo offline por carpetas.
