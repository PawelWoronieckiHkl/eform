/**
 * Reverse-translates incoming item parameters back into the canonical Polish
 * keys/values stored in `order_item.json_parameters`.
 *
 * Why this exists:
 *   The export side (`OrderSender`) writes parameters using their canonical
 *   Polish names (KOLOR, MODEL, ILOSC, …). A foreign system might however
 *   send the same data using *translated* descriptions (the values written
 *   into `translation_dictionary.description` for that group/lang pair).
 *
 * Strategy:
 *   - If the incoming key already matches a known canonical `param_name`,
 *     keep it as-is (passthrough).
 *   - Otherwise, look up the description in the dictionary for the user's
 *     language and `source_type='param'`, and replace it with the matched
 *     canonical name.
 *   - For values, when the canonical key has a `paramdict` entry whose
 *     description matches the value, swap the value for `value_key`.
 *
 * The translator is defensive: if the dictionary returns nothing (e.g. before
 * the first sync) the function returns the original parameters unchanged.
 *
 * Pure data-in / data-out — easy to unit-test by injecting a `repo` stub.
 */

function getDefaultRepo() {
  return require('../translationDict/dbRepository');
}

/**
 * @param {object} parameters       Incoming { key: value } map.
 * @param {string} groupNumber      asortment_group_number (e.g. "SLOPE").
 * @param {string} lang             User language code ('pl', 'en', ...).
 * @param {object} [opts]
 * @param {object} [opts.repo]      Optional repository override (for tests).
 * @returns {Promise<object>}       Translated parameters map (canonical keys).
 */
async function translateParametersToCanonical(parameters, groupNumber, lang, opts = {}) {
  const repo = opts.repo || getDefaultRepo();

  if (!parameters || typeof parameters !== 'object') return {};
  if (!groupNumber || !lang || lang === 'pl') {
    // Polish is the canonical storage language → no translation needed.
    return { ...parameters };
  }

  let dict;
  try {
    dict = await repo.getGroupTranslations(groupNumber, lang);
  } catch (_err) {
    return { ...parameters };
  }
  if (!dict || !dict.params) return { ...parameters };

  // Build description→param_name reverse map (case-insensitive on description).
  const paramReverse = new Map();
  for (const [paramName, description] of Object.entries(dict.params || {})) {
    if (description) paramReverse.set(String(description).toLowerCase(), paramName);
  }

  // For paramdict, build paramName → (description→value_key) map.
  const dictReverseByParam = {};
  for (const [paramName, valueMap] of Object.entries(dict.paramdict || {})) {
    const reverse = new Map();
    for (const [valueKey, description] of Object.entries(valueMap || {})) {
      if (description) reverse.set(String(description).toLowerCase(), valueKey);
    }
    dictReverseByParam[paramName] = reverse;
  }

  // Set of canonical param names known for this group (for fast passthrough check).
  const canonicalKeys = new Set(Object.keys(dict.params || {}));

  const result = {};
  for (const [rawKey, rawValue] of Object.entries(parameters)) {
    let key = rawKey;

    if (!canonicalKeys.has(rawKey)) {
      const mapped = paramReverse.get(String(rawKey).toLowerCase());
      if (mapped) key = mapped;
    }

    let value = rawValue;
    if (typeof value === 'string') {
      const dictMap = dictReverseByParam[key];
      if (dictMap) {
        const mappedVal = dictMap.get(value.toLowerCase());
        if (mappedVal !== undefined) value = mappedVal;
      }
    }

    result[key] = value;
  }

  return result;
}

module.exports = { translateParametersToCanonical };
