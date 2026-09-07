const RESULT_SCHEMA_HINT = `Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown, sin texto fuera del JSON) con esta forma exacta:

{
  "score": number,                     // 0-100, madurez/calidad del documento frente a la normativa indicada
  "summary": string,                   // resumen ejecutivo en 3-5 frases, en español, citando los hallazgos más importantes
  "risks": [
    {
      "id": string,                    // "R-01", "R-02", ...
      "severity": "alto" | "medio" | "bajo",
      "title": string,                 // título corto del riesgo/incoherencia
      "location": string,              // sección o apartado del documento donde aparece (o "No localizado" si no aplica)
      "explanation": string,           // por qué es un problema, en 2-4 frases
      "normative_reference": string,   // cláusula normativa relevante (ISO 19650-2, UNE-EN 17412, etc.) y por qué aplica
      "quote": string,                 // fragmento textual breve (máx. 240 caracteres) tomado del documento que evidencia el riesgo, o "" si no hay cita literal aplicable
      "suggested_fix": string          // propuesta concreta de mejora, accionable
    }
  ],
  "checklist": [
    { "item": string, "ref": string, "status": "ok" | "warn" | "fail" }
  ],
  "correct_sections": [ string ],       // apartados que sí cumplen razonablemente, en frases cortas
  "recommendations": [ string ]         // 3-6 recomendaciones priorizadas, accionables
}

Reglas:
- Todo el contenido en español.
- Basa cada riesgo en el texto real del documento proporcionado. No inventes secciones que no existan; si no puedes localizar la sección, usa "No localizado".
- Ordena "risks" por severidad (alto primero).
- "score" debe ser coherente con la cantidad y severidad de los riesgos.
- Si el documento no contiene información suficiente para evaluar algo, dilo explícitamente en el resumen en vez de inventarlo.
- No incluyas comentarios ni texto fuera del objeto JSON.`;

function buildAnalysisPrompt({ tipo, normativa, especialidad, nivel, fileName, text, truncated }) {
  const system = `Eres un segundo revisor técnico experto en gestión BIM (Building Information Modelling) para proyectos AEC (arquitectura, ingeniería y construcción), especializado en ${especialidad}. Tu trabajo es revisar documentación técnica (tipo: ${tipo}) frente a la normativa ${normativa}, detectando errores, incoherencias internas, riesgos contractuales y omisiones. No sustituyes el criterio profesional del revisor humano: tu salida es un análisis de apoyo que el experto validará. Nivel de revisión solicitado: ${nivel}.`;

  const user = `Documento a revisar: "${fileName}".
${truncated ? 'NOTA: el documento es extenso y el texto fue truncado a los primeros caracteres; evalúa solo sobre el contenido disponible y menciónalo en el resumen si es relevante.\n' : ''}
--- CONTENIDO DEL DOCUMENTO ---
${text}
--- FIN DEL CONTENIDO ---

${RESULT_SCHEMA_HINT}`;

  return { system, user };
}

function buildChatPrompt({ risk, question, tipo, normativa, docExcerpt }) {
  const system = `Eres el mismo segundo revisor técnico BIM que generó el informe de revisión (normativa ${normativa}, tipo de documento ${tipo}). Ahora respondes preguntas puntuales del revisor humano sobre UN riesgo concreto ya detectado. Responde en español, en 3-8 frases, de forma concreta y aplicada. Deja claro que la decisión final es del profesional humano. No repitas literalmente el JSON del informe.`;

  const user = `Riesgo sobre el que se pregunta:
- Título: ${risk.title}
- Severidad: ${risk.severity}
- Ubicación: ${risk.location}
- Explicación previa: ${risk.explanation}
- Referencia normativa: ${risk.normative_reference}
- Propuesta de mejora ya sugerida: ${risk.suggested_fix}

${docExcerpt ? `Fragmento de referencia del documento original:\n"""${docExcerpt}"""\n` : ''}
Pregunta del revisor humano: ${question}`;

  return { system, user };
}

module.exports = { buildAnalysisPrompt, buildChatPrompt };
