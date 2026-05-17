'use strict';

const path = require('path');

function isSafeOrderFileName(fileName) {
  if (typeof fileName !== 'string' || fileName.length === 0) return false;
  if (fileName.includes('\0')) return false;
  if (fileName.includes('/') || fileName.includes('\\')) return false;
  if (path.basename(fileName) !== fileName) return false;
  if (fileName === '.' || fileName === '..') return false;
  return fileName.toLowerCase().endsWith('.json');
}

function assertSafeOrderFileName(fileName) {
  if (!isSafeOrderFileName(fileName)) {
    throw new Error(`Unsafe order import file name: ${fileName}`);
  }
  return fileName;
}

module.exports = {
  isSafeOrderFileName,
  assertSafeOrderFileName
};
