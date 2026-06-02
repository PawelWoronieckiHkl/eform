/**
 * Imports a single, already-validated and user-resolved order payload into
 * the eform DB using the same primitives as the regular create-order flow:
 *
 *   - `db.insertSendAddress`  — destination address (send_address row)
 *   - `db.insertNewOrder`     — `order` row (status='active'; order_idx
 *                               assigned by the BEFORE-INSERT trigger)
 *   - `db.insertNewForm`      — one `order_item` row per position
 *   - `db.updateOrderPrice`   — recomputes total_* columns from items
 *
 * Each item's `parameters` is first reverse-translated to canonical Polish
 * keys/values via `parameterTranslator`, so an external system may send the
 * payload in its own language.
 *
 * Quantities default to the value of the canonical `ILOSC` parameter when
 * present, or to 1 — matching `pdfGenerator.readQty`.
 */

const orders = () => require('../../db/orders');
const positions = () => require('../../db/positions');
const itemBuilder = () => require('../itemBuilder');
const formEngine = () => require('../formEngine');
const { translateParametersToCanonical } = require('./parameterTranslator');
const { validateParameterValues } = require('./optionValidator');
const {
  buildDisplayValuesFromDictionary,
  getProductGroupName
} = require('./displayValueBuilder');
const log = (...args) => require('../../utils/logging').log(...args);

function readQuantity(parameters) {
  if (!parameters) return 1;
  const raw = parameters.ILOSC != null
    ? parameters.ILOSC
    : (parameters['ILOŚĆ'] != null ? parameters['ILOŚĆ'] : parameters.ilosc);
  const qty = Number(raw);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function buildShortJson(parameters) {
  // Mirrors the loose shape used by sendOrderService for parameters_short.
  return {
    data: { ...parameters },
    order: Object.keys(parameters).sort()
  };
}

function buildSendAddress(payload) {
  return {
    name: payload.name || payload.client || '',
    street: payload.address || '',
    city: payload.city || '',
    zip: payload.zip || '',
    country: payload.country || '',
    phone: payload.phone || '',
    email: payload.email || ''
  };
}

/**
 * @param {object} ctx
 * @param {object} ctx.payload   Output of `resolveOrderUser({ payload }).payload`.
 * @param {object} ctx.user      DB user row from `userResolver`.
 * @param {string} ctx.lang      Language code for parameter translation.
 * @param {object} [ctx.deps]    Dependency injection for tests.
 * @returns {Promise<{orderId: number, sendAddressId: number|null, itemIds: number[]}>}
 */
async function importResolvedOrder({ payload, user, lang, deps = {} }) {
  const ordersDb = deps.orders || orders();
  const positionsDb = deps.positions || positions();
  const builder = deps.itemBuilder || itemBuilder();
  const translator = deps.translator || translateParametersToCanonical;
  const optionValidator = deps.optionValidator || validateParameterValues;
  const engine = deps.formEngine || formEngine();
  const displayBuilder = deps.displayBuilder || buildDisplayValuesFromDictionary;
  const groupNameResolver = deps.groupNameResolver || getProductGroupName;
  const logger = deps.log || log;

  if (!payload || !user) {
    throw new Error('importResolvedOrder: payload and user are required');
  }

  // 0. Translate + validate every item BEFORE writing anything. This makes the
  // import fail fast (and prevents orphan order/send_address rows) when any
  // parameter value is not a valid option for its group. Validation runs on the
  // canonical params (post-translation) because the option dictionary is keyed
  // by canonical param_name/value_key. Translated params are reused below so we
  // don't translate twice.
  const preparedItems = [];
  for (const item of payload.items) {
    const groupNumber = item.product || item.asortment || '';
    const canonicalParams = await translator(item.parameters || {}, groupNumber, lang);

    const optionCheck = await optionValidator(groupNumber, canonicalParams, lang);
    if (!optionCheck.ok) {
      throw new Error(
        `Parameter validation failed for group ${groupNumber} (item ${item.posid != null ? item.posid : '?'}): ${optionCheck.errors.join('; ')}`
      );
    }

    preparedItems.push({ item, groupNumber, canonicalParams });
  }

  // 1. Send address — only if any field is non-empty.
  const addr = buildSendAddress(payload);
  let sendAddressId = null;
  if (addr.street || addr.city || addr.name) {
    sendAddressId = await ordersDb.insertSendAddress(addr);
    if (!sendAddressId) throw new Error('insertSendAddress failed');
  }

  // 2. Order header.
  const orderId = await ordersDb.insertNewOrder(
    payload.commission || '',     // commision
    null,                          // delivery_address_id (use send_address only)
    user.id,                       // user_id
    payload.comment || '',         // comment
    sendAddressId,                 // send_address_id
    0,                             // totalPrice (recomputed below)
    null,                          // employee_id
    null,                          // contact_info_id (mailId param name in fn)
    null                           // group_user_id
  );
  if (!orderId) throw new Error('insertNewOrder failed');

  // 3. Items.
  const itemIds = [];
  for (const { item, groupNumber, canonicalParams } of preparedItems) {
    // Resolve form version (mirrors what main.js getAppVersion does in the UI).
    const version = await positionsDb.getAppVersion(
      groupNumber,
      process.env.NODE_ENV || 'dev'
    );
    if (!version) {
      throw new Error(`importResolvedOrder: no app version for group ${groupNumber}`);
    }

    // Skip server-side price calculation — Playwright will recalculate after import.
    // JSDOM-based calculatePrices hangs for complex groups and blocks the import loop.
    // Filter out meta-fields from values before persisting — they pollute displayValues.
    const cleanValues = {};
    for (const [k, v] of Object.entries(canonicalParams)) {
      if (k.includes('___')) continue;
      if (k.endsWith('_ALIAS_DESCRIPTION')) continue;
      cleanValues[k] = v;
    }

    // Load form metadata (LISTROW, FORMROW, lockedParams, subParams) via a
    // lightweight boot — no updateProcedure, no price calculation. This gives
    // displayValueBuilder the information it needs to set correct row/locked
    // on every parameter even before Playwright runs the full recalculation.
    let formMeta = null;
    try {
      formMeta = await engine.getFormMeta({ groupNumber, version, lang });
    } catch (metaErr) {
      logger(`getFormMeta failed for group ${groupNumber}: ${metaErr.message} — falling back to stub row/locked`);
    }

    let priced = {
      values: cleanValues,
      displayValues: engine.stubDisplayEntries(cleanValues),
      formMeta,
      total: { total: 0, total_hidden: 0, total_sub: 0 },
      shortJson: buildShortJson(cleanValues)
    };

    // Persist displayValues in the same wire format the browser sends:
    // JSON.stringify(Array.from(map.entries())). insertNewForm will JSON.stringify
    // it again, producing the double-encoded shape the GET /:positionId route
    // (and downstream templates) expect.
    const displayValues = await displayBuilder({
      groupNumber,
      lang,
      values: priced.values || canonicalParams,
      displayValues: priced.displayValues,
      shortJson: priced.shortJson,
      formMeta: priced.formMeta
    });
    const displayValuesWire = engine.displayValuesToWireFormat(displayValues);
    const groupName = item.product_description
      || await groupNameResolver(groupNumber, lang)
      || '';

    const formData = builder.buildOrderItemStructure(
      orderId,                                       // order
      {},                                            // listPrice
      0,                                             // discountPercentage
      0,                                             // discount
      priced.total.total,                            // unitPrice
      priced.total.total_hidden,                     // totalPrice
      item.commission || payload.commission || '',  // name (used as commission alias)
      item.commission || '',                         // commission
      priced.values,                                 // jsonValues -> json_parameters
      displayValuesWire,                             // jsonValuesToDisplay -> json_parameters_desc
      readQuantity(canonicalParams),                 // amount
      item.comment || '',                            // comment
      version,                                       // version
      groupNumber,                                   // groupNumber -> asortment_group_number
      lang,                                          // lang
      item.department || '',                         // department
      groupName,                                     // groupName -> group_name
      priced.shortJson || buildShortJson(canonicalParams)
    );

    const result = await positionsDb.insertNewForm(formData);
    const insertId = result && result[0] ? result[0].insertId : null;
    if (!insertId) throw new Error(`insertNewForm failed for item ${item.posid}`);
    itemIds.push(insertId);
  }

  // 4. Reindex positions and recompute totals so the order matches what the
  // UI shows for orders created interactively.
  await positionsDb.reindexOrderPositions(orderId);
  await positionsDb.updateOrderPrice(orderId, null);

  logger(`Imported order id=${orderId} for user=${user.ident} positions=${itemIds.length}`);
  return { orderId, sendAddressId, itemIds };
}

module.exports = { importResolvedOrder, readQuantity, buildShortJson, buildSendAddress };
