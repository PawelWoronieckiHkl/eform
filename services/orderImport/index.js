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
const { resolvePayloadAliases } = require('./aliasResolver');
const importLogger = require('./importLogger');
const { makeTransactionalDeps } = require('./transactionalDb');
const { connetToDb } = require('../../db/core');
const { log } = require('../../utils/logging');
const { sendImportSummary } = require('../mailBot/importMailer');

const MAX_FILE_ATTEMPTS = 3;

function formatError(err) {
  if (!err) return 'unknown error';
  const parts = [];
  if (err.message) parts.push(err.message);
  if (err.code) parts.push(`code=${err.code}`);
  if (err.errno) parts.push(`errno=${err.errno}`);
  if (err.sqlState) parts.push(`sqlState=${err.sqlState}`);
  if (err.stack) parts.push(`\n${err.stack}`);
  return parts.length ? parts.join(' ') : String(err);
}

function isTransientError(err) {
  const code = err && err.code;
  return [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'PROTOCOL_CONNECTION_LOST',
    'ER_LOCK_DEADLOCK',
    'ER_LOCK_WAIT_TIMEOUT'
  ].includes(code) || /connect ETIMEDOUT/i.test(err && err.message ? err.message : '');
}

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
  let localPath;
  // Captured as soon as the payload is parsed so it survives into the error
  // branch below — otherwise a failed import logs userIdent=null.
  let userIdent = null;

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_FILE_ATTEMPTS; attempt++) {
    let conn;
    try {
      localPath = cache.incomingPathFor(fileName);

      // 1. Download (or keep from local fallback) into the incoming dir — this
      // doubles as the local backup required for audit ("kopia na serwerze").
      await ftp.downloadOrderFile(fileName, localPath, { localFallbackDir: paths.incoming });

      const payload = await readJson(localPath);
      if (payload && payload.userIdent) userIdent = payload.userIdent;

      const validation = validateOrderPayload(payload);
      if (!validation.ok) {
        throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
      }

      // Resolve client aliases in item parameters before user resolution
      const { items: resolvedItems, errors: aliasErrors } = await resolvePayloadAliases(validation.data.items, validation.data.userIdent);

      if (aliasErrors.length > 0) {
        throw new Error(`Alias resolution failed:\n${aliasErrors.join('\n')}`);
      }

      validation.data.items = resolvedItems;

      const resolved = await resolveOrderUser(validation.data);

      // Single DB transaction so partial inserts don't leave orphan rows.
      conn = await connetToDb();
      await conn.beginTransaction();
      const importResult = await importResolvedOrder({
        payload: resolved.payload,
        user: resolved.user,
        lang: resolved.lang,
        deps: makeTransactionalDeps(conn)
      });
      await conn.commit();
      await conn.end();
      conn = null;

      result.ok = true;
      result.orderId = importResult.orderId;

      // Log import result
      await importLogger.logSuccess({
        fileName,
        orderId: importResult.orderId,
        userIdent: validation.data.userIdent,
        itemsCount: resolvedItems.length
      });

      // Recalculate prices in a real browser (Playwright headless)
      // This runs AFTER commit so the order data is visible to the browser session.
      try {
        const { recalculateOrderInBrowser } = require('./browserRecalculator');
        const recalcResult = await recalculateOrderInBrowser(importResult.orderId);
        if (recalcResult.success) {
          // After Playwright recalculates (prices are correct but displayValues may lose aliases),
          // rebuild displayValues server-side using displayValueBuilder which correctly handles aliases.
          const { rebuildDisplayValuesForOrder } = require('./displayValueRebuilder');
          await rebuildDisplayValuesForOrder(importResult.orderId);
          log(`Import+recalculate OK for order ${importResult.orderId}`);
        } else {
          log(`WARN: import OK but recalculate failed for order ${importResult.orderId}: ${recalcResult.message}`);
        }
      } catch (recalcErr) {
        log(`WARN: import OK but recalculate error for order ${importResult.orderId}: ${recalcErr.message}`);
      }

      await cache.moveToProcessed(localPath);
      try {
        await ftp.moveRemoteFile(fileName, 'processed', { localFallbackDir: paths.incoming });
      } catch (err) {
        log(`WARN: import OK but FTP move to processed failed for ${fileName}: ${err.message}`);
      }
      return result;
    } catch (err) {
      lastError = err;
      if (conn) {
        try { await conn.rollback(); } catch (_e) { /* ignore */ }
        try { await conn.end(); } catch (_e) { /* ignore */ }
      }
      if (attempt < MAX_FILE_ATTEMPTS && isTransientError(err)) {
        log(`WARN: transient import error for ${fileName}, retry ${attempt}/${MAX_FILE_ATTEMPTS}: ${err.message}`);
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      break;
    }
  }

  result.error = lastError && lastError.message ? lastError.message : String(lastError || 'unknown error');
  const errorDetails = formatError(lastError);
  try {
    if (localPath) await cache.moveToError(localPath, errorDetails);
  } catch (_e) { /* file may already be missing */ }
  try {
    await ftp.moveRemoteFile(fileName, 'error', { localFallbackDir: paths.incoming });
  } catch (mvErr) {
    log(`WARN: failed to move FTP file ${fileName} to error/: ${mvErr.message}`);
  }
  log(`Import failed for ${fileName}: ${result.error}`);
  if (lastError && lastError.stack) {
    log(`Import failure details for ${fileName}: ${formatError(lastError)}`);
  }

  // Log error to import_log table
  try {
    await importLogger.logError({
      fileName,
      userIdent,
      errorMessage: result.error,
      errorDetails
    });
  } catch (_logErr) { /* don't let logging failure mask the real error */ }

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

  if (results.length > 0) {
    sendImportSummary(results).catch((err) =>
      log(`ImportMailer: unexpected error: ${err.message}`)
    );
  }

  return results;
}

module.exports = {
  runImport,
  processOneFile,
  // exported for tests
  _internals: { readJson, formatError, isTransientError }
};
