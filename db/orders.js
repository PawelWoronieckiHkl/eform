const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('./core')
const dateUtils = require("../utils/humanize_date.js");
const bcrypt = require('bcryptjs');
const { result } = require('lodash');


async function getOrderWithItems(orderId) {

    const orderItemsQuery = 'SELECT * FROM order_item WHERE order_id LIKE ?';
    const orderItems = await selectQuery(orderItemsQuery, orderId);

    const orderDetailsQuery = 'SELECT * FROM \`order\` WHERE id LIKE ?';
    let orderDetails = await selectQuery(orderDetailsQuery, orderId);
    orderDetails = dateUtils.humanizeData(orderDetails);

    return { orderDetails, orderItems }
}

async function checkOwner(orderId, userId) {

    const query = 'SELECT id FROM \`order\` WHERE id = ? AND user_id = ?';
    const order = await selectQuery(query, [orderId, userId]);

    return order.length > 0;
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
    
    orderDetails = dateUtils.humanizeData(orderDetails);
    return orderDetails[0];
}


async function updateOrderDetails(orderId, comment, commission, contactInfo, sendAddress) {
    let values;
    let query = `UPDATE \`order\` SET commision = ?, comment = ? WHERE id = ?`;

    const res = await updateQuery(query, [commission, comment, orderId]);

    
    if (contactInfo) {
        
        const orderAddressId = await getOrderAddressId(orderId);
        if (!orderAddressId) {
            
            const newOrderAddrId = await insertOrderAddress(contactInfo);
            query = `UPDATE \`order\` SET order_address_id = ? WHERE id = ?`;
            await updateQuery(query, [newOrderAddrId, orderId]);
        } else {
            
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
async function getOrderNo(orderId) {
    const query = 'SELECT order_idx from \`order\` where id like ?';
    const orderNo = await selectQuery(query, orderId);
    if (!orderNo[0]?.order_idx) {
        return false;
    };
    return orderNo[0]?.order_idx;
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

    if (!sendAddId[0]?.send_address_id) {

        orderDetailsQuery = `SELECT o.id, o.commision, o.created_date, o.sent_date, o.order_idx, o.comment,o.total_price,o.total_price_hidden, u.client_name , u.tax_id, u.ident as user_ident,org.ident as org_ident,o.commision as name,u.street,u.zip,u.city,u.country, u.phone, u.email
FROM eform.\`order\` o 
join \`user\` u on  u.id = o.user_id
join organization org on org.id = o.organization_id 
where o.id like ?
`}
    else {

        orderDetailsQuery = `SELECT o.id, o.commision, o.created_date, o.sent_date, o.comment, o.order_idx, u.client_name , u.tax_id, u.ident as user_ident,org.ident as org_ident,s.name,s.street,s.zip,s.city,s.country, s.phone, s.email
FROM \`order\` o 
join \`user\` u on  u.id = o.user_id
join send_address s on s.id = o.send_address_id 
join organization org on org.id = o.organization_id 
where o.id like ?`
    }

    let orderDetails = await selectQuery(orderDetailsQuery, orderId);
    
    orderDetails = dateUtils.humanizeData(orderDetails)[0];

    return { orderDetails, orderItems }
}


async function deleteOrder(orderId) {
    const query = "DELETE FROM \`order\` WHERE id like ?";
    const response = await deleteQuery(query, orderId);
    return response;
}


async function getUserOrders(userId, limit = 10, offset = 0, sent = false, organization = false, employeeId = null) {
    let query = ''


    if (organization) {
        
        if (!sent) {
            query = `
             SELECT o.id,o.user_id,o.order_address_id, o.commision,o.total_price,o.created_date,o.sent_date,o.organization_id,o.comment,o.status,o.send_address_id,o.order_idx, u.ident as user_ident FROM \`order\` o
            join \`user\` u on o.user_id = u.id
            WHERE o.organization_id = ? and o.status like 'active'
            ORDER BY o.id DESC 
            LIMIT ? OFFSET ?
        `;
        } else {
            query = `
            SELECT o.id,o.user_id,o.order_address_id, o.commision,o.total_price,o.created_date,o.sent_date,o.organization_id,o.comment,o.status,o.send_address_id,o.order_idx, u.ident as user_ident FROM \`order\` o
            join \`user\` u on o.user_id = u.id
            WHERE o.organization_id = ? and o.status like 'sent'
            ORDER BY o.sent_date DESC 
            LIMIT ? OFFSET ?
        `;
        }

        try {

            const rows = await selectQuery(query, [organization, limit, offset]);
            const result = dateUtils.humanizeData(rows);

            if (result.length == 0) { return false }
            return result;

        }
        catch (err) {
            console.error(err);
            return false;
        }
    }

    const sqlInput = employeeId !== null ? [' AND employee_id = ? '] : '';

    if (!sent) {
        query = `
        SELECT o.id, o.user_id, o.order_address_id, o.commision, o.total_price, o.created_date, o.sent_date, o.organization_id, o.comment, o.status, o.send_address_id, o.order_idx, o.value, o.total_price_hidden, o.employee_id
,e.id as emp_id, e.name, e.surname FROM \`order\` o 
        left join employee e on e.id = o.employee_id
        WHERE  o.user_id = ? ${sqlInput} and o.status like 'active'
        ORDER BY o.id DESC 
        LIMIT ? OFFSET ?
    `;
    }
    else {
        query = `
        SELECT o.id, o.user_id, o.order_address_id, o.commision, o.total_price, o.created_date, o.sent_date, o.organization_id, o.comment, o.status, o.send_address_id, o.order_idx, o.value, o.total_price_hidden, o.employee_id
,e.id as emp_id, e.name, e.surname FROM \`order\` o 
        left join employee e on e.id = o.employee_id
        WHERE o.user_id = ? ${sqlInput} and o.status like 'sent'
        ORDER BY o.sent_date DESC 
        LIMIT ? OFFSET ?
    `;
    }

    try {
        let rows;
        if (employeeId !== null) {
            rows = await selectQuery(query, [userId, employeeId, limit, offset]);
        } else {
            rows = await selectQuery(query, [userId, limit, offset]);
        }

        const result = dateUtils.humanizeData(rows);
        if (result.length == 0) { return false }
        
        return result;
    }
    catch (err) {
        console.error(err);
        return false;
    }
}


async function getUserOrderId(orderId) {
    const query = `SELECT order_idx FROM \`order\` WHERE id = ?`;
    const result = await selectQuery(query, orderId);
    return result[0]?.order_idx || false;
}

async function countUserOrders(userId, sent = false, organization = false, employeeId = null) {
    let sql;
    try {
        let count
        if (organization) {
            
            if (!sent) {
                count = await selectQuery(
                    "SELECT COUNT(*) as count FROM `order` WHERE organization_id = ? and status like 'active'", organization
                );
            }
            else {
                count = await selectQuery(
                    "SELECT COUNT(*) as count FROM `order` WHERE organization_id = ? and status like 'sent'", organization
                );
            }
        } else {

            const sqlInput = employeeId !== null ? ' AND employee_id = ? ' : '';
            if (!sent) {
                sql = `
                    SELECT COUNT(*) as count FROM \`order\` WHERE user_id = ? ${sqlInput} and status like 'active'`
            }
            else {
                sql =
                    `SELECT COUNT(*) as count FROM \`order\` WHERE user_id = ? ${sqlInput} and status like 'sent'`
            }
            if (employeeId !== null) {
                count = await selectQuery(sql, [userId, employeeId]);
            } else {
                count = await selectQuery(sql, [userId]);
            }
        }

        if (!count || count.length === 0) {
            return 0;
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

        return response[0]?.insertId;

    }

    catch (err) {
        console.error(err);
        return false;
    }
}

async function insertNewOrder(commision, addressId, userId, comment, sendAddressId = null, totalPrice = 0, employeeId = null) {
    
    const query = `INSERT INTO \`order\` 
    (user_id,
    order_address_id,
    commision,
    total_price,
    organization_id,
    comment,
    status,
    created_date,
    send_address_id,
    employee_id)
    values (?,?,?,?,
    (select u.organization_id from eform.\`user\` u  where u.id =?) 
    ,?,'active',?,?,?)`
    try {
        const response = await insertQuery(query,
            [userId,
                addressId,
                commision,
                totalPrice,
                userId,
                comment,
                dateUtils.getDbTimestamp(),
                sendAddressId !== undefined && sendAddressId !== null ? sendAddressId : null,
                employeeId
            ]
        )

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
async function updateOrderPriceOnSend(orderId, prices) {
    const hidden = prices?.hiddenPrices[0] ?? null;
    const visible = prices?.visiblePrices[0] ?? null;

    const query = `UPDATE \`order\` SET total_price = ?, total_price_hidden = ?  where id = ?`
    try {
        const response = await updateQuery(query, [visible, hidden, orderId])
        return response;
    }

    catch (err) {
        console.error(err);
        return false;
    }
}
async function getTotal(orderId) {
    const query = `select SUM(total_price) as total_price_hidden, SUM(unit_price) as total_price from order_item where order_id = ?`;
    const result = await selectQuery(query, orderId);
    return {
        visible: result[0]?.total_price || 0,
        hidden: result[0]?.total_price_hidden || 0
    };
}

async function saveDiscount(orderId, discountPercentage, discountValue) {
    const query = `UPDATE \`order\` SET client_discount_percentage = ?, client_discount_value = ? WHERE id = ?`;
    try {
        const response = await updateQuery(query, [discountPercentage, discountValue, orderId]);
        
        return {
            discountPercentage: response[0]?.client_discount_percentage,
            discountValue: response[0]?.client_discount_value
        };
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function getDiscount(orderId) {
    const query = `SELECT client_discount_percentage, client_discount_value FROM \`order\` WHERE id = ?`;
    const result = await selectQuery(query, orderId);
    if (result.length === 0) {
        return null;
    }

    return result[0]
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
    getUserOrderId,
    getOrderWithItems,
    checkOwner,
    updateOrderPriceOnSend,
    getTotal,
    saveDiscount,
    getDiscount,
    getOrderNo
}

