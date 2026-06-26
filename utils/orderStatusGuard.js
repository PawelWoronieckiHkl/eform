const db = require('../db/db_helper.js');

function sentOrderPath(orderId) {
    return `/orders/history/order/${orderId}`;
}

/**
 * Returns block reason when order must not be edited, or null if editing is allowed.
 */
async function getOrderMutationBlock(orderId, sessionUser) {
    const status = await db.getOrderStatus(orderId);

    if (status === 'correction') {
        if (sessionUser?.isAdmin) {
            return null;
        }
        return {
            success: false,
            status: 'error',
            message: 'Zamówienie jest w trakcie korekty administracyjnej.',
            redirect: sentOrderPath(orderId)
        };
    }

    if (status === 'sent') {
        return {
            success: false,
            status: 'error',
            message: 'Nie można edytować wysłanego zamówienia.',
            redirect: sentOrderPath(orderId)
        };
    }

    return null;
}

async function shouldRedirectFromActiveOrderView(orderId, sessionUser) {
    const status = await db.getOrderStatus(orderId);

    if (status === 'sent') {
        return { redirect: sentOrderPath(orderId) };
    }

    if (status === 'correction' && !sessionUser?.isAdmin) {
        return { redirect: sentOrderPath(orderId) };
    }

    return null;
}

async function isSentOrder(orderId) {
    return (await db.getOrderStatus(orderId)) === 'sent';
}

async function isCorrectionOrder(orderId) {
    return (await db.getOrderStatus(orderId)) === 'correction';
}

module.exports = {
    sentOrderPath,
    getOrderMutationBlock,
    shouldRedirectFromActiveOrderView,
    isSentOrder,
    isCorrectionOrder
};
