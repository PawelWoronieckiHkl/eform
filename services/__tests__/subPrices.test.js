'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  orderHasSubPrices,
  calcSubTotals,
  resolveSubPricePdfView,
  buildPdfSendDataTotals
} = require('../subPrices');
const {
  makeOrderItem,
  makeLegacyOrderItem,
  mockReq,
  SUB_SUMA_VISIBLE,
  SUB_SUMA_LOCKED,
  REGULAR_SUMA
} = require('./fixtures/subPriceOrder');

test('orderHasSubPrices returns true when subParamValues exist after parsing', async () => {
  const orderService = require('../orderService');
  const { cleanOrderItems } = await orderService.jsonTextBackToMap([makeOrderItem()]);
  assert.equal(orderHasSubPrices(cleanOrderItems), true);
});

test('orderHasSubPrices returns false for legacy orders without SUB___ params', async () => {
  const orderService = require('../orderService');
  const { cleanOrderItems } = await orderService.jsonTextBackToMap([makeLegacyOrderItem()]);
  assert.equal(orderHasSubPrices(cleanOrderItems), false);
});

test('calcSubTotals sums listsum SUB params with overwrite semantics per item', () => {
  const items = [makeOrderItem()];
  const totals = calcSubTotals(items);
  assert.equal(totals.subVisible, SUB_SUMA_VISIBLE);
  assert.equal(totals.subLocked, SUB_SUMA_LOCKED);
});

test('calcSubTotals aggregates multiple positions', () => {
  const items = [makeOrderItem(), makeOrderItem({ id: 2 })];
  const totals = calcSubTotals(items);
  assert.equal(totals.subVisible, parseFloat((390 * 2).toFixed(2)));
  assert.equal(totals.subLocked, parseFloat((360 * 2).toFixed(2)));
});

test('resolveSubPricePdfView — pure client sees SUB-only (clientView)', () => {
  const req = mockReq({ orgId: 42 });
  const view = resolveSubPricePdfView(req, true);
  assert.equal(view.isClientView, true);
  assert.equal(view.showBoth, false);
  assert.equal(view.isPureClient, true);
});

test('resolveSubPricePdfView — org owner without keychain sees SUB-only', () => {
  const req = mockReq({ isOwner: true, orgId: 42, showSubParams: false });
  const view = resolveSubPricePdfView(req, true);
  assert.equal(view.isClientView, true);
  assert.equal(view.showBoth, false);
  assert.equal(view.hasSubToggle, true);
});

test('resolveSubPricePdfView — org owner with keychain sees both price sets', () => {
  const req = mockReq({ isOwner: true, orgId: 42, showSubParams: true });
  const view = resolveSubPricePdfView(req, true);
  assert.equal(view.isClientView, false);
  assert.equal(view.showBoth, true);
});

test('resolveSubPricePdfView — admin with client context mirrors org owner', () => {
  const req = mockReq(
    { isAdmin: true, orgId: 3, showSubParams: true },
    { orgId: 42, ident: 'luxan', clientName: 'Luxan' }
  );
  const view = resolveSubPricePdfView(req, true);
  assert.equal(view.showBoth, true);
  assert.equal(view.isClientView, false);
});

test('resolveSubPricePdfView — HKL org (id 3) disables SUB modes', () => {
  const req = mockReq({ orgId: 3 });
  const view = resolveSubPricePdfView(req, true);
  assert.equal(view.isPureClient, false);
  assert.equal(view.isClientView, false);
  assert.equal(view.showBoth, false);
});

test('resolveSubPricePdfView — no SUB data keeps regular view', () => {
  const req = mockReq({ isOwner: true, orgId: 42, showSubParams: false });
  const view = resolveSubPricePdfView(req, false);
  assert.equal(view.isClientView, false);
  assert.equal(view.showBoth, false);
});

test('resolveSubPricePdfView — works outside NODE_ENV=test (production)', () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const req = mockReq({ orgId: 42 });
  const view = resolveSubPricePdfView(req, true);
  assert.equal(view.isClientView, true);
  assert.equal(view.isPureClient, true);
  process.env.NODE_ENV = prevEnv;
});

test('buildPdfSendDataTotals — client view uses SUB totals', () => {
  const totals = buildPdfSendDataTotals({
    isClientView: true,
    showBoth: false,
    orderItems: [makeOrderItem()],
    totalPrice: { visible: REGULAR_SUMA, hidden: '100' },
    translate: (key) => key
  });
  assert.equal(totals.total, `order.total: ${SUB_SUMA_VISIBLE}€`);
  assert.equal(totals.total_hidden, `order.total_hidden: ${SUB_SUMA_LOCKED}€`);
});

test('buildPdfSendDataTotals — showBoth uses regular visible + SUB locked total', () => {
  const totals = buildPdfSendDataTotals({
    isClientView: false,
    showBoth: true,
    orderItems: [makeOrderItem()],
    totalPrice: { visible: REGULAR_SUMA, hidden: '100' },
    translate: (key) => key
  });
  assert.equal(totals.total, `order.total: ${REGULAR_SUMA}€`);
  assert.equal(totals.total_hidden, `order.total_hidden: ${SUB_SUMA_LOCKED}€`);
});

test('buildPdfSendDataTotals — regular view uses order total from DB', () => {
  const totals = buildPdfSendDataTotals({
    isClientView: false,
    showBoth: false,
    orderItems: [makeOrderItem()],
    totalPrice: { visible: REGULAR_SUMA, hidden: '120' },
    translate: (key) => key,
    showGoldPrices: true
  });
  assert.equal(totals.total, `order.total: ${REGULAR_SUMA}€`);
  assert.equal(totals.total_hidden, 'order.total_hidden: 120€');
});

test('buildPdfSendDataTotals — regular view without gold prices hides total_hidden (mail/HKL)', () => {
  const totals = buildPdfSendDataTotals({
    isClientView: false,
    showBoth: false,
    orderItems: [makeOrderItem()],
    totalPrice: { visible: REGULAR_SUMA, hidden: '120' },
    translate: (key) => key,
    showGoldPrices: false
  });
  assert.equal(totals.total, `order.total: ${REGULAR_SUMA}€`);
  assert.equal(totals.total_hidden, null);
});
