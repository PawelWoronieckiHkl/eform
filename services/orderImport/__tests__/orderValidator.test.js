'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateOrderPayload } = require('../orderValidator');

test('rejects non-object payload', () => {
  const r = validateOrderPayload('nope');
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /not an order object/);
});

test('rejects displayValues array mistaken for order payload', () => {
  const r = validateOrderPayload([
    ['CENA', { option_value: '59.43', param_description: 'Price' }]
  ]);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /json_parameters_desc/);
});

test('requires userIdent and items', () => {
  const r = validateOrderPayload({});
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /userIdent/.test(e)));
  assert.ok(r.errors.some((e) => /items/.test(e)));
});

test('rejects empty items array', () => {
  const r = validateOrderPayload({ userIdent: 'u1', items: [] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /non-empty/.test(e)));
});

test('rejects item without product/asortment', () => {
  const r = validateOrderPayload({
    userIdent: 'u1',
    items: [{ parameters: { KOLOR: 'X' } }]
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /product\/asortment/.test(e)));
});

test('rejects item with empty parameters', () => {
  const r = validateOrderPayload({
    userIdent: 'u1',
    items: [{ product: 'GRP1', parameters: {} }]
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /parameters is empty/.test(e)));
});

test('accepts a minimal valid payload', () => {
  const payload = {
    userIdent: 'CLIENT_42',
    items: [
      { product: 'SLOPE', parameters: { KOLOR: 'czarny', ILOSC: 2 } }
    ]
  };
  const r = validateOrderPayload(payload);
  assert.equal(r.ok, true, r.errors.join('; '));
  assert.deepEqual(r.data, payload);
});

test('accepts asortment alias as well as product', () => {
  const r = validateOrderPayload({
    userIdent: 'X',
    items: [{ asortment: 'SLOPE', parameters: { A: 1 } }]
  });
  assert.equal(r.ok, true);
});
