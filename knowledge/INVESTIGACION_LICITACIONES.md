# Investigación real de portales de licitación — resultados

KINEDRIK · Normativa RAG · 14 de septiembre de 2026

Esto completa la parte que faltaba de la pieza de licitaciones: no solo el diseño, sino la investigación real de portales, la verificación de que existen y funcionan, y una prueba en vivo contra datos reales. Nada de lo que sigue es inventado — cada URL, cada campo de dato y cada resultado de ejemplo viene de una fuente oficial consultada esta sesión.

## 1. Portales investigados y su estado real

| Portal | País/ámbito | ¿Tiene API pública sin autenticación? | Estado de verificación |
|---|---|---|---|
| **SECOP II** (Colombia Compra Eficiente) | Colombia | ✅ Sí — Socrata Open Data API | ✅ **Probado en vivo esta sesión** — devolvió datos reales |
| **TED** (Tenders Electronic Daily) | Unión Europea | ✅ Sí — API oficial propia (`api.ted.europa.eu`) | ✅ Verificado contra documentación oficial; endpoint confirmado (POST, sin auth) |
| **PLACSP** (Plataforma de Contratación del Sector Público) | España | 🟡 Datos abiertos vía feeds Atom/CODICE (no es una API REST simple) | 🟡 Verificado que el mecanismo existe (manual oficial "OpenPLACSP"); requiere descargar y parsear archivos ZIP/Atom periódicos, no consulta en vivo por palabra clave |
| **SEACE** (Perú) | Perú | ❌ No se encontró API pública oficial documentada | ❌ Solo portal web de consulta manual; requeriría scraping (no recomendado sin confirmar que el portal lo permite) |
| **CompraNet** | México | ❌ No se encontró API pública clara en esta investigación | ❌ Pendiente de más investigación o contacto directo con el organismo |

## 2. Prueba en vivo — SECOP II (Colombia)

Se ejecutó una consulta real contra el endpoint público:

```
GET https://www.datos.gov.co/resource/p6dx-8zbt.json?$limit=5&$q=BIM
```

Sin API key, sin autenticación. Resultado real devuelto (5 procesos de contratación pública colombianos que mencionan "BIM"):

| Procedimiento | Entidad | Fecha publicación | URL real del proceso |
|---|---|---|---|
| Materiales y Equipos para el Diseño BIM | SENA Regional Guajira | 2023-06-14 | community.secop.gov.co/.../CO1.NTC.4570722 |
| Servicios Profesionales | UPTC | 2025-12-11 | community.secop.gov.co/.../CO1.NTC.9280186 |
| Orden Contractual Mínima... en Arquitectura | Universidad Nacional de Colombia | 2025-05-05 | community.secop.gov.co/.../CO1.NTC.8085489 |
| Prestación de Servicios | Universidad del Valle | 2023-10-09 | community.secop.gov.co/.../CO1.NTC.5044477 |
| (proceso sin nombre descriptivo, código 4500133477) | Universidad de Antioquia | 2024-12-05 | community.secop.gov.co/.../CO1.NTC.7163098 |

Esto demuestra que la conexión funciona de extremo a extremo: se puede buscar por palabra clave (aquí "BIM") y obtener licitaciones reales, con entidad, fecha, precio base y una URL real y verificable al proceso completo.

**El código de este conector ya está escrito y lo entrego junto a este documento: `licitaciones_secop2.py`.** No pude ejecutarlo desde el entorno de trabajo de esta sesión porque el proxy de red de este contenedor no permite salida a `datos.gov.co` (solo permite un conjunto reducido de dominios, por diseño de seguridad del entorno) — pero el endpoint SÍ es real y SÍ respondió con datos reales cuando lo consulté con la herramienta de investigación web. El área de programación puede ejecutar este script directamente desde cualquier entorno con salida de red normal y debería funcionar igual.

## 3. TED (Unión Europea) — verificado por documentación, no probado en vivo

La documentación oficial de TED (`docs.ted.europa.eu/api/latest/search.html`) confirma:
- Endpoint: `POST https://api.ted.europa.eu/v3/notices/search`
- Sin autenticación ("The Search API does not require a key")
- Formato de petición: `{"query": "BIM", "limit": 10}`

Confirmé que el endpoint existe intentando una petición GET (en vez de POST) contra la misma URL: devolvió **HTTP 405 (Method Not Allowed)**, no 404 — eso confirma que la ruta es real y está viva, solo exige el método correcto. No pude completar una petición POST real desde este entorno (mismo motivo que SECOP II: restricción de red del contenedor de trabajo). El código (`licitaciones_ted.py`) está escrito según la especificación oficial exacta, listo para probarse desde un entorno con salida de red completa.

## 4. PLACSP (España) — mecanismo real pero distinto: no es "buscar y listo"

El manual oficial "OpenPLACSP" (Dirección General del Patrimonio del Estado) confirma que España no ofrece una API de búsqueda en vivo como SECOP II o TED: en su lugar, publica archivos ZIP con XML en formato Atom/CODICE, actualizados periódicamente, en URLs como:

```
https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3_202101.zip
```

Para usarlo habría que: descargar el ZIP del período deseado, descomprimirlo, parsear el XML CODICE, y filtrar localmente por palabra clave — es un proceso de ingestión periódica (por ejemplo, un job diario/semanal que descarga y indexa), no una consulta en vivo. Documentado como diseño en el informe de arquitectura, no implementado como script todavía porque implica más piezas (descarga programada, parser XML CODICE) que las 2 horas de esta sesión permiten construir con la misma verificación rigurosa que el resto.

## 5. SEACE (Perú) y CompraNet (México) — sin API pública confirmada

Para ambos, la búsqueda no encontró una API pública documentada oficialmente (solo scrapers de terceros no oficiales en Apify, que no se recomiendan como fuente porque no se puede verificar que respeten los términos de uso del portal ni que los datos sean fieles). Si KINEDRIK necesita cubrir Perú o México, el siguiente paso realista es contactar directamente a OSCE (Perú) o a la Secretaría Anticorrupción y Buen Gobierno (México) para preguntar por accesos de datos abiertos — no inventar un scraper sin confirmar que está permitido.

## 6. Generador de índice desde PPT — probado y funcionando

Aparte de licitaciones, se implementó y probó `generar_indice_desde_ppt.py`: toma el texto de un PPT (Pliego de Prescripciones Técnicas) real de KINEDRIK y extrae automáticamente tipologías, los 7 Lotes con sus entregables, y los estándares de calidad — sin generar contenido, solo aplicando patrones sobre encabezados reales del documento (p. ej. "Lote A: Diagnóstico del Sistema" → "Entregables: ...").

Se probó contra el PPT real del área BIM (`Pliego_de_Prescripciones_Técnicas_(PPT)_-_Área_BIM.docx`, autor "Manus AI") y reprodujo correctamente los 7 Lotes con sus entregables — el mismo resultado que se había transcrito a mano para construir `kinedrik_indice_entregables_TODAS_AREAS_v0.1.0.json`. Esto confirma que el método puede automatizarse: cualquier PPT nuevo que siga el mismo formato (todos los de KINEDRIK lo siguen, mismo autor) puede indexarse sin intervención manual.

**Limitación honesta detectada en la prueba:** cuando un lote tiene un entregable final con coma "decorativa" dentro de una frase larga (p. ej. "Informe de viabilidad económica, ambiental y social. Matriz de riesgos...") el separador automático por comas no lo divide igual de bien que una persona lo haría a mano — queda como un único ítem más largo en vez de 2-3 más cortos. No afecta la información (todo el texto real está presente, solo agrupado distinto), pero un revisor humano debería repasar el resultado automático antes de reemplazar por completo el índice ya construido a mano.

## 7. Qué queda pendiente

1. Ejecutar `licitaciones_secop2.py` y `licitaciones_ted.py` desde un entorno con salida de red real (backend de programación) para confirmar los resultados en producción.
2. Decidir si KINEDRIK necesita cobertura de licitaciones en España (implica construir el ingestor periódico de PLACSP, más trabajo que un conector de API) y/o Perú/México (implica contactar a los organismos para pedir acceso a datos abiertos).
3. Revisar humanamente la separación de entregables del generador automático de PPT antes de confiar en él al 100% para reemplazar la transcripción manual.
