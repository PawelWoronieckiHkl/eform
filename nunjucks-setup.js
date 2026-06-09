const nunjucks = require('nunjucks');
const { i18n } = require('./server');
let env = null;
const { defaultLanguage } = require('./config');
const { log } = require('./utils/logging');
const { pdfValueParts } = require('./utils/pdfValueParts');
module.exports = {
  configure: (app) => {
    if (!env) {
      env = nunjucks.configure('templates', {
        autoescape: true,
        express: app,
        noCache: true
      });
      env.addGlobal('__', function () {

        const key = arguments[0];
        const ctx = this.getVariables();
        const lang = ctx && ctx.lang ? ctx.lang : defaultLanguage;
        log(lang)
        return i18n.__(key, { locale: lang });
      });

      // Filtr do mnożenia cen przez faktor (wizualny, tylko dla pracownika)
      env.addFilter('pdfValueParts', pdfValueParts);

      env.addFilter('applyFactor', function (value, factor) {
        if (!factor || factor === 1 || !value) return value;
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return (num * factor).toFixed(2);
      });

    }
    return env;
  },
  getEnv: () => {
    if (!env) throw new Error('Najpierw wywołaj configure() w server.js!');
    return env;
  }
};