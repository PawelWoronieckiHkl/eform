'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDisplayValuesFromDictionary } = require('../displayValueBuilder');

function fakeRepo(dict) {
  return {
    async getGroupTranslations() {
      return dict;
    }
  };
}

test('builds display values from translation dictionary params and paramdict', async () => {
  const out = await buildDisplayValuesFromDictionary({
    groupNumber: '43',
    lang: 'de',
    values: {
      MODEL: 'VS1',
      KOLOR: '3002-P20',
      KOLOR_ALIAS: '2002-P20',
      KOLOR___DESCRIPTION: 'PG #1',
      SZEROKOSC: 1232,
      MODEL___VISIBLE: true,
      KOLOR___VISIBLE: true,
      SZEROKOSC___VISIBLE: true
    },
    repo: fakeRepo({
      params: {
        MODEL: 'MODELL',
        KOLOR: 'STOFF',
        SZEROKOSC: 'BREITE [MM]'
      },
      paramdict: {
        MODEL: { VS1: 'Verspannt' },
        KOLOR: { '3002-P20': 'PG #1' }
      }
    })
  });

  assert.deepEqual(out.MODEL, {
    param_description: 'MODELL',
    sub: false,
    option_value: 'VS1',
    option_description: 'Verspannt',
    locked: false,
    row: '1'
  });
  assert.equal(out.KOLOR.param_description, 'STOFF');
  assert.equal(out.KOLOR.option_value, '2002-P20');
  assert.equal(out.KOLOR.option_description, 'PG #1');
  assert.equal(out.SZEROKOSC.option_value, '1232');
  assert.equal(out.SZEROKOSC.option_description, '');
  assert.equal(out.KOLOR___DESCRIPTION, undefined);
});

test('marks invisible fields with row 0 and preserves existing engine flags', async () => {
  const out = await buildDisplayValuesFromDictionary({
    groupNumber: '43',
    lang: 'de',
    values: {
      CENA: 276,
      CENA___VISIBLE: false
    },
    displayValues: {
      CENA: { locked: false }
    },
    repo: fakeRepo({
      params: { CENA: 'LISTENPREIS [€]' },
      paramdict: {}
    })
  });

  assert.equal(out.CENA.param_description, 'LISTENPREIS [€]');
  assert.equal(out.CENA.option_value, '276');
  assert.equal(out.CENA.row, '0');
  assert.equal(out.CENA.locked, false);
});

test('uses form metadata for row, listsum, locked and sub flags', async () => {
  const out = await buildDisplayValuesFromDictionary({
    groupNumber: '43',
    lang: 'de',
    values: {
      CENA: 276,
      CENA_RABAT: 200,
      SUB___CENA_RABAT: 180
    },
    formMeta: {
      params: [
        { NAME: 'CENA', LISTROW: '2', LISTSUM: 'true', FORMROW: '1' },
        { NAME: 'CENA_RABAT', LISTROW: '2', LISTSUM: 'true', FORMROW: '1' },
        { NAME: 'SUB___CENA_RABAT', LISTROW: '2', LISTSUM: 'true', FORMROW: '1' }
      ],
      lockedParams: ['CENA_RABAT'],
      subParams: ['SUB___CENA_RABAT']
    },
    repo: fakeRepo({
      params: {
        CENA: 'LISTENPREIS [€]',
        CENA_RABAT: 'RABATT',
        SUB___CENA_RABAT: 'SUB RABATT'
      },
      paramdict: {}
    })
  });

  assert.equal(out.CENA.row, '2');
  assert.equal(out.CENA.listsum, true);
  assert.equal(out.CENA.locked, false);
  assert.equal(out.CENA_RABAT.row, '2');
  assert.equal(out.CENA_RABAT.listsum, true);
  assert.equal(out.CENA_RABAT.locked, true);
  assert.equal(out.SUB___CENA_RABAT.sub, true);
  assert.equal(out.SUB___CENA_RABAT.locked, true);
});

test('keeps list row for locked fields even when visible flag is false', async () => {
  const out = await buildDisplayValuesFromDictionary({
    groupNumber: '43',
    lang: 'de',
    values: {
      CENA_RABAT: 200,
      CENA_RABAT___VISIBLE: false
    },
    formMeta: {
      params: [{ NAME: 'CENA_RABAT', LISTROW: '2', LISTSUM: 'true', FORMROW: '1' }],
      lockedParams: ['CENA_RABAT'],
      subParams: []
    },
    repo: fakeRepo({
      params: { CENA_RABAT: 'RABATT' },
      paramdict: {}
    })
  });

  assert.equal(out.CENA_RABAT.locked, true);
  assert.equal(out.CENA_RABAT.row, '2');
});
