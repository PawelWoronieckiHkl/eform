/**
 * Display Value Rebuilder
 *
 * After Playwright recalculates (which sets correct row/locked/listsum/prices
 * but may lose client aliases in option_value), this module patches
 * json_parameters_desc: for params that have _ALIAS in json_parameters,
 * it replaces option_value with the alias and option_description with alias_description.
 *
 * Does NOT rebuild from scratch — preserves row, locked, listsum, sub from Playwright.
 */

'use strict';

const { connetToDb } = require('../../db/core');
const { displayValuesToWireFormat } = require('../formEngine');
const { buildDisplayValuesFromDictionary } = require('./displayValueBuilder');
const { buildPersistedParameters, extractImportParams } = require('./orderImporter');
const { log } = require('../../utils/logging');

/**
 * Patch displayValues for all positions in an order — replace option_value
 * with alias where _ALIAS exists in json_parameters.
 * @param {number} orderId
 */
async function rebuildDisplayValuesForOrder(orderId) {
  const conn = await connetToDb();
  try {
    const [positions] = await conn.query(
      'SELECT id, asortment_group_number, lang, json_parameters, json_parameters_desc FROM order_item WHERE order_id = ?',
      [orderId]
    );

    if (!positions || positions.length === 0) return;

    for (const pos of positions) {
      let values = pos.json_parameters;
      if (typeof values === 'string') {
        try { values = JSON.parse(values); } catch { values = {}; }
      }
      if (!values || typeof values !== 'object') continue;

      // Parse existing displayValues (from Playwright — has correct row/locked/listsum)
      let displayRaw = pos.json_parameters_desc;
      if (typeof displayRaw === 'string') {
        try {
          displayRaw = JSON.parse(displayRaw);
          if (typeof displayRaw === 'string') displayRaw = JSON.parse(displayRaw);
        } catch { displayRaw = []; }
      }

      // Convert to Map-like structure for patching
      let entries;
      if (Array.isArray(displayRaw)) {
        entries = displayRaw; // [[key, value], ...]
      } else if (displayRaw && typeof displayRaw === 'object') {
        entries = Object.entries(displayRaw);
      } else {
        continue;
      }

      let changed = false;

      for (let i = 0; i < entries.length; i++) {
        const [paramName, entry] = entries[i];
        if (!paramName || !entry || typeof entry !== 'object') continue;

        const aliasKey = `${paramName}_ALIAS`;
        const aliasDescKey = `${paramName}_ALIAS_DESCRIPTION`;

        // If this param has an alias in values, patch option_value and option_description
        if (values[aliasKey] && values[aliasKey] !== '') {
          if (entry.option_value !== values[aliasKey]) {
            entry.option_value = values[aliasKey];
            changed = true;
          }
          if (values[aliasDescKey] && entry.option_description !== values[aliasDescKey]) {
            entry.option_description = values[aliasDescKey];
            changed = true;
          }
        }
      }

      if (changed) {
        const wire = JSON.stringify(entries);
        await conn.query(
          'UPDATE order_item SET json_parameters_desc = ? WHERE id = ?',
          [wire, pos.id]
        );
      }

      // Restore imported config params (e.g. WYSOKOSC/SZEROKOSC) when Playwright
      // recalc dropped them from displayValues but they remain in json_parameters.
      const importParams = extractImportParams(values);
      if (Object.keys(importParams).length > 0 && pos.asortment_group_number) {
        const displayObject = Object.fromEntries(entries);
        const rebuilt = await buildDisplayValuesFromDictionary({
          groupNumber: String(pos.asortment_group_number),
          lang: pos.lang || 'pl',
          values: buildPersistedParameters(extractImportParams(values), values),
          displayValues: displayObject,
          importValues: extractImportParams(values)
        });
        const rebuiltWire = displayValuesToWireFormat(rebuilt);
        const currentWire = displayValuesToWireFormat(displayObject);
        if (rebuiltWire !== currentWire) {
          await conn.query(
            'UPDATE order_item SET json_parameters_desc = ? WHERE id = ?',
            [rebuiltWire, pos.id]
          );
        }
      }
    }
  } finally {
    await conn.end();
  }
}

module.exports = { rebuildDisplayValuesForOrder };
