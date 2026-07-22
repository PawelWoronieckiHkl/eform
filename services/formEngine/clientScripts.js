/**
 * Server-side (fs-based) port of the subset of `FormsManager`
 * (public/scripts/formTools/getAvailableForms.js) needed by
 * `DataLoader.selectPrices()` (public/scripts/formTools/dataLoader.js).
 *
 * In the browser, `window.formsManager` is populated by main.js/edit_form.js
 * BEFORE `generateForm()` runs: it logs in, calls `/user/owner/` to learn the
 * session's org/client identity, then reads `prod.txt`'s `PARAM_SCRIPTS`
 * column to build the per-client `{org, client, param, file}` mapping that
 * `selectPrices()` uses to resolve `param.SOURCE` for params whose `SCRIPTS`
 * field is the literal string `'true'` (i.e. "resolve my script per-client",
 * as opposed to the older per-option-value `SCRIPTS='A'/'Cmul1.2'` scheme
 * that's wired directly off a SOURCE param like KOLOR).
 *
 * The headless engine (jsdomEnv.js) has no login session, so
 * `window.formsManager` was a hard no-op stub whose `getClientScripts()`
 * always returned `null` — `selectPrices()` then left `param.SOURCE` at
 * `<NULL>` and the price script never loaded, silently persisting CENA (and
 * everything derived from it) as blank/0. This module re-derives the same
 * `[path, scripts]` pair directly from disk, given the order owner's
 * `orgIdent`/`userIdent` (see db/organization.ident / user.ident).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { dataDir } = require('../../config');

/** Mirrors FormsManager.prepareData(): "org/client/param=file,org/client/param=file,...". */
function parseScriptEntries(raw) {
  if (!raw) return [];
  const out = [];
  for (let entry of String(raw).split(',')) {
    entry = entry.trim();
    if (!entry) continue;
    const [data, file] = entry.split('=');
    if (!data || !file) continue;
    const [organization, client, param] = data.split('/');
    if (!organization || !client || !param) continue;
    out.push({ organization, client, param, file: file.trim() });
  }
  return out;
}

/** Parse a tab-separated alias/dict file: first line = headers, rest = rows -> [{header: cell}]. */
function parseTabFile(text) {
  const lines = String(text).split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split('\t').map((h) => h.replace(/\r/g, '').trim());
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '' ) continue;
    const cells = lines[i].split('\t');
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (cells[idx] || '').replace(/\r/g, '').trim(); });
    out.push(obj);
  }
  return out;
}

/** Mirrors FormsManager.convertDataToObjects() for the single-group prod.txt shape: one `KEY\tVALUE` per line. */
function parseProdTxt(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const idx = line.indexOf('\t');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    if (!key) continue;
    const value = line.slice(idx + 1).replace(/\r$/, '');
    out[key] = value;
  }
  return out;
}

const prodTxtCache = new Map();

function readProdTxt(groupNumber, lang) {
  const cacheKey = `${groupNumber}::${lang}`;
  if (prodTxtCache.has(cacheKey)) return prodTxtCache.get(cacheKey);
  const prodPath = path.join(dataDir, String(groupNumber), 'data', lang, 'prod.txt');
  let parsed = null;
  try {
    parsed = parseProdTxt(fs.readFileSync(prodPath, 'utf8'));
  } catch (_e) {
    parsed = null;
  }
  prodTxtCache.set(cacheKey, parsed);
  return parsed;
}

/**
 * @param {object} opts
 * @param {string} opts.groupNumber
 * @param {string} [opts.lang='pl']
 * @param {string} opts.orgIdent   Owner organization ident (organization.ident), e.g. "HKL".
 * @param {string} opts.userIdent  Owner user ident (user.ident), e.g. "TCN".
 * @returns {[string, Array<{organization,client,param,file}>]|null} Same shape as
 *   FormsManager.getClientScripts(): `[currentRootPath, matchingScriptEntries]`, or
 *   `null` when there's no PARAM_SCRIPTS data or no entry matches this client.
 */
function getClientScripts({ groupNumber, lang, orgIdent, userIdent }) {
  if (!groupNumber || !orgIdent || !userIdent) return null;
  const prod = readProdTxt(groupNumber, lang || 'pl');
  if (!prod || !prod.param_scripts) return null;

  const entries = parseScriptEntries(prod.param_scripts);
  const org = orgIdent.trim().toLowerCase();
  const client = userIdent.trim().toLowerCase();
  const matching = entries.filter((e) =>
    e.organization.trim().toLowerCase() === org && e.client.trim().toLowerCase() === client
  );
  if (!matching.length) return null;

  const currentRootPath = `/data/${groupNumber}/data/`;
  return [currentRootPath, matching];
}

/**
 * Server-side (fs-based) port of `FormsManager.loadDataPerClient()`
 * (public/scripts/formTools/getAvailableForms.js).
 *
 * In the browser this reads `prod.txt`'s `PARAMDICT_ALIASES` column to find,
 * per (org, client, param), an alias file (e.g. `paramdict-KOLOR-ZONNELUX.txt`)
 * living under `<group>/data/`, then parses it into
 * `{ paramName: [{ VALUE, ALIAS, DESCRIPTION }, ...] }`. `DataLoader.selectCollections()`
 * overlays these onto the option list so the per-client ALIAS + ALIAS_DESCRIPTION
 * flow into `values[<PARAM>_ALIAS]` / `values[<PARAM>_ALIAS___DESCRIPTION]`.
 *
 * This matters for pricing: per-client price scripts read
 * `<PARAM>_ALIAS___DESCRIPTION` first (see the `IF(<X>_ALIAS___DESCRIPTION<>"",
 * ZAWIERA(<X>_ALIAS___DESCRIPTION,"#N"), ZAWIERA(<X>___DESCRIPTION,"#N"))`
 * pattern in param-CENA-*.js). Without the client alias collection loaded, that
 * field stays absent and the price silently computes to 0 — the exact "cena 0"
 * import bug this module exists to prevent. The engine had `loadDataPerClient`
 * stubbed to `{}`, so no alias descriptions ever loaded server-side.
 *
 * @returns {object} `{ paramName: [{VALUE, ALIAS, DESCRIPTION}, ...] }` (empty when none match).
 */
function loadClientAliases({ groupNumber, lang, orgIdent, userIdent }) {
  if (!groupNumber || !orgIdent || !userIdent) return {};
  const prod = readProdTxt(groupNumber, lang || 'pl');
  if (!prod || !prod.paramdict_aliases) return {};

  const entries = parseScriptEntries(prod.paramdict_aliases);
  const org = orgIdent.trim().toLowerCase();
  const client = userIdent.trim().toLowerCase();
  const matching = entries.filter((e) =>
    e.organization.trim().toLowerCase() === org && e.client.trim().toLowerCase() === client
  );
  if (!matching.length) return {};

  const out = {};
  for (const entry of matching) {
    const filePath = path.join(dataDir, String(groupNumber), 'data', entry.file);
    try {
      // Later file for the same param wins — mirrors the browser's
      // `allObjects[foundAlias.param] = objects` assignment.
      out[entry.param] = parseTabFile(fs.readFileSync(filePath, 'utf8'));
    } catch (_e) {
      // Missing alias file — leave the param without a client collection,
      // exactly as the browser's try/catch does.
    }
  }
  return out;
}

module.exports = {
  getClientScripts,
  loadClientAliases,
  parseScriptEntries,
  parseProdTxt,
  parseTabFile
};
