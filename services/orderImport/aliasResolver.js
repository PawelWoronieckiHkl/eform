/**
 * Alias Resolver for Order Import
 *
 * Resolves parameter values against the `client_aliases` table:
 *
 * For each parameter value in an item:
 *   1. If the value exists as `value_col` in client_aliases for this group → keep as-is
 *   2. If the value exists as `alias` → replace with the corresponding `value_col`,
 *      and populate <PARAM>_ALIAS and <PARAM>_ALIAS_DESCRIPTION fields
 *   3. If not found anywhere → throw an error with details
 *
 * This runs BEFORE parameterTranslator (which handles language translation).
 */

const { connetToDb } = require('../../db/core');
const { log } = require('../../utils/logging');

/**
 * Load all client_aliases for a given group number into lookup maps.
 * @param {string} groupNumber
 * @returns {Promise<{valueSet: Set<string>, aliasToEntry: Map<string, {value_col, alias, description, parameter, collection}>}>}
 */
async function loadAliasesForGroup(groupNumber) {
  const conn = await connetToDb();
  try {
    const [rows] = await conn.query(
      'SELECT value_col, alias, description, parameter, collection FROM client_aliases WHERE group_number = ?',
      [groupNumber]
    );

    // Set of all known values (for quick "is this a valid value?" check)
    const valueSet = new Set();
    // Map: alias → entry (for reverse lookup when value is actually an alias)
    const aliasToEntry = new Map();
    // Map: parameter+value → true (for checking if value exists for specific parameter)
    const paramValueSet = new Set();

    for (const row of rows) {
      valueSet.add(row.value_col);
      paramValueSet.add(`${row.parameter}::${row.value_col}`);

      if (row.alias && row.alias !== row.value_col) {
        // Key by parameter+alias for precise matching
        const key = `${row.parameter}::${row.alias}`;
        aliasToEntry.set(key, row);
      }
    }

    return { valueSet, aliasToEntry, paramValueSet };
  } finally {
    await conn.end();
  }
}

/**
 * List of parameter name suffixes/patterns to skip during alias resolution.
 * These are metadata fields, not actual product parameters.
 */
const SKIP_SUFFIXES = [
  '_ALIAS', '_ALIAS_DESCRIPTION', '_DESCRIPTION',
  '___DICT', '___TITLE', '___VISIBLE', '___DESCRIPTION'
];

const SKIP_PARAMS = new Set([
  'ILOSC', 'ILOŚĆ', 'ilosc', 'uid', 'UWAGI', 'KOMENTARZ',
  'DLUGOSC', 'SZEROKOSC', 'WYSOKOSC', 'PROWIZJA'
]);

function shouldSkipParam(paramName) {
  if (!paramName) return true;
  if (paramName.startsWith('_')) return true;
  if (SKIP_PARAMS.has(paramName)) return true;
  for (const suffix of SKIP_SUFFIXES) {
    if (paramName.endsWith(suffix)) return true;
  }
  // Skip numeric-only values (dimensions, quantities)
  return false;
}

function isNumericValue(value) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'object') return true;
  // Only skip pure numbers (integers/decimals), not codes with hyphens like "10100-50"
  return /^\d+([.,]\d+)?$/.test(String(value));
}

/**
 * Resolve aliases in item parameters for a single item.
 *
 * @param {object} parameters - The item's parameters object { KEY: value }
 * @param {string} groupNumber - The product group number
 * @returns {Promise<{resolved: object, errors: string[]}>}
 *   resolved: new parameters object with aliases resolved
 *   errors: array of error messages for values not found anywhere
 */
async function resolveItemAliases(parameters, groupNumber) {
  if (!parameters || typeof parameters !== 'object') {
    return { resolved: { ...parameters }, errors: [] };
  }

  const { valueSet, aliasToEntry, paramValueSet } = await loadAliasesForGroup(groupNumber);

  // If no aliases configured for this group, pass through unchanged
  if (valueSet.size === 0) {
    return { resolved: { ...parameters }, errors: [] };
  }

  const resolved = {};
  const errors = [];

  for (const [paramName, rawValue] of Object.entries(parameters)) {
    // Copy as-is first
    resolved[paramName] = rawValue;

    // Skip metadata/dimension/numeric params
    if (shouldSkipParam(paramName) || isNumericValue(rawValue)) continue;

    const strValue = String(rawValue);
    if (!strValue || strValue === '<NONE>' || strValue === '<NULL>') continue;

    // Check 1: Is this value a known VALUE for this parameter?
    if (paramValueSet.has(`${paramName}::${strValue}`)) {
      // Value is correct as-is, no alias resolution needed
      continue;
    }

    // Check 2: Is this value an ALIAS for this parameter?
    const aliasKey = `${paramName}::${strValue}`;
    const aliasEntry = aliasToEntry.get(aliasKey);

    if (aliasEntry) {
      // Found as alias → replace with the real value, store alias info
      resolved[paramName] = aliasEntry.value_col;
      resolved[`${paramName}_ALIAS`] = aliasEntry.alias;
      resolved[`${paramName}_ALIAS_DESCRIPTION`] = aliasEntry.description || '';
      continue;
    }

    // Check 3: Maybe it's a global value (exists in valueSet but not for this specific param)
    if (valueSet.has(strValue)) {
      // It's a known value in the system, just not mapped to this specific parameter
      // Keep as-is — it might be valid from a different context
      continue;
    }

    // Not found anywhere — report error but don't block the import
    errors.push(`Parametr "${paramName}": wartość "${strValue}" nie znaleziona ani jako VALUE ani jako ALIAS w grupie ${groupNumber}`);
  }

  return { resolved, errors };
}

/**
 * Resolve aliases for all items in a payload.
 *
 * @param {Array} items - Array of item objects with .parameters and .product/.asortment
 * @returns {Promise<{items: Array, errors: string[]}>}
 */
async function resolvePayloadAliases(items) {
  const allErrors = [];
  const resolvedItems = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const groupNumber = item.product || item.asortment || '';

    if (!groupNumber) {
      resolvedItems.push(item);
      continue;
    }

    const { resolved, errors } = await resolveItemAliases(item.parameters || {}, groupNumber);

    resolvedItems.push({ ...item, parameters: resolved });

    for (const err of errors) {
      allErrors.push(`Item[${i}] (group=${groupNumber}): ${err}`);
    }
  }

  return { items: resolvedItems, errors: allErrors };
}

module.exports = { resolveItemAliases, resolvePayloadAliases, loadAliasesForGroup };
