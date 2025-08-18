const i18n = require('i18n');
const { localesDir, availabeLanguages, defaultLanguage } = require('../../config');

function confLang(lang) {
  i18n.configure({
    locales: availabeLanguages,
    directory: localesDir,
    defaultLocale: lang,
    cookie: 'lang',
    queryParameter: 'lang',
    objectNotation: true,
    autoReload: true

  });
  return i18n;
}


module.exports = confLang;