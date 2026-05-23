/**
 * Browser-based order recalculator using Playwright.
 *
 * After import, this module opens the order page in a headless browser,
 * logs in as the order's owner, and triggers the "Przelicz" (recalculate) flow.
 * This ensures prices are calculated with the correct per-client price scripts.
 *
 * Uses the same Playwright installation as pdfGenerator.
 */

'use strict';

const { chromium } = require('playwright');
const { log } = require('../../utils/logging');
const { connetToDb } = require('../../db/core');

const APP_PORT = process.env.PORT || 3000;
const APP_URL = `http://localhost:${APP_PORT}`;

/**
 * Get the owner (user) credentials for an order.
 * Returns { pin, password } or null.
 */
async function getOrderOwnerCredentials(orderId) {
  const conn = await connetToDb();
  try {
    const [rows] = await conn.query(`
      SELECT u.pin, u.password, u.ident
      FROM \`order\` o
      JOIN user u ON u.id = o.user_id
      WHERE o.id = ?
    `, [orderId]);
    return rows.length > 0 ? rows[0] : null;
  } finally {
    await conn.end();
  }
}

/**
 * Recalculate an order using a real browser (Playwright headless).
 * Logs in as the order's owner to ensure correct per-client price scripts.
 *
 * @param {number} orderId - The order ID to recalculate
 * @param {object} [opts] - Options
 * @param {number} [opts.timeout] - Max time in ms (default 120000)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function recalculateOrderInBrowser(orderId, opts = {}) {
  const timeout = opts.timeout || 120000;
  let browser;

  try {
    // Get the order owner's credentials for context
    const creds = await getOrderOwnerCredentials(orderId);
    if (!creds) {
      return { success: false, message: 'Nie znaleziono właściciela zamówienia' };
    }

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(timeout);

    // 1. Login as admin (has recalculate button access)
    const adminPin = process.env.ADMIN_PIN || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'eforszef123';
    const loginUrl = `${APP_URL}/user/auth/login?pin=${encodeURIComponent(adminPin)}&password=${encodeURIComponent(adminPassword)}`;
    await page.goto(loginUrl);
    await page.waitForURL('**/');

    // 2. Set context user to the order owner (so price scripts load for correct client)
    await page.goto(`${APP_URL}/orders/userOrders?userIdent=${encodeURIComponent(creds.ident)}`);
    await page.waitForLoadState('networkidle');

    // 3. Navigate to the order page
    await page.goto(`${APP_URL}/orders/order/${orderId}`);
    await page.waitForLoadState('networkidle');

    // 3. Check if recalculate button exists
    const btn = await page.$('#recalculate-order-btn');
    if (!btn) {
      log(`browserRecalculator: no recalculate button for order ${orderId}`);
      return { success: false, message: 'Przycisk przeliczania nie znaleziony' };
    }

    // 4. Trigger recalculation and wait for the POST /recalculate response
    const recalcResponsePromise = page.waitForResponse(
      resp => resp.url().includes('/recalculate') && resp.request().method() === 'POST',
      { timeout }
    );

    await page.evaluate(async (oid) => {
      const { recalculateOrder } = await import('/scripts/recalculateOrder.js');
      window.confirmPrompt = async () => true;
      recalculateOrder(oid);
    }, orderId);

    const response = await recalcResponsePromise;
    const data = await response.json().catch(() => ({}));

    const result = {
      success: data.success === true,
      message: data.message || (data.success ? 'OK' : 'Błąd przeliczania')
    };

    log(`browserRecalculator: order ${orderId} → ${result.success ? 'OK' : 'FAIL'}: ${result.message}`);
    return result;
  } catch (err) {
    log(`browserRecalculator: error for order ${orderId}: ${err.message}`);
    return { success: false, message: err.message };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = { recalculateOrderInBrowser };
