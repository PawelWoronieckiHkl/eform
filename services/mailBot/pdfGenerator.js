const ExcelJS = require('exceljs');
const nunjucks = require('nunjucks');
const { chromium } = require('playwright'); // Zmienione z puppeteer na playwright
const fs = require('fs');
const path = require('path');
const confLang = require('./conf');
const { localesDir, availabeLanguages, defaultLanguage } = require('../../config');

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

async function generatePdf(orderData, cleanOrderItems, lang, logoPath,sendData) {
  console.log('zaczynam', logoPath)
  const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
  const logoDataUri = `data:image/png;base64,${logoBase64}`;
  // 1. Konfiguracja i18n
  const i18n = confLang(lang);
  const __ = (key) => i18n.__(key, { locale: lang });

  // 2. Poprawna konfiguracja Nunjucks
  const templatesDir = path.dirname(path.join(__dirname, 'order-pdf.njk'));
  const env = nunjucks.configure(templatesDir, {
    autoescape: true,
    trimBlocks: true,
    lstripBlocks: true
  });

  // 3. Rejestracja funkcji tłumaczącej jako globalnej
  env.addGlobal('__', __);
  const data = await sendData
  console.log('sendDAta', data)
  const html = env.render('order-pdf.njk', {
    orderDetails: orderData,
    cleanOrderItems: cleanOrderItems,
    logoPath: logoDataUri,
    sendData:data
  });
  let browser;
  if (process.env.NODE_ENV == 'live-dev') {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
  }
  else {
    const executablePath = '/root/.cache/ms-playwright/chromium_headless_shell-1179/chrome-linux/headless_shell';
    if (!fs.existsSync(executablePath)) {
      throw new Error(`Playwright executable missing at ${executablePath}`);
    }

    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  // 6. Wstrzyknięcie zasobów z obsługą błędów
  try {
    await page.setContent(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      /* Dodaj wszystkie potrzebne style */
      ${fs.readFileSync(path.join(__dirname, 'styles/order-pdf.css'), 'utf8')}
      /* ... i pozostałe pliki CSS ... */
      
      /* Ustawienia globalne */
      body {
        font-family: "Courier", monospace !important;
        width: 400mm;  /* Szerokość zgodna z A3 w landscapie */
        margin: 0;
        padding: 0;
      }
      
      .logo { 
        width: 400px; 
        margin-top: 60px; 
        margin-left: 60px; 
      }
      
      @page {
        size: A3 landscape;
        margin: 0;
      }
    </style>
  </head>
  <body>${html}</body>
  </html>
`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
  } catch (error) {
    console.error('Błąd podczas wstrzykiwania treści:', error);
    await browser.close();
    throw error;
  }

  // 7. Generowanie PDF
  const pdfBuffer = await page.pdf({
    format: 'A3',
    landscape: true,
    printBackground: true,
    scale: 0.33,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
  });

  await browser.close();
  return pdfBuffer;
}

module.exports = { generateExcel, generatePdf };
