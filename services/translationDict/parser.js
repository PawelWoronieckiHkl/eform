/**
 * Parser for param.txt and paramdict.txt TSV files.
 * Extracts translatable entries (NAME→DESCRIPTION, VALUE→DESCRIPTION).
 */

/**
 * Parse param.txt content into translation entries.
 * Each row maps param NAME → DESCRIPTION (the human-readable label).
 *
 * @param {string} content - Raw TSV file content
 * @returns {Array<{paramName: string, description: string}>}
 */
function parseParamFile(content) {
  const rows = content.split('\n');
  if (rows.length < 2) return [];

  const headers = rows[0].split('\t').map(h => h.replace(/\r/g, '').trim());
  const nameIdx = headers.indexOf('NAME');
  const descIdx = headers.indexOf('DESCRIPTION');

  if (nameIdx === -1 || descIdx === -1) return [];

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split('\t');
    const name = (cols[nameIdx] || '').replace(/\r/g, '').trim();
    const desc = (cols[descIdx] || '').replace(/\r/g, '').trim();

    if (!name || name === '<NULL>') continue;

    entries.push({
      paramName: name,
      description: desc && desc !== '<NULL>' ? desc : null
    });
  }

  return entries;
}

/**
 * Parse paramdict.txt content into translation entries.
 * Columns follow the pattern: {PARAM}_VALUE, {PARAM}_DESCRIPTION, {PARAM}_ENABLE, {PARAM}_PROC, {PARAM}_ATTRS
 * We extract {PARAM}_VALUE → {PARAM}_DESCRIPTION pairs.
 *
 * @param {string} content - Raw TSV file content
 * @returns {Array<{paramName: string, valueKey: string, description: string}>}
 */
function parseParamDictFile(content) {
  const rows = content.split('\n');
  if (rows.length < 2) return [];

  const headers = rows[0].split('\t').map(h => h.replace(/\r/g, '').trim());

  // Find all {PARAM}_VALUE columns and their corresponding {PARAM}_DESCRIPTION
  const paramColumns = [];
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].endsWith('_VALUE')) {
      const paramName = headers[i].replace('_VALUE', '');
      const descHeader = paramName + '_DESCRIPTION';
      const descIdx = headers.indexOf(descHeader);
      if (descIdx !== -1) {
        paramColumns.push({ paramName, valueIdx: i, descIdx });
      }
    }
  }

  const entries = [];
  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const cols = rows[rowIdx].split('\t');

    for (const { paramName, valueIdx, descIdx } of paramColumns) {
      const value = (cols[valueIdx] || '').replace(/\r/g, '').trim();
      const desc = (cols[descIdx] || '').replace(/\r/g, '').trim();

      if (!value || value === '<NULL>') continue;

      entries.push({
        paramName,
        valueKey: value,
        description: desc && desc !== '<NULL>' ? desc : null
      });
    }
  }

  return entries;
}

module.exports = { parseParamFile, parseParamDictFile };
