#!/usr/bin/env node
/** One-shot FTP order import (standalone process, logs to import/import.log). */
process.env.ORDER_IMPORT_STANDALONE = '1';
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
