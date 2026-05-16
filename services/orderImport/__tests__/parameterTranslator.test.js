'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { translateParametersToCanonical } = require('../parameterTranslator');

function fakeRepo(dictByGroupLang) {
  return {
    async getGroupTranslations(group, lang) {
      return dictByGroupLang[`${group}__${lang}`] || null;
    }
  };
}

test('returns input unchanged when lang is pl (canonical)', async () => {
  const out = await translateParametersToCanonical(
    { KOLOR: 'czarny' },
    'SLOPE',
    'pl',
    { repo: fakeRepo({}) }
  );
  assert.deepEqual(out, { KOLOR: 'czarny' });
});

test('returns input unchanged and does not throw when dict is missing', async () => {
  const out = await translateParametersToCanonical(
    { KOLOR: 'black' },
    'SLOPE',
    'en',
    { repo: fakeRepo({}) }
  );
  assert.deepEqual(out, { KOLOR: 'black' });
});

test('passes canonical keys through even in foreign lang', async () => {
  const repo = fakeRepo({
    'SLOPE__en': {
      params: { KOLOR: 'Color', MODEL: 'Model' },
      paramdict: { KOLOR: { CZARNY: 'Black', BIALY: 'White' } }
    }
  });
  const out = await translateParametersToCanonical(
    { KOLOR: 'Black' },
    'SLOPE',
    'en',
    { repo }
  );
  assert.deepEqual(out, { KOLOR: 'CZARNY' });
});

test('reverse-translates foreign param description and value', async () => {
  const repo = fakeRepo({
    'SLOPE__de': {
      params: { KOLOR: 'Farbe', ILOSC: 'Menge' },
      paramdict: { KOLOR: { CZARNY: 'Schwarz' } }
    }
  });
  const out = await translateParametersToCanonical(
    { Farbe: 'Schwarz', Menge: 5 },
    'SLOPE',
    'de',
    { repo }
  );
  assert.deepEqual(out, { KOLOR: 'CZARNY', ILOSC: 5 });
});

test('keeps non-string values verbatim', async () => {
  const repo = fakeRepo({
    'SLOPE__en': { params: { ILOSC: 'Quantity' }, paramdict: {} }
  });
  const out = await translateParametersToCanonical(
    { Quantity: 7 },
    'SLOPE',
    'en',
    { repo }
  );
  assert.deepEqual(out, { ILOSC: 7 });
});

test('survives a thrown repo error by returning input', async () => {
  const repo = {
    async getGroupTranslations() {
      throw new Error('db down');
    }
  };
  const out = await translateParametersToCanonical(
    { KOLOR: 'Black' },
    'SLOPE',
    'en',
    { repo }
  );
  assert.deepEqual(out, { KOLOR: 'Black' });
});
