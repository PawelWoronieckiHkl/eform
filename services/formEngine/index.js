/**
 * Public API for the server-side form engine.
 *
 *   calculatePrices({ groupNumber, version, lang, values, displayValues, userIdent })
 *     → Boots a fresh JSDOM, replays the same `generateForm` pipeline the
 *       browser runs, then returns the final values, displayValues, totals
 *       and shortJson so the caller can persist real prices.
 *
 *   recalculatePosition(positionId)
 *     → Loads an existing `order_item`, recomputes prices using the engine
 *       and writes the result back via db/positions.updatePosition. Used as
 *       a maintenance hook to refresh stale prices on a single row.
 *
 * The engine is intentionally one-shot per call: each invocation builds and
 * disposes its own JSDOM instance. JSDOM is heavy (~50ms-200ms for a cold
 * boot) but this avoids the very real risk of state bleed between groups —
 * `form.js` writes copiously to `window.*` globals.
 */

'use strict';

const { bootEngine } = require('./jsdomEnv');

/**
 * Drive `updateProcedure` for every key in `values` so that every per-group
 * calculation script has a chance to run. We process keys sequentially to
 * respect the calculationQueue inside form.js.
 */
async function replayValues({ window, values }) {
  const engine = window.__engine;
  const params = window.params || [];
  const inputs = window.formInputs || {};
  const displayValues = window.formDisplayValues;
  const allOptionsByParameter = window.allOptionsByParameter || {};
  const groupNumber = window.tempGroupNumber;
  const calculatedParams = {};
  const filters = {};
  const options = {};

  // Build a quick lookup of param names this form actually knows about, so we
  // skip values that belong to other versions of the group (e.g. legacy keys
  // like `PK`/`ZY` inherited from older orders). Without this filter
  // `updateProcedure` blows up reading `FORMAT` from an undefined param entry.
  const knownParamNames = new Set();
  for (const p of params) {
    if (p && typeof p.name === 'string') knownParamNames.add(p.name);
  }
  for (const k of Object.keys(inputs || {})) knownParamNames.add(k);

  // Pre-seed formValues + DOM inputs with every incoming value BEFORE we
  // start firing updateProcedure. Otherwise the first updateProcedure call
  // runs `updateFieldStates` → `clearDisabledValues` and wipes any param
  // whose ENABLE formula references a sibling that isn't in formValues yet
  // (e.g. SZEROKOSC's ENABLE depends on SLOPE_TYPE). Mirroring the browser
  // input handler's `values[name] = value` for the whole batch up-front
  // makes the formula context coherent on the very first evaluation.
  //
  // We also default every known param name to '' so the formula parser
  // doesn't error out on unset variables (hot-formula-parser returns
  // {error:'#NAME?'} for any unknown identifier and the wrapper turns that
  // into `false`, which then disables the field and wipes its value).
  for (const p of params) {
    const n = p && p.NAME;
    if (!n) continue;
    if (window.formValues[n] === undefined) window.formValues[n] = '';
  }
  for (const [name, value] of Object.entries(values || {})) {
    if (name === 'uid') continue;
    if (knownParamNames.size > 0 && !knownParamNames.has(name)) continue;
    window.formValues[name] = value;
    const input = inputs[name];
    if (input && 'value' in input) {
      try { input.value = value == null ? '' : value; } catch (_e) { /* read-only */ }
    }
  }

  for (const [name, value] of Object.entries(values || {})) {
    if (name === 'uid') continue;
    if (knownParamNames.size > 0 && !knownParamNames.has(name)) {
      if (process.env.FORM_ENGINE_DEBUG) {
        process.stderr.write(`[formEngine] skip unknown field ${name}\n`);
      }
      continue;
    }
    const input = inputs[name];
    const tagName = input && input.tagName ? input.tagName : 'INPUT';

    // Mirror what the browser input/change handlers in form.js do BEFORE
    // calling updateProcedure: write the raw value into formValues and onto
    // the DOM input. Without this the formula parser sees SZEROKOSC/WYSOKOSC
    // (and friends) as undefined and every price formula evaluates to false.
    window.formValues[name] = value;
    if (input && 'value' in input) {
      try { input.value = value == null ? '' : value; } catch (_e) { /* read-only */ }
    }

    try {
      await engine.updateProcedure({
        params,
        inputs,
        values: window.formValues,
        displayValues,
        allOptionsByParameter,
        options,
        name,
        value,
        groupNumber,
        tagName,
        filters,
        calculatedParams,
        flags: {
          updateInputs: true,
          validate: true,
          buildValues: true,
          updateStates: true,
          percent: true
        }
      });
    } catch (err) {
      // Don't kill the whole calculation — log and continue so we still get
      // a (possibly partial) total back to the caller.
      process.stderr.write(`[formEngine] updateProcedure failed for ${name}: ${err.message}\n`);
    }
  }
}

function displayValuesToObject(displayValues) {
  const out = {};
  if (!displayValues) return out;
  if (typeof displayValues.forEach === 'function') {
    displayValues.forEach((v, k) => { out[k] = v; });
  } else {
    Object.assign(out, displayValues);
  }
  return out;
}

/**
 * Convert an in-memory displayValues object (`{KEY: {param_description,...}}`)
 * into the wire format that the UI sends and that the templates expect:
 *
 *   JSON.stringify([[key, value], [key, value], ...])
 *
 * Mirrors `JSON.stringify(Array.from(formDisplayValues.entries()))` from
 * `public/scripts/main.js`. Used by the importer so persisted rows match the
 * exact shape produced by the browser flow.
 */
function displayValuesToWireFormat(displayValues) {
  if (!displayValues) return JSON.stringify([]);
  let entries;
  // Order matters: Arrays also expose `.entries()` but it yields `[index,value]`
  // pairs which would silently corrupt the wire format. Handle them first.
  if (Array.isArray(displayValues)) {
    entries = displayValues;
  } else if (displayValues instanceof Map
    || (typeof displayValues.entries === 'function' && typeof displayValues.forEach === 'function' && typeof displayValues.size === 'number')) {
    entries = Array.from(displayValues.entries());
  } else {
    entries = Object.entries(displayValues);
  }
  return JSON.stringify(entries);
}

/**
 * Build a synthetic displayValues entry for a primitive raw value. Used when
 * the engine could not run and we have to persist *something* that follows the
 * Map-entries contract. The shape mirrors `buildValuesToDisplay` in
 * `public/scripts/formTools/updateFieldsAndValues.js`.
 */
function stubDisplayEntries(values) {
  const out = [];
  for (const [k, v] of Object.entries(values || {})) {
    if (k === 'uid' || k.endsWith('___DICT')) continue;
    out.push([k, {
      param_description: k,
      sub: false,
      option_value: v == null ? '' : String(v),
      option_description: '',
      locked: false,
      row: '1'
    }]);
  }
  return out;
}

/**
 * Core entry: run the engine once and return prices + final state.
 *
 * @param {object} opts
 * @param {string} opts.groupNumber       Asortment group (= item.product).
 * @param {string|number} opts.version    Form version (from prod.txt).
 * @param {string} opts.lang              Language code.
 * @param {object} opts.values            Canonical {paramName: value} map.
 * @param {object} [opts.displayValues]   Pre-existing display values (for edit).
 * @param {string} [opts.uid]             Override UID; otherwise synthetic.
 * @returns {Promise<{values, displayValues, total, shortJson}>}
 */
async function calculatePrices(opts) {
  const { groupNumber, version, lang, values = {}, displayValues = null, uid } = opts || {};
  if (!groupNumber || !version) {
    throw new Error('formEngine.calculatePrices: groupNumber and version are required');
  }

  const env = await bootEngine({ lang: lang || 'pl', uid });

  try {
    const initialDisplayValues = displayValues
      ? new env.window.Map(Object.entries(displayValues))
      : new env.window.Map();

    await env.window.__engine.generateForm(
      version,
      groupNumber,
      Object.assign({}, values),
      initialDisplayValues,
      true,
      lang || 'pl',
      false
    );

    await replayValues({ window: env.window, values });

    // Drain the calculation queue.
    let safety = 50;
    while (env.window.calculationQueue && env.window.calculationQueue.length > 0 && safety-- > 0) {
      await new Promise((r) => setTimeout(r, 20));
    }

    const finalDisplayValues = env.window.formDisplayValues;
    const total = env.window.__engine.getTotal(finalDisplayValues);

    return {
      values: Object.assign({}, env.window.formValues),
      displayValues: displayValuesToObject(finalDisplayValues),
      total: {
        total: total.total || 0,
        total_hidden: total.total_hidden || 0,
        total_sub: total.total_sub || 0
      },
      shortJson: Object.assign({}, env.window.shortJson || {})
    };
  } finally {
    env.dispose();
  }
}

/**
 * Recalculate a single existing position by id.
 *
 * - Reads the row via db/positions.getPosition.
 * - Decodes its stored canonical values (json_parameters).
 * - Reuses the json_parameters_desc as the seed displayValues map.
 * - Runs calculatePrices.
 * - Persists the new prices via db/positions.updatePosition.
 *
 * The version is read from the stored `parameters_short.VERSION` if present
 * (every shortJson the importer/UI builds includes it). If absent, the latest
 * version on disk is used (callers should pass the version explicitly via the
 * second argument to bypass detection).
 *
 * @param {number} positionId
 * @param {object} [overrides] - { version, lang } to force values.
 */
async function recalculatePosition(positionId, overrides = {}) {
  // Lazy require — keeps the module free of DB side-effects at load time so
  // tests can run without a live MySQL pool.
  const { getPosition, updatePosition } = require('../../db/positions');

  const row = await getPosition(positionId);
  if (!row) throw new Error(`recalculatePosition: position ${positionId} not found`);

  const groupNumber = row.asortment_group_number || row.asortment_group || row.product || row.group_number;
  if (!groupNumber) {
    throw new Error(`recalculatePosition: cannot determine group for position ${positionId}`);
  }

  const values = safeJsonParse(row.json_parameters, {});
  const displayValues = safeJsonParse(row.json_parameters_desc, {});
  const shortJson = safeJsonParse(row.parameters_short, {});

  const version = overrides.version || shortJson.VERSION || shortJson.version;
  if (!version) {
    throw new Error(`recalculatePosition: no version available for position ${positionId}`);
  }
  const lang = overrides.lang || row.lang || 'pl';

  const result = await calculatePrices({
    groupNumber,
    version,
    lang,
    values,
    displayValues
  });

  await updatePosition(
    {
      id: positionId,
      commission: row.commision,
      comment: row.comment,
      jsonValues: result.values,
      jsonValuesToDisplay: displayValuesToWireFormat(result.displayValues),
      jsonShort: result.shortJson
    },
    {
      total: result.total.total,
      total_hidden: result.total.total_hidden,
      total_sub: result.total.total_sub
    }
  );

  return result;
}

function safeJsonParse(raw, fallback) {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (_e) { return fallback; }
}

module.exports = {
  calculatePrices,
  recalculatePosition,
  // Lower-level helpers exposed for tests / advanced callers.
  bootEngine,
  displayValuesToWireFormat,
  stubDisplayEntries
};
