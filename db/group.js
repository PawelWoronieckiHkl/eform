const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('./core');
const bcrypt = require('bcryptjs');
const { log } = require('../utils/logging');

async function getGroupUsersByParentId(parentUserId) {
    const query = `
        SELECT id, user_id, ident, pin, street, zip, city, phone, email, tax_id
        FROM group_user
        WHERE user_id = ?
        ORDER BY id, ident
    `;
    const result = await selectQuery(query, [parentUserId]);
    return result || [];
}

async function getGroupUserById(id) {
    const query = `
        SELECT id, user_id, ident, pin, street, zip, city, phone, email, tax_id
        FROM group_user
        WHERE id = ?
    `;
    const result = await selectQuery(query, [id]);
    return result?.[0] || null;
}

async function getGroupUserByLogin(login) {
    const query = `SELECT * FROM group_user WHERE pin = ?`;
    const result = await selectQuery(query, [login]);
    return result?.[0] || null;
}

async function isGroupLoginTaken(login, excludeId = null) {
    let query = `SELECT id FROM group_user WHERE pin = ?`;
    const params = [login];
    if (excludeId) {
        query += ` AND id != ?`;
        params.push(excludeId);
    }
    const result = await selectQuery(query, params);
    return result && result.length > 0;
}

async function isGroupIdentTaken(ident, excludeId = null) {
    let query = `SELECT id FROM group_user WHERE ident = ?`;
    const params = [ident];
    if (excludeId) {
        query += ` AND id != ?`;
        params.push(excludeId);
    }
    const result = await selectQuery(query, params);
    return result && result.length > 0;
}

async function addGroupUser(data) {
    const {
        parentUserId,
        ident,
        pin,
        password,
        street = '',
        zip = '',
        city = '',
        phone = '',
        email = '',
        taxId = ''
    } = data;

    const hashedPassword = bcrypt.hashSync(password, 12);

    const query = `
        INSERT INTO group_user
            (user_id, ident, pin, password, plain, street, zip, city, phone, email, tax_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
        const result = await insertQuery(query, [
            parentUserId, ident, pin, hashedPassword, password,
            street, zip, city, phone, email, taxId
        ]);
        return { success: true, id: result[0]?.insertId };
    } catch (err) {
        log('[group.js] addGroupUser error:', err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return { success: false, info: 'DUPLICATE' };
        }
        throw err;
    }
}

async function updateGroupUser(id, data) {
    const {
        ident,
        pin,
        street = '',
        zip = '',
        city = '',
        phone = '',
        email = '',
        taxId = ''
    } = data;

    const query = `
        UPDATE group_user
        SET ident = ?, pin = ?,
            street = ?, zip = ?, city = ?, phone = ?, email = ?, tax_id = ?
        WHERE id = ?
    `;
    await updateQuery(query, [
        ident, pin,
        street, zip, city, phone, email, taxId,
        id
    ]);
    return { success: true };
}

async function updateGroupUserPassword(id, password) {
    const hashedPassword = bcrypt.hashSync(password, 12);
    const query = `UPDATE group_user SET password = ? WHERE id = ?`;
    await updateQuery(query, [hashedPassword, id]);
    return { success: true };
}

async function deleteGroupUser(id) {
    const query = `DELETE FROM group_user WHERE id = ?`;
    await deleteQuery(query, [id]);
    return { success: true };
}

async function countGroupUsers(parentUserId) {
    const query = `SELECT COUNT(*) as cnt FROM group_user WHERE user_id = ?`;
    const result = await selectQuery(query, [parentUserId]);
    return result?.[0]?.cnt || 0;
}

async function getPendingOrdersByParentUserId(parentUserId) {
    const query = `
        SELECT o.id, o.commision, o.created_date, o.total_price, o.comment, o.status,
               gu.id as shop_id, gu.ident as shop_ident, gu.id as shop_number
        FROM \`order\` o
        JOIN group_user gu ON gu.id = o.group_user_id
        WHERE gu.user_id = ? AND o.status = 'pending_approval'
        ORDER BY o.id DESC
    `;
    const result = await selectQuery(query, [parentUserId]);
    return result || [];
}

async function countPendingOrdersByParentUserId(parentUserId) {
    const query = `
        SELECT COUNT(*) as cnt FROM \`order\` o
        JOIN group_user gu ON gu.id = o.group_user_id
        WHERE gu.user_id = ? AND o.status = 'pending_approval'
    `;
    const result = await selectQuery(query, [parentUserId]);
    return result?.[0]?.cnt || 0;
}

async function getGroupUserByOrderId(orderId) {
    const query = `
        SELECT gu.* FROM group_user gu
        JOIN \`order\` o ON o.group_user_id = gu.id
        WHERE o.id = ?
    `;
    const result = await selectQuery(query, [orderId]);
    return result?.[0] || null;
}

async function appendShopNumberToOrderIdx(orderId, shopNumber) {
    const query = `UPDATE \`order\` SET order_idx = CONCAT(order_idx, '-', ?) WHERE id = ?`;
    await updateQuery(query, [shopNumber, orderId]);
}

module.exports = {
    getGroupUsersByParentId,
    getGroupUserById,
    getGroupUserByLogin,
    isGroupLoginTaken,
    isGroupIdentTaken,
    addGroupUser,
    updateGroupUser,
    updateGroupUserPassword,
    deleteGroupUser,
    countGroupUsers,
    getPendingOrdersByParentUserId,
    countPendingOrdersByParentUserId,
    getGroupUserByOrderId,
    appendShopNumberToOrderIdx,
};
