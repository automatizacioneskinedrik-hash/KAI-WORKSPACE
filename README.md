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
| `FREE_TRIAL_LIMIT` | Nº de análisis permitidos antes de bloquear con 402 (por defecto `5`). Ver [Plan de monetización](#plan-de-monetización-siguiente-fase). |

## Backend endurecido

- **Helmet**: cabeceras de seguridad estándar en todas las respuestas.
- **Rate limiting**: `/api/analyze` (30 peticiones/15 min) y `/api/analyses/:id/chat` (60/15 min) por IP, para evitar abuso antes de exponer la demo fuera de local.
- **Validación de entrada**: `tipo`, `normativa`, `especialidad` y `nivel` se validan contra listas cerradas (si llega un valor no reconocido, se usa el valor por defecto en vez de inyectarlo tal cual en el prompt).
- **Manejo de errores centralizado**: archivo demasiado grande (413), formato no soportado (400), JSON inválido del modelo (502), sin API key (412), 404 explícito para rutas `/api/*` no existentes.

## Prueba gratuita (free trial) — real, no simulada

El backend cuenta los análisis reales guardados en `data/db.json` y expone el estado en
`/api/health` (`trial: { used, limit, remaining }`). Al llegar a `FREE_TRIAL_LIMIT`,
`/api/analyze` responde `402 TRIAL_LIMIT_REACHED` y el frontend deshabilita el botón de
análisis mostrando el aviso. No hay ningún límite falso ni contador decorativo: es la
misma fuente de datos que alimenta el historial.

## Plan de monetización (siguiente fase)

Pensado para la siguiente iteración, sin implementar todavía (requiere decisiones de
producto y credenciales de la pasarela):

1. **Pasarela de pago**: Stripe Checkout + Billing Portal es la opción recomendada (rápida
   de integrar, factura automática, sin PCI a cargo nuestro).
2. **Planes**: mantener el free trial actual (N análisis) como plan gratuito; añadir un
   plan de pago con análisis ilimitados o por paquetes de tokens (alineado con el
   "monedero de tokens" que ya menciona el estudio de viabilidad).
3. **Identidad real de usuario**: el límite de prueba hoy es global a la instancia porque
   el login es una demo solo-cliente (`testing`/`123`). Para cobrar por usuario hace falta
   autenticación real (Moodle SSO vía LTI 1.3, según el estudio, o un login propio mínimo)
   antes de poder atar el contador de trial y el plan a una cuenta concreta.
4. **Webhook de Stripe → backend**: actualizar el plan del usuario en `data/db.json` (o en
   Firebase, cuando se migre la persistencia) al confirmarse el pago.

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

1. Validar el flujo completo con un BEP real y `OPENAI_API_KEY` de producción.
2. Migrar `data/db.json` a Firebase (Firestore) cuando se necesite persistencia multi-usuario real.
3. Autenticación real de usuario (sustituir el login demo solo-cliente) para atar plan/trial a cada cuenta.
4. Integrar Stripe para el plan de pago (ver [Plan de monetización](#plan-de-monetización-siguiente-fase)).
5. Desplegar en Cloud Run (arquitectura recomendada por el estudio de viabilidad) cuando
   se quiera compartir la demo fuera de local.
