const nunjucks = require('nunjucks');
const { i18n } = require('./server');
let env = null;
const {defaultLanguage } = require('./config');
module.exports = {
  configure: (app) => {
    if (!env) {
      env = nunjucks.configure('templates', {
        autoescape: true,
        express: app,
        noCache: true
      });
      env.addGlobal('__', function() {
        
        const key = arguments[0];
        const ctx = this.getVariables();
        const lang = ctx && ctx.lang ? ctx.lang : defaultLanguage ;
        console.log(lang)
        return i18n.__(key, { locale: lang });
      });
    }
    return env;
  },
  getEnv: () => {
    if (!env) throw new Error('Najpierw wywołaj configure() w server.js!');
    return env;
  }
};