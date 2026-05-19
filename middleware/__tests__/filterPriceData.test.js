const assert = require('node:assert');
const { test } = require('node:test');
const { filterPriceData } = require('../employeePermissions');

/**
 * Helper: tworzy mock obiektu req z opcjonalnymi employeePermissions w sesji
 */
function mockReq(employeePermissions) {
    return {
        session: employeePermissions !== undefined
            ? { employeePermissions }
            : {},
        hidePrices: undefined
    };
}

test('filterPriceData sets hidePrices=false when user is not an employee (no employeePermissions)', (t, done) => {
    const req = mockReq(undefined);
    filterPriceData(req, {}, () => {
        assert.strictEqual(req.hidePrices, false);
        done();
    });
});

test('filterPriceData sets hidePrices=false when employeePermissions is null', (t, done) => {
    const req = { session: { employeePermissions: null }, hidePrices: undefined };
    filterPriceData(req, {}, () => {
        assert.strictEqual(req.hidePrices, false);
        done();
    });
});

test('filterPriceData sets hidePrices=false when employee has can_see_prices=true', (t, done) => {
    const req = mockReq({ can_send_orders: false, can_see_prices: true, can_see_all_orders: false });
    filterPriceData(req, {}, () => {
        assert.strictEqual(req.hidePrices, false);
        done();
    });
});

test('filterPriceData sets hidePrices=true when employee has can_see_prices=false', (t, done) => {
    const req = mockReq({ can_send_orders: true, can_see_prices: false, can_see_all_orders: true });
    filterPriceData(req, {}, () => {
        assert.strictEqual(req.hidePrices, true);
        done();
    });
});

test('filterPriceData always calls next()', (t, done) => {
    const req = mockReq({ can_send_orders: false, can_see_prices: false, can_see_all_orders: false });
    let nextCalled = false;
    filterPriceData(req, {}, () => {
        nextCalled = true;
        assert.strictEqual(nextCalled, true);
        done();
    });
});

test('filterPriceData sets hidePrices=true when all permissions are false', (t, done) => {
    const req = mockReq({ can_send_orders: false, can_see_prices: false, can_see_all_orders: false });
    filterPriceData(req, {}, () => {
        assert.strictEqual(req.hidePrices, true);
        done();
    });
});
