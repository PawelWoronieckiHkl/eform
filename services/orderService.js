const _ = require("n_");

async function jsonTextBackToMap(orderItems) {
  let total = {}
  let cleanOrderItems = [];
  let prevHeaderKeys = [];
  let table = {
    headerKeys1: [],
    headerKeys2: [],
    displayHeaders1: [],
    displayHeaders2: [],
    rows: [],
    locked: []
  };

  for (let item of orderItems) {
    let parsed = item.json_parameters_desc;
    try {
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (!Array.isArray(parsed)) throw new Error("JSON not in array format");
    } catch (err) {
      parsed = [];
    }

    // Zastosuj array of [key, param], oraz headerKey = param_description + '||' + key
    const jsonParameters = new Map(parsed);
    let currentHeaderKeys1 = [];
    let currentDisplayHeaders1 = [];
    let currentHeaderKeys2 = [];
    let currentDisplayHeaders2 = [];

    for (const [key, param] of jsonParameters.entries()) {

      const display = param && param.param_description ? param.param_description : key;
      const headerKey = display + "||" + key; // rozróżnia nawet powtarzalne "MODEL"
      const rowStr = (param && param.row !== undefined) ? String(param.row) : '1';
      if (rowStr === '0') {
        continue; // pomiń parametry z row === '0'
      }
      const isRow2 = rowStr === '2';

      if (isRow2) {
        currentHeaderKeys2.push(headerKey);
        currentDisplayHeaders2.push(display);
      } else {
        currentHeaderKeys1.push(headerKey);
        currentDisplayHeaders1.push(display);
      }
    }

    const currentHeaderKeys = currentHeaderKeys1.concat(currentHeaderKeys2);

    // Jeśli nagłówki się zmieniły, zamknij poprzednią tabelę
    if (!areArraysEqual(prevHeaderKeys, currentHeaderKeys)) {
      if (table.rows.length > 0) {
        cleanOrderItems.push(removeEmptyColumns({
          headers1: table.displayHeaders1,
          headers2: table.displayHeaders2,
          headerKeys1: table.headerKeys1,
          headerKeys2: table.headerKeys2,
          rows: table.rows,
          locked: table.locked
        }));
      }
      table = {
        headerKeys1: currentHeaderKeys1,
        headerKeys2: currentHeaderKeys2,
        displayHeaders1: currentDisplayHeaders1,
        displayHeaders2: currentDisplayHeaders2,
        rows: [],
        locked: table.locked

      };
    }

    // Tworzymy wiersz jako obiekt: [headerKey] => wartość, plus na display mapujemy nagłówek po kolei
    item.lockedParams = []
    item.posId = item.id || 0
    let rowObj = {};
    for (const [key, param] of jsonParameters.entries()) {
      const display = param && param.param_description ? param.param_description : key;
      const headerKey = display + "||" + key;
      const rowStr = (param && param.row !== undefined) ? String(param.row) : '1';
      if (rowStr === '0') {
        continue; // pomiń parametry z row === '0'
      }
      let value = "-";
      if (param) {
        if ("row" in param) {
          // console.log(param.row);
        }
        if ('listsum' in param) {
          console.log(param, 'LISTSUM')
        }
        if (!('option_value' in param)) {
          value = "-";
        } else if ('option_description' in param && (param['option_description'] != '')) {
          value = `${param.option_value} - ${param.option_description}`;
        } else {
          value = param.option_value;
        }

        if ('locked' in param && 'param_description' in param) {
          if (!isNaN(param.option_value) && param?.option_value != undefined && 'listsum' in param) {
            let totalkey = total[param.param_description] || { price: 0, locked: !!param.locked };
            totalkey.price = (totalkey.price || 0) + Number(param.option_value || 0);
            totalkey.locked = !!param.locked;
            total[param.param_description] = totalkey;
          }
          if (param.locked) {

            if (!table.locked.includes(param.param_description)) {
              table.locked.push(param.param_description)
            }
            item.lockedParams.push(param.param_description)
          }
        }
      }

      // inicjuj komórkę jeśli nie istnieje i zapisz do odpowiedniego row1/row2
      if (!rowObj[headerKey]) {
        rowObj[headerKey] = { row1: null, row2: null };
      }
      const targetRow = (rowStr === '2') ? 'row2' : 'row1';
      const rowToDelete = (rowStr === '2') ? 'row1' : 'row2';
      rowObj[headerKey][targetRow] = value;
      delete rowObj[headerKey][rowToDelete];
    }

    table.rows.push({ item, row: rowObj });

    prevHeaderKeys = currentHeaderKeys;
  }

  if (table.rows.length > 0) {
    cleanOrderItems.push(removeEmptyColumns({
      headers1: table.displayHeaders1,
      headers2: table.displayHeaders2,
      headerKeys1: table.headerKeys1,
      headerKeys2: table.headerKeys2,
      rows: table.rows,
      locked: table.locked

    }));
  }
  // console.log(JSON.stringify(cleanOrderItems, null, 2));
  return { cleanOrderItems, total };
}

function areArraysEqual(arrA, arrB) {
  if (arrA.length !== arrB.length) return false;
  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i] !== arrB[i]) return false;
  }
  return true;
}


function removeEmptyColumns(table) {
  const { headers1 = [], headers2 = [], headerKeys1 = [], headerKeys2 = [], rows } = table;
  const combinedHeaderKeys = headerKeys1.concat(headerKeys2);

  const columnsToRemove = [];

  // kolumna pusta gdy dla wszystkich wierszy zarówno row1 jak i row2 są "-"
  for (let idx = 0; idx < combinedHeaderKeys.length; idx++) {
    let allEmpty = true;
    const headerKey = combinedHeaderKeys[idx];
    for (const rowObj of rows) {
      const cell = rowObj.row[headerKey];
      const v1 = cell?.row1;
      const v2 = cell?.row2;
      if ((v1 !== "-" && v1 !== undefined && v1 !== null) || (v2 !== "-" && v2 !== undefined && v2 !== null)) {
        allEmpty = false;
        break;
      }
    }
    if (allEmpty) {
      columnsToRemove.push(idx);
    }
  }

  // jeśli nie ma kolumn do usunięcia - zwróć oryginalne headers1/headers2 i mapowane rows
  if (columnsToRemove.length === 0) {
    const mappedRows = rows.map(r => {
      const row1 = {};
      const row2 = {};
      // map headers1
      for (let i = 0; i < headers1.length; i++) {
        const headerKey = headerKeys1[i];
        const cell = r.row[headerKey] || { row1: "-", row2: "-" };
        row1[headers1[i]] = cell.row1;
      }
      // map headers2
      for (let i = 0; i < headers2.length; i++) {
        const headerKey = headerKeys2[i];
        const cell = r.row[headerKey] || { row1: "-", row2: "-" };
        row2[headers2[i]] = cell.row2;
      }
      return { item: r.item, row: { row1, row2 } };
    });

    return {
      headers1,
      headers2,
      rows: mappedRows,
      locked: table.locked
    };
  }

  // Filtrujemy po pozycjach - rozdzielamy indeksy dla headers1 i headers2
  const newHeaderKeys1 = headerKeys1.filter((_, idx) => !columnsToRemove.includes(idx));
  const newHeaders1 = headers1.filter((_, idx) => !columnsToRemove.includes(idx));

  const offset = headerKeys1.length;
  const newHeaderKeys2 = headerKeys2.filter((_, idx) => !columnsToRemove.includes(offset + idx));
  const newHeaders2 = headers2.filter((_, idx) => !columnsToRemove.includes(offset + idx));

  const newRows = rows.map(rowObj => {
    const filteredRow = { row1: {}, row2: {} };
    for (let i = 0; i < newHeaders1.length; i++) {
      const display = newHeaders1[i];
      const headerKey = newHeaderKeys1[i];
      const cell = rowObj.row[headerKey] || { row1: "-", row2: "-" };
      filteredRow.row1[display] = cell.row1;
    }
    for (let i = 0; i < newHeaders2.length; i++) {
      const display = newHeaders2[i];
      const headerKey = newHeaderKeys2[i];
      const cell = rowObj.row[headerKey] || { row1: "-", row2: "-" };
      filteredRow.row2[display] = cell.row2;
    }
    return { item: rowObj.item, row: filteredRow };
  });

  return {
    headers1: newHeaders1,
    headers2: newHeaders2,
    rows: newRows,
    locked: table.locked
  };
}

module.exports = { jsonTextBackToMap };
