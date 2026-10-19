#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KINEDRIK Normativa RAG - motor de recuperación por refinamiento (v0.1)

Este es el "runtime" mínimo que demuestra cómo una skill debe consultar la
base de conocimiento kinedrik_normativa_kb_BIM_v0.1.0.json: NUNCA se
devuelve la norma completa. Se filtra por área/norma/apartado y se rankea
por coincidencia léxica con la refinación del estudiante (p.ej. "requisitos
de intercambio de información en fase de oferta"), devolviendo solo los
chunks relevantes con su chunk_id (trazabilidad) y estado_revision.

Uso:
    python3 retrieve.py "requisitos de intercambio de información" --norma 19650-2 --top 5

Este script es una referencia de integración, no la skill final: la skill
de Claude debe llamar a esta misma lógica (o su equivalente en el runtime
donde se despliegue) y citar siempre chunk_id + norma_codigo + apartado en
la respuesta al estudiante, nunca reescribir el extracto como si fuera una
paráfrasis libre de la norma completa.
"""
import json, re, sys, argparse, os

KB_PATH = os.path.join(os.path.dirname(__file__), "kb_out", "kinedrik_normativa_kb_BIM_v0.1.0.json")

STOP = set("de la el los las en y con para por un una del al que su sus se es o desde entre como".split())

def tokenize(s):
    return [w for w in re.findall(r"[a-záéíóúñü]+", s.lower()) if w not in STOP and len(w) > 2]

def load_kb(path=KB_PATH):
    return json.load(open(path, encoding="utf-8"))

def search(kb, query, norma_filtro=None, area_filtro=None, top=5):
    qtoks = set(tokenize(query))
    results = []
    for c in kb["chunks"]:
        if norma_filtro and norma_filtro.lower() not in c["norma_codigo"].lower():
            continue
        if area_filtro and area_filtro.lower() != c["area_codigo"].lower():
            continue
        ctoks = set(tokenize(c["titulo_apartado"] + " " + c["extracto"]))
        overlap = qtoks & ctoks
        if not overlap:
            continue
        score = len(overlap) / max(1, len(qtoks))
        results.append((score, c))
    results.sort(key=lambda x: -x[0])
    return results[:top]

def format_result(score, c):
    return (
        f"[{c['chunk_id']}] {c['norma_codigo']} — apartado {c['apartado']} \"{c['titulo_apartado']}\"\n"
        f"  relevancia léxica: {score:.2f} | estado: {c['estado_revision']}\n"
        f"  extracto: {c['extracto'][:280].strip()}...\n"
    )

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query")
    ap.add_argument("--norma", default=None, help="filtra por código de norma, ej. 19650-2")
    ap.add_argument("--area", default=None, help="filtra por código de área, ej. AMETBIM")
    ap.add_argument("--top", type=int, default=5)
    args = ap.parse_args()

    kb = load_kb()
    hits = search(kb, args.query, args.norma, args.area, args.top)
    if not hits:
        print("Sin coincidencias verificadas en la base de conocimiento para esta refinación.")
        print("REQUIERE VALIDACIÓN: ampliar cobertura o reformular la consulta — no se devuelve la norma completa como fallback.")
        return
    print(f"Refinación: \"{args.query}\" -> {len(hits)} extracto(s) relevante(s) de {kb['metadata']['total_chunks']} indexados\n")
    for score, c in hits:
        print(format_result(score, c))

if __name__ == "__main__":
    main()
