const fs = require('fs');
const path = require('path');
const { dataDir } = require('../config');

const LOCK_FILE = path.join(dataDir, '.access-lock.json');

function readState() {
  try {
    const raw = fs.readFileSync(LOCK_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { blocked: !!parsed.blocked, updatedAt: parsed.updatedAt || null };
  } catch (_err) {
    return { blocked: false, updatedAt: null };
  }
}

function isBlocked() {
  return readState().blocked;
}

function setBlocked(blocked) {
  const dir = path.dirname(LOCK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const state = {
    blocked: !!blocked,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(LOCK_FILE, JSON.stringify(state));
  return state;
}

module.exports = { isBlocked, setBlocked, getState: readState };
