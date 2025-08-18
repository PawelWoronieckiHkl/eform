const mysql = require("mysql2/promise.js");
const dateUtils = require("../utils/humanize_date.js");
const e = require("express");
const bcrypt = require('bcryptjs');

async function connetToDb() {
    const connection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || '192.168.0.8',
        port: process.env.DATABASE_PORT || '8001',
        user: process.env.DATABASE_USER || 'portal_eform',
        password: process.env.DATABASE_PASSWORD || 'A5q|:4Ny',
        database: process.env.DATABASE || 'eform',

    });
    return connection;
}

async function selectQuery(query, data = false) {
    const connection = await connetToDb();
    await connection.connect();
    try {
        let [rows, fields] = ''
        if (data) {
            [rows, fields] = await connection.query(query, data);
        }
        else {
            [rows, fields] = await connection.query(query);
        }
        if (rows.length > 0) {
            await connection.end();
            return rows;
        } else {
            await connection.end();
            return false;
        }
    } catch (err) {
        await connection.end();
        console.error(err);
        return false;
    }
}

async function insertQuery(query, data) {
    const connection = await connetToDb();
    await connection.connect();
    try {
        const response = await connection.query(query, data)
        await connection.end()
        return response;
    }

    catch (err) {
        await connection.end();
        console.error(err);
        return false;
    }
}
async function updateQuery(query, data) {
    const connection = await connetToDb();
    await connection.connect();
    try {
        const response = await connection.query(query, data)
        await connection.end();
        return response;
    }

    catch (err) {
        await connection.end();
        console.error(err);
        return false;
    }
}


async function deleteQuery(query, data) {
    const connection = await connetToDb();
    await connection.connect();
    try {
        const [response] = await connection.query(query, [data])

        if (response.affectedRows) {
            return true
        }
        else { return false };
    }
    catch (err) {
        console.log(err)
    };
}


// module.exports = {
// getDbPassword,
// connetToDb,
// getUserData,
// insertOrderAddress,
// insertNewOrder,
// getUserOrders,
// getOrderDetails,
// updateOrderDetails,
// insertNewForm,
// deleteOrder,
// deletePosition,
// getOrderWithItems,
// getPosition,
// updateOrderComment,
// getFormVersion,
// getAppVersion,
// getPolicyState,
// updateAppVersion,
// getLanguage,
// getUserLogo,
// getOwner,
// updatePosition,
// getUserAddresses,
// countUserOrders,
// changeOrderStatus,
// getOrderDataToSend,
// updateUserPasswordByPin,
// getLastChoice,
// addUser,
// getFirstLogonInfo,
// getUsers
// };
// 

module.exports = {
    selectQuery, updateQuery, deleteQuery, insertQuery, connetToDb
}