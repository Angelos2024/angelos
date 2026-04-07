import sqlite3
import json
import re
from pathlib import Path
from json import JSONDecoder

# ========= CONFIGURACIÓN =========
CARPETA_JSON = Path(r"C:\Users\pik_y\Documents\GitHub\Local-consults\estudio\angelos\dic\trilingueNT")
SALIDA_DB = Path(r"C:\Users\pik_y\Documents\GitHub\Local-consults\estudio\angelos\dic\interlineal_nt.db")
# =================================


def extraer_orden_y_libro(nombre_archivo: str):
    stem = Path(nombre_archivo).stem
    m = re.match(r"^(\d+)(.+)$", stem)
    if m:
        orden = int(m.group(1))
        libro = m.group(2).strip()
        return orden, libro
    return None, stem.strip()


def cargar_json_flexible(path: Path):
    """
    Carga:
    1) JSON normal: una sola lista o un solo objeto
    2) múltiples bloques JSON concatenados: [..][..] o {...}{...}
    3) BOM UTF-8 si existe
    """
    texto = path.read_text(encoding="utf-8-sig").strip()

    if not texto:
        return []

    # intento normal
    try:
        data = json.loads(texto)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            return [data]
        else:
            return []
    except json.JSONDecodeError as e:
        if "Extra data" not in str(e):
            raise

    # modo flexible: múltiples bloques JSON concatenados
    decoder = JSONDecoder()
    idx = 0
    n = len(texto)
    bloques = []

    while idx < n:
        while idx < n and texto[idx].isspace():
            idx += 1

        if idx >= n:
            break

        obj, end = decoder.raw_decode(texto, idx)
        bloques.append(obj)
        idx = end

    resultado = []
    for bloque in bloques:
        if isinstance(bloque, list):
            resultado.extend(bloque)
        elif isinstance(bloque, dict):
            resultado.append(bloque)

    return resultado


def crear_db(conn: sqlite3.Connection):
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS diccionario (
        pk INTEGER PRIMARY KEY AUTOINCREMENT,
        testamento TEXT NOT NULL,
        libro_orden INTEGER,
        libro TEXT NOT NULL,
        archivo_fuente TEXT NOT NULL,
        item_id INTEGER,
        texto_hebreo TEXT,
        equivalencia_griega TEXT,
        equivalencia_espanol TEXT,
        candidatos_json TEXT
    )
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_diccionario_testamento ON diccionario(testamento)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_diccionario_libro ON diccionario(libro)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_diccionario_libro_orden ON diccionario(libro_orden)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_diccionario_texto_hebreo ON diccionario(texto_hebreo)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_diccionario_equivalencia_griega ON diccionario(equivalencia_griega)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_diccionario_equivalencia_espanol ON diccionario(equivalencia_espanol)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_diccionario_item_id ON diccionario(item_id)")

    conn.commit()


def insertar_archivo(conn: sqlite3.Connection, archivo_json: Path):
    libro_orden, libro = extraer_orden_y_libro(archivo_json.name)
    data = cargar_json_flexible(archivo_json)

    if not isinstance(data, list):
        print(f"[ADVERTENCIA] {archivo_json.name} no produjo una lista. Se omite.")
        return 0

    cur = conn.cursor()
    insertados = 0

    for item in data:
        if not isinstance(item, dict):
            continue

        item_id = item.get("id")
        texto_hebreo = item.get("texto_hebreo")
        equivalencia_griega = item.get("equivalencia_griega")
        equivalencia_espanol = item.get("equivalencia_espanol")

        # respaldo por si alguna clave viene con ñ
        if equivalencia_espanol is None:
            equivalencia_espanol = item.get("equivalencia_español")

        candidatos = item.get("candidatos", [])
        if candidatos is None:
            candidatos = []

        candidatos_json = json.dumps(candidatos, ensure_ascii=False)

        cur.execute("""
        INSERT INTO diccionario (
            testamento,
            libro_orden,
            libro,
            archivo_fuente,
            item_id,
            texto_hebreo,
            equivalencia_griega,
            equivalencia_espanol,
            candidatos_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "NT",
            libro_orden,
            libro,
            archivo_json.name,
            item_id,
            texto_hebreo,
            equivalencia_griega,
            equivalencia_espanol,
            candidatos_json
        ))

        insertados += 1

    conn.commit()
    return insertados


def main():
    if not CARPETA_JSON.exists():
        raise FileNotFoundError(f"No existe la carpeta: {CARPETA_JSON}")

    archivos = sorted(CARPETA_JSON.glob("*.json"))

    if not archivos:
        print("No se encontraron archivos JSON en la carpeta indicada.")
        return

    SALIDA_DB.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(SALIDA_DB)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA temp_store=MEMORY;")

    crear_db(conn)

    total = 0
    for archivo in archivos:
        try:
            n = insertar_archivo(conn, archivo)
            total += n
            print(f"[OK] {archivo.name}: {n} registros")
        except Exception as e:
            print(f"[ERROR] {archivo.name}: {e}")

    conn.close()
    print(f"\nBase creada: {SALIDA_DB}")
    print(f"Total registros insertados: {total}")


if __name__ == "__main__":
    main()