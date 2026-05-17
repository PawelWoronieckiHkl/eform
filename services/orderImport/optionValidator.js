/**
 * Validates parameter values against available options from the database.
 * 
 * Only checks parameters that have options (from translation_dictionary where source_type='paramdict').
 * Skips INPUT, CALCULATED, and other non-option-based parameters.
 */

const dbRepository = require('../translationDict/dbRepository');
const { log } = require('../../utils/logging');

/**
 * Get all available options for a group and language.
 * Returns a map: paramName => Set of valid values
 */
async function getAvailableOptionsForGroup(groupNumber, lang) {
  try {
    const translations = await dbRepository.getGroupTranslations(groupNumber, lang);
    const optionsMap = {};
    
    // Only include paramdict entries (these are select/dropdown options)
    for (const [paramName, valueDict] of Object.entries(translations.paramdict || {})) {
      optionsMap[paramName] = new Set(Object.keys(valueDict));
    }
    
    return optionsMap;
  } catch (err) {
    log(`optionValidator: failed to get translations for group ${groupNumber}: ${err.message}`);
    return {};
  }
}

/**
 * Validate that parameter values exist in the available options.
 * 
 * @param {string} groupNumber - Asortment group number
 * @param {object} parameters - Parameter key-value pairs to validate
 * @param {string} lang - Language code
 * @returns {Promise<{ok: boolean, errors: string[]}>}
 */
async function validateParameterValues(groupNumber, parameters, lang) {
  const errors = [];
  
  if (!parameters || typeof parameters !== 'object') {
    return { ok: true, errors: [] };
  }
  
  const availableOptions = await getAvailableOptionsForGroup(groupNumber, lang);
  
  for (const [paramName, value] of Object.entries(parameters)) {
    // Skip special internal parameters
    if (skipParameter(paramName)) {
      continue;
    }
    
    // Check if this parameter has options defined
    if (paramName in availableOptions) {
      const validValues = availableOptions[paramName];
      const paramValue = String(value).trim();
      
      // If value is empty, that's usually allowed (not selected)
      if (paramValue === '' || paramValue === null) {
        continue;
      }
      
      // Check if the value exists in available options
      if (!validValues.has(paramValue)) {
        errors.push(`Parameter "${paramName}": value "${value}" not found in available options (group ${groupNumber})`);
      }
    }
  }
  
  return {
    ok: errors.length === 0,
    errors
  };
}

/**
 * Check if a parameter should be skipped from validation.
 * Skip internal params, description fields, dict flags, etc.
 */
function skipParameter(paramName) {
  if (!paramName || typeof paramName !== 'string') return true;
  
  // Skip special fields
  if (paramName.startsWith('_')) return true;
  if (paramName.startsWith('uid')) return true;
  if (paramName.endsWith('___DICT')) return true;
  if (paramName.endsWith('___TITLE')) return true;
  if (paramName.endsWith('___VISIBLE')) return true;
  if (paramName.endsWith('___DESCRIPTION')) return true;
  if (paramName.endsWith('_ALIAS')) return true;
  if (paramName.endsWith('_ALIAS___DESCRIPTION')) return true;
  
  return false;
}

module.exports = {
  validateParameterValues,
  getAvailableOptionsForGroup,
  skipParameter
};
