const e = require('express');
const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('../core')


async function insertNewForm(formData) {
    const insertFormQuery = 'INSERT INTO order_item(order_id, name, commision, json_parameters, json_parameters_desc, amount, list_price, discount_percentage, discount, unit_price, total_price,comment,ver,asortment_group_number,lang,department,group_name) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)'
    console.log('siema')
    const fields = [
        formData.order,
        formData.name,
        formData.commission,
        JSON.stringify(formData.jsonValues),
        JSON.stringify(formData.jsonValuesToDisplay),
        formData.amount,
        JSON.stringify(formData.listPrice),
        formData.discountPercentage,
        formData.discount,
        formData.unitPrice,
        formData.totalPrice,
        formData.comment,
        formData.version,
        formData.groupNumber,
        formData.lang,
        formData.department,
        formData.group
    ];
    console.log(fields)
    const response = await insertQuery(insertFormQuery, fields);

    return response;

}


async function getPosition(positionId) {
    const query = 'SELECT * FROM order_item WHERE id LIKE ?'
    let result = await selectQuery(query, positionId)
    return result[0];
}

async function getLastChoice(userId) {
    const query = 'SELECT * FROM department,asortment_group WHERE user_pin LIKE ?'
    let result = await selectQuery(query, userId)
    return result[0];
}

async function updatePosition(positionData) {
    const query = `
    UPDATE order_item
    SET 
        commision = ?,
        name = ?,
        json_parameters = ?,
        json_parameters_desc = ?,
        comment = ?
    WHERE id = ?
  `;
    const values = [
        positionData.commission,
        positionData.commission,
        JSON.stringify(positionData.jsonValues),
        JSON.stringify(positionData.jsonValuesToDisplay),
        positionData.comment,
        parseInt(positionData.id)
    ]
    const response = updateQuery(query, values);
    return response
}



async function deletePosition(positionId) {
    const query = "DELETE FROM order_item WHERE id like ?";
    const response = await deleteQuery(query, positionId);
    return response;
}


async function getAppVersion(group, nodeVer) {
    console.log(nodeVer, "VERSION NODE @@@@@@@@@@@@@@@@")
    const nodes = {
        'dev': 'version_dev',
        'archive': 'version_archive',
        'test': 'version_string',
        'prod': 'version_string'
    }
    const connection = await connetToDb();
    await connection.connect();
    const table = nodes[nodeVer] || 'version_string';
    const query = `SELECT ${table} as version_string FROM app_version WHERE asort_group LIKE ?`;
    const [rows, fields] = await connection.query(query, group)
    console.log(rows, group)
    try {

        if (rows.length == 0) {
            const defaultVer = `SELECT ${table} as version_string from app_version where id = 1`
            const res = await connection.query(defaultVer)
            const insertQuery = `INSERT into app_version (asort_group,version_string,version_archive,version_dev) VALUES (?,?,?,?)`
            const response = await connection.query(insertQuery, [group, res[0][0].version_string, res[0][0].version_string, res[0][0].version_string])
            const getVer = `SELECT ${table} as version_string FROM app_version WHERE id LIKE ?`;
            const [ver, fields] = await connection.query(getVer, response[0].insertId)
            await connection.end();
            console.log(ver[0].version_string, "WERSJA")
            return ver[0].version_string;
        }
        await connection.end();
        return rows[0].version_string;
    }
    catch (err) {
        await connection.end();
        console.error(err);
        return false;
    }
}


async function updateAppVersion(version, groupNr, nodeVer) {
    console.log(nodeVer, "VERSION NODE @@@@@@@@@@@@@@@@")
    const nodes = {
        'dev': 'version_dev',
        'archive': 'version_archive',
        'test': 'version_string',
        'prod': 'version_string'
    }
    const table = nodes[nodeVer] || 'version_string';

    const connection = await connetToDb();
    await connection.connect();
    const query = `UPDATE app_version SET ${table}  = ? where asort_group = ?`
    try {
        const response = await connection.query(query, [version, groupNr])

        if (response[0].affectedRows == 0) {
            const insertQuery = `INSERT into app_version (asort_group,${table},version_archive,version_dev) VALUES (?,?,?,?)`
            const res = await connection.query(insertQuery, [groupNr, version, version, version])

        }

        await connection.end();
        return response;

    }
    catch (err) {
        await connection.end();
        console.error(err);
        return false;
    }
}



async function getFormVersion(groupNr) {
    const query = `select ver from order_item where asortment_group_number = ? order by id desc limit 1`

    let response = await selectQuery(query, groupNr);

    return response[0];
}

async function checkFavoriteExists(userId, productValue, groupNumber) {
    const sql = `
    SELECT 1
    FROM user_favorites 
    WHERE user_id = ${userId} 
      AND product_value = '${productValue}' 
      AND group_number = ${groupNumber}
  `;
    const result = await selectQuery(sql, [userId, productValue, groupNumber]);
    console.log(result)
    if (result) {
        console.log('Favorite exists');
        return true
    }
    else {
        console.log('Favorite does not exist');
        return false
    }

}
async function getFavs(userId, groupNumber) {
    const sql = `
    select * from user_favorites
    WHERE user_id = ${userId}
    and group_number = ${groupNumber}`;
    return selectQuery(sql);
}

async function addFavorite(userId, productValue, groupNumber) {
    const sql = `
    INSERT INTO user_favorites (user_id, product_value, group_number)
    VALUES (?, ?, ?)
  `;
    return insertQuery(sql, [userId, productValue, groupNumber]);
}

async function removeFavorite(userId, productValue, groupNumber) {
    const sql = `
    DELETE FROM user_favorites WHERE user_id = ${userId} AND product_value = '${productValue}' AND group_number = ${groupNumber}
  `;
    return deleteQuery(sql);
}

async function duplicateSendAddress(id) {
    const selectQueryStr = `
        SELECT * FROM send_address WHERE id = ?
    `;
    const response = await selectQuery(selectQueryStr, id);
    if (response.length > 0) {
        const { id, ...data } = response[0];
        console.log(data, 'DATA TO DUPLICATE')
        const newId = await insertQuery(`INSERT INTO send_address (
  street,
  city,
  zip,
  country,
  phone,
  email,
  user_id,
  name) values (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                data.street,
                data.city,
                data.zip,
                data.country,
                data.phone,
                data.email,
                data.user_id,
                data.name
            ])
        return newId[0].insertId;
    }
    return null;
}

async function duplicateOrderAddress(id) {
    const selectQueryStr = `
        SELECT * FROM order_address WHERE id = ?
    `;

    const response = await selectQuery(selectQueryStr, id);
    if (response.length > 0) {
        const { id, ...data } = response[0];
        console.log(data, 'DATA TO DUPLICATE')
        const newId = await insertQuery(`INSERT INTO order_address (
  street,
  city,
  zip,
  country,
  phone,
  email,
  user_id,
  name) values (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                data.street,
                data.city,
                data.zip,
                data.country,
                data.phone,
                data.email,
                data.user_id,
                data.name
            ])
        return newId[0].insertId;
    }
    return null;
}

module.exports = {
    insertNewForm,
    getPosition,
    duplicateOrderAddress,
    getLastChoice,
    updatePosition,
    deletePosition,
    getAppVersion,
    updateAppVersion,
    getFormVersion,
    checkFavoriteExists,
    addFavorite,
    getFavs,
    duplicateSendAddress,
    removeFavorite

}