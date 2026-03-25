const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('./core')
const dateUtils = require("../utils/humanize_date.js");
const e = require("express");
const bcrypt = require('bcryptjs');


async function checkIfStatusExists(record) {
    let query = `SELECT id from position_statuses WHERE user_ident = ? and order_idx = ? and order_pos = ?`
    const result = await selectQuery(query, [record.USERIDENT, record.ORDERNO, record.ORDERPOS]);
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
    const query = `SELECT * FROM position_statuses WHERE user_ident = ? AND order_idx = ?`;
    const result = await selectQuery(query, [userIdent, orderIdx]);
    return result;
}


async function updateStatus(record) {
    const query = `UPDATE position_statuses SET
    status = ?,
    shipping_date = ?,
    parcel_code = ?
    WHERE user_ident = ? AND order_idx = ? AND order_pos = ?`;
    const result = await updateQuery(query, [
        record.STATUS,
        dateUtils.convertToSQLDate(record.SHIPPINGDATE),
        record.PARCELCODE,
        record.USERIDENT,
        record.ORDERNO,
        record.ORDERPOS
    ]);
    return result;
}

async function syncOrderFromStatuses(userIdent, orderIdx) {
    const query = `
        UPDATE \`order\` o
        SET
            o.delivery_date = (
                SELECT DATE(MAX(ps.shipping_date))
                FROM position_statuses ps
                WHERE ps.user_ident = ? AND ps.order_idx = ?
            ),
            o.prod_status = (
                SELECT ps.status
                FROM position_statuses ps
                WHERE ps.user_ident = ? AND ps.order_idx = ?
                  AND ps.shipping_date IS NOT NULL
                ORDER BY ps.shipping_date DESC
                LIMIT 1
            ),
            o.spedition_numbers = (
                SELECT JSON_ARRAYAGG(DISTINCT ps.parcel_code)
                FROM position_statuses ps
                WHERE ps.user_ident = ? AND ps.order_idx = ?
                  AND ps.parcel_code IS NOT NULL
                  AND ps.parcel_code != ''
            )
        WHERE o.order_idx = ?
          AND o.user_id = (SELECT id FROM \`user\` WHERE ident = ?)`;
    const result = await updateQuery(query, [
        userIdent, orderIdx,
        userIdent, orderIdx,
        userIdent, orderIdx,
        orderIdx,
        userIdent
    ]);

    return result;
}


module.exports = {
    checkIfStatusExists,
    insertStatus,
    getUserStatuses,
    updateStatus,
    syncOrderFromStatuses
};