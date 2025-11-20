import { showToast } from "../components/toast.js";

export function generateExcel() {
  const comment = document.getElementById('comment')
  const commision = document.getElementById('commission-name') || document.getElementById('commission-name-mobile')



  const tables = document.querySelectorAll('#print-template-container table');
  console.log(tables)
  const wb = XLSX.utils.book_new();

  const combinedData = [];
  const headerRows = [];
  const separatorRows = [];

  tables.forEach(table => {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
    combinedData.push(headers);
    headerRows.push(combinedData.length - 1);

    const rows = table.querySelectorAll('tbody tr');
    if (rows.length > 0) {
      rows.forEach(tr => {
        const rowData = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        combinedData.push(rowData);
      });
    } else {

      const bodyRows = table.querySelectorAll('tr');

      for (let i = 1; i < bodyRows.length; i++) {
        const rowData = Array.from(bodyRows[i].querySelectorAll('td')).map(td => td.innerText.trim());
        combinedData.push(rowData);
      }
    }


    combinedData.push(Array(headers.length).fill(''));
    separatorRows.push(combinedData.length - 1);
  });

  if (combinedData.length && combinedData[combinedData.length - 1].every(cell => cell === '')) {
    separatorRows.pop();
    combinedData.pop();
  }

  const ws = XLSX.utils.aoa_to_sheet(combinedData);

  headerRows.forEach(rowIdx => {
    for (let col = 0; col < combinedData[rowIdx].length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          fill: { patternType: "solid", fgColor: { rgb: "E0E0E0" } },
          font: { color: { rgb: "000000" }, bold: true }
        };
      }
    }
  });

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let row = range.s.r; row <= range.e.r; ++row) {

    if (separatorRows.includes(row)) continue;
    for (let col = range.s.c; col <= range.e.c; ++col) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = ws[cellAddress].s || {};
      ws[cellAddress].s.border = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };
    }
  }

  const columnWidths = [];
  for (let col = 0; col < combinedData[0].length; col++) {
    let maxLength = 10;
    for (let row = 0; row < combinedData.length; row++) {
      const cellValue = combinedData[row][col] || '';
      if (cellValue.length > maxLength) maxLength = cellValue.length;
    }
    columnWidths.push({ wch: maxLength + 2 });
  }
  ws['!cols'] = columnWidths;

  XLSX.utils.book_append_sheet(wb, ws, commision.dataset.name);
  XLSX.writeFile(wb, `${comment.dataset.id}"${commision.dataset.name}".xlsx`);
}

export async function generatePdf(isShort = false) {
  const comment = document.getElementById('comment');
  const commision = document.getElementById('commission-name') || document.getElementById('commission-name-mobile');



  const orderId = comment.dataset.id;
  if (!orderId) {
    alert('Nie znaleziono ID zamówienia');
    return;
  }

  try {
    // Sprawdź czy kłódka jest otwarta (sprawdź po ID kłódki)
    const hasPricesAccess = document.getElementById('lock-btn') !== null; // otwarta kłódka ma id="lock-btn"
    const downloadUrl = `/orders/orderpdf/${orderId}/${hasPricesAccess ? 'true' : 'false'}/${isShort ? 'true' : 'false'}`;
    console.log('Generating PDF from URL:', downloadUrl);
    const response = await fetch(downloadUrl);
    console.log(response)
    if (!response.ok) {
      // Sprawdź czy odpowiedź jest w formacie JSON (błąd)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        if (errorData.success === false) {
          showToast('error', errorData.message);
          return;
        }
      }
      throw new Error(`HTTP ${response.status}`);
    }

    // Jeśli odpowiedź jest OK, pobierz PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Utwórz ukryty link i kliknij go, żeby rozpocząć pobieranie
    const link = document.createElement('a');
    link.href = url;
    link.download = `zamowienie_${orderId}.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Zwolnij URL
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Błąd podczas generowania PDF:', error);
    showToast('error', 'Wystąpił błąd podczas generowania PDF');
  }
}