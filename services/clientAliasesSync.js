/**
 * Client Aliases Sync Service
 *
 * Scans /mnt/eform/datatest/{groupNumber}/data/ for files matching
 * paramdict-<PARAMETER>-<COLLECTION>.txt, parses the 3-column TSV
 * (VALUE, ALIAS, DESCRIPTION) and upserts into the `client_aliases` table.
 *
 * Unique constraint: (value_col, group_number, parameter, collection)
 * If a record exists with different alias/description, it gets updated.
 */

const fs = require('fs');
const path = require('path');
const { connetToDb } = require('../db/core');
const { dataDir } = require('../config');
const { log } = require('../utils/logging');

const TABLE_NAME = 'client_aliases';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    value_col VARCHAR(191) NOT NULL,
    alias VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    parameter VARCHAR(100) NOT NULL,
    collection VARCHAR(100) NOT NULL,
    group_number VARCHAR(10) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_value_group (value_col, group_number, parameter, collection)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

/**
 * Ensure the client_aliases table exists.
 */
async function ensureTable() {
  const conn = await connetToDb();
  try {
    await conn.query(CREATE_TABLE_SQL);
  } finally {
    await conn.end();
  }
}

/**
 * Discover all numeric group directories under dataDir.
 * @returns {Promise<string[]>}
 */
async function discoverGroups() {
  const entries = await fs.promises.readdir(dataDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
    .map(e => e.name)
    .sort((a, b) => Number(a) - Number(b));
}

/**
 * Find all paramdict-<PARAM>-<COLLECTION>.txt files in a group's data directory.
 * @param {string} groupNumber
 * @returns {Promise<Array<{filePath: string, parameter: string, collection: string}>>}
 */
async function findParamDictFiles(groupNumber) {
  const groupDataDir = path.join(dataDir, groupNumber, 'data');
  const results = [];

  try {
    const files = await fs.promises.readdir(groupDataDir);
    // Format: paramdict-<PARAMETER>-<COLLECTION>.txt
    // Parameters use underscores (never hyphens), but collections CAN contain hyphens
    // (e.g. "BD-Line"). So we split on the FIRST hyphen only to get the parameter,
    // and everything after it (up to .txt) is the collection name.
    const prefix = 'paramdict-';
    const suffix = '.txt';

    for (const file of files) {
      if (!file.startsWith(prefix) || !file.endsWith(suffix)) continue;

      const inner = file.slice(prefix.length, -suffix.length); // e.g. "KOLOR_DODATKOWY-BD-Line"
      const firstHyphen = inner.indexOf('-');
      if (firstHyphen === -1) continue;

      const parameter = inner.slice(0, firstHyphen);    // e.g. "KOLOR_DODATKOWY"
      const collection = inner.slice(firstHyphen + 1);  // e.g. "BD-Line"

      if (!parameter || !collection) continue;

      results.push({
        filePath: path.join(groupDataDir, file),
        parameter,
        collection
      });
    }
  } catch (err) {
    // Directory doesn't exist or not readable — skip
  }

  return results;
}

/**
 * Parse a paramdict-*.txt file (TSV: VALUE\tALIAS\tDESCRIPTION).
 * First line is the header — skip it.
 * @param {string} filePath
 * @returns {Promise<Array<{value: string, alias: string, description: string}>>}
 */
async function parseParamDictFile(filePath) {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('\t');
    const value = (parts[0] || '').trim();
    const alias = (parts[1] || '').trim();
    const description = (parts[2] || '').trim();

    if (!value) continue;

    entries.push({ value, alias, description });
  }

  return entries;
}

/**
 * Upsert a batch of client alias entries.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE for efficient bulk upsert.
 *
 * @param {Array<{value: string, alias: string, description: string, parameter: string, collection: string, groupNumber: string}>} entries
 * @returns {Promise<{affected: number}>}
 */
async function upsertBatch(entries) {
  if (!entries.length) return { affected: 0 };

  const conn = await connetToDb();
  try {
    const BATCH_SIZE = 500;
    let totalAffected = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(',\n');
      const values = [];

      for (const entry of batch) {
        values.push(
          entry.value,
          entry.alias,
          entry.description,
          entry.parameter,
          entry.collection,
          entry.groupNumber
        );
      }

      const sql = `
        INSERT INTO ${TABLE_NAME}
          (value_col, alias, description, parameter, collection, group_number)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
          alias = VALUES(alias),
          description = VALUES(description),
          updated_at = CURRENT_TIMESTAMP
      `;

      const [result] = await conn.query(sql, values);
      totalAffected += result.affectedRows;
    }

    return { affected: totalAffected };
  } finally {
    await conn.end();
  }
}

/**
 * Sync all groups: scan paramdict-*.txt files and upsert to DB.
 * @returns {Promise<{groups: Array, totalEntries: number, errors: Array}>}
 */
async function syncAll() {
  await ensureTable();

  const groups = await discoverGroups();
  log(`clientAliasesSync: Found ${groups.length} groups to scan`);

  const results = [];
  const errors = [];
  let totalEntries = 0;

  for (const groupNumber of groups) {
    try {
      const dictFiles = await findParamDictFiles(groupNumber);

      if (dictFiles.length === 0) {
        results.push({ groupNumber, status: 'skipped', reason: 'no paramdict files' });
        continue;
      }

      const entries = [];

      for (const { filePath, parameter, collection } of dictFiles) {
        const parsed = await parseParamDictFile(filePath);
        for (const { value, alias, description } of parsed) {
          entries.push({ value, alias, description, parameter, collection, groupNumber });
        }
      }

      if (entries.length > 0) {
        const upsertResult = await upsertBatch(entries);
        results.push({
          groupNumber,
          status: 'synced',
          files: dictFiles.length,
          entries: entries.length,
          affected: upsertResult.affected
        });
        totalEntries += entries.length;
      } else {
        results.push({ groupNumber, status: 'empty' });
      }
    } catch (err) {
      log(`clientAliasesSync: Error processing group ${groupNumber}: ${err.message}`);
      errors.push({ groupNumber, error: err.message });
    }
  }

  log(`clientAliasesSync: Sync complete. ${totalEntries} entries across ${groups.length} groups.`);
  return { groups: results, totalEntries, errors };
}

/**
 * Sync a single group.
 * @param {string} groupNumber
 * @returns {Promise<Object>}
 */
async function syncGroup(groupNumber) {
  await ensureTable();

  const dictFiles = await findParamDictFiles(groupNumber);
  if (dictFiles.length === 0) {
    return { groupNumber, status: 'skipped', reason: 'no paramdict files' };
  }

  const entries = [];
  for (const { filePath, parameter, collection } of dictFiles) {
    const parsed = await parseParamDictFile(filePath);
    for (const { value, alias, description } of parsed) {
      entries.push({ value, alias, description, parameter, collection, groupNumber });
    }
  }

  if (entries.length > 0) {
    const upsertResult = await upsertBatch(entries);
    return {
      groupNumber,
      status: 'synced',
      files: dictFiles.length,
      entries: entries.length,
      affected: upsertResult.affected
    };
  }

  return { groupNumber, status: 'empty' };
}

module.exports = { syncAll, syncGroup, ensureTable };
