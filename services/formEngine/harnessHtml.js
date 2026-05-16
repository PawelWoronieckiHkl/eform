/**
 * Minimal HTML skeleton expected by `form.js` and the `formTools/*` modules.
 *
 * The browser code is intimately coupled with these DOM nodes — building the
 * skeleton up-front is far cheaper than refactoring all `document.getElementById`
 * call sites out of the frontend (which would mean maintaining two parallel
 * implementations of the entire pricing engine).
 *
 * Only nodes that the runtime actually reads/writes are present. Everything
 * UI-only (toasts, dialogs, attachment upload widgets) is given an inert
 * placeholder so JavaScript references don't crash.
 */

'use strict';

function buildHarnessHtml({ lang = 'pl', orderId = 0 } = {}) {
  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <title>formEngine harness</title>
  </head>
  <body>
    <input type="hidden" id="env-info" value="" />
    <div id="node-div"></div>
    <div id="config-number-info"></div>
    <div id="user-info"></div>
    <div id="logo" class="logo"></div>
    <span id="orderId">${orderId}</span>
    <span id="positionId"></span>
    <span id="version-space"></span>
    <input type="text" id="commission-input" />
    <div id="dynamic-form"></div>
    <div id="buttons-space"></div>
    <button id="show-button" type="button"></button>
    <button id="reset-button" type="button"></button>
    <div id="attachment-container"></div>
    <span class="attachment-label"></span>
    <div id="last-config-info" style="display:none"></div>
    <div class="order-reminder" style="display:none"></div>
    <div class="asortment-inputs"></div>
    <select id="department-select"></select>
    <select id="asortment-group-select"></select>
    <div class="filter-controls"></div>
    <span id="file-error-message" class="d-none"></span>

    <dialog id="image-preview-dialog">
      <img id="preview-image" alt="" />
    </dialog>
    <dialog id="color-dialog">
      <button id="dialog-close" type="button"></button>
    </dialog>
    <dialog id="confirm-dialog">
      <button id="close-dialog-btn" type="button"></button>
      <button id="dialog-confirm" type="button"></button>
    </dialog>
  </body>
</html>`;
}

module.exports = { buildHarnessHtml };
