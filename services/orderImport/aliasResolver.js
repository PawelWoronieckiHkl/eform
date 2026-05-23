/**
 * Alias Resolver for Order Import
 *
 * 3-level validation for each parameter value:
 *   1. product_group — is the group_number valid?
 *   2. translation_dictionary (value_key) — is this a known canonical value for this param+group?
 *   3. client_aliases — is this an alias that maps to a real value?
 *
 * IMPORTANT: Only parameters that have entries in translation_dictionary (paramdict)
 * or client_aliases are validated. Parameters without any dictionary entries are
 * free-form (numeric, calculated, descriptions) and are skipped automatically.
 */

'use strict';

const { connetToDb } = require('../../db/core');
const { log } = require('../../utils/logging');

// ─── Data loaders ────────────────────────────────────────────────────────────

async function loadTranslationDictValues(groupNumber) {
  const conn = await connetToDb();
  try {
    const [rows] = await conn.query(
      `SELECT param_name, value_key FROM translation_dictionary
       WHERE group_number = ? AND source_type = 'paramdict'`,
      [groupNumber]
    );
    const paramValueSet = new Set();
    const dictParams = new Set();
    for (const r of rows) {
      paramValueSet.add(`${r.param_name}::${r.value_key}`);
      dictParams.add(r.param_name);
    }
    return { paramValueSet, dictParams };
  } finally {
    await conn.end();
  }
}

async function loadClientAliases(groupNumber) {
  const conn = await connetToDb();
  try {
    const [rows] = await conn.query(
      'SELECT value_col, alias, description, parameter FROM client_aliases WHERE group_number = ?',
      [groupNumber]
    );
    const aliasMap = new Map();
    const valueSet = new Set();
    const aliasParams = new Set();
    for (const r of rows) {
      valueSet.add(`${r.parameter}::${r.value_col}`);
      aliasParams.add(r.parameter);
      if (r.alias) {
        aliasMap.set(`${r.parameter}::${r.alias}`, r);
      }
    }
    return { aliasMap, valueSet, aliasParams };
  } finally {
    await conn.end();
  }
}

async function isValidProductGroup(groupNumber) {
  const conn = await connetToDb();
  try {
    const [rows] = await conn.query(
      'SELECT 1 FROM product_group WHERE group_number = ? LIMIT 1',
      [groupNumber]
    );
    return rows.length > 0;
  } finally {
    await conn.end();
  }
}

// ─── Skip logic ──────────────────────────────────────────────────────────────

const SKIP_SUFFIXES = ['_ALIAS', '_ALIAS_DESCRIPTION', '___DICT', '___TITLE', '___VISIBLE', '___DESCRIPTION'];

function shouldSkipParam(paramName) {
  if (!paramName) return true;
  if (paramName.startsWith('_')) return true;
  if (paramName === 'uid') return true;
  for (const suffix of SKIP_SUFFIXES) {
    if (paramName.endsWith(suffix)) return true;
  }
  return false;
}

// ─── Main resolver ───────────────────────────────────────────────────────────

async function resolveItemAliases(parameters, groupNumber) {
  if (!parameters || typeof parameters !== 'object') {
    return { resolved: {}, errors: [] };
  }

  const groupValid = await isValidProductGroup(groupNumber);
  if (!groupValid) {
    return {
      resolved: { ...parameters },
      errors: [`Grupa produktowa "${groupNumber}" nie istnieje w product_group`]
    };
  }

  const { paramValueSet, dictParams } = await loadTranslationDictValues(groupNumber);
  const { aliasMap, valueSet: clientAliasValues, aliasParams } = await loadClientAliases(groupNumber);

  // Only validate params that have dictionary/alias entries
  const validatableParams = new Set([...dictParams, ...aliasParams]);

  const resolved = {};
  const errors = [];

  for (const [paramName, rawValue] of Object.entries(parameters)) {
    // Don't overwrite _ALIAS/_ALIAS_DESCRIPTION already set by resolver
    if ((paramName.endsWith('_ALIAS') || paramName.endsWith('_ALIAS_DESCRIPTION')) && resolved[paramName] !== undefined) {
      continue;
    }

    // Copy as-is
    resolved[paramName] = rawValue;

    // Skip metadata params
    if (shouldSkipParam(paramName)) continue;

    // Skip params without dictionary entries — free-form/calculated
    if (!validatableParams.has(paramName)) continue;

    // Skip empty/null/numeric/object values
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;
    if (typeof rawValue === 'number' || typeof rawValue === 'boolean' || typeof rawValue === 'object') continue;

    const strValue = String(rawValue);
    if (strValue === '<NONE>' || strValue === '<NULL>') continue;

    // Handle multi-value fields (pipe-separated)
    const valueParts = strValue.includes('|') ? strValue.split('|') : [strValue];
    let allPartsValid = true;

    for (const part of valueParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (paramValueSet.has(`${paramName}::${trimmed}`)) continue;
      if (clientAliasValues.has(`${paramName}::${trimmed}`)) continue;

      const aliasEntry = aliasMap.get(`${paramName}::${trimmed}`);
      if (aliasEntry) continue;

      allPartsValid = false;
      errors.push(`Parametr "${paramName}": wartość "${trimmed}" nie znaleziona w translation_dictionary ani client_aliases (grupa ${groupNumber})`);
    }

    // Single-value alias resolution
    if (!strValue.includes('|') && allPartsValid) {
      const aliasEntry = aliasMap.get(`${paramName}::${strValue}`);
      if (aliasEntry) {
        resolved[paramName] = aliasEntry.value_col;
        resolved[`${paramName}_ALIAS`] = aliasEntry.alias;
        resolved[`${paramName}_ALIAS_DESCRIPTION`] = aliasEntry.description || '';
      }
    }
  }

  return { resolved, errors };
}

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

module.exports = { resolveItemAliases, resolvePayloadAliases };
