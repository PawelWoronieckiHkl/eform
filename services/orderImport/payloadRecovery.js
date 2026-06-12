'use strict';

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const { validateOrderPayload, looksLikeDisplayValuesArray } = require('./orderValidator');
const ftp = require('./ftpClient');

async function parseJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  let parsed = JSON.parse(raw);
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }
  return parsed;
}

function processedNameMatches(fileName, candidate) {
  return candidate === fileName
    || candidate.endsWith(`__${fileName}`)
    || candidate.endsWith(`_${fileName}`);
}

async function findValidPayloadInDir(dir, fileName, readFile) {
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }

  const matches = entries
    .filter((name) => name.endsWith('.json') && processedNameMatches(fileName, name))
    .sort()
    .reverse();

  for (const name of matches) {
    try {
      const parsed = await readFile(path.join(dir, name));
      const validation = validateOrderPayload(parsed);
      if (validation.ok) {
        return { payload: validation.data, source: path.join(dir, name) };
      }
    } catch (_err) {
      // try next candidate
    }
  }

  return null;
}

async function findValidPayloadOnFtpProcessed(fileName) {
  if (!ftp.FTP_ENABLED) return null;

  const tmpDir = path.join(os.tmpdir(), `order_import_recovery_${process.pid}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    const ftpMod = require('basic-ftp');
    const { ftpImportPath } = require('../../config');
    const client = new ftpMod.Client();
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false
    });
    await client.cd(path.posix.join(ftpImportPath, 'processed'));
    const list = await client.list();
    client.close();

    const matches = list
      .filter((entry) => entry.type === 1 && entry.name.endsWith('.json')
        && processedNameMatches(fileName, entry.name))
      .sort((a, b) => String(b.name).localeCompare(String(a.name)));

    for (const entry of matches) {
      const tmpPath = path.join(tmpDir, entry.name);
      const client2 = new ftpMod.Client();
      try {
        await client2.access({
          host: process.env.FTP_HOST,
          user: process.env.FTP_USER,
          password: process.env.FTP_PASSWORD,
          secure: false
        });
        await client2.downloadTo(tmpPath, path.posix.join(ftpImportPath, 'processed', entry.name));
        client2.close();
        const parsed = await parseJsonFile(tmpPath);
        const validation = validateOrderPayload(parsed);
        if (validation.ok) {
          return { payload: validation.data, source: `ftp:processed/${entry.name}` };
        }
      } catch (_err) {
        try { client2.close(); } catch (_e) { /* ignore */ }
      } finally {
        try { await fs.unlink(tmpPath); } catch (_e) { /* ignore */ }
      }
    }
  } finally {
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (_e) { /* ignore */ }
  }

  return null;
}

/**
 * When FTP delivers a position displayValues array instead of an order object,
 * try to recover the last successfully imported order JSON for the same file name.
 */
async function tryRecoverValidOrderPayload(fileName, parsed, { localProcessedDir } = {}) {
  const initial = validateOrderPayload(parsed);
  if (initial.ok) {
    return { payload: initial.data, recovered: false, source: null };
  }

  const shouldTryRecovery = looksLikeDisplayValuesArray(parsed)
    || parsed === null
    || typeof parsed !== 'object'
    || Array.isArray(parsed);

  if (!shouldTryRecovery) {
    return { payload: parsed, recovered: false, source: null };
  }

  const readFile = parseJsonFile;

  if (localProcessedDir) {
    const local = await findValidPayloadInDir(localProcessedDir, fileName, readFile);
    if (local) return { payload: local.payload, recovered: true, source: local.source };
  }

  const remote = await findValidPayloadOnFtpProcessed(fileName);
  if (remote) return { payload: remote.payload, recovered: true, source: remote.source };

  return { payload: parsed, recovered: false, source: null };
}

module.exports = {
  tryRecoverValidOrderPayload,
  processedNameMatches
};
