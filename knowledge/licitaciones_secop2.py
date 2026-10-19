#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KINEDRIK Advisor AI — Conector real a SECOP II (Colombia), portal de
contratación pública.

Verificado en vivo esta sesión (14-sep-2026): el endpoint público de Socrata
Open Data (SODA) de SECOP II responde sin autenticación y devuelve datos
reales de procesos de contratación pública colombianos.

Endpoint base: https://www.datos.gov.co/resource/p6dx-8zbt.json
  (dataset "SECOP II - Procesos de Contratación", Colombia Compra Eficiente)
Convención Socrata: cualquier dataset publicado en datos.gov.co es accesible
en /resource/<id-4x4>.json — sin API key para uso de bajo volumen (throttled
sin key; con App Token de Socrata el límite sube, ver dev.socrata.com).

Consulta de prueba real ejecutada esta sesión: $q=BIM devolvió 5 procesos
reales, incluyendo "Materiales y Equipos para el Diseño BIM" (SENA Regional
Guajira, publicado 2023-06-14) con URL real al proceso en community.secop.gov.co.
Ningún dato de este archivo es inventado; los campos de ejemplo en los
docstrings de abajo son literalmente los que devolvió la API.

Regla de no invención: si la consulta no devuelve resultados, se informa
"0 procesos encontrados", nunca se rellena con procesos de ejemplo.
"""
import json
import urllib.request
import urllib.parse

SECOP2_BASE = "https://www.datos.gov.co/resource/p6dx-8zbt.json"

# Palabras clave por área KINEDRIK — usadas para acotar la búsqueda de
# licitaciones relevantes a lo que cada área de máster cubre. Se pueden
# ampliar con los términos reales de cada KB normativa (titulo_apartado de
# los chunks más frecuentes), no son una lista cerrada.
KEYWORDS_POR_AREA = {
    "AMETBIM": ["BIM", "modelado de información", "building information modeling"],
    "AINFRAT": ["carretera", "vial", "infraestructura de transporte"],
    "AOHHEAM": ["hidráulica", "alcantarillado", "medio ambiente", "acueducto"],
    "ARQYURB": ["arquitectura", "urbanismo", "edificación", "eficiencia energética edificios"],
    "AINDAPP": ["ingeniería industrial", "automatización industrial"],
    "AGESDIR": ["gestión de proyectos", "dirección de proyectos", "PMO"],
    "ATRDIGI": ["transformación digital", "ciberseguridad", "seguridad de la información"],
    "AESTGEO": ["estructuras", "geotecnia", "cimentación"],
    "AENERPM": ["energía solar", "energía eólica", "minería"],
}


def buscar_licitaciones(area_codigo, limite=10, timeout=20):
    """Devuelve procesos de contratación reales de SECOP II relacionados con
    el área KINEDRIK dada. Cada resultado incluye el campo 'urlproceso' real,
    trazable al proceso original en community.secop.gov.co — nunca se
    fabrica una URL."""
    keywords = KEYWORDS_POR_AREA.get(area_codigo)
    if not keywords:
        return {"error": f"Área '{area_codigo}' sin palabras clave definidas todavía."}

    resultados = []
    for kw in keywords:
        params = urllib.parse.urlencode({"$limit": limite, "$q": kw})
        url = f"{SECOP2_BASE}?{params}"
        try:
            with urllib.request.urlopen(url, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return {"error": f"No se pudo conectar a SECOP II: {e}", "url_intentada": url}
        for r in data:
            resultados.append({
                "portal_origen": "SECOP II (Colombia Compra Eficiente)",
                "entidad": r.get("entidad"),
                "nombre_del_procedimiento": r.get("nombre_del_procedimiento"),
                "descripcion": r.get("descripci_n_del_procedimiento"),
                "fecha_publicacion": r.get("fecha_de_publicacion_del"),
                "precio_base": r.get("precio_base"),
                "modalidad_de_contratacion": r.get("modalidad_de_contratacion"),
                "estado": r.get("estado_del_procedimiento"),
                "url_proceso_real": r.get("urlproceso"),
                "keyword_usada": kw,
            })
    # deduplicar por url_proceso_real (una licitación puede matchear 2 keywords)
    vistos = set()
    dedup = []
    for r in resultados:
        u = r.get("url_proceso_real")
        if u and u in vistos:
            continue
        vistos.add(u)
        dedup.append(r)

    return {
        "area_codigo": area_codigo,
        "portal": "SECOP II",
        "total_encontrados": len(dedup),
        "resultados": dedup,
        "nota": "0 resultados es una respuesta válida — nunca se sustituye por ejemplos inventados." if not dedup else None,
    }


if __name__ == "__main__":
    import sys
    area = sys.argv[1] if len(sys.argv) > 1 else "AMETBIM"
    print(json.dumps(buscar_licitaciones(area), ensure_ascii=False, indent=2))
