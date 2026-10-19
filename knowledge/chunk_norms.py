#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KINEDRIK Advisor AI - Normativa RAG KB Builder
Chunking real de textos de normas (UNE/EN/ISO BIM) por apartado/clausula,
con metadata, para un indice recuperable por refinamiento (RAG), no por
volcado integro del documento.

Regla de oro (igual que kinedrik_kb_snapshot): nunca inventar texto. Todo
extracto proviene literalmente del texto fuente descargado de Drive. Donde
no se puede verificar vigencia/alcance con el propio texto, se marca
REQUIERE VALIDACION.
"""
import re, json, hashlib, datetime, os

SRC_DIR = "/tmp/kinedrik/bim_norms"
OUT_DIR = "/tmp/kinedrik/kb_out"
os.makedirs(OUT_DIR, exist_ok=True)

# Metadata verificada manualmente contra la cabecera real de cada documento
# (leida en el propio texto descargado; ver fuente_verificada=True).
NORMS = [
    {"file": "19650-1.txt", "codigo": "UNE-EN ISO 19650-1:2019", "titulo": "Organización y digitalización de la información en obras de edificación e ingeniería civil que utilizan BIM. Gestión de la información al utilizar BIM. Parte 1: Conceptos y principios",
     "familia": "ISO 19650", "parte": 1, "idioma": "es", "vigente": True},
    {"file": "19650-2.txt", "codigo": "UNE-EN ISO 19650-2:2019 (versión corregida, junio 2020)", "titulo": "Gestión de la información al utilizar BIM. Parte 2: Fase de desarrollo de los activos",
     "familia": "ISO 19650", "parte": 2, "idioma": "es", "vigente": True},
    {"file": "19650-3.txt", "codigo": "UNE-EN ISO 19650-3:2021", "titulo": "Gestión de la información al utilizar BIM. Parte 3: Fase operativa de los activos",
     "familia": "ISO 19650", "parte": 3, "idioma": "es", "vigente": True},
    {"file": "19650-4.txt", "codigo": "UNE-EN ISO 19650-4:2023", "titulo": "Gestión de la información al utilizar BIM. Parte 4: Intercambio de información",
     "familia": "ISO 19650", "parte": 4, "idioma": "es", "vigente": True},
    {"file": "19650-5.txt", "codigo": "UNE-EN ISO 19650-5:2020", "titulo": "Gestión de la información al utilizar BIM. Parte 5: Enfoque orientado a la seguridad para la gestión de la información",
     "familia": "ISO 19650", "parte": 5, "idioma": "es", "vigente": True},
    {"file": "cen_iso_20042718.txt", "codigo": "EN ISO 19650-6:2025", "titulo": "Information management using building information modelling. Part 6: Health and safety information",
     "familia": "ISO 19650", "parte": 6, "idioma": "en", "vigente": True},
    {"file": "12006-2.txt", "codigo": "UNE-EN ISO 12006-2:2020", "titulo": "Construcción de edificios. Organización de la información relativa a las obras de construcción. Parte 2: Marco de trabajo para la clasificación",
     "familia": "ISO 12006", "parte": 2, "idioma": "es", "vigente": True},
    {"file": "12006-3.txt", "codigo": "UNE-EN ISO 12006-3:2022", "titulo": "Organización de la información relativa a las obras de construcción. Parte 3: Marco de referencia para la información orientada a objetos",
     "familia": "ISO 12006", "parte": 3, "idioma": "es", "vigente": True},
    {"file": "29481-1.txt", "codigo": "UNE-EN ISO 29481-1:2018", "titulo": "Documentación de información de edificios y obras de ingeniería civil (BIM). Manual de intercambio de información. Parte 1: Metodología y formato",
     "familia": "ISO 29481", "parte": 1, "idioma": "es", "vigente": True},
    {"file": "29481-2.txt", "codigo": "UNE-EN ISO 29481-2:2017", "titulo": "Documentación de información de edificios y obras de ingeniería civil (BIM). Manual de intercambio de información. Parte 2: Marco de trabajo para la interacción",
     "familia": "ISO 29481", "parte": 2, "idioma": "es", "vigente": True},
    {"file": "29481-3.txt", "codigo": "UNE-EN ISO 29481-3:2022", "titulo": "Documentación de información de edificios y obras de ingeniería civil (BIM). Manual de intercambio de información. Parte 3: Términos y estados de conservación",
     "familia": "ISO 29481", "parte": 3, "idioma": "es", "vigente": True},
]

AREA_CODE = "AMETBIM"
AREA_NAME = "BIM (Metodología BIM)"

# Encabezado de clausula: "N", "N.N", "N.N.N", "N.N.N.N" seguido de espacio + texto con mayuscula/letra
HEAD_RE = re.compile(r'^(?P<num>\d{1,2}(?:\.\d{1,2}){0,3})\s+(?P<title>[A-ZÁÉÍÓÚÑ0-9][^\n]{2,140})$', re.MULTILINE)
ANEXO_RE = re.compile(r'^(?P<num>Anexo [A-Z])\s*(?:\(\w+\))?\s*\n?(?P<title>[A-ZÁÉÍÓÚÑ][^\n]{2,140})$', re.MULTILINE)

STOPWORDS_TITLE = ("Prohibida", "Génova", "AENOR", "Este documento")

def clean_text(t):
    t = t.replace('\x0c', '\n')
    return t

def find_body_start(text):
    """Evita capturar el indice (tabla de contenidos con puntos de relleno '....')."""
    # el indice tiene lineas con muchos puntos consecutivos '...'; el cuerpo real, no.
    lines = text.split('\n')
    # heuristica: buscar segunda ocurrencia de '0 Introducción' o '1 Objeto' (cuerpo, tras indice)
    idxs = [i for i, l in enumerate(lines) if re.match(r'^(0|1)\s+(Introducci[oó]n|Objeto)', l.strip())]
    if len(idxs) >= 2:
        return sum(len(l) + 1 for l in lines[:idxs[1]])
    return 0

def is_toc_line(line):
    return '....' in line or bool(re.search(r'\.{4,}', line))

def chunk_norm(meta):
    path = os.path.join(SRC_DIR, meta["file"])
    raw = clean_text(open(path, encoding='utf-8').read())
    start = find_body_start(raw)
    body = raw[start:] if start else raw

    matches = list(HEAD_RE.finditer(body))
    chunks = []
    for i, m in enumerate(matches):
        num = m.group('num')
        title = m.group('title').strip().rstrip('.')
        if is_toc_line(m.group(0)) or any(s in title for s in STOPWORDS_TITLE):
            continue
        if len(title) < 3:
            continue
        seg_start = m.end()
        seg_end = matches[i + 1].start() if i + 1 < len(matches) else min(len(body), seg_start + 6000)
        content = body[seg_start:seg_end].strip()
        # si el contenido arrastra restos del indice (puntos de relleno '....'),
        # se recorta ahí: es una fuga de la tabla de contenidos hacia el cuerpo,
        # nunca se completa con texto inventado.
        toc_leak = re.search(r'\.{4,}', content)
        if toc_leak and toc_leak.start() < 200:
            content = content[:toc_leak.start()].strip()
        # limpia lineas de paginacion/cabecera repetida
        content = re.sub(r'\n{3,}', '\n\n', content)
        if len(content) < 15:
            continue
        # descarta duplicados exactos de numero+titulo (aparecen en TOC si el heuristico fallo)
        chunks.append({"num": num, "title": title, "content": content[:4000]})

    # Anexos (p.ej. "Anexo A"): cabeceras no numéricas, tratadas aparte porque
    # su formato ("Anexo A (Informativo)\nTítulo") no encaja en HEAD_RE.
    anexo_matches = [m for m in ANEXO_RE.finditer(body) if not is_toc_line(m.group(0))]
    for i, m in enumerate(anexo_matches):
        num = m.group('num')
        title = m.group('title').strip().rstrip('.')
        seg_start = m.end()
        seg_end = anexo_matches[i + 1].start() if i + 1 < len(anexo_matches) else min(len(body), seg_start + 4000)
        content = body[seg_start:seg_end].strip()
        toc_leak = re.search(r'\.{4,}', content)
        if toc_leak and toc_leak.start() < 200:
            content = content[:toc_leak.start()].strip()
        content = re.sub(r'\n{3,}', '\n\n', content)
        if len(content) < 15:
            continue
        chunks.append({"num": num, "title": title, "content": content[:4000]})

    # deduplicar por numero de apartado unicamente: el PDF a veces reparte un
    # mismo titulo en dos lineas (salto de columna), generando una segunda
    # cabecera espuria con el mismo "num" pero titulo truncado/incompleto.
    # Nos quedamos con la version de mayor contenido util para cada num.
    SCRAMBLE_RE = re.compile(r'\d,\d')  # "5,4,3" en vez de "5.4.3": indicio de reflujo de columnas
    best = {}
    for c in chunks:
        key = c["num"]
        score = len(c["content"]) - (50 if SCRAMBLE_RE.search(c["title"]) else 0)
        if key not in best or score > best[key][0]:
            best[key] = (score, c)
    def sort_key(c):
        if c["num"].startswith("Anexo"):
            return (1, c["num"])
        return (0, [int(x) for x in c["num"].split('.')])
    chunks = sorted((v[1] for v in best.values()), key=sort_key)

    out = []
    scramble_check = re.compile(r'\d,\d')
    for c in chunks:
        level = 1 if c["num"].startswith("Anexo") else c["num"].count('.') + 1
        chunk_id = f"{meta['codigo'].split(':')[0].replace(' ', '_')}_{c['num'].replace(' ', '_')}"
        uid = hashlib.sha1(chunk_id.encode()).hexdigest()[:10]
        reflow = bool(scramble_check.search(c["content"][:200]))
        out.append({
            "chunk_id": f"{chunk_id}#{uid}",
            "norma_codigo": meta["codigo"],
            "norma_titulo": meta["titulo"],
            "familia": meta["familia"],
            "parte": meta["parte"],
            "area_codigo": AREA_CODE,
            "area_nombre": AREA_NAME,
            "apartado": c["num"],
            "nivel": level,
            "titulo_apartado": c["title"],
            "idioma": meta["idioma"],
            "extracto": c["content"],
            "n_caracteres": len(c["content"]),
            "fuente_verificada": True,
            "vigente_segun_texto": meta["vigente"],
            "estado_revision": "REVISAR VIGENCIA" if not meta["vigente"] else ("REQUIERE VALIDACIÓN (posible reflujo de columnas en extracción PDF)" if reflow else "OK"),
            "posible_reflujo_texto": reflow,
            "fecha_extraccion": datetime.date.today().isoformat(),
            "origen": "Google Drive - Normativa KINEDRIK / Área BIM",
        })
    return out

def main():
    all_chunks = []
    per_norm_report = []
    for meta in NORMS:
        chunks = chunk_norm(meta)
        all_chunks.extend(chunks)
        per_norm_report.append({"norma": meta["codigo"], "apartados_extraidos": len(chunks)})
        print(f"{meta['codigo']:45s} -> {len(chunks):3d} apartados")

    kb = {
        "metadata": {
            "product_name": "KINEDRIK Normativa RAG - Base de Conocimiento (área BIM)",
            "version": "0.1.0",
            "generated_at": datetime.datetime.now().isoformat(),
            "generator": "Claude (Cowork) - extracción literal desde PDFs UNE/EN/ISO reales (Google Drive KINEDRIK)",
            "area_codigo": AREA_CODE,
            "area_nombre": AREA_NAME,
            "total_normas": len(NORMS),
            "total_chunks": len(all_chunks),
            "metodo": "Chunking por apartado/cláusula numerada (regex sobre texto extraído del PDF), deduplicado, sin generación de contenido: cada 'extracto' es texto literal de la norma.",
            "regla_no_invencion": "Ningún campo 'extracto' contiene texto generado; es una cita literal recortada del documento fuente. Cambios de redacción, resúmenes o interpretaciones NO están permitidos en este nivel — eso se hace en tiempo de consulta (skill), citando siempre chunk_id.",
        },
        "normas": NORMS,
        "chunks": all_chunks,
        "cobertura": per_norm_report,
    }

    out_path = os.path.join(OUT_DIR, "kinedrik_normativa_kb_BIM_v0.1.0.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=2)
    print(f"\nTotal chunks: {len(all_chunks)}")
    print(f"Guardado en: {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")

if __name__ == "__main__":
    main()
