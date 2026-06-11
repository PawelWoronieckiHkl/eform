'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sendImportedOrder,
  buildImportRequestContext,
  normalizeOrderItems,
  parseJsonField
} = require('../sendAfterImport');

test('parseJsonField parses string JSON and passes through objects', () => {
  assert.deepEqual(parseJsonField('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonField({ b: 2 }), { b: 2 });
  assert.equal(parseJsonField('not-json', 'x'), 'x');
});

test('normalizeOrderItems parses json fields on items', () => {
  const out = normalizeOrderItems([
    { id: 1, json_parameters: '{"KOLOR":"X"}', parameters_short: '{"data":{}}' }
  ]);
  assert.deepEqual(out[0].json_parameters, { KOLOR: 'X' });
  assert.deepEqual(out[0].parameters_short, { data: {} });
});

test('buildImportRequestContext exposes user session for OrderSender', () => {
  const req = buildImportRequestContext({
    id: 5,
    pin: 'P1',
    ident: 'U1',
    client_name: 'Acme',
    organization_id: 3,
    org_ident: 'hkl',
    _importLang: 'de'
  });
  assert.equal(req.session.user.ident, 'U1');
  assert.equal(req.session.user.organization, 'HKL');
  assert.equal(req.getLocale(), 'de');
});

test('sendImportedOrder returns error for empty order', async () => {
  const ordersDb = {
    async getOrderDataToSend() {
      return { orderDetails: {}, orderItems: [] };
    }
  };
  const result = await sendImportedOrder({
    orderId: 1,
    user: { id: 1, pin: 'P', ident: 'U', client_name: 'X', organization_id: 1, org_ident: 'ORG' },
    lang: 'pl',
    deps: { orders: ordersDb, log: () => {} }
  });
  assert.equal(result.sent, false);
  assert.equal(result.error, 'empty order');
});

test('sendImportedOrder changes status, uploads and sends mail with import flag', async () => {
  const calls = { status: null, saveToFile: 0, sendMail: 0, prodPdf: 0 };

  class FakeSender {
    constructor(_req, orderDetails) {
      this.slopePaths = [];
      this.data = { orderid: orderDetails.id, commission: orderDetails.commision };
    }
    async init() {
      this.fileName = 'ORG_U1_42';
      return this.data;
    }
    async saveToFile() {
      calls.saveToFile += 1;
    }
  }

  const ordersDb = {
    async getOrderDataToSend(orderId) {
      return {
        orderDetails: { id: orderId, commision: 'CM-1', contact_info_id: null },
        orderItems: [{
          id: 10,
          json_parameters: { KOLOR: 'X' },
          parameters_short: { data: {}, order: [] },
          json_parameters_desc: '[]'
        }]
      };
    },
    async changeOrderStatus(orderId, status) {
      calls.status = { orderId, status };
      return true;
    },
    async getUserLogo() { return 'hkl.png'; },
    async getGroupDeliveryTimes() { return {}; },
    async getUserMail() {
      return { organization_email: 'org@test', organization_email2: null, user_email: 'user@test' };
    },
    async getUserOrderId() { return 42; },
    async getTotal() { return { visible: 100, hidden: 80 }; },
    async getOrgInfo() { return { company_mail: 'a@b.c' }; }
  };

  const mailer = {
    async sendMailAsync(_to, _lang, _pdf, _attachments, templateVars) {
      calls.sendMail += 1;
      assert.equal(templateVars.isImport, true);
    }
  };

  const result = await sendImportedOrder({
    orderId: 99,
    user: {
      id: 1,
      pin: 'P1',
      ident: 'U1',
      client_name: 'Acme',
      organization_id: 3,
      org_ident: 'ORG'
    },
    lang: 'pl',
    deps: {
      orders: ordersDb,
      mailer,
      log: () => {},
      OrderSender: { OrderSender: FakeSender },
      orderService: {
        async jsonTextBackToMap(items) {
          return { cleanOrderItems: items, total: {} };
        }
      },
      getExtraAttachments: async () => [],
      generatePdf: async () => Buffer.from('pdf'),
      translateOrderItems: async (_items, clean) => {
        calls.prodPdf += 1;
        return clean;
      },
      generateProductionPdf: async () => Buffer.from('prod'),
      uploadProductionPdf: async (_pdf, _name, options) => {
        assert.equal(options.forceProductionSend, true);
      },
      buildItemProductionDays: () => ({ maxProdDays: 0 }),
      getProductionSendSkipClient: () => null,
      formatSendTotals: async (data) => {
        data.total = '100€';
        return data;
      }
    }
  });

  assert.equal(result.sent, true);
  assert.equal(calls.status?.status, 'sent');
  assert.equal(calls.status?.orderId, 99);
  assert.equal(calls.saveToFile, 1);
  assert.equal(calls.sendMail, 1);
  assert.equal(calls.prodPdf, 1);
});
