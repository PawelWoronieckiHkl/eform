#!/usr/bin/env node
/**
 * Dry-run report for the FTP order import.
 *
 * Lists every *.json waiting in the import directory (FTP, or the local
 * `incoming/` fallback) and runs the full pre-transaction validation chain
 * against each one WITHOUT importing anything and WITHOUT moving any file.
 *
 * The point is visibility: instead of a bad order silently sitting on the FTP
 * until someone digs through `error/*.error.txt`, this prints a readable report
 * of which orders would be rejected and exactly why.
 *
 * Usage:
 *   node scripts/orderImportPreflight.js
 *
 * Exit code:
 *   0  - all pending files would import cleanly (or none found)
 *   1  - at least one file would be rejected (handy for cron alerting)
 *   2  - the report itself crashed
 */

require('dotenv').config();

const os = require('os');
const path = require('path');
const fs = require('fs').promises;

const ftp = require('../services/orderImport/ftpClient');
const cache = require('../services/orderImport/localCache');
const { preflightPayload } = require('../services/orderImport/preflight');

async function readOrderJson(fileName, fallbackDir) {
  // Download to a throwaway temp file so we never touch incoming/processed/error.
  const tmpPath = path.join(os.tmpdir(), `preflight_${process.pid}_${Date.now()}_${fileName}`);
  await ftp.downloadOrderFile(fileName, tmpPath, { localFallbackDir: fallbackDir });
  try {
    const raw = await fs.readFile(tmpPath, 'utf8');
    return JSON.parse(raw);
  } finally {
    try { await fs.unlink(tmpPath); } catch (_e) { /* best effort */ }
  }
}

function printStageErrors(report) {
  for (const [stage, res] of Object.entries(report.stages)) {
    if (res.ok) continue;
    console.log(`    [${stage}]`);
    for (const err of res.errors) console.log(`      - ${err}`);
  }
}

(async () => {
  await cache.ensureDirs();
  const paths = cache.paths();

  const files = await ftp.listOrderFiles({ localFallbackDir: paths.incoming });
  if (files.length === 0) {
    console.log('Preflight: brak plikow do sprawdzenia.');
    process.exit(0);
  }

  console.log(`Preflight: ${files.length} plik(ow) w kolejce importu\n`);

  let rejected = 0;
  for (const fileName of files) {
    let payload;
    try {
      // eslint-disable-next-line no-await-in-loop
      payload = await readOrderJson(fileName, paths.incoming);
    } catch (err) {
      rejected++;
      console.log(`FAIL  ${fileName}`);
      console.log(`    [odczyt] ${err.message}\n`);
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const report = await preflightPayload(payload);
    const meta = `user=${report.userIdent || '?'}, pozycji=${report.itemCount}`;

    if (report.ok) {
      console.log(`OK    ${fileName}  (${meta}) — przejdzie import`);
    } else {
      rejected++;
      console.log(`FAIL  ${fileName}  (${meta}) — zostanie ODRZUCONE`);
      printStageErrors(report);
    }
    console.log('');
  }

  console.log(`Preflight: ${files.length - rejected}/${files.length} przejdzie, ${rejected} do odrzucenia.`);
  process.exit(rejected === 0 ? 0 : 1);
})().catch((err) => {
  console.error('Preflight crashed:', err);
  process.exit(2);
});
