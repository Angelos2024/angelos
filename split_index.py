import json
import os

# Leer el índice completo
with open('./search/index-es.json', 'r', encoding='utf-8') as f:
    index = json.load(f)

tokens = index.get('tokens', {})
shards = {}

# Agrupar por primera letra del token
for token, refs in tokens.items():
    letter = token[0].lower() if token else '_'
    if letter not in shards:
        shards[letter] = {
            'v': index.get('v'),
            'lang': index.get('lang'),
            'tokens': {}
        }
    shards[letter]['tokens'][token] = refs

# Crear carpeta y escribir un archivo por letra
out_dir = './search/shards'
os.makedirs(out_dir, exist_ok=True)

for letter, shard in sorted(shards.items()):
    out_path = os.path.join(out_dir, f'index-es-{letter}.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(shard, f, ensure_ascii=False, separators=(',', ':'))
    size_kb = round(os.path.getsize(out_path) / 1024)
    print(f'index-es-{letter}.json → {size_kb} KB')

print('¡Listo!')
```

Córrelo desde la carpeta raíz de tu repo:
```
python split_index.py
```

Te va a imprimir algo como:
```
index-es-a.json → 380 KB
index-es-b.json → 290 KB
...
index-es-p.json → 450 KB
...
¡Listo!