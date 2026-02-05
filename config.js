const path = require('path');

module.exports = {
  rootDir: process.env.ROOT_DIR || '/mnt/eform',
  dataDir: process.env.DATA_DIR || '/mnt/eform/datatest',
  changesDir: process.env.CHANGES_DIR || '/mnt/eform/data/data/changes',
  localesDir: process.env.LOCALES_DIR || '/mnt/eform/languages' || path.join(__dirname, 'locales'),
  photoPath: path.join(process.env.ROOT_DIR, 'data') || '/mnt/eform/data/',
  slopePhotoPath: path.join(process.env.ROOT_DIR, 'data/WYMIAROWANIE_SLOPOW/TYP') || '/mnt/eform/data/WYMIAROWANIE_SLOPOW/TYP',
  usersPath:path.join(process.env.ROOT_DIR, 'data/data') || '/mnt/eform/data/data',
  outputData: process.env.OUTPUT_DIR || '/mnt/eform/datatest/out',
  shortJsonDir: path.join(process.env.ROOT_DIR, 'json_short') || '/mnt/eform/json_short',
  availabeLanguages: ['pl', 'en', 'de', 'fr', 'nl'],
  defaultLanguage: 'en',
};
