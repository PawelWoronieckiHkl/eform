/**
 * Translation Dictionary — main orchestrator.
 *
 * Scans all numeric group data directories, parses param.txt and paramdict.txt
 * for every supported language, and stores the translation mappings in DB.
 *
 * Usage:
 *   const translationDict = require('./services/translationDict');
 *   const result = await translationDict.syncAll();
 *   const translations = await translationDict.getGroupTranslations('43', 'en');
 */

const scanner = require('./fileScanner');
const parser = require('./parser');
const repo = require('./dbRepository');
const { log } = require('../../utils/logging');

/**
 * Run a full synchronization: scan all groups, parse files, upsert to DB.
 *
 * @param {Function} [progressCallback] - Optional (groupNumber, status) => void
 * @returns {Promise<{groups: Array, totalEntries: number, errors: Array}>}
 */
async function syncAll(progressCallback) {
  await repo.ensureTable();

  const groups = await scanner.discoverGroups();
  log(`translationDict: Found ${groups.length} groups to scan: ${groups.join(', ')}`);

  const results = [];
  const errors = [];
  let totalEntries = 0;

  for (const groupNumber of groups) {
    try {
      if (progressCallback) progressCallback(groupNumber, 'scanning');

      const syncStartTime = await repo.getMySQLNow();
      const groupData = await scanner.scanGroup(groupNumber);
      if (!groupData) {
        results.push({ groupNumber, status: 'skipped', reason: 'no data' });
        continue;
      }

      const entries = [];

      for (const [lang, files] of Object.entries(groupData.files)) {
        if (files.param) {
          const paramEntries = parser.parseParamFile(files.param);
          for (const entry of paramEntries) {
            entries.push({
              groupNumber,
              sourceType: 'param',
              paramName: entry.paramName,
              valueKey: null,
              lang,
              description: entry.description
            });
          }
        }

        if (files.paramdict) {
          const dictEntries = parser.parseParamDictFile(files.paramdict);
          for (const entry of dictEntries) {
            entries.push({
              groupNumber,
              sourceType: 'paramdict',
              paramName: entry.paramName,
              valueKey: entry.valueKey,
              lang,
              description: entry.description
            });
          }
        }
      }

      if (entries.length > 0) {
        const upsertResult = await repo.upsertBatch(entries);
        const staleRemoved = await repo.removeStaleEntries(groupNumber, syncStartTime);

        results.push({
          groupNumber,
          status: 'synced',
          entries: entries.length,
          affected: upsertResult.affected,
          staleRemoved
        });
        totalEntries += entries.length;
      } else {
        results.push({ groupNumber, status: 'empty' });
      }

      if (progressCallback) progressCallback(groupNumber, 'done');

    } catch (err) {
      log(`translationDict: Error processing group ${groupNumber}: ${err.message}`);
      errors.push({ groupNumber, error: err.message });
      if (progressCallback) progressCallback(groupNumber, 'error');
    }
  }

  log(`translationDict: Sync complete. ${totalEntries} entries across ${groups.length} groups.`);

  return { groups: results, totalEntries, errors };
}

/**
 * Sync a single group.
 * @param {string} groupNumber
 * @returns {Promise<Object>}
 */
async function syncGroup(groupNumber) {
  await repo.ensureTable();

  const syncStartTime = await repo.getMySQLNow();
  const groupData = await scanner.scanGroup(groupNumber);
  if (!groupData) {
    return { groupNumber, status: 'skipped', reason: 'no data' };
  }

  const entries = [];
  for (const [lang, files] of Object.entries(groupData.files)) {
    if (files.param) {
      const paramEntries = parser.parseParamFile(files.param);
      for (const entry of paramEntries) {
        entries.push({
          groupNumber,
          sourceType: 'param',
          paramName: entry.paramName,
          valueKey: null,
          lang,
          description: entry.description
        });
      }
    }

    if (files.paramdict) {
      const dictEntries = parser.parseParamDictFile(files.paramdict);
      for (const entry of dictEntries) {
        entries.push({
          groupNumber,
          sourceType: 'paramdict',
          paramName: entry.paramName,
          valueKey: entry.valueKey,
          lang,
          description: entry.description
        });
      }
    }
  }

  if (entries.length > 0) {
    const upsertResult = await repo.upsertBatch(entries);
    const staleRemoved = await repo.removeStaleEntries(groupNumber, syncStartTime);
    return {
      groupNumber,
      status: 'synced',
      entries: entries.length,
      affected: upsertResult.affected,
      staleRemoved
    };
  }

  return { groupNumber, status: 'empty' };
}

module.exports = {
  syncAll,
  syncGroup,
  getGroupTranslations: repo.getGroupTranslations,
  getTranslations: repo.getTranslations,
  getSyncStatus: repo.getSyncStatus
};
