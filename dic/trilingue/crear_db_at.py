import sqlite3
import json
import re
from pathlib import Path

# ========= CONFIGURACIÓN =========
CARPETA_JSON = Path(r"C:\Users\pik_y\Documents\GitHub\Local-consults\estudio\angelos\dic\trilingueNT")   # cambia esta ruta
SALIDA_DB = Path(r"C:\Users\pik_y\Documents\GitHub\Local-consults\estudio\angelos\dic\trilingueNT\interlineal_nt.db")  # cambia esta ruta
# =================================

def extraer_orden_y_libro(nombre_archivo: str):
    """
    Ejemplos:
    01Mateo.json     -> (1, 'Mateo')
    09JudasEF.json   -> (9, 'JudasEF')
    14Apocalipsis.json -> (14, 'Apocalipsis')
    """
    stem = Path(nombre_archivo).stem
    m = re.match(r"^(\d+)(.+)$", stem)
    if m:
        orden = int(m.group(1))
        libro = m.group(2).strip()
        return orden, libro
    return None, stem.strip()

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

    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_diccionario_testamento
    ON diccionario(testamento)
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_diccionario_libro
    ON diccionario(libro)
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_diccionario_libro_orden
    ON diccionario(libro_orden)
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_diccionario_texto_hebreo
    ON diccionario(texto_hebreo)
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_diccionario_equivalencia_griega
    ON diccionario(equivalencia_griega)
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_diccionario_equivalencia_espanol
    ON diccionario(equivalencia_espanol)
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_diccionario_item_id
    ON diccionario(item_id)
    """)

    conn.commit()

def insertar_archivo(conn: sqlite3.Connection, archivo_json: Path):
    libro_orden, libro = extraer_orden_y_libro(archivo_json.name)

    with archivo_json.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        print(f"[ADVERTENCIA] {archivo_json.name} no contiene una lista JSON. Se omite.")
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

        # por si algunos archivos tienen tilde rara en la clave
        if equivalencia_espanol is None:
            equivalencia_espanol = item.get("equivalencia_español")

        candidatos = item.get("candidatos", [])
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