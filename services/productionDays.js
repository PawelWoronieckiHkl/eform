const ELECTRIC_EXTRA_DAYS = 5;

function isElectric(jsonParams) {
    if (!jsonParams) return false;
    if (jsonParams.MOTOR && String(jsonParams.MOTOR).trim() !== '') return true;
    if (jsonParams.STEROWANIE_ELEKTRYCZNE && String(jsonParams.STEROWANIE_ELEKTRYCZNE).trim() !== '') return true;
    if (String(jsonParams.STEROWANIE).toUpperCase() === 'EL') return true;
    return false;
}

function isSlope(jsonParams) {
    if (!jsonParams) return false;
    const model = String(jsonParams.MODEL || '').toUpperCase();
    return model.includes('SLOPE');
}

function computeItemProductionDays(item, productionTimes) {
    const groupData = productionTimes[item.asortment_group_number];
    if (!groupData) return null;

    const jp = item.json_parameters || {};
    let days = isSlope(jp) && groupData.slopeDays != null
        ? groupData.slopeDays
        : groupData.days;

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

module.exports = { computeItemProductionDays, buildItemProductionDays, ELECTRIC_EXTRA_DAYS };
