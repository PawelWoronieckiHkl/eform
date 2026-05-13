'use strict';

const { log } = require('../../utils/logging');

/**
 * Translates a comment to Polish if it is not already Polish.
 * Uses franc-min for language detection and @vitalets/google-translate-api for translation.
 * Both packages are ESM-only, so loaded via dynamic import.
 *
 * @param {string} text
 * @returns {Promise<string>} - Translated text (or original if detection/translation fails)
 */
async function translateToPolish(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) return text;

    try {
        const { franc } = await import('franc-min');
        const detectedLang = franc(text, { minLength: 5 });

        // 'pol' is ISO 639-3 for Polish, 'und' means undetermined
        if (detectedLang === 'pol' || detectedLang === 'und') {
            return text;
        }

        const { translate } = await import('@vitalets/google-translate-api');
        const result = await translate(text, { to: 'pl' });
        return result.text || text;
    } catch (err) {
        log(`commentTranslator: translation failed (${err.message}), using original`);
        return text;
    }
}

module.exports = { translateToPolish };
