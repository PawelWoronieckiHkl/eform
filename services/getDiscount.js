const db = require("../db/db_helper.js");
const { calcSubTotals, resolveDiscountBaseTotal } = require('./subPrices');

async function getPriceAfterDiscount(orderId) {
    const discount = await db.getDiscount(orderId);
    const totals = await db.getTotal(orderId);
    const { orderDetails, orderItems } = await db.getOrderWithItems(orderId);
    const orgId = orderDetails?.organization_id;

    let baseTotal = parseFloat(totals.visible) || 0;
    if (orgId != null && Number(orgId) !== 3) {
        const subTotals = calcSubTotals(orderItems);
        baseTotal = resolveDiscountBaseTotal(orgId, totals, subTotals);
    }

    const discountPercentage = parseFloat(discount.client_discount_percentage);
    const discountValue = parseFloat(discount.client_discount_value);
    if (Number.isFinite(discountPercentage) && discountPercentage > 0) {
        let result = baseTotal - (baseTotal * (discountPercentage / 100));
        return {
            result: result.toFixed(2),
            type: 'percentage',
            discountValue: discountPercentage,
            baseTotal: baseTotal.toFixed(2)
        };
    }
    if (Number.isFinite(discountValue) && discountValue > 0) {
        let result = baseTotal - discountValue;
        return {
            result: result.toFixed(2),
            type: 'value',
            discountValue: discountValue,
            baseTotal: baseTotal.toFixed(2)
        };
    }
    return {
        result: baseTotal.toFixed(2),
        type: 'none',
        discountValue: 0,
        baseTotal: baseTotal.toFixed(2)
    };
}

module.exports = {
    getPriceAfterDiscount
};
