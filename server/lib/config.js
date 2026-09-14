const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'config.json');

const DEFAULTS = {
  customInstructions: ''
};

function load() {
  if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(config) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function getConfig() {
  return load();
}

function setCustomInstructions(text) {
  const config = load();
  config.customInstructions = String(text || '').slice(0, 6000);
  save(config);
  return config;
}

module.exports = { getConfig, setCustomInstructions };
