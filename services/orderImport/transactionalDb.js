'use strict';

const fs = require('fs');
const path = require('path');
const dateUtils = require('../../utils/humanize_date.js');
const { dataDir } = require('../../config');
const { log } = require('../../utils/logging');

function firstResult(response) {
  return response && response[0] ? response[0] : null;
}

async function insertSendAddress(conn, address) {
  const query = 'INSERT INTO send_address(name,street,city,zip,country,phone,email) values (?,?,?,?,?,?,?)';
  const response = await conn.query(query, [
    address.name,
    address.street,
    address.city,
    address.zip,
    address.country,
    address.phone,
    address.email
  ]);
  const result = firstResult(response);
  return result && result.insertId ? result.insertId : false;
}

async function insertNewOrder(
  conn,
  commision,
  addressId,
  userId,
  comment,
  sendAddressId = null,
  totalPrice = 0,
  employeeId = null,
  mailId = null,
  groupUserId = null
) {
  if (groupUserId) {
    throw new Error('FTP import does not support group shop order numbering');
  }

  const query = `INSERT INTO \`order\`
    (user_id,
    delivery_address_id,
    commision,
    total_price,
    organization_id,
    comment,
    status,
    created_date,
    send_address_id,
    contact_info_id,
    employee_id,
    group_user_id)
    values (?,?,?,?,
    (select u.organization_id from eform.\`user\` u where u.id =?)
    ,?,'active',?,?,?,?,?)`;

  const response = await conn.query(query, [
    userId,
    addressId || null,
    commision,
    totalPrice,
    userId,
    comment,
    dateUtils.getDbTimestamp(),
    sendAddressId || null,
    mailId || null,
    employeeId || null,
    groupUserId || null
  ]);

  const result = firstResult(response);
  return result && result.insertId ? result.insertId : false;
}

async function getPosCounter(conn, orderId) {
  const [rows] = await conn.query('SELECT COUNT(*) as count FROM order_item WHERE order_id = ?', [orderId]);
  return Number(rows && rows[0] ? rows[0].count : 0);
}

async function insertNewForm(conn, formData) {
  const orderpos = await getPosCounter(conn, formData.order) + 1;
  formData.orderpos = orderpos;

  const query = `INSERT INTO order_item(
    order_id, name, commision, json_parameters, json_parameters_desc, amount,
    list_price, discount_percentage, discount, unit_price, total_price,
    total_price_sub, comment, ver, asortment_group_number, lang, department,
    group_name, parameters_short, orderpos
  ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  return conn.query(query, [
    formData.order,
    formData.name,
    formData.commission,
    JSON.stringify(formData.jsonValues),
    JSON.stringify(formData.jsonValuesToDisplay),
    formData.amount,
    JSON.stringify(formData.listPrice),
    formData.discountPercentage,
    formData.discount,
    formData.unitPrice,
    formData.totalPrice,
    formData.totalPriceSub || 0,
    formData.comment,
    formData.version,
    formData.groupNumber,
    formData.lang,
    formData.department,
    formData.group,
    JSON.stringify(formData.parameters_short),
    formData.orderpos
  ]);
}

async function reindexOrderPositions(conn, orderId) {
  const [positions] = await conn.query(
    'SELECT id FROM order_item WHERE order_id = ? ORDER BY orderpos ASC, id ASC',
    [orderId]
  );

  for (let i = 0; i < positions.length; i++) {
    await conn.query('UPDATE order_item SET orderpos = ? WHERE id = ?', [i + 1, positions[i].id]);
  }

  return positions.length;
}

async function updateOrderPrice(conn, orderId) {
  const [currentPrices] = await conn.query(
    `SELECT oi.unit_price, oi.total_price, oi.total_price_sub
     FROM eform.order_item oi
     JOIN eform.\`order\` o ON oi.order_id = o.id
     WHERE o.id = ?`,
    [orderId]
  );

  if (!currentPrices || currentPrices.length === 0) {
    throw new Error(`Order with ID ${orderId} has no imported items.`);
  }

  let total = 0;
  let totalHidden = 0;
  let totalSub = 0;
  for (const price of currentPrices) {
    total += parseFloat(price.unit_price || 0);
    totalHidden += parseFloat(price.total_price || 0);
    totalSub += parseFloat(price.total_price_sub || 0);
  }

  total = parseFloat(total.toFixed(2));
  totalHidden = parseFloat(totalHidden.toFixed(2));
  totalSub = parseFloat(totalSub.toFixed(2));

  return conn.query(
    'UPDATE `order` SET total_price = ?, total_price_hidden = ?, total_float = ?, total_float_hidden = ?, total_price_sub = ? WHERE id = ?',
    [total, totalHidden, total, totalHidden, totalSub, orderId]
  );
}

async function getAppVersion(conn, group, nodeVer) {
  const nodes = {
    dev: 'version_dev',
    archive: 'version_archive',
    test: 'version_string',
    prod: 'version_string'
  };
  const table = nodes[nodeVer] || 'version_string';

  const [rows] = await conn.query(
    `SELECT ${table} as version_string, version_string AS stable_version FROM app_version WHERE asort_group LIKE ?`,
    [group]
  );
  if (rows.length > 0) {
    const selectedVersion = rows[0].version_string;
    if (formVersionExists(group, selectedVersion)) return selectedVersion;

    const stableVersion = rows[0].stable_version;
    if (stableVersion && stableVersion !== selectedVersion && formVersionExists(group, stableVersion)) {
      log(`WARN: app_version.${table}=${selectedVersion} for group=${group} has no files; using version_string=${stableVersion}`);
      return stableVersion;
    }

    return selectedVersion;
  }

  const [defaults] = await conn.query(`SELECT ${table} as version_string FROM app_version WHERE id = 1`);
  const defaultVersion = defaults && defaults[0] ? defaults[0].version_string : null;
  if (!defaultVersion) {
    throw new Error(`No app version configured for group ${group}`);
  }

  const [insertResult] = await conn.query(
    'INSERT INTO app_version (asort_group, version_string, version_archive, version_dev) VALUES (?, ?, ?, ?)',
    [group, defaultVersion, defaultVersion, defaultVersion]
  );
  const [created] = await conn.query(`SELECT ${table} as version_string FROM app_version WHERE id LIKE ?`, [insertResult.insertId]);
  return created && created[0] ? created[0].version_string : defaultVersion;
}

function formVersionExists(group, version) {
  if (!group || !version) return false;
  return fs.existsSync(path.join(dataDir, String(group), 'data', 'versions', String(version)));
}

function makeTransactionalDeps(conn) {
  return {
    orders: {
      insertSendAddress: (address) => insertSendAddress(conn, address),
      insertNewOrder: (...args) => insertNewOrder(conn, ...args)
    },
    positions: {
      insertNewForm: (formData) => insertNewForm(conn, formData),
      reindexOrderPositions: (orderId) => reindexOrderPositions(conn, orderId),
      updateOrderPrice: (orderId) => updateOrderPrice(conn, orderId),
      getAppVersion: (group, nodeVer) => getAppVersion(conn, group, nodeVer)
    }
  };
}

module.exports = {
  makeTransactionalDeps
};
