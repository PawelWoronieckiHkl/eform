'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { preflightPayload } = require('../preflight');

function makeDeps(overrides = {}) {
  return {
    resolvePayloadAliases: async (items) => ({ items, errors: [] }),
    resolveOrderUser: async () => ({ user: { id: 1 }, lang: 'pl', payload: {} }),
    translator: async (params) => params,
    optionValidator: async () => ({ ok: true, errors: [] }),
    ...overrides
  };
}

test('reports ok when every stage passes', async () => {
  const payload = {
    userIdent: 'TCN',
    items: [{ product: '59', parameters: { KOLOR: '307' } }]
  };
  const report = await preflightPayload(payload, { deps: makeDeps() });
  assert.equal(report.ok, true, report.errors.join('; '));
  assert.equal(report.userIdent, 'TCN');
  assert.equal(report.itemCount, 1);
  for (const stage of Object.values(report.stages)) assert.equal(stage.ok, true);
});

test('structural failure short-circuits later stages', async () => {
  let aliasCalled = false;
  const deps = makeDeps({
    resolvePayloadAliases: async (items) => { aliasCalled = true; return { items, errors: [] }; }
  });
  const report = await preflightPayload({}, { deps });
  assert.equal(report.ok, false);
  assert.equal(report.stages.structural.ok, false);
  assert.equal(aliasCalled, false, 'alias stage must not run after structural failure');
});

test('surfaces alias-resolution errors (the TCN KOLOR/MONTAZ case)', async () => {
  const deps = makeDeps({
    resolvePayloadAliases: async (items) => ({
      items,
      errors: [
        'Item[0] (group=59): Parametr "KOLOR": wartość "105766" nie znaleziona w translation_dictionary ani client_aliases (grupa 59)',
        'Item[0] (group=59): Parametr "MONTAZ": wartość "ODD" nie znaleziona w translation_dictionary ani client_aliases (grupa 59)'
      ]
    })
  });
  const report = await preflightPayload({
    userIdent: 'TCN',
    items: [{ product: '59', parameters: { KOLOR: '105766', MONTAZ: 'ODD' } }]
  }, { deps });

  assert.equal(report.ok, false);
  assert.equal(report.stages.alias.ok, false);
  assert.equal(report.stages.alias.errors.length, 2);
  assert.ok(report.errors.some((e) => /105766/.test(e)));
  assert.ok(report.errors.some((e) => /ODD/.test(e)));
});

test('surfaces option-validation errors prefixed by item index/group', async () => {
  const deps = makeDeps({
    optionValidator: async () => ({
      ok: false,
      errors: ['Parameter "KOLOR": value "105766" not found in available options (group 59)']
    })
  });
  const report = await preflightPayload({
    userIdent: 'TCN',
    items: [{ product: '59', parameters: { KOLOR: '105766' } }]
  }, { deps });

  assert.equal(report.ok, false);
  assert.equal(report.stages.options.ok, false);
  assert.match(report.stages.options.errors[0], /^Item\[0\] \(group=59\):/);
});

test('reports user-resolution failure without throwing', async () => {
  const deps = makeDeps({
    resolveOrderUser: async () => { throw new Error('User not found by ident="GHOST"'); }
  });
  const report = await preflightPayload({
    userIdent: 'GHOST',
    items: [{ product: '59', parameters: { KOLOR: '307' } }]
  }, { deps });

  assert.equal(report.ok, false);
  assert.equal(report.stages.user.ok, false);
  assert.match(report.stages.user.errors[0], /User not found/);
});
