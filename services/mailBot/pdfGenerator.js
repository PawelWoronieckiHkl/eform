const ExcelJS = require('exceljs');
const nunjucks = require('nunjucks');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const confLang = require('./conf');
const { localesDir, availabeLanguages, defaultLanguage } = require('../../config');
const { log } = require('../../utils/logging');

async function generateExcel(orderData) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Zamówienie');

  worksheet.addRow(['ID', 'Nazwa', 'Ilość']);

  orderData.items.forEach(item => {
    worksheet.addRow([item.id, item.name, item.quantity]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

async function generatePdf(orderData, cleanOrderItems, lang, logoPath, sendData, orderIdx, prices = true, maxProdDays = 0) {
  log('zaczynam', logoPath)
  const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
  const logoDataUri = `data:image/png;base64,${logoBase64}`;
  // 1. Konfiguracja i18n
  const i18n = confLang(lang);
  const __ = (key) => i18n.__(key, { locale: lang });

  const templatesDir = path.dirname(path.join(__dirname, 'order-pdf.njk'));
  const env = nunjucks.configure(templatesDir, {
    autoescape: true,
    trimBlocks: true,
    lstripBlocks: true
  });

  env.addGlobal('__', __);
  const data = await sendData
  log('sendDAta', data)

  // Sum of ordered quantities (ILOŚĆ) across all positions.
  // Source of truth: order_item.json_parameters — always stored in Polish keys
  // (json_parameters_desc is the translated/displayed variant). Key: "ILOSC".
  // Fallbacks: order_item.amount column, then 1 per row.
  const readQty = (item) => {
    if (!item) return 1;
    let jp = item.json_parameters;
    if (typeof jp === 'string') {
      try { jp = JSON.parse(jp); } catch { jp = null; }
    }
    if (jp && typeof jp === 'object') {
      const raw = jp.ILOSC ?? jp['ILOŚĆ'] ?? jp.ilosc;
      const qty = Number(raw);
      if (Number.isFinite(qty) && qty > 0) return qty;
    }
    const amt = Number(item.amount);
    if (Number.isFinite(amt) && amt > 0) return amt;
    return 1;
  };

  let totalQuantity = 0;
  for (const table of (cleanOrderItems || [])) {
    for (const rowObj of (table.rows || [])) {
      totalQuantity += readQty(rowObj && rowObj.item);
    }
  }

  const html = env.render('order-pdf.njk', {
    orderDetails: orderData,
    cleanOrderItems: cleanOrderItems,
    logoPath: logoDataUri,
    sendData: data,
    orderNr: orderIdx,
    prices: prices,
    maxProdDays: maxProdDays,
    totalQuantity: totalQuantity
  });

  // Prevent single-letter orphans: replace space after single-letter word with non-breaking space
  // e.g. "w Polsce" -> "w\u00a0Polsce", "i tak" -> "i\u00a0tak"
  const fixOrphans = (str) => str.replace(/(^|[ \u00a0])([a-zA-Z\u00c0-\u017e])[ ]/g, '$1$2\u00a0');
  const htmlFixed = fixOrphans(html);
  let browser;
  if (process.env.NODE_ENV == 'live-dev') {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
  }
  else {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setContent(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      /* Import głównego CSS */
      ${fs.readFileSync(path.join(__dirname, 'styles/order-pdf.css'), 'utf8')}
    </style>
  </head>
  <body>${htmlFixed}</body>
  </html>
`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
  } catch (error) {
    log('Błąd podczas wstrzykiwania treści:', error);
    await browser.close();
    throw error;
  }

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    scale: 0.8,
    margin: { top: '1mm', right: '1mm', bottom: '1mm', left: '1mm' }
  });

  await browser.close();
  return pdfBuffer;
}

module.exports = { generateExcel, generatePdf };
