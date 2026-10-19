# Arquitectura — KINEDRIK Normativa RAG (por área, sobre TFM/PPT)

Este documento fija el diseño de los componentes que el usuario pidió explícitamente y que van más allá de la KB en sí: verificación de modelos, verificación de sitios de licitación, y generador de índices sobre PPTs/cronogramas/presupuestos — todo organizado por área y enganchado al flujo de 7 Lotes ya verificado en los Pliegos de Prescripciones Técnicas (PPT) reales de cada área.

Patrón general (idéntico al usado en `KINEDRIK_Advisor_AI`): **motor genérico + datos en KB.json, nunca texto fijo en el motor.** Cada pieza de abajo separa "motor" (código, estable) de "datos" (JSON, versionable, regenerable sin tocar código) — así se cumple `GUIA_ACTUALIZACION.md`: no hay que tocar el motor a mano cuando cambian los datos de origen.

## 1. Base de conocimiento normativa (RAG) — ENTREGADO v0.1.0 (BIM)

- `kinedrik_normativa_kb_BIM_v0.1.0.json`: 436 chunks reales de 11 normas BIM.
- `retrieve.py`: recuperación por refinamiento (léxica en v0.1; migrable a embeddings sin cambiar el esquema de chunk).
- `kinedrik_casuisticas_BIM_v0.1.0.json`: puente Lote (A-G) ↔ chunk_id.
- **Extensión a las 8 áreas restantes**: ejecutar `chunk_norms.py` con la lista `NORMS` de cada área (las normas ya están catalogadas por área en la Fase 1 — solo falta apuntar el script a cada carpeta de Drive y repetir el proceso; el motor no cambia).

## 2. Verificación de modelos (BIM/IFC)

**Objetivo real del usuario:** que el sistema "verifique los modelos" — es decir, comprobar que un modelo IFC entregado por un estudiante cumple los requisitos que la propia KB normativa (arriba) establece: LOD/LOI declarado, parámetros obligatorios por disciplina, nomenclatura de contenedores, etc. (ISO 19650-1 cap. 12 "Contenedores de información", 19650-2 §5.6 "Producción de la información").

**Diseño (motor separado de datos, para no inventar reglas):**

- `REGLAS_VERIFICACION_IFC.json` (a construir): lista de comprobaciones, cada una **citando su chunk_id de origen** en la KB — nunca una regla "porque sí". Ejemplo de forma (aún sin poblar con reglas reales — requiere que el usuario/Johan/Angel confirmen qué parámetros IFC exige KINEDRIK, ya que la norma ISO 19650 no fija nombres de propiedad IFC concretos, eso lo define cada BEP/proyecto):
  ```json
  {"regla_id": "R-BIM-001", "chunk_id_origen": "UNE-EN_ISO_19650-2_5.6...", "check": "IfcProject.Name no vacío", "severidad": "media"}
  ```
- Motor: script Python con `ifcopenshell` (librería estándar del sector, gratuita) que carga el `.ifc`, recorre entidades y aplica cada regla de `REGLAS_VERIFICACION_IFC.json`, devolviendo hallazgos con severidad y cita normativa — mismo formato que los `risks` (R-01…R-06) del prototipo `kai-workspace-prototipo.html`, pero generados por verificación real del archivo, no precargados.
- **Por qué no se entrega ya poblado:** las reglas de verificación (qué parámetro IFC concreto, qué umbral) no están en las normas ISO en sí — están en el BEP de cada proyecto o en un estándar interno de KINEDRIK aún no confirmado. Poblar esta tabla sin esa fuente sería "inventar reglas", justo lo que las instrucciones del proyecto prohíben. **Necesita**: un `.ifc` de ejemplo real + el BEP o estándar interno de KINEDRIK que defina qué se exige, para no inventar el criterio de verificación.

## 3. Verificación de sitios de licitación

**Objetivo real:** un componente desplegable que compruebe activamente portales de licitación (Opportunity Scout, ya conceptualizado en Fase 2-3-4) — no una tabla de demo con oportunidades ficticias.

**Diseño:**

- `FUENTES_LICITACION.json` (a construir con el usuario): lista de URLs reales de portales relevantes para los másteres/áreas KINEDRIK (p. ej. plataformas de contratación pública española/LatAm por país). **Sin URLs reales confirmadas, este componente no puede ejecutarse de verdad** — cualquier URL que yo proponga sin confirmación sería una invención, prohibida explícitamente en el encargo original.
- Motor (`check_licitaciones.py`, esqueleto ya viable): para cada fuente, hace `GET` real (respetando robots.txt y rate limits), extrae campos estructurados (objeto, plazo, presupuesto base, CPV/código, enlace) y los compara contra las áreas/palabras clave de la KB de másteres (`kinedrik_kb_snapshot_v1.0.0.json` → `ontology.families[*].keywords`) para puntuar afinidad — reutilizando el motor de afinidad que ya existe en `KINEDRIK_Advisor_AI`, no uno nuevo.
- Salida: JSON con oportunidades reales encontradas, cada una con `fuente_url`, `fecha_verificacion` y `estado: VERIFICADO` — nunca una fila sin URL trazable.
- **Necesita**: que el usuario (o Andrea/Johan/Angel) confirme 3-5 portales reales de licitación a monitorizar; con eso el esqueleto queda operativo en una sesión.

## 4. Generador de índices (PPTs + cronogramas + presupuestos)

**Objetivo real:** un índice de entregables por área que mire los 9 PPT (ya leídos íntegramente, autor Manus AI) y los junte con cronograma y presupuesto reales del Lote F/G de cada uno.

**Diseño — esto sí es 100% construible ya, porque los PPT ya están verificados y descargados:**

- `INDICE_ENTREGABLES.json`: por área → por lote (A-G) → lista de entregables **copiados literalmente de la sección "Entregables:" de cada PPT real** (ej. BIM Lote F: "Memoria de mediciones, cuadro de precios unitarios, presupuesto detallado, cronograma de ejecución y curva de inversión"). Cero invención: es transcripción literal del PPT ya leído.
- El índice se cruza con la KB normativa: cada entregable de "Lote B: Análisis Normativo" apunta a las casuísticas de `kinedrik_casuisticas_BIM_v0.1.0.json` correspondientes, cerrando el círculo PPT → Lote → Normativa → chunk_id.
- **Siguiente paso inmediato**: generar `INDICE_ENTREGABLES.json` para las 9 áreas a partir del texto ya capturado de los 9 PPT (no requiere nueva información externa) — puede hacerse en la siguiente iteración sin bloqueos.

## Cómo consume esto "la skill"

La skill de Claude (o cualquier runtime) debe:
1. Recibir la refinación del estudiante en lenguaje natural.
2. Determinar área + (si aplica) lote, usando `INDICE_ENTREGABLES.json` como mapa.
3. Llamar a `retrieve.py`-equivalente sobre la KB de esa área con la refinación → obtener 3-5 `chunk_id`, nunca la norma completa.
4. Responder citando `norma_codigo` + `apartado` + `chunk_id`, y si aplica, ejecutar verificación de modelo o consulta de licitaciones activas con los motores del punto 2/3.
5. Si no hay coincidencia verificada en la KB → responder "REQUIERE VALIDACIÓN", nunca completar con conocimiento no verificado del modelo base.

## Roadmap inmediato (en orden de dependencia)

1. ✅ KB normativa BIM chunked + motor de recuperación + casuísticas (este entregable).
2. `INDICE_ENTREGABLES.json` (9 áreas, desde los PPT ya leídos) — sin bloqueos, siguiente iteración.
3. Repetir el chunking (`chunk_norms.py`) para las 8 áreas restantes, según prioridad que el equipo confirme (nota interna: BIM ya priorizado; "presentar avances de entrenamiento con otras ISO" sugiere continuar con la familia ISO de otra área técnica, p. ej. ISO 9001/14001 ya catalogadas).
4. Verificación de modelos IFC: bloqueado hasta recibir un `.ifc` de ejemplo + criterio de verificación interno de KINEDRIK (Johan/Angel).
5. Verificación de licitaciones: bloqueado hasta recibir 3-5 URLs reales de portales a monitorizar.
