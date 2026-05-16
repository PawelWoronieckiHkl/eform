/**
 * Top-level entry point for the FTP order import pipeline.
 *
 *   runImport()  →  for every *.json on the FTP:
 *                     1. download to `<localImportDir>/incoming/`
 *                     2. parse + validate
 *                     3. resolve user (DB), back-fill missing fields
 *                     4. translate parameters to canonical keys
 *                     5. insert the order + items inside a single DB
 *                        transaction (rolled back on any failure)
 *                     6. move local + remote file to processed/error
 *
 * Returns a per-file summary array so the CLI / cron can report progress.
 *
 * The function is fully self-contained — no Express/HTTP layer, so it can be
 * scheduled, tested, or invoked manually with the same code path.
 */

const fs = require('fs').promises;
const path = require('path');

const ftp = require('./ftpClient');
const cache = require('./localCache');
const { validateOrderPayload } = require('./orderValidator');
const { resolveOrderUser } = require('./userResolver');
const { importResolvedOrder } = require('./orderImporter');
const { connetToDb } = require('../../db/core');
const { log } = require('../../utils/logging');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }
}

async function processOneFile(fileName) {
  const result = {
    file: fileName,
    ok: false,
    orderId: null,
    error: null
  };

  const paths = cache.paths();
  const localPath = cache.incomingPathFor(fileName);

  // 1. Download (or copy from local fallback) into the incoming dir — this
  // doubles as the local backup required for audit ("kopia na serwerze").
  await ftp.downloadOrderFile(fileName, localPath, { localFallbackDir: paths.incoming });

  let conn;
  try {
    const payload = await readJson(localPath);

    const validation = validateOrderPayload(payload);
    if (!validation.ok) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const resolved = await resolveOrderUser(validation.data);

    // Single DB transaction so partial inserts don't leave orphan rows.
    conn = await connetToDb();
    await conn.beginTransaction();
    const importResult = await importResolvedOrder({
      payload: resolved.payload,
      user: resolved.user,
      lang: resolved.lang
    });
    await conn.commit();
    await conn.end();
    conn = null;

    result.ok = true;
    result.orderId = importResult.orderId;

    await cache.moveToProcessed(localPath);
    try {
      await ftp.moveRemoteFile(fileName, 'processed', { localFallbackDir: paths.incoming });
    } catch (err) {
      log(`WARN: import OK but FTP move to processed failed for ${fileName}: ${err.message}`);
    }
  } catch (err) {
    result.error = err.message || String(err);
    if (conn) {
      try { await conn.rollback(); } catch (_e) { /* ignore */ }
      try { await conn.end(); } catch (_e) { /* ignore */ }
    }
    try {
      await cache.moveToError(localPath, result.error);
    } catch (_e) { /* file may already be missing */ }
    try {
      await ftp.moveRemoteFile(fileName, 'error', { localFallbackDir: paths.incoming });
    } catch (mvErr) {
      log(`WARN: failed to move FTP file ${fileName} to error/: ${mvErr.message}`);
    }
    log(`Import failed for ${fileName}: ${result.error}`);
  }

  return result;
}

async function runImport() {
  await cache.ensureDirs();
  const paths = cache.paths();

  const files = await ftp.listOrderFiles({ localFallbackDir: paths.incoming });
  log(`OrderImport: found ${files.length} file(s)`);

  const results = [];
  for (const fileName of files) {
    // Skip files that have already been moved into incoming/ but came from a
    // crashed previous run — they will be retried below as the listing above
    // also includes them in local-fallback mode. That's intentional.
    // eslint-disable-next-line no-await-in-loop
    results.push(await processOneFile(fileName));
  }
  return results;
}

module.exports = {
  runImport,
  processOneFile,
  // exported for tests
  _internals: { readJson }
};
