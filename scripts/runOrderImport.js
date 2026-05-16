#!/usr/bin/env node
/**
 * CLI runner for the FTP order import.
 *
 * Usage:
 *   node scripts/runOrderImport.js
 *
 * Environment:
 *   FTP_HOST / FTP_USER / FTP_PASSWORD - if missing, the importer reads files
 *                                        from <localImportDir>/incoming/ instead
 *                                        (handy in dev / for re-runs).
 *
 * Exit code:
 *   0  - all files imported successfully (or no files found)
 *   1  - one or more files failed; details are printed and stored under
 *        <localImportDir>/error/<file>.error.txt
 */

require('dotenv').config();

const { runImport } = require('../services/orderImport');

(async () => {
  try {
    const results = await runImport();
    if (results.length === 0) {
      console.log('OrderImport: nothing to do.');
      process.exit(0);
    }
    let failed = 0;
    for (const r of results) {
      if (r.ok) {
        console.log(`OK    ${r.file}  ->  order id=${r.orderId}`);
      } else {
        failed++;
        console.error(`FAIL  ${r.file}  ->  ${r.error}`);
      }
    }
    console.log(`OrderImport: ${results.length - failed}/${results.length} imported.`);
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('OrderImport crashed:', err);
    process.exit(2);
  }
})();
