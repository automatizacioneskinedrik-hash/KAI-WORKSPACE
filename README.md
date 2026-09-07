# K·AI Workspace — MVP: AI Technical Reviewer

MVP funcional (no maqueta) del primer AI Skill de K·AI Workspace: un segundo revisor
técnico que analiza documentación BIM/AEC (BEP, EIR, memorias, etc.) frente a normativa
(ISO 19650-2, UNE-EN 17412...) usando IA real.

Este repo implementa exactamente el alcance mínimo que el
[Estudio de viabilidad técnica](./Estudio_viabilidad_tecnica%20KAI-Workspace.pdf) define
como "MVP demostrable": **una habilidad AI operativa de extremo a extremo**, con carga
documental real, ejecución vía backend (sin exponer credenciales al navegador) y
persistencia técnica de cada ejecución. Deliberadamente **no** incluye Moodle SSO, pagos,
monedero de tokens ni gamificación — el propio estudio los marca como aplazables y fuera
del primer incremento.

## Qué hace de verdad

1. Subes un PDF o DOCX (p. ej. un BEP).
2. El backend extrae el texto real del documento (`pdf-parse` / `mammoth`).
3. Se envía a un modelo de OpenAI con un prompt que fuerza una salida JSON estructurada:
   score de madurez, riesgos priorizados (con cita textual del propio documento),
   checklist normativo y recomendaciones.
4. El resultado se persiste en `data/db.json` (histórico real, no simulado).
5. Puedes abrir el detalle de cada riesgo y preguntarle a la IA sobre él — la respuesta
   es una llamada real al modelo, con el contexto de ese riesgo.

No hay animaciones con datos falsos ni `setTimeout` simulando un análisis: si no hay
`OPENAI_API_KEY` configurada, la app lo dice claramente en la topbar y el análisis falla
con un error explícito en lugar de inventar resultados.

## Cómo correrlo

```bash
npm install
cp .env.example .env   # añade tu OPENAI_API_KEY
npm run dev
```

Abre `http://localhost:8080`.

Variables de entorno (`.env`):

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | Clave de la API de OpenAI. Sin ella, `/api/analyze` responde 412 con un mensaje claro. |
| `OPENAI_MODEL` | Modelo a usar (por defecto `gpt-4o-mini`). |
| `PORT` | Puerto del servidor (por defecto `8080`). |

## Estructura

```
server/
  index.js          Express app + rutas (/api/analyze, /api/analyses, /api/analyses/:id/chat)
  lib/extract.js     Extracción de texto real (PDF / DOCX)
  lib/prompts.js     Prompts del análisis y del chat contextual
  lib/llm.js         Cliente HTTP a la API de OpenAI (chat completions, JSON mode)
  lib/db.js          Persistencia simple en JSON (data/db.json)
public/
  index.html/app.js/styles.css   Frontend (sin build step), UI heredada de la maqueta
                                  de I+D pero recableada a datos reales del backend
```

## Lo que queda fuera de este MVP (a propósito)

Según el estudio de viabilidad, esto pertenece a fases posteriores y no debe bloquear la
primera demo:

- Integración SSO con Moodle (autenticación real de alumno/matrícula vía LTI 1.3).
- Monedero de tokens, paquetes comerciales y pasarela de pago.
- Gamificación (XP, niveles, badges).
- Las otras skills del portafolio (Design Explorer, Decision Intelligence, etc.).
- Procesamiento especializado de IFC/BIM nativo (hoy solo se analiza la documentación
  del modelo, no el archivo IFC binario).

## Próximos pasos sugeridos

1. Añadir `OPENAI_API_KEY` real y validar el flujo completo con un BEP real.
2. `git init`, primer commit, y push al repositorio remoto de GitHub del proyecto.
3. Desplegar en Cloud Run (arquitectura recomendada por el estudio de viabilidad) cuando
   se quiera compartir la demo fuera de local.
