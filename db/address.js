const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('./core')
const dateUtils = require("../utils/humanize_date.js");
const e = require("express");
const bcrypt = require('bcryptjs');



async function insertDeliveryAddress(payload, userId) {
    const query = `INSERT INTO delivery_address (user_id, name, phone_number, street, city, zip, country) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const { name, phone, street, city, zip, country } = payload;
    const result = await insertQuery(query, [userId, name, phone, street, city, zip, country]);
    return result.insertId;
}

async function insertMailAddress(payload, userId) {
    const query = `INSERT INTO contact_info (user_id, email) VALUES (?, ?)`;
    const { mail } = payload;
    const result = await insertQuery(query, [userId, mail]);
    return result.insertId;
}

async function getUserAddresses(userId) {
    const query = `SELECT id, name, phone_number AS phone, street, city, zip, country FROM delivery_address WHERE user_id = ?`;
    const addresses = await selectQuery(query, [userId]);
    return addresses;
}

async function getUserMails(userId) {
    const query = `SELECT id, email FROM contact_info WHERE user_id = ?`;
    const mails = await selectQuery(query, [userId]);
    return mails;
}

module.exports = {
    insertDeliveryAddress,
    insertMailAddress,
    getUserAddresses,
    getUserMails
}
