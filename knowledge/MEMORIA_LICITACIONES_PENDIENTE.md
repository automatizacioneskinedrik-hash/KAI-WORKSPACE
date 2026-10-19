# Memoria — Módulo de Verificación de Licitaciones ("Opportunity Scout")

**Estado: PENDIENTE — bloqueado por falta de datos reales.**

## Por qué no está construido todavía

El resto del sistema (base normativa RAG, verificación de modelos BIM, índice de entregables por área) se construyó exclusivamente a partir de documentos reales: 11 normas ISO/UNE-EN descargadas de Drive y verificadas párrafo a párrafo, y los 9 Pliegos de Prescripciones Técnicas (PPT) reales de KINEDRIK. Esa es la regla del proyecto: **nunca inventar norma, cláusula, fecha, precio o URL**.

Para el módulo de licitaciones no existe ese equivalente todavía: no se ha recibido ninguna URL real de un portal de contratación pública, ni un criterio interno de KINEDRIK sobre qué campos de un anuncio de licitación hay que verificar (requisitos técnicos, plazos, garantías, solvencia, etc.). Construir el módulo ahora mismo implicaría o bien simular licitaciones/URLs de ejemplo (viola la regla de no-invención) o bien dejar el módulo vacío de forma engañosa (tampoco es aceptable). Por eso se ha dejado explícitamente marcado como **"pendiente"** dentro del prototipo (pantalla "Licitaciones", con explicación visible para el usuario) en lugar de simularlo.

## Qué hace falta para desbloquearlo

1. **3–5 URLs reales** de portales de licitación/contratación pública (nacionales o regionales, según el país/área objetivo de KINEDRIK) que el equipo confirme como fuentes válidas.
2. **Criterio de verificación**: qué campos de un anuncio de licitación deben cotejarse contra la normativa cargada (p. ej. si un pliego de licitación BIM exige un BEP conforme a ISO 19650-2, el módulo debería poder señalarlo).
3. Confirmación de si el alcance es solo BIM (Área AMETBIM) o las 9 áreas, igual que se hizo con cronograma/presupuesto.

## Qué SÍ está listo para conectarse en cuanto lleguen los datos

- El motor de retrieval (`retrieve.py`) y la KB de 449 apartados normativos ya funcionan por refinamiento (nunca devuelven la norma completa) — el mismo motor puede alimentar la verificación de un anuncio de licitación en cuanto haya texto real que analizar.
- El patrón de UI ya existe en el prototipo (tarjetas de hallazgo con cita verificada + chunk_id + extracto literal), replicable para licitaciones sin rediseño adicional.

## Siguiente paso

Andrea: por favor comparte con Johan/Angel la petición de las 3–5 URLs reales de portales de licitación y el criterio de verificación — en cuanto lleguen, se construye la KB de licitaciones con el mismo método (sin inventar nada) usado para BIM.
