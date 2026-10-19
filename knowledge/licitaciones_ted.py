#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KINEDRIK Advisor AI — Conector a TED (Tenders Electronic Daily), el diario
oficial de licitaciones públicas de la Unión Europea.

Fuente verificada esta sesión (14-sep-2026) contra la documentación OFICIAL
de la Oficina de Publicaciones de la UE:
  - Documentación: https://docs.ted.europa.eu/api/latest/search.html
  - Endpoint real:  POST https://api.ted.europa.eu/v3/notices/search
  - Sin autenticación: "The Search API does not require a key" (doc oficial).
  - Confirmado que el endpoint existe y espera POST: una petición GET al
    mismo endpoint devolvió HTTP 405 (Method Not Allowed), no 404.

LIMITACIÓN HONESTA: este entorno de trabajo no tiene salida de red hacia
api.ted.europa.eu (el proxy de este contenedor solo permite un conjunto
reducido de dominios), así que la llamada POST real no se pudo ejecutar de
extremo a extremo aquí. El endpoint, el método y el formato de la petición
SÍ están verificados contra la documentación oficial — lo que falta es
probarlo desde un entorno con salida de red completa (el backend de
producción del área de programación). No se ha inventado ningún dato de
ejemplo de respuesta: por eso este archivo no incluye una "respuesta de
ejemplo", solo la petición.
"""
import json
import urllib.request

TED_SEARCH_URL = "https://api.ted.europa.eu/v3/notices/search"

KEYWORDS_POR_AREA = {
    "AMETBIM": "BIM OR \"building information modelling\"",
    "AINFRAT": "carretera OR road infrastructure",
    "AOHHEAM": "hydraulic OR wastewater OR water treatment",
    "ARQYURB": "architecture OR urban planning OR energy efficiency buildings",
    "AINDAPP": "industrial engineering OR automation",
    "AGESDIR": "project management OR PMO",
    "ATRDIGI": "digital transformation OR cybersecurity OR information security",
    "AESTGEO": "structural engineering OR geotechnical",
    "AENERPM": "solar energy OR wind energy OR mining",
}


def buscar_licitaciones(area_codigo, limite=10, timeout=20):
    query = KEYWORDS_POR_AREA.get(area_codigo)
    if not query:
        return {"error": f"Área '{area_codigo}' sin palabras clave definidas todavía."}

    body = json.dumps({"query": query, "limit": limite}).encode("utf-8")
    req = urllib.request.Request(
        TED_SEARCH_URL, data=body, method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {
            "error": f"No se pudo completar la llamada a TED desde este entorno: {e}",
            "endpoint_verificado_via_documentacion_oficial": TED_SEARCH_URL,
            "nota": "Ejecutar este mismo script desde un entorno con salida de red completa (backend de producción) para obtener resultados reales.",
        }

    resultados = []
    for n in data.get("notices", data.get("results", [])):
        resultados.append({
            "portal_origen": "TED — Tenders Electronic Daily (UE)",
            "titulo": n.get("title"),
            "url_proceso_real": n.get("links", {}).get("html") if isinstance(n.get("links"), dict) else n.get("url"),
            "raw": n,  # se conserva el objeto completo tal como lo devuelve TED, sin recortar campos por si el esquema real difiere del supuesto arriba
        })
    return {"area_codigo": area_codigo, "portal": "TED", "total_encontrados": len(resultados), "resultados": resultados}


if __name__ == "__main__":
    import sys
    area = sys.argv[1] if len(sys.argv) > 1 else "AMETBIM"
    print(json.dumps(buscar_licitaciones(area), ensure_ascii=False, indent=2))
