const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('../core')
const dateUtils = require("../../utils/humanize_date.js");
const e = require("express");
const bcrypt = require('bcryptjs');

async function getDeliveryTimes(userPin) {
    const query = 'SELECT * FROM organization_delivery_terms WHERE organization_id LIKE (select organization_id from `user` where pin=?)'
    let result = await selectQuery(query, userPin)
    return result;
}

module.exports = {getDeliveryTimes}