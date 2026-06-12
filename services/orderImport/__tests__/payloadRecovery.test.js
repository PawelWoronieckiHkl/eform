'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const { tryRecoverValidOrderPayload, processedNameMatches } = require('../payloadRecovery');

test('processedNameMatches accepts timestamp-prefixed processed copies', () => {
  assert.equal(
    processedNameMatches(
      '1781099464060_HKL_TCN_271454_20260610_155031.json',
      '2026-06-11T12-14-16-060Z__1781099464060_HKL_TCN_271454_20260610_155031.json'
    ),
    true
  );
});

test('recovers valid order payload from local processed when FTP file is displayValues', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'order-recovery-'));
  const fileName = 'order_test.json';
  const goodOrder = {
    userIdent: 'TCN',
    items: [{ product: '59', parameters: { MODEL: 'H50' } }]
  };

  await fs.writeFile(
    path.join(dir, `2026-06-11T12-00-00-000Z__${fileName}`),
    JSON.stringify(goodOrder),
    'utf8'
  );

  const displayValues = [
    ['CENA', { option_value: '59.43', param_description: 'Price' }]
  ];

  const result = await tryRecoverValidOrderPayload(fileName, displayValues, {
    localProcessedDir: dir
  });

  assert.equal(result.recovered, true);
  assert.equal(result.payload.userIdent, 'TCN');
  assert.equal(result.payload.items.length, 1);

  await fs.rm(dir, { recursive: true, force: true });
});

test('returns original payload when recovery is not possible', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'order-recovery-empty-'));
  const displayValues = [
    ['CENA', { option_value: '59.43', param_description: 'Price' }]
  ];

  const result = await tryRecoverValidOrderPayload('missing.json', displayValues, {
    localProcessedDir: dir
  });

  assert.equal(result.recovered, false);
  assert.deepEqual(result.payload, displayValues);

  await fs.rm(dir, { recursive: true, force: true });
});
