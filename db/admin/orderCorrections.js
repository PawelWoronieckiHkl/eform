const { selectQuery, updateQuery } = require('../core');
const dateUtils = require('../../utils/humanize_date.js');
const { log } = require('../../utils/logging');

/**
 * Search sent orders for admin correction module.
 */
async function searchSentOrders({ query = '', page = 1, limit = 25 } = {}) {
    const offset = (Math.max(1, page) - 1) * limit;
    const like = `%${query.trim()}%`;
    const hasQuery = query.trim().length > 0;

    const whereParts = [`o.status = 'sent'`];
    const params = [];

    if (hasQuery) {
        whereParts.push(`(
            o.order_idx LIKE ?
            OR o.commision LIKE ?
            OR u.ident LIKE ?
            OR u.client_name LIKE ?
            OR org.ident LIKE ?
        )`);
        params.push(like, like, like, like, like);
    }

    const where = whereParts.join(' AND ');

    const countRows = await selectQuery(
        `SELECT COUNT(*) AS total
         FROM \`order\` o
         JOIN \`user\` u ON u.id = o.user_id
         JOIN organization org ON org.id = o.organization_id
         WHERE ${where}`,
        params
    );
    const total = countRows?.[0]?.total || 0;

    const rows = await selectQuery(
        `SELECT
            o.id,
            o.order_idx,
            o.commision,
            o.sent_date,
            o.corrected_at,
            o.total_price,
            o.status,
            u.ident AS user_ident,
            u.client_name,
            org.ident AS org_ident
         FROM \`order\` o
         JOIN \`user\` u ON u.id = o.user_id
         JOIN organization org ON org.id = o.organization_id
         WHERE ${where}
         ORDER BY o.sent_date DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return {
        orders: dateUtils.humanizeData(rows || []),
        total,
        page: Math.max(1, page),
        limit,
        totalPages: Math.ceil(total / limit) || 1
    };
}

async function getCorrectionOrderMeta(orderId) {
    const rows = await selectQuery(
        `SELECT o.id, o.status, o.order_idx, o.user_id, u.ident AS user_ident, u.pin
         FROM \`order\` o
         JOIN \`user\` u ON u.id = o.user_id
         WHERE o.id = ?`,
        [orderId]
    );
    return rows?.[0] || null;
}

async function openOrderForCorrection(orderId) {
    const result = await updateQuery(
        `UPDATE \`order\` SET status = 'correction' WHERE id = ? AND status = 'sent'`,
        [orderId]
    );
    return result?.affectedRows > 0;
}

async function finalizeOrderCorrection(orderId) {
    const correctedAt = dateUtils.getDbTimestamp();
    const result = await updateQuery(
        `UPDATE \`order\` SET status = 'sent', corrected_at = ? WHERE id = ? AND status = 'correction'`,
        [correctedAt, orderId]
    );
    return result?.affectedRows > 0;
}

async function cancelOrderCorrection(orderId) {
    const result = await updateQuery(
        `UPDATE \`order\` SET status = 'sent' WHERE id = ? AND status = 'correction'`,
        [orderId]
    );
    return result?.affectedRows > 0;
}

async function listOrdersInCorrection({ page = 1, limit = 25 } = {}) {
    const offset = (Math.max(1, page) - 1) * limit;

    const countRows = await selectQuery(
        `SELECT COUNT(*) AS total FROM \`order\` WHERE status = 'correction'`,
        []
    );
    const total = countRows?.[0]?.total || 0;

    const rows = await selectQuery(
        `SELECT
            o.id,
            o.order_idx,
            o.commision,
            o.sent_date,
            u.ident AS user_ident,
            u.client_name,
            org.ident AS org_ident
         FROM \`order\` o
         JOIN \`user\` u ON u.id = o.user_id
         JOIN organization org ON org.id = o.organization_id
         WHERE o.status = 'correction'
         ORDER BY o.sent_date DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );

    return {
        orders: dateUtils.humanizeData(rows || []),
        total,
        page: Math.max(1, page),
        limit,
        totalPages: Math.ceil(total / limit) || 1
    };
}

module.exports = {
    searchSentOrders,
    getCorrectionOrderMeta,
    openOrderForCorrection,
    finalizeOrderCorrection,
    cancelOrderCorrection,
    listOrdersInCorrection
};
