'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { importResolvedOrder, readQuantity, buildSendAddress } = require('../orderImporter');

test('readQuantity falls back to 1 for missing/invalid values', () => {
  assert.equal(readQuantity({}), 1);
  assert.equal(readQuantity({ ILOSC: 'abc' }), 1);
  assert.equal(readQuantity({ ILOSC: 0 }), 1);
  assert.equal(readQuantity({ ILOSC: -3 }), 1);
});

test('readQuantity reads canonical and Polish-accent variants', () => {
  assert.equal(readQuantity({ ILOSC: 4 }), 4);
  assert.equal(readQuantity({ 'ILOŚĆ': '6' }), 6);
});

test('buildSendAddress maps payload to send_address columns', () => {
  const out = buildSendAddress({
    name: 'Acme', client: 'Acme', address: 'Main 1', city: 'Berlin',
    zip: '10115', country: 'de', phone: '+49', email: 'x@y.z'
  });
  assert.deepEqual(out, {
    name: 'Acme', street: 'Main 1', city: 'Berlin', zip: '10115',
    country: 'de', phone: '+49', email: 'x@y.z'
  });
});

test('buildPersistedParameters keeps all import params and overlays engine prices', () => {
  const { buildPersistedParameters, restoreParametersAfterRecalc } = require('../orderImporter');
  const out = buildPersistedParameters(
    { SZEROKOSC: 1320, WYSOKOSC: 1860, MODEL: 'H50', ILOSC: 1 },
    { MODEL: 'H50', CENA: 276, SZEROKOSC: '', WYSOKOSC: '', SZEROKOSC___VISIBLE: false }
  );
  assert.equal(out.SZEROKOSC, 1320);
  assert.equal(out.WYSOKOSC, 1860);
  assert.equal(out.CENA, 276);
  assert.equal(out.SZEROKOSC___VISIBLE, false);

  const afterRecalc = restoreParametersAfterRecalc(out, {
    MODEL: 'H50', CENA: 280, ILOSC: 1, SZEROKOSC___VISIBLE: false
  });
  assert.equal(afterRecalc.SZEROKOSC, 1320);
  assert.equal(afterRecalc.WYSOKOSC, 1860);
  assert.equal(afterRecalc.CENA, 280);
});

test('importResolvedOrder runs the full pipeline with stubs', async () => {
  const calls = { sendAddress: [], order: [], items: [] };

  const ordersDb = {
    async insertSendAddress(addr) { calls.sendAddress.push(addr); return 77; },
    async insertNewOrder(commision, addressId, userId, comment, sendAddressId) {
      calls.order.push({ commision, addressId, userId, comment, sendAddressId });
      return 999;
    }
  };
  const positionsDb = {
    async insertNewForm(formData) {
      calls.items.push(formData);
      return [{ insertId: 1000 + calls.items.length }];
    },
    async reindexOrderPositions() {},
    async updateOrderPrice() {},
    async getAppVersion() { return '1'; }
  };
  const itemBuilder = {
    buildOrderItemStructure(...args) {
      // Project to the keys our importer relies on for the assertions.
      return {
        order: args[0],
        amount: args[10],
        groupNumber: args[13],
        lang: args[14],
        groupName: args[16],
        jsonValues: args[8],
        jsonValuesToDisplay: args[9]
      };
    }
  };
  const translator = async (params) => {
    // Simulate description→canonical mapping.
    const remap = { Color: 'KOLOR', Quantity: 'ILOSC' };
    const out = {};
    for (const [k, v] of Object.entries(params)) out[remap[k] || k] = v;
    return out;
  };
  const formEngine = {
    async calculatePrices() {
      return {
        values: { KOLOR: 'Black', ILOSC: 3 },
        displayValues: { KOLOR: 'Black', ILOSC: 3 },
        total: { total: 100, total_hidden: 120, total_sub: 0 },
        shortJson: { data: { KOLOR: 'Black' }, order: ['KOLOR'] }
      };
    },
    displayValuesToWireFormat: (dv) => JSON.stringify(Object.entries(dv || {})),
    stubDisplayEntries: (v) => Object.entries(v || {}).map(([k, val]) => [k, { option_value: String(val) }])
  };
  const displayBuilder = async ({ values }) => ({
    KOLOR: {
      param_description: 'Color',
      option_value: values.KOLOR,
      option_description: 'Black',
      row: '1',
      locked: false,
      sub: false
    },
    ILOSC: {
      param_description: 'Quantity',
      option_value: values.ILOSC,
      option_description: '',
      row: '1',
      locked: false,
      sub: false
    }
  });

  const payload = {
    userIdent: 'U1', commission: 'CM-1', comment: 'hi',
    name: 'Acme', address: 'Main 1', city: 'Berlin', zip: '1', country: 'de',
    items: [
      { product: 'SLOPE', commission: 'POS-1',
        parameters: { Color: 'Black', Quantity: 3 } }
    ]
  };
  const user = { id: 42, ident: 'U1' };

  const res = await importResolvedOrder({
    payload, user, lang: 'de',
    deps: {
      orders: ordersDb,
      positions: positionsDb,
      itemBuilder,
      translator,
      formEngine,
      displayBuilder,
      groupNameResolver: async () => 'COSIFLOR',
      optionValidator: async () => ({ ok: true, errors: [] }),
      log: () => {}
    }
  });

  assert.equal(res.orderId, 999);
  assert.equal(res.sendAddressId, 77);
  assert.deepEqual(res.itemIds, [1001]);

  assert.equal(calls.sendAddress.length, 1);
  assert.equal(calls.order[0].userId, 42);
  assert.equal(calls.order[0].sendAddressId, 77);
  assert.equal(calls.order[0].commision, 'CM-1');

  assert.equal(calls.items.length, 1);
  assert.equal(calls.items[0].order, 999);
  assert.equal(calls.items[0].groupNumber, 'SLOPE');
  assert.equal(calls.items[0].lang, 'de');
  assert.equal(calls.items[0].groupName, 'COSIFLOR');
  assert.equal(calls.items[0].amount, 3);
  assert.deepEqual(calls.items[0].jsonValues, { KOLOR: 'Black', ILOSC: 3 });
  assert.match(calls.items[0].jsonValuesToDisplay, /Color/);
  assert.match(calls.items[0].jsonValuesToDisplay, /Quantity/);
});

test('importResolvedOrder skips send_address when payload has none', async () => {
  let sendAddressCalled = false;
  const ordersDb = {
    async insertSendAddress() { sendAddressCalled = true; return 1; },
    async insertNewOrder() { return 5; }
  };
  const positionsDb = {
    async insertNewForm() { return [{ insertId: 1 }]; },
    async reindexOrderPositions() {},
    async updateOrderPrice() {},
    async getAppVersion() { return '1'; }
  };
  const itemBuilder = { buildOrderItemStructure: () => ({}) };
  const translator = async (p) => p;
  const formEngine = {
    async calculatePrices() {
      return {
        values: { KOLOR: 'X' },
        displayValues: { KOLOR: 'X' },
        total: { total: 0, total_hidden: 0, total_sub: 0 },
        shortJson: {}
      };
    },
    displayValuesToWireFormat: (dv) => JSON.stringify(Object.entries(dv || {})),
    stubDisplayEntries: (v) => Object.entries(v || {}).map(([k, val]) => [k, { option_value: String(val) }])
  };
  const displayBuilder = async ({ values }) => ({ KOLOR: { option_value: values.KOLOR } });

  const res = await importResolvedOrder({
    payload: {
      userIdent: 'U1',
      items: [{ product: 'SLOPE', parameters: { KOLOR: 'X' } }]
    },
    user: { id: 1 },
    lang: 'pl',
    deps: {
      orders: ordersDb,
      positions: positionsDb,
      itemBuilder,
      translator,
      formEngine,
      displayBuilder,
      groupNameResolver: async () => '',
      optionValidator: async () => ({ ok: true, errors: [] }),
      log: () => {}
    }
  });

  assert.equal(sendAddressCalled, false);
  assert.equal(res.sendAddressId, null);
  assert.equal(res.orderId, 5);
});

test('importResolvedOrder throws and inserts nothing when option validation fails', async () => {
  const calls = { sendAddress: 0, order: 0, items: 0 };
  const ordersDb = {
    async insertSendAddress() { calls.sendAddress += 1; return 1; },
    async insertNewOrder() { calls.order += 1; return 5; }
  };
  const positionsDb = {
    async insertNewForm() { calls.items += 1; return [{ insertId: 1 }]; },
    async reindexOrderPositions() {},
    async updateOrderPrice() {},
    async getAppVersion() { return '1'; }
  };
  const itemBuilder = { buildOrderItemStructure: () => ({}) };
  const translator = async (p) => p;
  const formEngine = {
    displayValuesToWireFormat: (dv) => JSON.stringify(Object.entries(dv || {})),
    stubDisplayEntries: (v) => Object.entries(v || {}).map(([k, val]) => [k, { option_value: String(val) }])
  };
  const displayBuilder = async () => ({});

  await assert.rejects(
    importResolvedOrder({
      payload: {
        userIdent: 'U1',
        items: [{ product: 'SLOPE', posid: 7, parameters: { KOLOR: 'nieistniejacy' } }]
      },
      user: { id: 1, ident: 'U1' },
      lang: 'pl',
      deps: {
        orders: ordersDb,
        positions: positionsDb,
        itemBuilder,
        translator,
        formEngine,
        displayBuilder,
        groupNameResolver: async () => '',
        optionValidator: async () => ({
          ok: false,
          errors: ['Parameter "KOLOR": value "nieistniejacy" not found in available options (group SLOPE)']
        }),
        log: () => {}
      }
    }),
    /Parameter validation failed for group SLOPE \(item 7\).*KOLOR.*nieistniejacy/
  );

  // Hard guarantee: a failed validation must not create the order or its items.
  assert.equal(calls.order, 0);
  assert.equal(calls.items, 0);
});
