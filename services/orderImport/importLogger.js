/**
 * Import Logger — records each import attempt to the `import_log` table.
 */

const { connetToDb } = require('../../db/core');

/**
 * Log a successful import.
 * @param {object} params
 * @param {string} params.fileName
 * @param {number} params.orderId
 * @param {string} params.userIdent
 * @param {number} params.itemsCount
 */
async function logSuccess({ fileName, orderId, userIdent, itemsCount }) {
  const conn = await connetToDb();
  try {
    await conn.query(
      `INSERT INTO import_log (file_name, status, order_id, user_ident, items_count)
       VALUES (?, 'success', ?, ?, ?)`,
      [fileName, orderId, userIdent || null, itemsCount || 0]
    );
  } finally {
    await conn.end();
  }
}

/**
 * Log a failed import.
 * @param {object} params
 * @param {string} params.fileName
 * @param {string} params.userIdent
 * @param {string} params.errorMessage - Short error summary
 * @param {string} [params.errorDetails] - Full stack/details
 */
async function logError({ fileName, userIdent, errorMessage, errorDetails }) {
  const conn = await connetToDb();
  try {
    await conn.query(
      `INSERT INTO import_log (file_name, status, user_ident, error_message, error_details)
       VALUES (?, 'error', ?, ?, ?)`,
      [fileName, userIdent || null, errorMessage || 'Unknown error', errorDetails || null]
    );
  } finally {
    await conn.end();
  }
}

/**
 * Log a partial import (imported but with alias resolution warnings).
 * @param {object} params
 * @param {string} params.fileName
 * @param {number} params.orderId
 * @param {string} params.userIdent
 * @param {number} params.itemsCount
 * @param {string} params.errorMessage - Warning details
 */
async function logPartial({ fileName, orderId, userIdent, itemsCount, errorMessage }) {
  const conn = await connetToDb();
  try {
    await conn.query(
      `INSERT INTO import_log (file_name, status, order_id, user_ident, items_count, error_message)
       VALUES (?, 'partial', ?, ?, ?, ?)`,
      [fileName, orderId, userIdent || null, itemsCount || 0, errorMessage || null]
    );
  } finally {
    await conn.end();
  }
}

module.exports = { logSuccess, logError, logPartial };
