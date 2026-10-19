#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KINEDRIK Advisor AI — Generador automático de índice de entregables desde un
PPT (Pliego de Prescripciones Técnicas) real, en .docx o .pdf.

NOTA DE VOCABULARIO: en KINEDRIK "PPT" significa "Pliego de Prescripciones
Técnicas" (un documento Word/PDF), NO una presentación PowerPoint. Los 9 PPT
reales de KINEDRIK son .docx, autoría "Manus AI".

Este script reemplaza el proceso manual que se usó para construir
kinedrik_indice_entregables_TODAS_AREAS_v0.1.0.json (hecho a mano, leyendo
cada uno de los 9 PPT uno por uno). Aquí se automatiza como una función
reutilizable, para que el área de programación la exponga como botón
"Generar índice desde PPT" en el Modo Admin del prototipo.

Regla de no invención: todo lo que devuelve viene literalmente del texto del
PPT. Si una sección no se encuentra con el patrón esperado, se deja vacía y
marcada, nunca se rellena con contenido supuesto.
"""
import re
import json
import sys

LOTES_OFICIALES = {
    "A": "Diagnóstico",
    "B": "Análisis Normativo",
    "C": "Formulación de Alternativas",
    "D": "Selección de Solución",
    "E": "Diseño y Dimensionamiento",
    "F": "Cuantificación Técnica y Presupuesto",
    "G": "Evaluación de Viabilidad",
}

# Cabecera de lote real: "Lote A: Diagnóstico del Sistema" (el nombre después
# de ":" puede variar levemente por área -- se captura literal, no se fuerza
# al nombre oficial de LOTES_OFICIALES, que solo sirve para validar que las
# 7 letras A-G aparecen y en orden).
LOTE_HEAD_RE = re.compile(
    r'^Lote\s+([A-G])\s*:\s*([^\n]{2,120})$', re.MULTILINE)

TIPOLOGIAS_HEAD_RE = re.compile(
    r'^\d+\\?\.\s*Tipolog[ií]as\s+de\s+Proyectos', re.MULTILINE)

OBJETO_HEAD_RE = re.compile(r'^\d+\\?\.\s*Objeto\s+y\s+Alcance', re.MULTILINE)

REQUISITOS_LOTE_HEAD_RE = re.compile(
    r'^\d+\\?\.\s*Requisitos\s+T[eé]cnicos\s+por\s+Lote', re.MULTILINE)

ESTANDARES_HEAD_RE = re.compile(
    r'^\d+\\?\.\s*Est[aá]ndares\s+de\s+Calidad', re.MULTILINE)

ENTREGABLES_LINE_RE = re.compile(r'^Entregables:\s*(.+)$', re.MULTILINE)

AUTOR_RE = re.compile(r'^Autor:\s*(.+)$', re.MULTILINE)

AREA_TITLE_RE = re.compile(
    r'Pliego de Prescripciones T[eé]cnicas\s*\(PPT\)\s*-\s*[ÁA]rea:?\s*([^\n]+)')


def clean(t):
    return t.replace('\\.', '.').strip()


def extraer_tipologias(texto):
    m = TIPOLOGIAS_HEAD_RE.search(texto)
    end_m = REQUISITOS_LOTE_HEAD_RE.search(texto)
    if not m:
        return []
    start = m.end()
    end = end_m.start() if end_m else len(texto)
    bloque = texto[start:end]
    # las tipologías son párrafos que empiezan con "Nombre:" (mayúscula
    # inicial + ":" antes de 80 caracteres) dentro del bloque
    tipologias = []
    for line in bloque.split('\n'):
        line = line.strip()
        m2 = re.match(r'^([A-ZÁÉÍÓÚÑ][^:]{4,90}):\s*(.+)$', line)
        if m2:
            tipologias.append({"nombre": clean(m2.group(1)), "descripcion": clean(m2.group(2))})
    return tipologias


def extraer_lotes(texto):
    matches = list(LOTE_HEAD_RE.finditer(texto))
    lotes = []
    letras_encontradas = []
    for i, m in enumerate(matches):
        letra = m.group(1)
        nombre = clean(m.group(2))
        letras_encontradas.append(letra)
        seg_start = m.end()
        seg_end = matches[i + 1].start() if i + 1 < len(matches) else len(texto)
        bloque = texto[seg_start:seg_end]
        ent_m = ENTREGABLES_LINE_RE.search(bloque)
        entregables = []
        if ent_m:
            raw = ent_m.group(1)
            # separador real usado en los PPT: coma, fuera de paréntesis
            partes = re.split(r',\s*(?![^(]*\))', raw)
            entregables = [clean(p) for p in partes if clean(p)]
        lotes.append({
            "lote": letra,
            "nombre_oficial_referencia": LOTES_OFICIALES.get(letra, "DESCONOCIDO — REQUIERE VALIDACIÓN"),
            "nombre_en_ppt": nombre,
            "entregables": entregables,
            "entregables_encontrados": len(entregables) > 0,
        })
    faltantes = [l for l in "ABCDEFG" if l not in letras_encontradas]
    return lotes, faltantes


def extraer_estandares(texto):
    m = ESTANDARES_HEAD_RE.search(texto)
    if not m:
        return []
    autor_m = AUTOR_RE.search(texto)
    end = autor_m.start() if autor_m else len(texto)
    bloque = texto[m.end():end]
    estandares = []
    for line in bloque.split('\n'):
        line = line.strip()
        m2 = re.match(r'^([A-ZÁÉÍÓÚÑ][^:]{3,60}):\s*(.+)$', line)
        if m2:
            estandares.append({"criterio": clean(m2.group(1)), "detalle": clean(m2.group(2))})
    return estandares


def generar_indice_desde_texto(texto, fuente_nombre):
    area_m = AREA_TITLE_RE.search(texto)
    area_nombre_ppt = clean(area_m.group(1)) if area_m else "NO DETECTADO — REQUIERE VALIDACIÓN"
    autor_m = AUTOR_RE.search(texto)
    autor = clean(autor_m.group(1)) if autor_m else "NO DETECTADO"

    lotes, faltantes = extraer_lotes(texto)
    tipologias = extraer_tipologias(texto)
    estandares = extraer_estandares(texto)

    estado = "OK — 7 lotes A-G detectados con entregables" if not faltantes and all(l["entregables_encontrados"] for l in lotes) \
        else f"REQUIERE VALIDACIÓN — faltan lotes {faltantes} o algunos sin entregables detectados"

    return {
        "fuente_ppt": fuente_nombre,
        "area_nombre_segun_ppt": area_nombre_ppt,
        "autor_declarado_en_ppt": autor,
        "tipologias": tipologias,
        "lotes": lotes,
        "estandares_calidad_entrega": estandares,
        "estado_extraccion": estado,
        "metodo": "Extracción automática por patrón de encabezados reales del PPT (Lote X: nombre / Entregables: ...), sin generación de contenido — regenera el mismo resultado que la transcripción manual si el PPT sigue el formato estándar de KINEDRIK (Manus AI).",
    }


def generar_indice_desde_archivo(path, fuente_nombre=None):
    """Punto de entrada para el área de programación: acepta un .docx o .txt
    ya extraído a texto plano (para .pdf usar la misma extracción de texto
    que ya usa el resto del pipeline vía la skill de pdf/docx)."""
    if path.endswith(".docx"):
        try:
            import docx
        except ImportError:
            raise RuntimeError("Falta python-docx (pip install python-docx) para leer .docx directamente.")
        d = docx.Document(path)
        texto = "\n".join(p.text for p in d.paragraphs)
    else:
        texto = open(path, encoding="utf-8").read()
    return generar_indice_desde_texto(texto, fuente_nombre or path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 generar_indice_desde_ppt.py <archivo.docx|archivo.txt>")
        sys.exit(1)
    resultado = generar_indice_desde_archivo(sys.argv[1])
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
