'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const { isSafeOrderFileName, assertSafeOrderFileName } = require('../fileNames');

function loadFtpClientWithoutFtpEnv() {
  const modulePath = require.resolve('../ftpClient');
  delete require.cache[modulePath];

  const saved = {
    FTP_HOST: process.env.FTP_HOST,
    FTP_USER: process.env.FTP_USER,
    FTP_PASSWORD: process.env.FTP_PASSWORD
  };

  delete process.env.FTP_HOST;
  delete process.env.FTP_USER;
  delete process.env.FTP_PASSWORD;
  const client = require('../ftpClient');

  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  return client;
}

test('order import file names must be plain json basenames', () => {
  assert.equal(isSafeOrderFileName('order-1.json'), true);
  assert.equal(isSafeOrderFileName('ORDER.JSON'), true);
  assert.equal(isSafeOrderFileName('../order.json'), false);
  assert.equal(isSafeOrderFileName('nested/order.json'), false);
  assert.equal(isSafeOrderFileName('order.txt'), false);
  assert.throws(() => assertSafeOrderFileName('../order.json'), /Unsafe order import file name/);
});

test('local FTP fallback treats same source and destination as already downloaded', async () => {
  const ftp = loadFtpClientWithoutFtpEnv();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'order-import-'));
  const filePath = path.join(dir, 'order.json');

  try {
    await fs.writeFile(filePath, '{"ok":true}', 'utf8');
    await ftp.downloadOrderFile('order.json', filePath, { localFallbackDir: dir });
    assert.equal(await fs.readFile(filePath, 'utf8'), '{"ok":true}');
  } finally {
    await fs.unlink(filePath).catch(() => {});
    await fs.rmdir(dir).catch(() => {});
  }
});
