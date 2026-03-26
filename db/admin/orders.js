const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('../core')
const dateUtils = require("../../utils/humanize_date.js");
const bcrypt = require('bcryptjs');
const { log } = require('../../utils/logging');



async function getOrderWithItems(orderId) {

    const orderItemsQuery = 'SELECT * FROM order_item WHERE order_id = ?';
    const orderItems = await selectQuery(orderItemsQuery, orderId);

    const orderDetailsQuery = 'SELECT * FROM \`order\` WHERE id = ?';
    let orderDetails = await selectQuery(orderDetailsQuery, orderId);
    orderDetails = dateUtils.humanizeData(orderDetails);

    return { orderDetails, orderItems }
}

async function checkOwner(orderId, userId) {
    log('Checking ownership for orderId:', orderId, 'and userId:', userId);
    const query = 'SELECT id FROM \`order\` WHERE id = ? AND user_id = ?';
    const order = await selectQuery(query, [orderId, userId]);
    log(order.length)
    return order.length > 0;
}

async function getOrderDetails(orderId) {
    const orderDetailsQuery = `SELECT 
    \`order\`.id,
    \`order\`.commision,
    \`order\`.created_date,
    \`order\`.comment,
    \`order\`.delivery_address_id,
    \`order\`.contact_info_id,
    da.id as address_id,
    da.street,
    da.phone_number as phone,
    da.city,
    da.zip,
    da.name,
    da.country,
    ci.email,
    send_address.id as send_address_id,
    send_address.name as send_name,
    send_address.street as send_street,
    send_address.phone as send_phone,
    send_address.email as send_email,
    send_address.city as send_city,
    send_address.zip as send_zip,
    send_address.country as send_country
    FROM \`order\`
    LEFT JOIN delivery_address da ON \`order\`.delivery_address_id = da.id
    LEFT JOIN contact_info ci ON \`order\`.contact_info_id = ci.id
    LEFT JOIN send_address ON \`order\`.send_address_id = send_address.id
    WHERE \`order\`.id = ?`;

    let orderDetails = await selectQuery(orderDetailsQuery, orderId);
    log(orderDetails, 'query')
    orderDetails = dateUtils.humanizeData(orderDetails);
    return orderDetails[0];
}


async function updateOrderDetails(orderId, comment, commission, deliveryAddressId, contactInfoId, sendAddress) {
    let values;
    let query = `UPDATE \`order\` SET commision = ?, comment = ?, delivery_address_id = ?, contact_info_id = ? WHERE id = ?`;

    const res = await updateQuery(query, [commission, comment, deliveryAddressId || null, contactInfoId || null, orderId]);


    if (sendAddress) {
        const sendAddressId = await getSendAddressId(orderId);
        if (!sendAddressId) {
            const newSendAddrId = await insertSendAddress(sendAddress);
            query = `UPDATE \`order\` SET send_address_id = ? WHERE id = ?`;
            await updateQuery(query, [newSendAddrId, orderId]);
        } else {
            query = `
                UPDATE \`order\`
                JOIN send_address ON \`order\`.send_address_id = send_address.id
                SET 
                    send_address.name = ?,
                    send_address.street = ?,
                    send_address.phone = ?,
                    send_address.email = ?,
                    send_address.city = ?,
                    send_address.zip = ?,
                    send_address.country = ?
                WHERE \`order\`.id = ?
            `;
            values = [
                sendAddress.name,
                sendAddress.street,
                sendAddress.phone,
                sendAddress.email,
                sendAddress.city,
                sendAddress.zip,
                sendAddress.country,
                orderId
            ];
            await updateQuery(query, values);
        }
    }

    return res;
}


async function getSendAddressId(orderId) {
    const sendAddQuery = 'SELECT send_address_id from \`order\` where id = ?';
    const sendAddId = await selectQuery(sendAddQuery, orderId);
    if (!sendAddId[0]?.send_address_id) {
        return false;
    }
    return sendAddId[0].send_address_id;
}

async function getDeliveryAddressId(orderId) {
    const query = 'SELECT delivery_address_id from \`order\` where id = ?';
    const result = await selectQuery(query, orderId);
    if (!result[0]?.delivery_address_id) {
        return false;
    }
    return result[0].delivery_address_id;
}

async function getOrderDataToSend(orderId) {
    const orderItemsQuery = 'SELECT * FROM order_item WHERE order_id = ?';
    const orderItems = await selectQuery(orderItemsQuery, orderId);
    const orderFlagsQuery = 'SELECT send_address_id, delivery_address_id, contact_info_id FROM `order` WHERE id = ?';
    const orderFlags = await selectQuery(orderFlagsQuery, orderId);
    const hasSendAddress = !!orderFlags[0]?.send_address_id;
    const hasDeliveryAddress = !!orderFlags[0]?.delivery_address_id;
    let orderDetailsQuery = '';

    if (hasSendAddress) {
        orderDetailsQuery = `SELECT o.id, o.commision, o.created_date, o.sent_date, o.comment, o.order_idx, o.total_price, o.total_price_hidden, u.client_name, u.tax_id, u.ident as user_ident, org.ident as org_ident, s.name, s.street, s.zip, s.city, s.country, s.phone, COALESCE(ci.email, s.email, u.email) as email
FROM \`order\` o
join \`user\` u on u.id = o.user_id
join send_address s on s.id = o.send_address_id
left join contact_info ci on ci.id = o.contact_info_id
join organization org on org.id = o.organization_id
where o.id = ?`;
    } else if (hasDeliveryAddress) {
        orderDetailsQuery = `SELECT o.id, o.commision, o.created_date, o.sent_date, o.order_idx, o.comment, o.total_price, o.total_price_hidden, u.client_name, u.tax_id, u.ident as user_ident, org.ident as org_ident, da.name, da.street, da.zip, da.city, da.country, da.phone_number as phone, COALESCE(ci.email, u.email) as email
FROM \`order\` o
join \`user\` u on u.id = o.user_id
join delivery_address da on da.id = o.delivery_address_id
left join contact_info ci on ci.id = o.contact_info_id
join organization org on org.id = o.organization_id
where o.id = ?`;
    } else {
        orderDetailsQuery = `SELECT o.id, o.commision, o.created_date, o.sent_date, o.order_idx, o.comment, o.total_price, o.total_price_hidden, u.client_name, u.tax_id, u.ident as user_ident, org.ident as org_ident, o.commision as name, u.street, u.zip, u.city, u.country, u.phone, COALESCE(ci.email, u.email) as email
FROM \`order\` o
join \`user\` u on u.id = o.user_id
left join contact_info ci on ci.id = o.contact_info_id
join organization org on org.id = o.organization_id
where o.id = ?`;
    }

    let orderDetails = await selectQuery(orderDetailsQuery, orderId);
    orderDetails = dateUtils.humanizeData(orderDetails)[0];

    return { orderDetails, orderItems }
}


async function deleteOrder(orderId) {
    const query = "DELETE FROM \`order\` WHERE id = ?";
    const response = await deleteQuery(query, orderId);
    return response;
}


async function getUserOrders(userId, limit = 10, offset = 0, sent = false, isOwner = false) {
    let query = ''
    log(isOwner, 'isOwner in db')
    if (isOwner) {
        query = `
        SELECT * FROM \`order\` 
        WHERE organization_id = ? and status like 'active'
        ORDER BY id DESC 

    `;
        try {
            log(isOwner, 'isOwner')
            const rows = await selectQuery(query, [isOwner, limit, offset]);
            const result = dateUtils.humanizeData(rows);
            log(result, 'result orders')
            if (result.length == 0) { return false }
            return result;

        }
        catch (err) {
            await connection.end();
            log(err);
            return false;
        }

    }

    if (!sent) {

        query = `
        SELECT * FROM \`order\` 
        WHERE user_id = ? and status like 'active'
        ORDER BY id DESC 
        LIMIT ? OFFSET ?
    `;
    }

    else {
        query = `
        SELECT * FROM \`order\` 
        WHERE user_id = ? and status like 'sent'
        ORDER BY sent_date DESC 
        LIMIT ? OFFSET ?
    `;
    }

    try {
        const rows = await selectQuery(query, [userId, limit, offset]);
        const result = dateUtils.humanizeData(rows);
        if (result.length == 0) { return false }
        return result;
    }
    catch (err) {
        await connection.end();
        log(err);
        return false;
    }
}


async function getUserOrderId(orderId) {
    const query = `SELECT order_idx FROM \`order\` WHERE id = ?`;
    const result = await selectQuery(query, orderId);
    return result[0]?.order_idx || false;
}

async function countUserOrders(userId, sent = false) {

    try {
        let count
        if (!sent) {
            count = await selectQuery(
                "SELECT COUNT(*) as count FROM `order` WHERE user_id = ? and status like 'active'", userId
            );
        }
        else {
            count = await selectQuery(
                "SELECT COUNT(*) as count FROM `order` WHERE user_id = ? and status like 'sent'", userId
            );
        }

        return count[0].count;
    } catch (err) {
        log(err);
        return 0;
    }
}

async function insertSendAddress(address) {
    const query = `INSERT INTO send_address(name,street,city,zip,country,phone,email) values (?,?,?,?,?,?,?)`
    try {
        const response = await insertQuery(query,
            [
                address['name'],
                address['street'],
                address['city'],
                address['zip'],
                address['country'],
                address['phone'],
                address['email']])
        log(response)
        return response[0]?.insertId;

    }

    catch (err) {
        log(err);
        return false;
    }
}

async function insertNewOrder(commision, addressId, userId, comment, sendAddressId = null, totalPrice = 0, employeeId = null, mailId = null) {
    addressId = addressId || null;
    mailId = mailId || null;
    sendAddressId = sendAddressId || null;
    employeeId = employeeId || null;

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
    employee_id)
    values (?,?,?,?,
    (select u.organization_id from eform.\`user\` u  where u.id =?) 
    ,?,'active',?,?,?,?)`
    try {
        const response = await insertQuery(query,
            [userId,
                addressId,
                commision,
                totalPrice,
                userId,
                comment,
                dateUtils.getDbTimestamp(),
                sendAddressId,
                mailId,
                employeeId
            ]
        )
        log(response)
        return response[0].insertId;
    }

    catch (err) {
        log(err);
        return false;
    }
}

async function updateOrderComment(orderId, comment) {
    const query = `UPDATE \`order\` SET comment = ? where id = ?`
    try {
        const response = await updateQuery(query, [comment, orderId])
        return response;
    }

    catch (err) {
        return false;
    }
}

async function changeOrderStatus(orderId, status) {
    const sentDate = dateUtils.getDbTimestamp();
    const query = `UPDATE \`order\` SET status = ?, sent_date = ?  where id = ?`
    try {
        const response = await updateQuery(query, [status, sentDate, orderId])
        return response;
    }

    catch (err) {
        log(err);
        return false;
    }
}

async function getOrderWithItems(orderId) {
    const orderItemsQuery = 'SELECT * FROM order_item WHERE order_id = ?';
    const orderItems = await selectQuery(orderItemsQuery, orderId);

    const orderDetailsQuery = 'SELECT * FROM `order` WHERE id = ?';
    let orderDetails = await selectQuery(orderDetailsQuery, orderId);
    orderDetails = dateUtils.humanizeData(orderDetails);

    return { orderDetails: orderDetails[0], orderItems }
}

module.exports = {
    getOrderWithItems,
    getOrderDetails,
    updateOrderDetails,
    getOrderDataToSend,
    deleteOrder,
    getUserOrders,
    countUserOrders,
    getDeliveryAddressId,
    insertNewOrder,
    updateOrderComment,
    changeOrderStatus,
    insertSendAddress,
    getUserOrderId,
    getOrderWithItems,
    checkOwner
}

