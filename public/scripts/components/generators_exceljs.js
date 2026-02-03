
import { showToast } from "../components/toast.js";

/**
 * Konfiguracja dla generatora Excel
 */
const EXCEL_CONFIG = {
    HEADER_BG_COLOR: 'E0E0E0',
    HEADER_TEXT_COLOR: '000000',
    BORDER_COLOR: '000000',
    BORDER_STYLE: 'thin',
    MIN_COLUMN_WIDTH: 10,
    COLUMN_WIDTH_PADDING: 2,
    MAX_SHEET_NAME_LENGTH: 30,
    SKIP_FIRST_ROW: true,
    SKIP_FIRST_COLUMN: true,
    LOGO_SPACE_ROWS: 3
};

/**
 * Klasa odpowiedzialna za generowanie plików Excel z tabel HTML używając ExcelJS
 */
class ExcelJSGenerator {
    constructor(config = EXCEL_CONFIG) {
        this.config = { ...EXCEL_CONFIG, ...config };
        this.workbook = null;
        this.combinedData = [];
        this.headerRows = [];
        this.separatorRows = [];
        this.row3Rows = [];  // Trzeci wiersz z locked params
        this.isLocked = false;
        this.isShort = false;

        let btns = document.querySelectorAll('[id="generate-excel-btn"]');
        console.log(btns, 'sprawdzamy wszystkie przyciski');
        btns.forEach(btn => {
            console.log(btn.dataset.lock, 'sprawdzamy dataset lock dla przycisku');
            if (btn && btn.dataset.lock === 'true') {
                this.isLocked = true;
            }
        });
        console.log('Final isLocked value:', this.isLocked);

        // Sprawdź czy flaga short jest aktywna
        let shortBtns = document.querySelectorAll('[id="short-print-button"]');
        console.log(shortBtns, 'sprawdzamy short print buttons');
        shortBtns.forEach(btn => {
            console.log(btn.dataset.lock, 'sprawdzamy dataset lock dla short przycisku');
            if (btn && btn.dataset.lock === 'true') {
                this.isShort = true;
            }
        });
        console.log('Final isShort value:', this.isShort);

        this.orderData = null;
    }

    /**
     * Główna metoda generująca plik Excel
     */
    async generate(containerId = '#print-template-container') {
        try {
            const metadata = this._getDocumentMetadata();
            console.log('Fetching order data for ID:', metadata.id);
            const orderData = await this.fetchOrderData(metadata.id);
            console.log('Order data received:', orderData);
            this.orderData = orderData;
            const logoData = await this._extractLogo(containerId);

            // Użyj cleanOrderItems z orderData zamiast parsowania HTML
            this._extractDataFromCleanOrderItems(orderData.cleanOrderItems);
            this._addEmptyRowAndColumn();
            this._adjustIndicesForOffset();

            const worksheet = await this._createWorksheet();
            this._applyHeaderStyles(worksheet);
            this._applyRow2Styles(worksheet);
            this._applyRow3Styles(worksheet);
            this._applyBorderStyles(worksheet);
            this._applyColumnWidths(worksheet);
            await this._addLogoToWorksheet(worksheet, logoData);
            this._addOrderTitle(worksheet, metadata);
            console.log('Adding client data to worksheet...');
            this._addClientData(worksheet, orderData);

            await this._saveWorkbook(worksheet, metadata);

            console.log('Excel generated successfully');
        } catch (error) {
            console.error('Error generating Excel:', error);
            showToast('error', 'Błąd podczas generowania pliku Excel');
        }
    }

    /**
     * Pobiera szczegóły zamówienia z backendu
     */
    async fetchOrderData(orderId) {
        try {
            console.log(orderId, 'Pobieranie danych zamówienia dla ID:');
            const response = await fetch(`/orders/order-details/${orderId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                return data.data;
            } else {
                throw new Error('Failed to fetch order data');
            }
        } catch (error) {
            console.error('Error fetching order data:', error);
            return null;
        }
    }

    /**
     * Pobiera metadane dokumentu (ID, nazwa komisji)
     */
    _getDocumentMetadata() {
        const comment = document.getElementById('comment');
        const commision = document.getElementById('commission-name') ||
            document.getElementById('commission-name-mobile');
        const orderTitle = document.getElementById('order-title') ||
            document.getElementById('order-title-mobile');

        if (!comment || !commision) {
            throw new Error('Missing required document metadata elements');
        }

        return {
            id: comment.dataset.id,
            name: commision.dataset.name,
            title: orderTitle ? orderTitle.textContent.replace(/\s+/g, ' ').trim() : 'Zamówienie'
        };
    }

    /**
     * Pobiera wszystkie tabele z kontenera
     */
    _getTablesFromContainer(containerId) {
        const tables = document.querySelectorAll(`${containerId} table`);

        if (tables.length === 0) {
            throw new Error(`No tables found in container: ${containerId}`);
        }

        return tables;
    }

    /**
     * Ekstraktuje logo z kontenera i konwertuje do base64
     */
    async _extractLogo(containerId) {
        try {
            let logoUrl = null;

            // Najpierw spróbuj znaleźć logo widoczne na stronie (w navbarze/headerze)
            const visibleLogo = document.querySelector('.logo, nav img, header img');
            if (visibleLogo && visibleLogo.src) {
                logoUrl = visibleLogo.src;
                console.log('Found visible logo on page:', logoUrl);
            }

            // Jeśli nie ma, szukaj w kontenerze do druku
            if (!logoUrl) {
                const container = document.querySelector(containerId);
                if (container) {
                    const logoImg = container.querySelector('img[alt="logo"], .print-logo');
                    if (logoImg && logoImg.src) {
                        logoUrl = logoImg.src;
                        console.log('Found logo in container:', logoUrl);
                    }
                }
            }

            if (!logoUrl) {
                console.log('Logo not found, using default /img/logo.png');
                logoUrl = '/img/logo.png';
            }

            if (logoUrl.startsWith('data:')) {
                console.log('Logo is already base64');
                return {
                    base64: logoUrl.split(',')[1],
                    mimeType: logoUrl.match(/data:(.*?);/)?.[1] || 'image/png'
                };
            }

            console.log('Converting image to base64:', logoUrl);
            return await this._imageToBase64(logoUrl);
        } catch (error) {
            console.error('Error extracting logo:', error);
            return null;
        }
    }

    /**
     * Konwertuje obraz do base64
     */
    async _imageToBase64(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            if (!url.startsWith('http')) {
                console.log('Local image path detected');
            } else {
                img.crossOrigin = 'Anonymous';
            }

            img.onload = () => {
                console.log('Image loaded successfully:', img.width, 'x', img.height);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                try {
                    const dataUrl = canvas.toDataURL('image/png');
                    const base64Data = dataUrl.split(',')[1];
                    console.log('Image converted to base64, length:', base64Data.length);
                    resolve({
                        base64: base64Data,
                        mimeType: 'image/png',
                        width: img.width,
                        height: img.height
                    });
                } catch (error) {
                    console.error('Error converting to base64:', error);
                    reject(error);
                }
            };

            img.onerror = (error) => {
                console.error('Failed to load image:', url, error);
                reject(new Error('Failed to load image: ' + url));
            };

            console.log('Loading image from:', url);
            img.src = url;
        });
    }

    /**
     * Ekstraktuje dane z cleanOrderItems (z backendu)
     */
    _extractDataFromCleanOrderItems(cleanOrderItems) {
        if (!cleanOrderItems || cleanOrderItems.length === 0) {
            console.warn('No cleanOrderItems provided');
            return;
        }

        cleanOrderItems.forEach(table => {
            this._processCleanTable(table);
            this._addSeparator();
        });

        this._removeTrailingSeparator();
    }

    /**
     * Przetwarza pojedynczą tabelę z cleanOrderItems
     */
    _processCleanTable(table) {
        // Dodaj nagłówki (z headers1, ale pomijając te w table.locked)
        const nonLockedHeaders = table.headers1.filter(h => !table.locked || !table.locked.includes(h));
        const headers = ['#', ...nonLockedHeaders, 'Oddział', 'Grupa', 'Komisja', 'Komentarz'];
        this.combinedData.push(headers);
        this.headerRows.push(this.combinedData.length - 1);

        let itemIndex = 1;

        // Przetwórz każdy wiersz
        table.rows.forEach(rowObj => {
            // Row 1 - główne dane (non-locked parameters from headers1)
            const row1Data = [itemIndex];
            table.headers1.forEach(header => {
                // Pomiń jeśli w table.locked (globalnie locked dla tabeli)
                if (table.locked && table.locked.includes(header)) {
                    return;
                }
                row1Data.push(rowObj.row.row1[header] || '-');
            });
            row1Data.push(
                rowObj.item.department || '-',
                rowObj.item.group_name || '-',
                rowObj.item.commision || '-',
                rowObj.item.comment || '-'
            );
            this.combinedData.push(row1Data);

            // Row 2 - ceny (non-locked parameters from headers2)
            const row2Data = Array(row1Data.length).fill('');
            let colIdx = 1;
            table.headers2.forEach(header => {
                // Pomiń jeśli w table.locked (globalnie locked dla tabeli)
                if (table.locked && table.locked.includes(header)) {
                    return;
                }
                const value = rowObj.row.row2[header];
                if (value && value !== '-' && value !== '') {
                    row2Data[colIdx] = `${header}: ${value}`;
                    colIdx++;
                }
            });
            this.combinedData.push(row2Data);

            // Row 3 - locked parameters (tylko gdy this.isShort === true)
            if (this.isShort && table.locked && table.locked.length > 0) {
                const row3Data = Array(row1Data.length).fill('');
                let colIdx = 1;

                // Zbierz locked params z headers1
                table.headers1.forEach(header => {
                    if (table.locked.includes(header)) {
                        const value = rowObj.row.row1[header];
                        if (value && value !== '-' && value !== '') {
                            row3Data[colIdx] = `${header}: ${value}`;
                            colIdx++;
                        }
                    }
                });

                // Zbierz locked params z headers2
                table.headers2.forEach(header => {
                    if (table.locked.includes(header)) {
                        const value = rowObj.row.row2[header];
                        if (value && value !== '-' && value !== '') {
                            row3Data[colIdx] = `${header}: ${value}`;
                            colIdx++;
                        }
                    }
                });

                this.combinedData.push(row3Data);
                this.row3Rows.push(this.combinedData.length - 1);
            }

            itemIndex++;
        });
    }

    /**
     * Ekstraktuje dane ze wszystkich tabel
     */
    _extractDataFromTables(tables) {
        tables.forEach(table => {
            this._processTable(table);
            this._addSeparator();
        });

        this._removeTrailingSeparator();
    }

    /**
     * Przetwarza pojedynczą tabelę
     */
    _processTable(table) {
        const headers = this._extractHeaders(table);
        this.combinedData.push(headers);
        this.headerRows.push(this.combinedData.length - 1);

        const rows = this._extractRows(table);
        rows.forEach(row => this.combinedData.push(row));
    }

    /**
     * Ekstraktuje nagłówki z tabeli
     */
    _extractHeaders(table) {
        return Array.from(table.querySelectorAll('thead th'))
            .map(th => th.innerText.trim());
    }

    /**
     * Ekstraktuje wiersze danych z tabeli
     */
    _extractRows(table) {
        const tbodyRows = table.querySelectorAll('tbody tr');

        if (tbodyRows.length > 0) {
            return Array.from(tbodyRows).map(tr =>
                Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
            );
        }

        const allRows = table.querySelectorAll('tr');
        return Array.from(allRows).slice(1).map(tr =>
            Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
        );
    }

    /**
     * Dodaje separator między tabelami (dwa wiersze)
     */
    _addSeparator() {
        const lastRow = this.combinedData[this.combinedData.length - 1];
        const separator1 = Array(lastRow.length).fill('');
        const separator2 = Array(lastRow.length).fill('');
        this.combinedData.push(separator1);
        this.separatorRows.push(this.combinedData.length - 1);
        this.combinedData.push(separator2);
        this.separatorRows.push(this.combinedData.length - 1);
    }

    /**
     * Usuwa ostatni separator jeśli jest pusty
     */
    _removeTrailingSeparator() {
        const lastRow = this.combinedData[this.combinedData.length - 1];
        if (lastRow && lastRow.every(cell => cell === '')) {
            this.separatorRows.pop();
            this.combinedData.pop();
        }
    }

    /**
     * Dodaje pusty wiersz i kolumnę na początku oraz przestrzeń na logo
     */
    _addEmptyRowAndColumn() {
        if (!this.config.SKIP_FIRST_COLUMN && !this.config.SKIP_FIRST_ROW) {
            return;
        }

        if (this.config.SKIP_FIRST_COLUMN) {
            this.combinedData.forEach(row => row.unshift(''));
        }

        if (this.config.SKIP_FIRST_ROW) {
            const numCols = this.combinedData[0]?.length || 1;
            for (let i = 0; i < this.config.LOGO_SPACE_ROWS; i++) {
                const emptyRow = Array(numCols).fill('');
                this.combinedData.unshift(emptyRow);
            }
        }
    }

    /**
     * Dostosowuje indeksy po dodaniu offsetu
     */
    _adjustIndicesForOffset() {
        const offset = this.config.SKIP_FIRST_ROW ? this.config.LOGO_SPACE_ROWS : 0;

        if (offset > 0) {
            this.headerRows = this.headerRows.map(idx => idx + offset);
            this.separatorRows = this.separatorRows.map(idx => idx + offset);
            this.row3Rows = this.row3Rows.map(idx => idx + offset);
        }
    }

    /**
     * Tworzy worksheet z danych używając ExcelJS
     */
    async _createWorksheet() {
        this.workbook = new ExcelJS.Workbook();
        const worksheet = this.workbook.addWorksheet('Sheet1');

        // Dodaj dane do arkusza
        this.combinedData.forEach((row, rowIndex) => {
            const excelRow = worksheet.getRow(rowIndex + 1);
            row.forEach((cellValue, colIndex) => {
                excelRow.getCell(colIndex + 1).value = cellValue || '';
            });
            excelRow.commit();
        });

        return worksheet;
    }

    /**
     * Aplikuje style dla nagłówków
     */
    _applyHeaderStyles(worksheet) {
        const startCol = this.config.SKIP_FIRST_COLUMN ? 2 : 1;

        this.headerRows.forEach(rowIdx => {
            const row = this.combinedData[rowIdx];
            const excelRow = worksheet.getRow(rowIdx + 1);

            for (let col = startCol; col <= row.length; col++) {
                const cell = excelRow.getCell(col);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF' + this.config.HEADER_BG_COLOR }
                };
                cell.font = {
                    color: { argb: 'FF' + this.config.HEADER_TEXT_COLOR },
                    bold: true
                };
            }
            excelRow.commit();
        });
    }

    /**
     * Aplikuje jasnoniebieski kolor dla row2 (co drugi wiersz każdej pozycji)
     */
    _applyRow2Styles(worksheet) {
        const startCol = this.config.SKIP_FIRST_COLUMN ? 2 : 1;

        this.headerRows.forEach(headerIdx => {
            // Startujemy od wiersza po headerze + 1 (pomijamy pierwszy wiersz danych)
            let rowIdx = headerIdx + 2; // Pomijamy header i row1

            // Przechodzimy przez wiersze aż do następnego headera lub końca danych
            while (rowIdx < this.combinedData.length) {
                // Sprawdź czy to nie jest kolejny header lub separator
                if (this.headerRows.includes(rowIdx) || this.separatorRows.includes(rowIdx)) {
                    break;
                }

                // Row2 - pomaluj na jasny niebieski
                const excelRow = worksheet.getRow(rowIdx + 1);
                const row = this.combinedData[rowIdx];

                // Znajdź ostatnią wypełnioną kolumnę
                let lastFilledCol = startCol;
                for (let col = startCol; col <= row.length; col++) {
                    if (row[col - 1] && row[col - 1].toString().trim() !== '') {
                        lastFilledCol = col;
                    }
                }

                // Pokoloruj tylko wypełnione kolumny
                for (let col = startCol; col <= lastFilledCol; col++) {
                    const cell = excelRow.getCell(col);
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFD9E1F2' } // Jasny niebieski
                    };
                }
                excelRow.commit();

                // Przeskocz do następnej pozycji
                // Jeśli następny wiersz to row3 (locked params), przeskocz o 3, inaczej o 2
                if (rowIdx + 1 < this.combinedData.length && this.row3Rows.includes(rowIdx + 1)) {
                    rowIdx += 3; // row1 + row2 + row3
                } else {
                    rowIdx += 2; // row1 + row2
                }
            }
        });
    }

    /**
     * Aplikuje style dla row3 (locked params) - złoty/żółty kolor
     */
    _applyRow3Styles(worksheet) {
        if (!this.isShort || this.row3Rows.length === 0) {
            return; // Nie stosuj jeśli nie ma row3 lub isShort jest false
        }

        const startCol = this.config.SKIP_FIRST_COLUMN ? 2 : 1;

        this.row3Rows.forEach(rowIdx => {
            const excelRow = worksheet.getRow(rowIdx + 1);
            const row = this.combinedData[rowIdx];

            // Znajdź ostatnią wypełnioną kolumnę
            let lastFilledCol = startCol;
            for (let col = startCol; col <= row.length; col++) {
                if (row[col - 1] && row[col - 1].toString().trim() !== '') {
                    lastFilledCol = col;
                }
            }

            // Pokoloruj tylko wypełnione kolumny na złoty/żółty
            for (let col = startCol; col <= lastFilledCol; col++) {
                const cell = excelRow.getCell(col);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFF2CC' } // Jasny złoty/żółty
                };
            }
            excelRow.commit();
        });
    }

    /**
     * Aplikuje obramowania dla komórek
     */
    _applyBorderStyles(worksheet) {
        const startCol = this.config.SKIP_FIRST_COLUMN ? 2 : 1;
        const borderStyle = {
            style: this.config.BORDER_STYLE,
            color: { argb: 'FF' + this.config.BORDER_COLOR }
        };

        this.combinedData.forEach((row, rowIdx) => {
            if (this.separatorRows.includes(rowIdx)) return;

            const excelRow = worksheet.getRow(rowIdx + 1);

            for (let col = startCol; col <= row.length; col++) {
                const cell = excelRow.getCell(col);
                cell.border = {
                    top: borderStyle,
                    bottom: borderStyle,
                    left: borderStyle,
                    right: borderStyle
                };
            }
            excelRow.commit();
        });
    }

    /**
     * Ustawia szerokości kolumn
     */
    _applyColumnWidths(worksheet) {
        const numCols = this.combinedData[0]?.length || 0;

        for (let col = 1; col <= numCols; col++) {
            let maxLength = this.config.MIN_COLUMN_WIDTH;

            // Kolumna B (indeks 2) powinna być szersza dla logo
            if (col === 2) {
                maxLength = 25; // Szerokość dla kolumny z logo
            } else {
                for (let row = 0; row < this.combinedData.length; row++) {
                    const cellValue = this.combinedData[row][col - 1] || '';
                    if (cellValue.length > maxLength) {
                        maxLength = cellValue.length;
                    }
                }
            }

            worksheet.getColumn(col).width = maxLength + this.config.COLUMN_WIDTH_PADDING;
        }
    }

    /**
     * Dodaje logo do arkusza Excel używając ExcelJS
     */
    async _addLogoToWorksheet(worksheet, logoData) {
        if (!logoData || !logoData.base64) {
            console.log('No logo data to add to worksheet');
            return;
        }

        try {
            console.log('Adding logo to worksheet with ExcelJS, base64 length:', logoData.base64.length);

            // Konwertuj base64 do ArrayBuffer
            const binaryString = atob(logoData.base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Dodaj obraz do workbooka
            const imageId = this.workbook.addImage({
                buffer: bytes.buffer,
                extension: 'png',
            });

            // Pozycja logo - kolumna 2 (B)
            const logoCol = 2;
            const logoRow = 2;

            // Nie merguj komórek - logo tylko w kolumnie B
            // worksheet.mergeCells(logoRow, logoCol, logoRow, logoCol);

            // Ustaw wysokość wierszy - małe
            for (let i = 1; i <= this.config.LOGO_SPACE_ROWS; i++) {
                worksheet.getRow(i).height = 12;
            }
            worksheet.getRow(logoRow).height = 50;

            // Dodaj obraz do arkusza - dokładnie jedna komórka B2
            worksheet.addImage(imageId, {
                tl: { col: 1, row: 1 },
                br: { col: 2, row: 2 },
                editAs: 'oneCell'
            });

            // Wycentruj logo w komórce
            const logoCell = worksheet.getCell(logoRow, logoCol);
            logoCell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            };

            console.log('Logo successfully added to worksheet at column', logoCol, 'row', logoRow);
        } catch (error) {
            console.error('Error adding logo to worksheet:', error);
        }
    }


    _addOrderTitle(worksheet, metadata) {
        try {
            // Pokoloruj cały wiersz 2 na niebiesko
            const row2 = worksheet.getRow(2);
            const numCols = this.combinedData[0]?.length || 10;
            for (let col = 1; col <= numCols; col++) {
                const cell = row2.getCell(col);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFFFF' } // Biały kolor
                };
            }
            row2.commit();

            // Merguj komórki D2 i E2
            worksheet.mergeCells('D2:E2');

            // Wstaw tytuł
            const titleCell = worksheet.getCell('D2');
            titleCell.value = metadata.title;

            // Formatowanie
            titleCell.font = {
                bold: true,
                size: 14,
                color: { argb: '000000' } // Czarny tekst na białym tle
            };
            titleCell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            };

            console.log('Order title added:', metadata.title);
        } catch (error) {
            console.error('Error adding order title:', error);
        }
    }

    /**
     * Dodaje dane klienta i wysyłki na końcu arkusza
     */
    _addClientData(worksheet, orderData) {
        if (!orderData || !orderData.sendData) {
            console.log('No order data to add');
            return;
        }

        try {
            const sendData = orderData.sendData;
            // Użyj długości combinedData zamiast worksheet.rowCount
            const lastRow = this.combinedData.length + 3; // Dodaj 3 puste wiersze   
            console.log('Adding client data at row:', lastRow);
            console.log(orderData, 'sprawdzamy kurwa');

            // Nagłówek sekcji klienta
            const clientHeaderRow = lastRow;
            const clientHeaderRowObj = worksheet.getRow(clientHeaderRow);
            clientHeaderRowObj.getCell(2).value = (t('order.client_data')).toUpperCase();

            clientHeaderRowObj.getCell(2).font = { bold: true, size: 12 };
            clientHeaderRowObj.getCell(2).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            clientHeaderRowObj.commit();

            // Dane klienta
            let currentRow = clientHeaderRow + 1;
            const clientData = [
                [t('new-order.client_name'), sendData.client],
                [t('base.nip'), sendData.tax],
                [t('orders.created_date'), sendData.created_date]
            ];



            clientData.forEach(([label, value]) => {
                const row = worksheet.getRow(currentRow);
                row.getCell(2).value = label;
                row.getCell(2).font = { bold: true };
                row.getCell(3).value = value || '-';
                row.commit();
                currentRow++;
            });

            // Pusta linia
            currentRow++;

            // Nagłówek sekcji wysyłki
            const shipHeaderRow = currentRow;
            const shipHeaderRowObj = worksheet.getRow(shipHeaderRow);
            shipHeaderRowObj.getCell(2).value = (t('order.send_data')).toUpperCase();
            shipHeaderRowObj.getCell(2).font = { bold: true, size: 12 };
            shipHeaderRowObj.getCell(2).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            shipHeaderRowObj.commit();



            currentRow = shipHeaderRow + 1;
            const shipData = [
                [t('base.street'), sendData.address],
                [t('base.city_country'), `${sendData.zip} ${sendData.city}`],
                [t('edit_order.country_placeholder'), sendData.country],
                ['Email:', sendData.email],
                [t('new-order.phone'), sendData.phone]
            ];


            shipData.forEach(([label, value]) => {
                const row = worksheet.getRow(currentRow);
                row.getCell(2).value = label;
                row.getCell(2).font = { bold: true };
                row.getCell(3).value = value || '-';
                row.commit();
                currentRow++;
            });

            // Pusta linia
            currentRow++;

            // Nagłówek sekcji total
            const totalHeaderRow = currentRow;
            const totalHeaderRowObj = worksheet.getRow(totalHeaderRow);
            totalHeaderRowObj.getCell(2).value = t('excel.order_sum')
            totalHeaderRowObj.getCell(2).font = { bold: true, size: 12 };
            totalHeaderRowObj.getCell(2).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            totalHeaderRowObj.commit();

            // Dane total
            currentRow = totalHeaderRow + 1;



            let labels = [t('order.total'), t('order.total_hidden')]

            const row = worksheet.getRow(currentRow);
            row.getCell(2).value = labels[0] || 'Total';
            row.getCell(2).font = { bold: true };
            row.getCell(3).value = `${this.orderData.totalPrice.visible} €` || '';
            row.commit();
            currentRow++;
            console.log(this.isLocked, 'sprawdzamy czy zablokowane');

            if (this.isLocked) {
                const hiddenRow = worksheet.getRow(currentRow);
                hiddenRow.getCell(2).value = labels[1] || 'Total Hidden';
                hiddenRow.getCell(2).font = { bold: true };
                hiddenRow.getCell(3).value = `${this.orderData.totalPrice.hidden} €` || '';
                hiddenRow.commit();
                currentRow++;
            }

            console.log('Client data successfully added to worksheet');



        } catch (error) {
            console.error('Error adding client data:', error);
        }
    }

    /**
    /**
     * Zapisuje workbook do pliku
     */
    async _saveWorkbook(worksheet, metadata) {
        const sheetName = this._sanitizeSheetName(metadata.name);
        worksheet.name = sheetName;

        const fileName = this._generateFileName(metadata);

        // Generuj plik Excel
        const buffer = await this.workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Zapisz używając FileSaver
        saveAs(blob, fileName);
    }

    /**
     * Sanityzuje nazwę arkusza (maksymalna długość)
     */
    _sanitizeSheetName(name) {
        return name.slice(0, this.config.MAX_SHEET_NAME_LENGTH);
    }

    /**
     * Generuje nazwę pliku
     */
    _generateFileName(metadata) {
        const sanitizedName = this._sanitizeSheetName(metadata.name);
        return `${metadata.id}_${sanitizedName}.xlsx`;
    }

    /**
     * Resetuje stan generatora
     */
    reset() {
        this.workbook = null;
        this.combinedData = [];
        this.headerRows = [];
        this.separatorRows = [];
        this.row3Rows = [];
    }
}

/**
 * Funkcja fasadowa dla zachowania kompatybilności wstecznej
 */
export async function generateExcelWithLogo() {
    const generator = new ExcelJSGenerator();
    await generator.generate();
}

// Eksportuj także oryginalną funkcję dla kompatybilności
export { generateExcelWithLogo as generateExcel };
