'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const orderService = require('../orderService');
const {
  makeOrderItem,
  makeLegacyOrderItem,
  SUB_CENA_VISIBLE,
  SUB_CENA_LOCKED,
  REGULAR_CENA
} = require('./fixtures/subPriceOrder');

test('jsonTextBackToMap extracts SUB___ params into subParamValues, not main table', async () => {
  const { cleanOrderItems } = await orderService.jsonTextBackToMap([makeOrderItem()]);
  const row = cleanOrderItems[0].rows[0];
  const subValues = row.item.subParamValues;

  assert.ok(Array.isArray(subValues));
  assert.equal(subValues.length, 4);

  const visibleSub = subValues.find((e) => e.display === 'SUB cena [€]' && !e.locked);
  const lockedSub = subValues.find((e) => e.display === 'SUB rabat [€]' && e.locked);
  assert.equal(visibleSub?.value, SUB_CENA_VISIBLE);
  assert.equal(lockedSub?.value, SUB_CENA_LOCKED);

  const headerDisplays = cleanOrderItems[0].headers2;
  assert.ok(headerDisplays.includes('Cena katalogowa [€]'));
  assert.ok(!headerDisplays.some((h) => h.includes('SUB')));
  assert.ok(!headerDisplays.some((h) => h.toLowerCase().includes('rabat')));
  assert.equal(row.row.row2['Cena katalogowa [€]'], REGULAR_CENA);
});

test('jsonTextBackToMap omits zero-percent RABAT from price rows', async () => {
  const { cleanOrderItems } = await orderService.jsonTextBackToMap([makeOrderItem()]);
  const headers2 = cleanOrderItems[0].headers2;
  assert.ok(!headers2.some((h) => h.toLowerCase().includes('rabat') && !h.toLowerCase().includes('sub')));
});

test('jsonTextBackToMap skips empty SUB___ values', async () => {
  const item = makeOrderItem();
  item.json_parameters_desc.push(
    ['SUB___PUSTY', { param_description: 'Pusty SUB', option_value: '-', row: '2' }]
  );
  const { cleanOrderItems } = await orderService.jsonTextBackToMap([item]);
  const subValues = cleanOrderItems[0].rows[0].item.subParamValues;
  assert.equal(subValues.some((e) => e.display === 'Pusty SUB'), false);
});

test('jsonTextBackToMap legacy order has empty subParamValues', async () => {
  const { cleanOrderItems } = await orderService.jsonTextBackToMap([makeLegacyOrderItem()]);
  const subValues = cleanOrderItems[0].rows[0].item.subParamValues;
  assert.deepEqual(subValues, []);
});
