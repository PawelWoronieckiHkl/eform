const _ = require("n_");

async function jsonTextBackToMap(orderItems) {
  let total = {}
  let cleanOrderItems = [];
  let prevHeaderKeys = [];
  let table = {
    headers: [],
    displayHeaders: [], // do ekranu
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
    let currentHeaderKeys = [];
    let displayHeaders = [];
    for (const [key, param] of jsonParameters.entries()) {
      const display = param && param.param_description ? param.param_description : key;
      const headerKey = display + "||" + key; // rozróżnia nawet powtarzalne "MODEL"

      currentHeaderKeys.push(headerKey);
      displayHeaders.push(display);
    }

    // Jeśli nagłówki się zmieniły, zamknij poprzednią tabelę
    if (!areArraysEqual(prevHeaderKeys, currentHeaderKeys)) {
      if (table.rows.length > 0) {
        cleanOrderItems.push(removeEmptyColumns({
          headers: table.displayHeaders,
          headerKeys: table.headers,
          rows: table.rows,
          locked: table.locked
        }));
      }
      table = {
        headers: currentHeaderKeys,
        displayHeaders: displayHeaders,
        rows: [],
        locked: table.locked

      };
    }

    // Tworzymy wiersz jako obiekt: [headerKey] => wartość, plus na display mapujemy nagłówek po kolei
    item.lockedParams = []
    let rowObj = {};
    let i = 0;
    for (const [key, param] of jsonParameters.entries()) {
      const display = param && param.param_description ? param.param_description : key;
      const headerKey = display + "||" + key;
      let value = "-";
      if (param) {
        if (!('option_value' in param)) {
          value = "-";
        } else if ('option_description' in param && (param['option_description'] != '')) {

          value = `${param.option_value} - ${param.option_description}`;
        } else {
          value = param.option_value;
        }
        if ('locked' in param && 'param_description' in param) {
          if (param.locked) {
            if (!isNaN(param.option_value) && param?.option_value != undefined) {
              console.log(param.option_value)
              total[key] = (total[key] || 0) + Number(param.option_value || 0);
            }
            if (!table.locked.includes(param.param_description)) {
              table.locked.push(param.param_description)
            }

            item.lockedParams.push(param.param_description)
          }
        }
      }

      rowObj[headerKey] = value;
      i++;

    }

    table.rows.push({ item, row: rowObj });

    prevHeaderKeys = currentHeaderKeys;
  }

  if (table.rows.length > 0) {
    cleanOrderItems.push(removeEmptyColumns({
      headers: table.displayHeaders,
      headerKeys: table.headers,
      rows: table.rows,
      locked: table.locked

    }));
  }
  console.log(total)
  return {cleanOrderItems,total};
}

function areArraysEqual(arrA, arrB) {
  if (arrA.length !== arrB.length) return false;
  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i] !== arrB[i]) return false;
  }
  return true;
}


function removeEmptyColumns(table) {
  const { headers, headerKeys, rows } = table;
  const columnsToRemove = [];

  for (let idx = 0; idx < headerKeys.length; idx++) {
    let allEmpty = true;
    const headerKey = headerKeys[idx];
    for (const rowObj of rows) {
      if (rowObj.row[headerKey] !== "-") {
        allEmpty = false;
        break;
      }
    }
    if (allEmpty) {
      columnsToRemove.push(idx);
    }
  }

  if (columnsToRemove.length === 0) return {
    headers,
    rows: rows.map(r => ({
      item: r.item,
      row: headers.reduce((acc, display, idx) => {
        const headerKey = headerKeys[idx];
        acc[display] = r.row[headerKey];
        return acc;
      }, {})
    })),
    locked: table.locked // dodaj locked
  };

  // Filtrujemy po pozycjach
  const newHeaders = headers.filter((_, idx) => !columnsToRemove.includes(idx));
  const newHeaderKeys = headerKeys.filter((_, idx) => !columnsToRemove.includes(idx));

  const newRows = rows.map(rowObj => {
    const filteredRow = {};
    for (let i = 0; i < newHeaders.length; i++) {
      const display = newHeaders[i];
      const headerKey = newHeaderKeys[i];
      filteredRow[display] = rowObj.row[headerKey];
    }
    return { item: rowObj.item, row: filteredRow };
  });

  return {
    headers: newHeaders,
    rows: newRows,
    locked: table.locked // dodaj przekazanie locked z oryginalnej tabeli
  };
}

module.exports = { jsonTextBackToMap };
