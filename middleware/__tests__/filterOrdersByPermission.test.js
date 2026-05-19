const assert = require('node:assert');
const { test } = require('node:test');
const { filterOrdersByPermission } = require('../employeePermissions');

/**
 * Helper: tworzy mock obiektu req z opcjonalnymi employeePermissions, user i employee w sesji
 */
function mockReq({ employeePermissions, userId, employeeId } = {}) {
    const session = {};
    if (employeePermissions !== undefined) {
        session.employeePermissions = employeePermissions;
    }
    if (userId !== undefined) {
        session.user = { id: userId };
    }
    if (employeeId !== undefined) {
        session.employee = { id: employeeId };
    }
    return { session, orderFilter: undefined };
}

test('filterOrdersByPermission sets orderFilter=null when user is not an employee (no employeePermissions)', (t, done) => {
    const req = mockReq({ userId: 10 });
    filterOrdersByPermission(req, {}, () => {
        assert.strictEqual(req.orderFilter, null);
        done();
    });
});

test('filterOrdersByPermission sets orderFilter with type "all" and userId when employee has can_see_all_orders=true', (t, done) => {
    const req = mockReq({
        employeePermissions: { can_send_orders: false, can_see_prices: false, can_see_all_orders: true },
        userId: 42,
        employeeId: 7
    });
    filterOrdersByPermission(req, {}, () => {
        assert.deepStrictEqual(req.orderFilter, { type: 'all', userId: 42 });
        done();
    });
});

test('filterOrdersByPermission sets orderFilter with type "own" and employeeId when employee has can_see_all_orders=false', (t, done) => {
    const req = mockReq({
        employeePermissions: { can_send_orders: true, can_see_prices: true, can_see_all_orders: false },
        userId: 42,
        employeeId: 7
    });
    filterOrdersByPermission(req, {}, () => {
        assert.deepStrictEqual(req.orderFilter, { type: 'own', employeeId: 7 });
        done();
    });
});

test('filterOrdersByPermission always calls next()', (t, done) => {
    const req = mockReq({
        employeePermissions: { can_send_orders: false, can_see_prices: false, can_see_all_orders: false },
        userId: 1,
        employeeId: 2
    });
    let nextCalled = false;
    filterOrdersByPermission(req, {}, () => {
        nextCalled = true;
        assert.strictEqual(nextCalled, true);
        done();
    });
});

test('filterOrdersByPermission uses correct employeeId from session.employee', (t, done) => {
    const req = mockReq({
        employeePermissions: { can_send_orders: false, can_see_prices: false, can_see_all_orders: false },
        userId: 100,
        employeeId: 55
    });
    filterOrdersByPermission(req, {}, () => {
        assert.strictEqual(req.orderFilter.employeeId, 55);
        assert.strictEqual(req.orderFilter.type, 'own');
        done();
    });
});

test('filterOrdersByPermission uses correct userId from session.user when can_see_all_orders=true', (t, done) => {
    const req = mockReq({
        employeePermissions: { can_send_orders: false, can_see_prices: false, can_see_all_orders: true },
        userId: 100,
        employeeId: 55
    });
    filterOrdersByPermission(req, {}, () => {
        assert.strictEqual(req.orderFilter.userId, 100);
        assert.strictEqual(req.orderFilter.type, 'all');
        done();
    });
});
