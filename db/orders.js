const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('./core')
const dateUtils = require("../utils/humanize_date.js");
const bcrypt = require('bcryptjs');



async function getOrderWithItems(orderId) {

    const orderItemsQuery = 'SELECT * FROM order_item WHERE order_id LIKE ?';
    const orderItems = await selectQuery(orderItemsQuery, orderId);

    const orderDetailsQuery = 'SELECT * FROM \`order\` WHERE id LIKE ?';
    let orderDetails = await selectQuery(orderDetailsQuery, orderId);
    orderDetails = dateUtils.humanizeData(orderDetails);

    return { orderDetails, orderItems }
}



async function getOrderDetails(orderId) {
    const orderDetailsQuery = `SELECT 
    \`order\`.id,
    \`order\`.commision,
    \`order\`.created_date,
    \`order\`.comment,
    order_address.id as address_id,
    order_address.street,
    order_address.phone,
    order_address.email,
    order_address.city,
    order_address.zip,
    send_address.id as send_address_id,
    send_address.name as send_name,
    send_address.street as send_street,
    send_address.phone as send_phone,
    send_address.email as send_email,
    send_address.city as send_city,
    send_address.zip as send_zip,
    send_address.country as send_country,
    order_address.name,
    order_address.country
    FROM \`order\`
    LEFT JOIN order_address ON \`order\`.order_address_id = order_address.id
    LEFT JOIN send_address ON \`order\`.send_address_id = send_address.id
    WHERE \`order\`.id = ?`;
    
    let orderDetails = await selectQuery(orderDetailsQuery, orderId);
    console.log(orderDetails, 'query')
    orderDetails = dateUtils.humanizeData(orderDetails);
    return orderDetails[0];
}


async function updateOrderDetails(orderId, comment, commission, contactInfo, sendAddress) {
    let values;
    let query = `UPDATE \`order\` SET commision = ?, comment = ? WHERE id = ?`;

    const res = await updateQuery(query, [commission, comment, orderId]);

    // ---- ORDER ADDRESS ----
    if (contactInfo) {
        // Sprawdź, czy zamówienie ma już przypisany adres
        const orderAddressId = await getOrderAddressId(orderId);
        if (!orderAddressId) {
            // Dodaj nowy adres i przypisz do zamówienia
            const newOrderAddrId = await insertOrderAddress(contactInfo);
            query = `UPDATE \`order\` SET order_address_id = ? WHERE id = ?`;
            await updateQuery(query, [newOrderAddrId, orderId]);
        } else {
            // Aktualizuj istniejący adres
            query = `
                UPDATE \`order\`
                JOIN order_address ON \`order\`.order_address_id = order_address.id
                SET 
                    order_address.name = ?,
                    order_address.street = ?,
                    order_address.phone = ?,
                    order_address.email = ?,
                    order_address.city = ?,
                    order_address.zip = ?,
                    order_address.country = ?
                WHERE \`order\`.id = ?
            `;
            values = [
                contactInfo.name,
                contactInfo.street,
                contactInfo.phone,
                contactInfo.email,
                contactInfo.city,
                contactInfo.zip,
                contactInfo.country,
                orderId
            ];
            await updateQuery(query, values);
        }
    }

    // ---- SEND ADDRESS ----
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
    const sendAddQuery = 'SELECT send_address_id from \`order\` where id like ?';
    const sendAddId = await selectQuery(sendAddQuery, orderId);
    if (!sendAddId[0]?.send_address_id) {
        return false;
    };
}

async function getOrderAddressId(orderId) {
    const sendAddQuery = 'SELECT order_address_id from \`order\` where id like ?';
    const sendAddId = await selectQuery(sendAddQuery, orderId);
    if (!sendAddId[0]?.order_address_id) {
        return false;
    };
}

async function getOrderDataToSend(orderId) {
    const orderItemsQuery = 'SELECT * FROM order_item WHERE order_id LIKE ?';
    const orderItems = await selectQuery(orderItemsQuery, orderId);
    const sendAddQuery = 'SELECT send_address_id from \`order\` where id like ?';
    const sendAddId = await selectQuery(sendAddQuery, orderId);
    let orderDetailsQuery = '';
    console.log(sendAddId)
    if (!sendAddId[0]?.send_address_id) {

        orderDetailsQuery = `SELECT o.id, o.commision, o.sent_date, o.comment, u.client_name , u.tax_id, u.ident as user_ident,org.ident as org_ident,o.commision as name,u.street,u.zip,u.city,u.country, u.phone, u.email
FROM eform.\`order\` o 
join \`user\` u on  u.id = o.user_id
join organization org on org.id = o.organization_id 
where o.id like ?
`}
    else {

        orderDetailsQuery = `SELECT o.id, o.commision, o.sent_date, o.comment, u.client_name , u.tax_id, u.ident as user_ident,org.ident as org_ident,s.name,s.street,s.zip,s.city,s.country, s.phone, s.email
FROM \`order\` o 
join \`user\` u on  u.id = o.user_id
join send_address s on s.id = o.send_address_id 
join organization org on org.id = o.organization_id 
where o.id like ?`
    }

    let orderDetails = await selectQuery(orderDetailsQuery, orderId);
    // console.log(JSON.stringify(orderDetails))
    orderDetails = dateUtils.humanizeData(orderDetails)[0];
    console.log(orderDetails, 'ORDER DETAILS')
    return { orderDetails, orderItems }
}


async function deleteOrder(orderId) {
    const query = "DELETE FROM \`order\` WHERE id like ?";
    const response = await deleteQuery(query, orderId);
    return response;
}


async function getUserOrders(userId, limit = 10, offset = 0, sent = false) {
    let query = ''
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
        console.error(err);
        return false;
    }
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
        console.error(err);
        return 0;
    }
}

async function insertOrderAddress(address) {
    const query = `INSERT INTO order_address(name,street,city,zip,country,phone,email) values (?,?,?,?,?,?,?)`
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

        return response[0]?.insertId;

    }

    catch (err) {
        console.error(err);
        return false;
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
        console.log(response)
        return response[0]?.insertId;

    }

    catch (err) {
        console.error(err);
        return false;
    }
}

async function insertNewOrder(commision, addressId, userId, comment, sendAddressId = null, totalPrice = 0) {

    const query = `INSERT INTO \`order\` 
    (user_id,
    order_address_id,
    commision,
    total_price,
    organization_id,
    comment,
    status,
    created_date,
    send_address_id)
    values (?,?,?,?,
    (select u.organization_id from eform.\`user\` u  where u.id =?) 
    ,?,'active',?,?)`
    try {
        const response = await insertQuery(query,
            [userId,
                addressId,
                commision,
                totalPrice,
                userId,
                comment,
                dateUtils.getDbTimestamp(),
                sendAddressId !== undefined && sendAddressId !== null ? sendAddressId : null
            ]
        )
        console.log(response)
        return response[0].insertId;
    }

    catch (err) {
        console.error(err);
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
        console.error(err);
        return false;
    }
}

async function getOrderWithItems(orderId) {
    const orderItemsQuery = 'SELECT * FROM order_item WHERE order_id LIKE ?';
    const orderItems = await selectQuery(orderItemsQuery, orderId);

    const orderDetailsQuery = 'SELECT * FROM `order` WHERE id LIKE ?';
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
    insertOrderAddress,
    insertNewOrder,
    updateOrderComment,
    changeOrderStatus,
    insertSendAddress,
    getOrderWithItems
}