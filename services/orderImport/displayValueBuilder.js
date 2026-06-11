'use strict';

const SUPPORTED_LANGS = new Set(['pl', 'en', 'de', 'fr', 'nl']);

function getDefaultTranslationRepo() {
  return require('../translationDict/dbRepository');
}

function normalizeLang(lang) {
  const normalized = String(lang || 'pl').toLowerCase();
  return SUPPORTED_LANGS.has(normalized) ? normalized : 'pl';
}

function normalizeDisplayValues(displayValues) {
  const result = {};
  if (!displayValues) return result;

  if (Array.isArray(displayValues)) {
    for (const entry of displayValues) {
      if (Array.isArray(entry) && entry.length >= 2) {
        result[entry[0]] = entry[1];
      }
    }
    return result;
  }

  if (displayValues instanceof Map) {
    for (const [key, value] of displayValues.entries()) {
      result[key] = value;
    }
    return result;
  }

  if (typeof displayValues === 'object') {
    return { ...displayValues };
  }

  return result;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function hasImportValue(importValues, paramName) {
  if (!importValues || !Object.prototype.hasOwnProperty.call(importValues, paramName)) {
    return false;
  }
  const value = importValues[paramName];
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value).length > 0;
  }
  return true;
}

function shouldSkipParam(paramName) {
  if (!paramName || paramName === 'uid') return true;
  if (paramName.startsWith('_')) return true;
  if (paramName.endsWith('___DICT')) return true;
  if (paramName.endsWith('___TITLE')) return true;
  if (paramName.endsWith('___VISIBLE')) return true;
  if (paramName.endsWith('___DESCRIPTION')) return true;
  if (paramName.endsWith('_ALIAS')) return true;
  return false;
}

function buildParamMetaMap(formMeta) {
  const result = {};
  const params = formMeta && Array.isArray(formMeta.params) ? formMeta.params : [];

  for (const param of params) {
    if (param && param.NAME) {
      result[param.NAME] = param;
    }
  }

  return result;
}

function hasExistingOwnValue(entry, key) {
  return entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, key);
}

function boolFromFormValue(value) {
  return value === true || value === 'true';
}

function resolveLocked(paramName, existingEntry, formMeta) {
  if (hasExistingOwnValue(existingEntry, 'locked')) {
    return existingEntry.locked === true;
  }

  const lockedParams = formMeta && Array.isArray(formMeta.lockedParams)
    ? formMeta.lockedParams
    : [];

  if (lockedParams.includes(paramName)) return true;
  if (paramName.startsWith('SUB___') && lockedParams.includes(paramName.slice(6))) return true;
  return false;
}

function resolveSub(paramName, existingEntry, formMeta) {
  if (hasExistingOwnValue(existingEntry, 'sub')) {
    return existingEntry.sub === true;
  }

  const subParams = formMeta && Array.isArray(formMeta.subParams)
    ? formMeta.subParams
    : [];

  return paramName.startsWith('SUB___') || subParams.includes(paramName);
}

function resolveRow(paramName, values, existingEntry, paramMeta, locked, importValues) {
  // Params explicitly provided in the import JSON must stay visible in row1/row2
  // even when the engine marks them disabled (singlePass often sets ___VISIBLE=false).
  if (hasImportValue(importValues, paramName) && !locked) {
    if (paramMeta && paramMeta.FORMROW === '0') return '0';
    return String((paramMeta && paramMeta.LISTROW) || '1');
  }

  if (hasValue(existingEntry && existingEntry.row)) {
    return String(existingEntry.row);
  }

  const visibleKey = `${paramName}___VISIBLE`;
  if (!locked && values && values[visibleKey] === false) return '0';
  if (paramMeta && paramMeta.FORMROW === '0') return '0';
  return String((paramMeta && paramMeta.LISTROW) || '1');
}

function stringifyValue(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function buildObjectDisplayValue(value) {
  const valueParts = [];
  const descParts = [];

  for (const [fieldName, fieldValue] of Object.entries(value || {})) {
    if (fieldName === 'TYP') continue;
    if (!hasValue(fieldValue)) continue;

    valueParts.push(String(fieldValue));
    descParts.push(`${String(fieldName).split(' ')[0]}:${fieldValue}`);
  }

  return {
    option_value: valueParts.join(' / '),
    option_description: descParts.join(' / ')
  };
}

function orderedParamNames(values, shortJson, importValues) {
  const seen = new Set();
  const result = [];

  const add = (name) => {
    if (shouldSkipParam(name) || seen.has(name)) return;
    seen.add(name);
    result.push(name);
  };

  if (shortJson && Array.isArray(shortJson.order)) {
    shortJson.order.forEach(add);
  }

  Object.keys(importValues || {}).forEach(add);
  Object.keys(values || {}).forEach(add);
  return result;
}

function mergeEntry(baseEntry, existingEntry, paramName, importValues) {
  if (!existingEntry || typeof existingEntry !== 'object') {
    return baseEntry;
  }

  const imported = hasImportValue(importValues, paramName);
  const merged = imported
    ? { ...existingEntry, ...baseEntry }
    : { ...baseEntry, ...existingEntry };

  if (!hasValue(existingEntry.param_description)) {
    merged.param_description = baseEntry.param_description;
  }
  if (imported || (!hasValue(existingEntry.option_value) && hasValue(baseEntry.option_value))) {
    merged.option_value = baseEntry.option_value;
  }
  if (!hasValue(existingEntry.option_description) && hasValue(baseEntry.option_description)) {
    merged.option_description = baseEntry.option_description;
  }
  if (imported || !hasValue(existingEntry.row)) {
    merged.row = baseEntry.row;
  }
  if (imported) {
    if (hasExistingOwnValue(existingEntry, 'locked')) merged.locked = existingEntry.locked;
    if (hasExistingOwnValue(existingEntry, 'sub')) merged.sub = existingEntry.sub;
    if (hasExistingOwnValue(existingEntry, 'listsum')) merged.listsum = existingEntry.listsum;
  }

  return merged;
}

async function getProductGroupName(groupNumber, lang) {
  if (!groupNumber) return '';

  const safeLang = normalizeLang(lang);
  const column = `name_${safeLang}`;
  const { connetToDb } = require('../../db/core');
  const conn = await connetToDb();
  try {
    const [rows] = await conn.query(
      `SELECT ${column} AS name, name_pl FROM product_group WHERE group_number = ? LIMIT 1`,
      [groupNumber]
    );
    if (!rows || !rows[0]) return '';
    return rows[0].name || rows[0].name_pl || '';
  } finally {
    await conn.end();
  }
}

async function buildDisplayValuesFromDictionary({
  groupNumber,
  lang,
  values,
  displayValues = null,
  shortJson = null,
  formMeta = null,
  importValues = null,
  repo = null
}) {
  const safeLang = normalizeLang(lang);
  const safeValues = values || {};
  const safeImportValues = importValues || null;
  const existing = normalizeDisplayValues(displayValues);
  const paramMetaMap = buildParamMetaMap(formMeta);
  const translationsRepo = repo || getDefaultTranslationRepo();
  const dict = await translationsRepo.getGroupTranslations(groupNumber, safeLang);
  const paramsDict = (dict && dict.params) || {};
  const paramdict = (dict && dict.paramdict) || {};

  const output = {};
  const names = orderedParamNames(safeValues, shortJson, safeImportValues);

  for (const paramName of names) {
    const rawValue = hasImportValue(safeImportValues, paramName)
      ? safeImportValues[paramName]
      : safeValues[paramName];
    const titleKey = `${paramName}___TITLE`;
    const aliasKey = `${paramName}_ALIAS`;
    const paramMeta = paramMetaMap[paramName] || null;
    const existingEntry = existing[paramName];
    const locked = resolveLocked(paramName, existingEntry, formMeta);
    const sub = resolveSub(paramName, existingEntry, formMeta);
    const row = resolveRow(paramName, safeValues, existingEntry, paramMeta, locked, safeImportValues);
    const paramDescription = paramsDict[paramName] || safeValues[titleKey] || paramName;

    let optionValue = stringifyValue(hasValue(safeValues[aliasKey]) ? safeValues[aliasKey] : rawValue);
    let optionDescription = '';

    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      const objectDisplay = buildObjectDisplayValue(rawValue);
      optionValue = objectDisplay.option_value;
      optionDescription = objectDisplay.option_description;
    } else {
      const valueMap = paramdict[paramName] || {};
      const rawValueKey = stringifyValue(rawValue);
      optionDescription = valueMap[rawValueKey] || '';

      if (rawValueKey === '<NONE>' && !optionDescription) {
        optionValue = '';
      }
    }

    const baseEntry = {
      param_description: stringifyValue(paramDescription),
      sub,
      option_value: optionValue,
      option_description: stringifyValue(optionDescription),
      locked,
      row
    };

    if (paramMeta && boolFromFormValue(paramMeta.LISTSUM)) {
      baseEntry.listsum = true;
    }

    output[paramName] = mergeEntry(baseEntry, existingEntry, paramName, safeImportValues);
  }

  for (const [key, value] of Object.entries(existing)) {
    if (!output[key]) {
      output[key] = value;
    }
  }

  return output;
}

module.exports = {
  buildDisplayValuesFromDictionary,
  getProductGroupName,
  _internals: {
    normalizeDisplayValues,
    orderedParamNames,
    shouldSkipParam,
    buildParamMetaMap
  }
};
