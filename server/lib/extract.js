const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const MAX_CHARS = 60000; // keeps prompt cost/latency bounded for the MVP

async function extractText(buffer, mimeType, originalName) {
  const lower = (originalName || '').toLowerCase();
  let text = '';

  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    const parsed = await pdfParse(buffer);
    text = parsed.text;
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    throw new Error('Formato no soportado. Usa PDF o DOCX.');
  }

  text = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();

  if (!text) {
    throw new Error('No se pudo extraer texto del documento (¿está escaneado como imagen?).');
  }

  const truncated = text.length > MAX_CHARS;
  return {
    text: truncated ? text.slice(0, MAX_CHARS) : text,
    truncated,
    fullLength: text.length
  };
}

module.exports = { extractText, MAX_CHARS };
