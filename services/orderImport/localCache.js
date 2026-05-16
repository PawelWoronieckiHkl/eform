/**
 * Local backup / staging directory for files pulled from the import FTP.
 *
 * Layout under `config.localImportDir`:
 *
 *   incoming/   - just-downloaded copies (the working file lives here)
 *   processed/  - files imported successfully (timestamp prefix, kept for audit)
 *   error/      - files whose import failed; an .error.txt sibling explains why
 *
 * Note: the same directory is *also* used as the source when FTP is disabled
 * (see ftpClient.js → localFallbackDir). In that mode you simply drop JSON
 * files into `incoming/` and re-run the importer.
 */

const path = require('path');
const fs = require('fs').promises;
const { localImportDir } = require('../../config');

const SUBDIRS = {
  incoming: 'incoming',
  processed: 'processed',
  error: 'error'
};

function paths() {
  return {
    root: localImportDir,
    incoming: path.join(localImportDir, SUBDIRS.incoming),
    processed: path.join(localImportDir, SUBDIRS.processed),
    error: path.join(localImportDir, SUBDIRS.error)
  };
}

async function ensureDirs() {
  const p = paths();
  await fs.mkdir(p.incoming, { recursive: true });
  await fs.mkdir(p.processed, { recursive: true });
  await fs.mkdir(p.error, { recursive: true });
  return p;
}

function incomingPathFor(fileName) {
  return path.join(paths().incoming, fileName);
}

function timestampedName(fileName) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `${ts}__${fileName}`;
}

async function moveToProcessed(localPath) {
  const dest = path.join(paths().processed, timestampedName(path.basename(localPath)));
  await fs.rename(localPath, dest);
  return dest;
}

async function moveToError(localPath, errorMessage) {
  const baseName = timestampedName(path.basename(localPath));
  const dest = path.join(paths().error, baseName);
  await fs.rename(localPath, dest);
  await fs.writeFile(`${dest}.error.txt`, String(errorMessage || 'unknown error'), 'utf8');
  return dest;
}

module.exports = {
  SUBDIRS,
  paths,
  ensureDirs,
  incomingPathFor,
  moveToProcessed,
  moveToError
};
