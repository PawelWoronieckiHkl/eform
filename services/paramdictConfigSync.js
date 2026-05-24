/**
 * Paramdict Aliases Config Sync
 *
 * Parses PARAMDICT_ALIASES from prod.txt in each group's language directory
 * and stores the org/user/param → collection mapping in `paramdict_aliases_config`.
 *
 * Format in prod.txt (tab-separated, line starting with PARAMDICT_ALIASES):
 *   ORG/USER/PARAM=paramdict-PARAM-COLLECTION.txt,ORG/USER/PARAM=...
 *
 * This tells us which alias collection a specific client uses for a parameter.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { connetToDb } = require('../db/core');
const { dataDir } = require('../config');
const { log } = require('../utils/logging');

/**
 * Parse PARAMDICT_ALIASES line from prod.txt content.
 * Returns array of { orgIdent, userIdent, parameter, collection }
 */
function parseParamdictAliases(content) {
  const results = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts[0] && parts[0].toUpperCase() === 'PARAMDICT_ALIASES' && parts[1]) {
      const entries = parts[1].split(',');
      for (const entry of entries) {
        const [key, file] = entry.split('=');
        if (!key || !file) continue;

        const keyParts = key.split('/');
        if (keyParts.length !== 3) continue;

        const orgIdent = keyParts[0].trim();
        const userIdent = keyParts[1].trim();
        const parameter = keyParts[2].trim();

        // Extract collection from filename: paramdict-PARAM-COLLECTION.txt
        const fileMatch = file.match(/^paramdict-[^-]+-(.+)\.txt$/);
        if (!fileMatch) {
          // Try: paramdict-PARAM_WITH_UNDERSCORES-COLLECTION.txt
          // Split on first hyphen after "paramdict-", then last hyphen before .txt
          const inner = file.replace(/^paramdict-/, '').replace(/\.txt$/, '');
          const lastHyphen = inner.lastIndexOf('-');
          if (lastHyphen > 0) {
            const collection = inner.slice(lastHyphen + 1);
            if (collection) {
              results.push({ orgIdent, userIdent, parameter, collection });
            }
          }
          continue;
        }

        results.push({ orgIdent, userIdent, parameter, collection: fileMatch[1] });
      }
    }
  }

  return results;
}

/**
 * Discover all numeric group directories and sync their PARAMDICT_ALIASES config.
 */
async function syncAll() {
  const conn = await connetToDb();
  try {
    const entries = await fs.promises.readdir(dataDir, { withFileTypes: true });
    const groups = entries
      .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
      .map(e => e.name)
      .sort((a, b) => Number(a) - Number(b));

    let totalEntries = 0;
    const errors = [];

    for (const groupNumber of groups) {
      try {
        // Read prod.txt from pl directory (config is language-independent)
        const prodPath = path.join(dataDir, groupNumber, 'data', 'pl', 'prod.txt');
        let content;
        try {
          content = await fs.promises.readFile(prodPath, 'utf-8');
        } catch {
          continue; // No prod.txt — skip
        }

        const configs = parseParamdictAliases(content);
        if (configs.length === 0) continue;

        // Batch upsert
        const BATCH_SIZE = 200;
        for (let i = 0; i < configs.length; i += BATCH_SIZE) {
          const batch = configs.slice(i, i + BATCH_SIZE);
          const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(',');
          const values = [];
          for (const c of batch) {
            values.push(groupNumber, c.orgIdent, c.userIdent, c.parameter, c.collection);
          }

          await conn.query(`
            INSERT INTO paramdict_aliases_config
              (group_number, org_ident, user_ident, parameter, collection)
            VALUES ${placeholders}
            ON DUPLICATE KEY UPDATE
              collection = VALUES(collection),
              updated_at = CURRENT_TIMESTAMP
          `, values);
        }

        totalEntries += configs.length;
      } catch (err) {
        errors.push({ groupNumber, error: err.message });
      }
    }

    log(`paramdictConfigSync: Synced ${totalEntries} entries from ${groups.length} groups`);
    return { totalEntries, errors };
  } finally {
    await conn.end();
  }
}

/**
 * Get the collection name for a specific org/user/param/group combination.
 */
async function getCollection(groupNumber, orgIdent, userIdent, parameter) {
  const conn = await connetToDb();
  try {
    const [rows] = await conn.query(
      `SELECT collection FROM paramdict_aliases_config
       WHERE group_number = ? AND UPPER(org_ident) = UPPER(?) AND UPPER(user_ident) = UPPER(?) AND parameter = ?
       LIMIT 1`,
      [groupNumber, orgIdent, userIdent, parameter]
    );
    return rows.length > 0 ? rows[0].collection : null;
  } finally {
    await conn.end();
  }
}

module.exports = { syncAll, getCollection, parseParamdictAliases };
