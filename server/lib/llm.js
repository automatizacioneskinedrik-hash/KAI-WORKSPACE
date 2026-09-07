const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function hasApiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function callChat({ system, user, json = false }) {
  if (!hasApiKey()) {
    const err = new Error(
      'No hay OPENAI_API_KEY configurada. Copia .env.example a .env y añade tu clave para habilitar el análisis real.'
    );
    err.code = 'NO_API_KEY';
    throw err;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.2
  };
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const err = new Error(`Error de la API de OpenAI (${res.status}): ${errText.slice(0, 500)}`);
    err.code = 'LLM_ERROR';
    throw err;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage || {};
  return { content, usage, model };
}

async function callAnalysisJson({ system, user }) {
  const { content, usage, model } = await callChat({ system, user, json: true });
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const err = new Error('El modelo devolvió un JSON inválido. Intenta de nuevo.');
    err.code = 'BAD_JSON';
    throw err;
  }
  return { result: parsed, usage, model };
}

module.exports = { hasApiKey, callChat, callAnalysisJson };
