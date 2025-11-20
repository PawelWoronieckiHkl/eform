const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('../core')
const dateUtils = require("../../utils/humanize_date.js");
const e = require("express");
const bcrypt = require('bcryptjs');


async function getLanguage(pin) {
    const query = 'SELECT country FROM \`user\` WHERE pin = ?'
    let result = await selectQuery(query, pin)
    if (result[0]) {
        console.log(result[0])
        return result[0].country.toLowerCase();
    }
    else {
        return 'en'
    }
}


async function getFirstLogonInfo(pin) {
    const query = 'SELECT first_login_at from `user` where pin like ?'
    let result = await selectQuery(query, pin)
    return result[0].first_login_at
}

async function uodateFirstLogonInfo(pin) {
    const query = 'UPDATE `user` SET first_login_at = ? WHERE pin LIKE ?'
    const now = dateUtils.getDbTimestamp()
    let result = await updateQuery(query, [now, pin])
    console.log(result, 'first logon update result')
    return result
}
async function setUserAcceptedRODO(pin) {
    const query = 'UPDATE `user` SET privacy_policy_accepted_at = ? WHERE pin LIKE ?'
    const now = dateUtils.getDbTimestamp()
    console.log(now, pin, 'now')
    let result = await updateQuery(query, [now, pin])
    console.log(result)
    return result
}

async function getPolicyState(pin) {
    const query = 'SELECT privacy_policy_accepted_at from `user` where pin like ?'
    let result = await selectQuery(query, pin)
    return result[0].privacy_policy_accepted_at
}


async function getUserLogo(pin) {
    const query = `select o.photo_path from user u join organization o on u.organization_id = o.id
    where u.pin = ?`;
    let result = await selectQuery(query, pin)
    return result[0].photo_path;
}

async function getUserMail(pin) {
    const query = 'select o.email as organization_email,o.email2 as organization_email2,u.email as user_email from `user` u join organization o on u.organization_id = o.id where u.pin = ?';
    let result = await selectQuery(query, pin)
    return result[0];
}


async function getOwner(pin) {
    const query = `select o.ident as orgIdent, o.id as orgId, u.ident as userIdent from user u join organization o on u.organization_id = o.id
    where u.pin = ?`;
    let result = await selectQuery(query, pin)
    return result[0];
}


async function updateUserPasswordByPin(pin, hash) {
    const sql = 'UPDATE eform.`user` SET password = ? WHERE pin = ?';
    const response = await updateQuery(sql, [hash, pin]);
    return response
}



async function getDbPassword(pin) {

    const query = `SELECT password FROM user WHERE pin LIKE ?`;

    try {
        const rows = await selectQuery(query, [pin]);

        if (rows.length > 0) {

            return rows[0].password;
        } else {

            return false;
        }
    } catch (err) {
        await connection.end();
        console.error(err);
        return false;
    }
}

async function getUserId(pin) {
    const query = `SELECT id FROM user WHERE pin LIKE ?`;
    const result = await selectQuery(query, [pin])

    return result[0].id;
}
async function getUserIdent(pin) {
    const query = `SELECT ident FROM user WHERE pin LIKE ?`;
    const result = await selectQuery(query, [pin])

    return result[0].id;
}

async function getUserByIdent(ident) {
    const query = `SELECT * FROM user WHERE ident = ?`;
    const result = await selectQuery(query, [ident]);

    if (result.length > 0) {
        return result[0];
    }
    return null;
}

async function updateUserIdent(oldIdent, newIdent) {
    const sql = `UPDATE eform.\`user\` SET ident = ? WHERE ident = ?`;
    const result = await updateQuery(sql, [newIdent, oldIdent]);
    return result;
}
async function getUserData(pin) {
    const query = `SELECT * FROM \`user\` WHERE pin LIKE ?`;

    try {
        const rows = await selectQuery(query, [pin])
        return rows[0];
    }
    catch (err) {
        await connection.end();
        console.error(err);
        return false;
    }
}


async function getUsers() {
    const sql = `
        SELECT 
            id,
            ident, 
            client_name AS name, 
            street AS address, 
            city, 
            zip, 
            tax_id AS taxid, 
            pin, 
            password
        FROM eform.\`user\`
    `;
    const result = await selectQuery(sql);

    return result;
}

async function getUserName(pin) {
    const query = `SELECT client_name FROM \`user\` WHERE pin LIKE ?`;
    const result = await selectQuery(query, [pin]);
    return result[0].client_name;
}

async function addUser(userData) {
    const {
        ident,
        name,
        address,
        city = '',
        zip = '',
        taxid,
        pin,
        country = 'en',
        password,
        phone = '',
        email = '',
        organization_id
    } = userData;

    const escapeApostrophe = (str) => (str || '').replace(/'/g, "''");

    const client_name = escapeApostrophe(name);
    const street = escapeApostrophe(address);
    const tax_id = escapeApostrophe(taxid);
    const escapedIdent = escapeApostrophe(ident);
    const escapedCity = escapeApostrophe(city);
    const escapedZip = escapeApostrophe(zip);
    const escapedCountry = escapeApostrophe(country);

    const hashedPassword = bcrypt.hashSync(password, 12);

    const sql = `
        INSERT INTO eform.\`user\`
        (ident, client_name, street, city, zip, tax_id, pin, password, country, organization_id,phone, email)
        VALUES (
            '${escapedIdent}',
            '${client_name}',
            '${street}',
            '${escapedCity}',
            '${escapedZip}',
            '${tax_id}',
            '${pin}',
            '${hashedPassword}',
            '${escapedCountry}',
            '${organization_id}',
            '${phone}',
            '${email}'
        )
    `;

    try {
        const result = await insertQuery(sql, []);
        return result.insertId;
    } catch (err) {
        throw new Error('Błąd przy dodawaniu użytkownika: ' + err.message);
    }
}
async function updateUser(userPin, email = '', phone = '') {
    const sql = `UPDATE eform.\`user\` set phone = ?, email = ? where pin like ?`;
    const result = await updateQuery(sql, [phone, email, userPin]);
    return result;
}

async function updateUserById(userId, updateData) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (fields.length === 0) {
        throw new Error('Brak danych do aktualizacji');
    }

    values.push(userId);

    const sql = `UPDATE eform.\`user\` SET ${fields.join(', ')} WHERE id = ?`;
    const result = await updateQuery(sql, values);
    return result;
}

async function getUserAddresses(userId) {

    const query = 'select a.id,a.street,a.city,a.zip,a.country,a.phone,a.email,o.commision, o.user_id  from `order` o join order_address a on o.order_address_id  = a.id where o.user_id =?';
    const addresses = await selectQuery(query, userId);

    return { addresses }
}

async function updateUserOrganization(ident, organizationId) {
    const sql = `UPDATE eform.\`user\` SET organization_id = ? WHERE ident = ?`;
    const result = await updateQuery(sql, [organizationId, ident]);
    return result;
}

module.exports = {
    getLanguage,
    getFirstLogonInfo,
    getPolicyState,
    getUserLogo,
    getOwner,
    updateUserPasswordByPin,
    getDbPassword,
    getUserData,
    getUsers,
    addUser,
    getUserId,
    getUserMail,
    updateUser,
    updateUserById,
    getUserAddresses,
    getUserName,
    setUserAcceptedRODO,
    uodateFirstLogonInfo,
    getUserIdent,
    getUserByIdent,
    updateUserIdent,
    updateUserOrganization,

}