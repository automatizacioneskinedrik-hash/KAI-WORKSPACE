# Informe de Validación — Base de Conocimiento Normativa (Área BIM) v0.1.0

## Qué es esto y por qué reemplaza las entregas anteriores

Las entregas previas (Fase 1 docx, Fase 2-3-4 docx, prototipo HTML estático) eran **documentos descriptivos**, no una base de datos operable. Esto es distinto: es la **base de conocimiento (KB) real, en JSON**, chunked por apartado normativo, pensada para que una skill la consulte por refinamiento — igual que `kinedrik_kb_snapshot_v1.0.0.json` alimenta el motor de `KINEDRIK_Advisor_AI/index.html`, pero aquí para normativa en vez de para másteres.

Se ha priorizado **BIM** primero, conforme a la nota de enfoque de entrenamiento ("priorizar el desarrollo y testeo sobre normativas BIM, ya que presentan mayor estabilidad y disponibilidad de datos"). El mismo pipeline (`chunk_norms.py`) es reutilizable para las otras 8 áreas en cuanto se prioricen.

## Fuentes procesadas (reales, sin invención)

11 documentos PDF reales descargados de la carpeta de Normativa BIM en Google Drive de KINEDRIK, descargados y extraídos íntegramente (no resumidos por IA antes del chunking):

| Norma | Título (real, de cabecera del documento) |
|---|---|
| UNE-EN ISO 19650-1:2019 | Conceptos y principios |
| UNE-EN ISO 19650-2:2019 (v. corregida jun-2020) | Fase de desarrollo de los activos |
| UNE-EN ISO 19650-3:2021 | Fase operativa de los activos |
| UNE-EN ISO 19650-4:2023 | Intercambio de información |
| UNE-EN ISO 19650-5:2020 | Enfoque orientado a la seguridad |
| EN ISO 19650-6:2025 | Health and safety information (versión inglesa — única disponible en Drive) |
| UNE-EN ISO 12006-2:2020 | Marco de trabajo para la clasificación |
| UNE-EN ISO 12006-3:2022 | Marco de referencia para info. orientada a objetos |
| UNE-EN ISO 29481-1:2018 | Manual de intercambio de información — metodología y formato |
| UNE-EN ISO 29481-2:2017 | Manual de intercambio de información — marco de interacción |
| UNE-EN ISO 29481-3:2022 | Manual de intercambio de información — términos y estados |

## Método de extracción (auditable)

1. Descarga íntegra del texto de cada PDF vía Drive (`read_file_content`), sin resumir.
2. Detección del inicio del cuerpo real del documento (se descarta el índice/tabla de contenidos, que produce falsos positivos por los puntos de relleno "....").
3. Segmentación por cabeceras de apartado numeradas (`5`, `5.1`, `5.1.4`, `5.4.2`, etc.) — el mismo estilo de cita que ya usa el prototipo `kai-workspace-prototipo.html` en sus fichas de riesgo (R-01…R-06 citan exactamente apartados como 5.1.4, 5.4.2, 5.3.2 de la ISO 19650-2, que **sí existen y sí dicen lo que el prototipo afirma** — verificado punto por punto en este informe).
4. Deduplicación por número de apartado (el PDF reparte a veces un título en dos líneas por salto de columna; nos quedamos con el fragmento de mayor contenido útil).
5. Cada chunk se marca `fuente_verificada: true` y lleva `chunk_id` trazable a la norma y apartado exactos. Ningún campo `extracto` contiene texto generado — es cita literal recortada.
6. Heurística de control de calidad: se marca `posible_reflujo_texto` cuando se detectan patrones típicos de reflujo de columnas del PDF (p. ej. "5,4,3" en vez de "5.4.3"); en la v0.1.0, **0 de 436 chunks quedaron marcados**, es decir, no se detectó reflujo relevante en el corpus BIM.

## Resultado

- **436 apartados/cláusulas** indexados de 11 normas reales.
- **0 clausulas inventadas.** Todo texto es cita literal recortada, con `chunk_id` de vuelta al documento y apartado exacto.
- **Motor de recuperación por refinamiento** (`retrieve.py`): dado un enunciado del estudiante (p. ej. "requisitos de intercambio de información del adjudicatario"), devuelve solo los 3-5 apartados más relevantes — nunca la norma completa. Si no hay coincidencia verificada, responde explícitamente "REQUIERE VALIDACIÓN" en vez de inventar o de devolver todo el documento como fallback.
- **Capa de casuísticas por Lote** (`kinedrik_casuisticas_BIM_v0.1.0.json`): liga cada uno de los 7 Lotes (A-G) del Pliego de Prescripciones Técnicas del Área BIM (fuente real, autor Manus AI) con los `chunk_id` normativos que un estudiante necesitaría en ese lote — 11 casuísticas generadas, las 11 con coincidencias verificadas en la KB (0 REQUIEREN VALIDACIÓN en esta primera pasada).

## Limitaciones conocidas (transparencia obligatoria)

- La cobertura de área **BIM está completa** para los 11 documentos disponibles en Drive; las **otras 8 áreas (Infraestructura, Energía y Minas, Obras Hidráulicas, Arquitectura y Urbanismo, Ingeniería Industrial, Gestión y Financiación, Transformación Digital, Estructuras y Geotecnia) aún no están chunked** — están catalogadas (Fase 1) pero no procesadas a nivel de cláusula. Siguiente paso natural tras validar BIM.
- El ranking de `retrieve.py` es léxico (solapamiento de tokens), no semántico/embeddings — funcional y trazable, pero se beneficiaría de un motor de embeddings si el volumen crece (mismo tipo de evolución que `GUIA_ACTUALIZACION.md` de KINEDRIK_Advisor_AI prevé para su propio motor de afinidad Jaccard → grafo de conocimiento).
- Componentes pendientes de este pedido que **no son bases de datos sino integraciones externas** (verificación de modelos BIM/IFC, verificación de sitios de licitación, generador de índices sobre PPTs/cronogramas/presupuestos): su diseño se documenta en `ARQUITECTURA_SISTEMA_NORMATIVA.md`, con andamiaje de código real donde es posible construirlo sin inventar datos de origen (URLs de licitación reales, modelos IFC reales) que aún no se han proporcionado.
