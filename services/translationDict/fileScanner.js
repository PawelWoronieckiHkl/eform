/**
 * File scanner — reads param.txt and paramdict.txt from data directories.
 * Path: data/{groupNumber}/data/{lang}/param.txt (always current).
 */

const fs = require('fs');
const path = require('path');
const { dataDir, availabeLanguages } = require('../../config');
const { log } = require('../../utils/logging');

const TARGET_FILES = ['param.txt', 'paramdict.txt'];

/**
 * Discover all numeric group directories under dataDir.
 * @returns {Promise<string[]>} - Array of group numbers (e.g. ['02','04','43'])
 */
async function discoverGroups() {
  const entries = await fs.promises.readdir(dataDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
    .map(e => e.name)
    .sort((a, b) => Number(a) - Number(b));
}

/**
 * Read a file from the main language directory.
 * Path: dataDir/{groupNumber}/data/{lang}/{filename}
 *
 * @param {string} groupNumber
 * @param {string} lang
 * @param {string} filename - 'param.txt' or 'paramdict.txt'
 * @returns {Promise<string|null>}
 */
async function readDataFile(groupNumber, lang, filename) {
  const filePath = path.join(dataDir, groupNumber, 'data', lang, filename);
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    return null;
  }
}

/**
 * Scan a single group: reads param/paramdict for all languages.
 *
 * @param {string} groupNumber
 * @returns {Promise<{groupNumber: string, files: Object}|null>}
 *   files: { [lang]: { param: string|null, paramdict: string|null } }
 */
async function scanGroup(groupNumber) {
  const groupDir = path.join(dataDir, groupNumber, 'data');
  try {
    await fs.promises.access(groupDir, fs.constants.R_OK);
  } catch {
    log(`translationDict: Data dir missing for group ${groupNumber}, skipping`);
    return null;
  }

  const files = {};
  let hasAnyFile = false;
  for (const lang of availabeLanguages) {
    files[lang] = {};
    for (const filename of TARGET_FILES) {
      const key = filename.replace('.txt', ''); // 'param' or 'paramdict'
      files[lang][key] = await readDataFile(groupNumber, lang, filename);
      if (files[lang][key]) hasAnyFile = true;
    }
  }

  if (!hasAnyFile) {
    log(`translationDict: No data files found for group ${groupNumber}`);
    return null;
  }

  return { groupNumber, files };
}

module.exports = { discoverGroups, readDataFile, scanGroup };
