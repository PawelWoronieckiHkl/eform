/**
 * Server-side runner for price calculation scripts.
 *
 * The price scripts (param-CENA-A.js, param-DOPLATA-B.js, etc.) define a
 * global function `f(jsonString)` that uses `evaluateFormula()` to compute
 * prices. In the browser, these are loaded via <script> tags. Here we
 * execute them directly in a VM sandbox with the formula handler available.
 *
 * This bypasses JSDOM entirely — no DOM needed, just pure JS execution.
 */

'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { dataDir } = require('../../config');
const { log } = require('../../utils/logging');

// Load and cache the formula parser + handler
let formulaHandlerCode = null;

function getFormulaHandler() {
  if (!formulaHandlerCode) {
    const parserPath = path.join(__dirname, '..', '..', 'node_modules', 'hot-formula-parser', 'dist', 'formula-parser.min.js');
    const formulaPath = path.join(__dirname, '..', '..', 'public', 'scripts', 'formula.js');
    const parserSrc = fs.readFileSync(parserPath, 'utf8');
    const formulaSrc = fs.readFileSync(formulaPath, 'utf8');
    formulaHandlerCode = { parserSrc, formulaSrc };
  }
  return formulaHandlerCode;
}

/**
 * Execute a price script file with given values.
 *
 * @param {string} scriptPath - Absolute path to the script file (e.g. param-CENA-A.js)
 * @param {object} values - The form values object
 * @returns {object|null} - Result from f() or null on error
 */
function executeScript(scriptPath, values) {
  try {
    const scriptSrc = fs.readFileSync(scriptPath, 'utf8');
    const { parserSrc, formulaSrc } = getFormulaHandler();

    // Create a sandbox with formula handler available as global `evaluateFormula`
    const sandbox = {
      console: { log: () => {}, error: () => {}, warn: () => {} },
      evaluateFormula: null,
      FormulaHandler: null,
      f: null,
      module: { exports: {} },
      exports: {},
      require: () => ({})
    };

    // Execute formula parser (defines HotFormulaParser on globalThis)
    const context = vm.createContext(sandbox);
    vm.runInContext(parserSrc, context, { filename: 'formula-parser.min.js' });

    // Execute formula.js (defines FormulaHandler using HotFormulaParser)
    vm.runInContext(formulaSrc, context, { filename: 'formula.js' });

    // Make evaluateFormula available globally (scripts call it directly)
    vm.runInContext(`
      if (typeof FormulaHandler !== 'undefined' && FormulaHandler.evaluateFormula) {
        evaluateFormula = function(expr, vals, mode) {
          return FormulaHandler.evaluateFormula(expr, vals, mode || 'formula');
        };
      }
    `, context);

    // Execute the price script (defines function f)
    vm.runInContext(scriptSrc, context, { filename: path.basename(scriptPath) });

    // Call f() with values
    if (typeof sandbox.f === 'function') {
      const jsonInput = JSON.stringify(values);
      const result = vm.runInContext(`f(${JSON.stringify(jsonInput)})`, context);
      return result;
    }

    return null;
  } catch (err) {
    if (process.env.FORM_ENGINE_DEBUG) {
      log(`scriptRunner: error executing ${path.basename(scriptPath)}: ${err.message}`);
    }
    return null;
  }
}

/**
 * Run all SCRIPT-type params for a group and update values/displayValues.
 *
 * @param {Array} params - The params array from the form definition
 * @param {object} values - Current form values (mutated in place)
 * @param {string} groupNumber - The group number
 * @param {string} version - The form version
 * @returns {object} - Updated values
 */
function runPriceScripts(params, values, groupNumber, version) {
  const scriptParams = params.filter(p =>
    p && p.NAME && p.SCRIPTS && p.SCRIPTS !== '<NULL>' && p.SOURCE && p.SOURCE !== '<NULL>'
  );

  for (const param of scriptParams) {
    // Script path: /data/<groupNumber>/data/<scriptFile>
    // SOURCE field contains the script filename pattern like "param-CENA-A.js"
    // But actually SOURCE == param.NAME for source-type params (slope etc.)
    // SCRIPTS field has the actual script reference
    const scriptFile = `param-${param.NAME}-${param.SCRIPTS}.js`;
    const scriptPath = path.join(dataDir, groupNumber, 'data', scriptFile);

    if (!fs.existsSync(scriptPath)) {
      // Try alternative naming patterns
      const altPath = path.join(dataDir, groupNumber, 'data', param.SCRIPTS);
      if (fs.existsSync(altPath)) {
        const result = executeScript(altPath, values);
        if (result) {
          for (const [key, val] of Object.entries(result)) {
            values[key] = val;
          }
        }
      }
      continue;
    }

    const result = executeScript(scriptPath, values);
    if (result) {
      for (const [key, val] of Object.entries(result)) {
        values[key] = val;
      }
    }
  }

  return values;
}

module.exports = { executeScript, runPriceScripts };
