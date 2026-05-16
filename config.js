const path = require('path');

// Resolve once so `path.join(undefined, …)` can never throw at module load.
const ROOT_DIR = process.env.ROOT_DIR || '/mnt/eform';

module.exports = {
  rootDir: ROOT_DIR,
  dataDir: process.env.DATA_DIR || '/mnt/eform/datatest',
  changesDir: process.env.CHANGES_DIR || path.join(ROOT_DIR, 'data/data/changes'),
  localesDir: process.env.LOCALES_DIR || '/mnt/eform/languages' || path.join(__dirname, 'locales'),
  photoPath: path.join(ROOT_DIR, 'data'),
  slopePhotoPath: path.join(ROOT_DIR, 'data/WYMIAROWANIE_SLOPOW/TYP'),
  usersPath: path.join(ROOT_DIR, 'data/data'),
  outputData: process.env.OUTPUT_DIR || '/mnt/eform/datatest/out',
  shortJsonDir: path.join(ROOT_DIR, 'json_short'),
  availabeLanguages: ['pl', 'en', 'de', 'fr', 'nl'],
  defaultLanguage: 'en',
  logsDir: path.join(process.env.LOG_PATH || '/mnt/eform/log/datadev'),
  ftpImportPath: process.env.FTP_IMPORT_PATH || '/orders-in',
  // Local mirror of incoming FTP orders. Each file pulled from FTP is first
  // saved here as a backup before being parsed/imported. After processing,
  // it is moved to the `processed/` or `error/` sub-folder.
  localImportDir: process.env.LOCAL_IMPORT_DIR
    || path.join(ROOT_DIR, 'data', 'orders-in')
};
