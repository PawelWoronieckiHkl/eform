/**
 * Bundles the real `public/scripts/form.js` (an ES module that imports the
 * whole `formTools/*` tree) into a single IIFE the JSDOM realm can execute as
 * a classic `<script>`. JSDOM 27 has no native ES-module support, so this
 * bundling step is non-negotiable.
 *
 * The bundle exposes its named exports on `window.__engineForm`:
 *   { generateForm, updateProcedure, getTotal, isSource,
 *     buildCommentSpace, recalculateLastChangedField }
 *
 * The bundled output is cached in-memory on first build (~150 ms one-off
 * cost) and re-used by every subsequent engine invocation in the same
 * Node process.
 */

'use strict';

const path = require('path');
const esbuild = require('esbuild');

const FORM_ENTRY = path.join(__dirname, '..', '..', 'public', 'scripts', 'form.js');

let cached = null;

function buildBundle() {
  const result = esbuild.buildSync({
    entryPoints: [FORM_ENTRY],
    bundle: true,
    format: 'iife',
    globalName: '__engineForm',
    write: false,
    platform: 'browser',
    target: 'es2020',
    logLevel: 'silent',
    // Inline string sources so the loader serves a self-contained payload.
    sourcemap: false
  });
  if (result.errors && result.errors.length) {
    const msg = result.errors.map((e) => e.text).join('\n');
    throw new Error(`formEngine bundler: esbuild failed:\n${msg}`);
  }
  return result.outputFiles[0].text;
}

function getBundle() {
  if (!cached) cached = buildBundle();
  return cached;
}

module.exports = { getBundle, _resetForTests: () => { cached = null; } };
