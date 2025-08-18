const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');

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


function generatePdf(orderData) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];
    
    // Tworzenie zawartości PDF
    doc.fontSize(12);
    doc.text(`Zamówienie nr: ${orderData.id}`, { align: 'center' });
    doc.moveDown();
    
    orderData.items.forEach(item => {
      doc.text(`${item.name} - ${item.quantity}szt`);
    });
    
    // Zapis do bufora
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.end();
  });
}

module.exports = { generateExcel, generatePdf };

