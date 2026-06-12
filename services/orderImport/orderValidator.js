/**
 * Validates the structure of an incoming order JSON file.
 *
 * The expected shape mirrors `OrderSender.data` from
 * `services/sendOrderService.js` (the export side of the same FTP channel):
 *
 *   {
 *     orderno, orderid, commission, client, organizationIdent, userIdent,
 *     created_date, tax, comment, sentDate,
 *     name, address, zip, city, country, email, phone,
 *     userStreet, userZip, userCity, userCountry, userPhone,
 *     total, total_hidden,
 *     items: [
 *       {
 *         posid, orderpos, product, department, product_description,
 *         commission, parameters: { KEY: value, ... }, comment, asortment
 *       }
 *     ]
 *   }
 *
 * Only `userIdent` and a non-empty `items` array are strictly required —
 * the rest can be filled in from DB user data (see userResolver.js).
 *
 * Returns: { ok: boolean, errors: string[], data: object|null }
 */

const REQUIRED_TOP_LEVEL = ['userIdent'];

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function looksLikeDisplayValuesArray(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  const first = raw[0];
  return Array.isArray(first)
    && first.length >= 2
    && typeof first[0] === 'string'
    && isObject(first[1])
    && ('option_value' in first[1] || 'param_description' in first[1]);
}

function validateItem(item, idx, errors) {
  if (!isObject(item)) {
    errors.push(`items[${idx}]: not an object`);
    return;
  }

  // `product` (canonical key) or `asortment` (legacy alias) must be present.
  const group = item.product || item.asortment;
  if (!group || typeof group !== 'string') {
    errors.push(`items[${idx}]: missing product/asortment (asortment_group_number)`);
  }

  if (!isObject(item.parameters)) {
    errors.push(`items[${idx}]: parameters must be an object`);
  } else if (Object.keys(item.parameters).length === 0) {
    errors.push(`items[${idx}]: parameters is empty`);
  }
}

function validateOrderPayload(raw) {
  const errors = [];

  if (!isObject(raw)) {
    if (looksLikeDisplayValuesArray(raw)) {
      return {
        ok: false,
        errors: [
          'Payload looks like json_parameters_desc (displayValues array), not an order object. '
          + 'Import expects { userIdent, items: [...] } — re-upload the full order JSON.'
        ],
        data: null
      };
    }
    if (typeof raw === 'string') {
      return {
        ok: false,
        errors: [
          'Payload is a JSON string, not an order object (double-encoded JSON?). '
          + 'Import expects { userIdent, items: [...] }.'
        ],
        data: null
      };
    }
    return { ok: false, errors: ['Payload is not a JSON object'], data: null };
  }

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!raw[key]) errors.push(`Missing required field: ${key}`);
  }

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    errors.push('items[] must be a non-empty array');
  } else {
    raw.items.forEach((item, idx) => validateItem(item, idx, errors));
  }

  return {
    ok: errors.length === 0,
    errors,
    data: errors.length === 0 ? raw : null
  };
}

module.exports = { validateOrderPayload, looksLikeDisplayValuesArray };
