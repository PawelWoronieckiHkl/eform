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

async function getUserAddresses(userId, orderId = null) {
    let query;

    query = `SELECT id, name, phone_number AS phone, street, city, zip, country FROM delivery_address WHERE user_id = ?`;
    if (orderId) {
        query += ` AND id = (SELECT order_address_id FROM \`order\` WHERE id = ?)`;
    }
    const addresses = await selectQuery(query, orderId ? [userId, orderId] : [userId]);
    return addresses;
}

async function getUserMails(userId) {
    const query = `SELECT id, email FROM contact_info WHERE user_id = ?`;
    const mails = await selectQuery(query, [userId]);
    return mails;
}

async function getAddressById(addressId) {
    const query = `SELECT id, name, phone_number AS phone, street, city, zip, country FROM delivery_address WHERE id = ?`;
    const addresses = await selectQuery(query, [addressId]);
    return addresses[0];
}

async function getMailById(mailId) {
    const query = `SELECT id, email FROM contact_info WHERE id = ?`;
    const mails = await selectQuery(query, [mailId]);
    return mails[0];
}

async function updateAddress(addressId, payload) {
    const query = `UPDATE delivery_address SET name = ?, phone_number = ?, street = ?, city = ?, zip = ?, country = ? WHERE id = ?`;
    const { name, phone, street, city, zip, country } = payload;
    await updateQuery(query, [name, phone, street, city, zip, country, addressId]);
}

async function updateMail(mailId, payload) {
    const query = `UPDATE contact_info SET email = ? WHERE id = ?`;
    const { mail } = payload;
    await updateQuery(query, [mail, mailId]);
}

async function deleteAddress(addressId) {
    const query = `DELETE FROM delivery_address WHERE id = ?`;
    await deleteQuery(query, [addressId]);
}

async function deleteMail(mailId) {
    const query = `DELETE FROM contact_info WHERE id = ?`;
    await deleteQuery(query, [mailId]);
}

module.exports = {
    insertDeliveryAddress,
    insertMailAddress,
    getUserAddresses,
    getUserMails,
    getAddressById,
    getMailById,
    updateAddress,
    updateMail,
    deleteAddress,
    deleteMail
}
