const path = require('path');

module.exports = {
  rootDir: process.env.ROOT_DIR || '/mnt/eform',
  dataDir: process.env.DATA_DIR || '/mnt/eform/datatest',
  localesDir: process.env.LOCALES_DIR || '/mnt/eform/languages' || path.join(__dirname, 'locales'),
  photoPath: path.join(process.env.ROOT_DIR, 'data') || '/mnt/eform/data/',
  usersPath:path.join(process.env.ROOT_DIR, 'data/data') || '/mnt/eform/data/data',
  outputData: process.env.OUTPUT_DIR || '/mnt/eform/datatest/out',
  availabeLanguages: ['pl', 'en', 'de', 'fr', 'nl'],
  defaultLanguage: 'en',
};
