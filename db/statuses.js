const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('./core')
const dateUtils = require("../utils/humanize_date.js");
const e = require("express");
const bcrypt = require('bcryptjs');


async function checkIfStatusExists(record) {
    let query = `SELECT id from position_statuses WHERE user_ident = ? and order_idx = ? and order_pos = ?`
    const result = await selectQuery(query, [record.USERIDENT, record.ORDERNO, record.ORDERPOS]);
    console.log(result, 'result w checkIfStatusExists');
    return result;
}

async function insertStatus(record) {
    const query = `INSERT INTO position_statuses
    (organization_ident, user_ident, order_idx, order_pos, status, shipping_date, parcel_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const result = await insertQuery(query, [
        record.ORGANIZATIONIDENT,
        record.USERIDENT,
        record.ORDERNO,
        record.ORDERPOS,
        record.STATUS,
        dateUtils.convertToSQLDate(record.SHIPPINGDATE),
        record.PARCELCODE
    ]);
    return result;
}	

async function getUserStatuses(userIdent, orderIdx) {
    console.log(userIdent, orderIdx, 'getUserStatuses params');
    const query = `SELECT * FROM position_statuses WHERE user_ident = ? AND order_idx = ?`;
    const result = await selectQuery(query, [userIdent, orderIdx]);
    return result;
}
module.exports = { checkIfStatusExists, insertStatus, getUserStatuses };