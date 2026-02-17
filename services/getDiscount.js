const db = require("../db/db_helper.js");


async function getPriceAfterDiscount(orderId) {
    const discount = await db.getDiscount(orderId);
    const {visible,hidden} = await db.getTotal(orderId);
    const discountPercentage = discount.client_discount_percentage;
    const discountValue = discount.client_discount_value;
    if (discountPercentage && discountPercentage > 0) {
        let result = visible - (visible * (discountPercentage / 100));
        return {result: result.toFixed(2), 
                type : 'percentage'
                ,discountValue: discountPercentage
        };
    }
    else if (discountValue && discountValue > 0) {
        let result = visible - discountValue;
        return {result: result.toFixed(2), 
                type : 'value',
                discountValue: discountValue
        };
    }
    else{
        return {result: visible, 
                type : 'none',
                discountValue: 0
        };
    } 
}

module.exports = {
    getPriceAfterDiscount
};