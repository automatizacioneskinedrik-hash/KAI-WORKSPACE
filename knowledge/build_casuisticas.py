#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Capa de "casuísticas" (Sección solicitada explícitamente por el usuario):
conecta cada Lote (A-G) del flujo TFM/PPT del área BIM -- ya verificado en
Pliego_de_Prescripciones_Técnicas_(PPT)_-_Área_BIM.docx, autor Manus AI --
con los extractos normativos reales que un estudiante necesitaría en ese
lote, usando el mismo motor de recuperación por refinamiento (retrieve.py).

Nunca se listan aquí clausulas "porque suenan relevantes": cada
chunk_id proviene de una búsqueda real ejecutada contra la KB (ver
"consulta_usada"), trazable y reproducible.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from retrieve import load_kb, search

KB = load_kb()

# Consultas ancladas al texto real del PPT Área BIM (Lote B: "Revisión de
# Marcos Regulatorios... Estándares BIM (ISO 19650, PAS 1192)... IFC...
# ISO 9001..."; Lote A: "estándares BIM aplicables (ISO 19650)... CDE";
# Lote E: "modelos interoperables (IFC)... LOD/LOI").
LOTES = [
    {"lote": "A", "nombre": "Diagnóstico del Sistema",
     "consultas": ["estándares BIM aplicables entorno común de datos CDE",
                   "usos BIM y casos de uso"]},
    {"lote": "B", "nombre": "Análisis Normativo",
     "consultas": ["requisitos y condiciones generales de gestión de la información",
                   "plan de ejecución BIM BEP",
                   "clasificación y codificación de la información"]},
    {"lote": "C", "nombre": "Formulación de Alternativas",
     "consultas": ["nivel de detalle LOD nivel de información LOI modelos"]},
    {"lote": "D", "nombre": "Selección de Solución",
     "consultas": ["criterios de aceptación validación de la información"]},
    {"lote": "E", "nombre": "Diseño y Dimensionamiento",
     "consultas": ["modelos BIM interoperables formato de intercambio IFC",
                   "producción colaborativa de la información contenedores"]},
    {"lote": "F", "nombre": "Cuantificación Técnica y Presupuesto",
     "consultas": ["mediciones extraídas de modelos BIM cuantificación"]},
    {"lote": "G", "nombre": "Evaluación de Viabilidad",
     "consultas": ["entrega y archivo de la información del activo"]},
]

def main():
    out = {"area_codigo": "AMETBIM", "area_nombre": "BIM",
           "fuente_lotes": "Pliego_de_Prescripciones_Técnicas_(PPT)_-_Área_BIM.docx (autor Manus AI, Google Drive KINEDRIK)",
           "metodo": "Cada 'casuistica' liga un Lote real del PPT a chunk_ids obtenidos por búsqueda léxica reproducible sobre kinedrik_normativa_kb_BIM_v0.1.0.json. Sin chunk_id verificado, la casuística queda vacía y marcada REQUIERE VALIDACIÓN — nunca se rellena con texto no verificado.",
           "casuisticas": []}
    for lote in LOTES:
        for q in lote["consultas"]:
            hits = search(KB, q, top=3)
            entry = {
                "lote": lote["lote"], "lote_nombre": lote["nombre"],
                "consulta_usada": q,
                "extractos": [
                    {"chunk_id": c["chunk_id"], "norma_codigo": c["norma_codigo"],
                     "apartado": c["apartado"], "titulo_apartado": c["titulo_apartado"],
                     "relevancia": round(score, 2), "estado_revision": c["estado_revision"]}
                    for score, c in hits
                ] if hits else [],
                "estado": "OK" if hits else "REQUIERE VALIDACIÓN (sin coincidencias en KB actual)",
            }
            out["casuisticas"].append(entry)

    path = "/tmp/kinedrik/kb_out/kinedrik_casuisticas_BIM_v0.1.0.json"
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    ok = sum(1 for c in out["casuisticas"] if c["estado"] == "OK")
    print(f"Casuísticas generadas: {len(out['casuisticas'])} | OK: {ok} | requieren validación: {len(out['casuisticas'])-ok}")
    print(f"Guardado en: {path}")

if __name__ == "__main__":
    main()
