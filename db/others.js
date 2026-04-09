const { selectQuery, insertQuery, updateQuery, deleteQuery } = require('./core')
const dateUtils = require("../utils/humanize_date.js");
const e = require("express");
const bcrypt = require('bcryptjs');

async function getDeliveryTimes(userPin) {
    const query = 'SELECT * FROM organization_delivery_terms WHERE organization_id LIKE (select organization_id from `user` where pin=?)'
    let result = await selectQuery(query, userPin)
    return result;
}

async function getGroupDeliveryTimes(orgId) {
    const query = `
        SELECT gm.group_number, gm.is_slope,
               MAX(CAST(odt.lead_time AS UNSIGNED)) as max_lead_time
        FROM group_delivery_mapping gm
        JOIN organization_delivery_terms odt ON odt.product_code = gm.product_code
        WHERE odt.organization_id = ?
        GROUP BY gm.group_number, gm.is_slope`;
    const rows = await selectQuery(query, [orgId]);
    if (!rows) return {};
    const map = {};
    for (const row of rows) {
        if (!map[row.group_number]) {
            map[row.group_number] = { days: 0, slopeDays: null };
        }
        if (row.is_slope) {
            map[row.group_number].slopeDays = row.max_lead_time;
        } else {
            map[row.group_number].days = Math.max(map[row.group_number].days, row.max_lead_time);
        }
    }
    return map;
}

module.exports = {getDeliveryTimes, getGroupDeliveryTimes}