const ELECTRIC_EXTRA_DAYS = 5;
const db = require('../db/db_helper');
const orderService = require('./orderService');

function isElectric(jsonParams) {
    if (!jsonParams) return false;
    if (jsonParams.MOTOR && String(jsonParams.MOTOR).trim() !== '') return true;
    if (jsonParams.STEROWANIE_ELEKTRYCZNE && String(jsonParams.STEROWANIE_ELEKTRYCZNE).trim() !== '') return true;
    if (String(jsonParams.STEROWANIE).toUpperCase() === 'EL') return true;
    return false;
}

function isSlope(jsonParams) {
    if (!jsonParams) return false;
    console.log(jsonParams.WYMIAROWANIE_SLOPOW___VISIBLE === true);
    if (jsonParams.WYMIAROWANIE_SLOPOW___VISIBLE === true) return true;
    const dodatki = String(jsonParams.DODATKI___DESCRIPTION || '').toUpperCase();
    return dodatki.includes('SLOPE') || dodatki.includes('SCHRÄG');
}

function computeItemProductionDays(item, productionTimes) {
    const groupData = productionTimes[item.asortment_group_number];
    if (!groupData) return null;

    const jp = item.json_parameters || {};
    let days = isSlope(jp) && groupData.slopeDays != null
        ? groupData.slopeDays
        : groupData.days;
        console.log(days);
    if (isElectric(jp)) {
        days += ELECTRIC_EXTRA_DAYS;
    }

    return days;
}

function buildItemProductionDays(cleanOrderItems, productionTimes) {
    const map = {};
    let maxProdDays = 0;
    for (const table of cleanOrderItems) {
        for (const rowObj of table.rows) {
            const days = computeItemProductionDays(rowObj.item, productionTimes);
            if (days != null) {
                map[rowObj.item.id] = days;
                if (days > maxProdDays) maxProdDays = days;
            }
        }
    }
    return { itemProductionDays: map, maxProdDays };
}

module.exports = { computeItemProductionDays, buildItemProductionDays, ELECTRIC_EXTRA_DAYS, recalcAndSaveMaxProdDays };

async function recalcAndSaveMaxProdDays(orderId) {
    try {
        const { orderDetails, orderItems } = await db.getOrderWithItems(orderId);
        if (!orderItems || orderItems.length === 0) {
            await db.updateMaxProdDays(orderId, 0);
            return 0;
        }
        const details = Array.isArray(orderDetails) ? orderDetails[0] : orderDetails;
        const orgId = details?.organization_id;
        const productionTimes = orgId ? await db.getGroupDeliveryTimes(orgId) : {};
        const { cleanOrderItems } = await orderService.jsonTextBackToMap(orderItems);
        const { maxProdDays } = buildItemProductionDays(cleanOrderItems, productionTimes);
        await db.updateMaxProdDays(orderId, maxProdDays);
        return maxProdDays;
    } catch (err) {
        console.error('recalcAndSaveMaxProdDays error:', err);
        return 0;
    }
}
