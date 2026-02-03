

export function generateShortJson(params, values) {

    let shortJson = {};
    for (let param of params) {
        if (values[param.NAME]) {
            shortJson[param.NAME] = values[param.NAME];
            if (values[`${param.NAME}_ALIAS`] != '') {
                shortJson[`${param.NAME}_ALIAS`] = values[`${param.NAME}_ALIAS`];
            }
        }

    }
    let paramsNames = params.map(p => p.NAME);
    shortJson = sortShortJsonByParamsNames(shortJson, paramsNames);
    return shortJson;
}

function sortShortJsonByParamsNames(shortJson, paramsNames) {
    let sortedShortJson = {};
    let keysOrder = [];

    // Najpierw dodaj klucze z paramsNames w ich kolejności
    for (let name of paramsNames) {
        if (shortJson.hasOwnProperty(name)) {
            sortedShortJson[name] = shortJson[name];
            keysOrder.push(name);
        }
        // Dodaj też _ALIAS jeśli istnieje
        if (shortJson.hasOwnProperty(`${name}_ALIAS`)) {
            sortedShortJson[`${name}_ALIAS`] = shortJson[`${name}_ALIAS`];
            keysOrder.push(`${name}_ALIAS`);
        }
    }

    // Potem dodaj wszystkie pozostałe klucze, które nie były w paramsNames
    for (let key in shortJson) {
        if (!keysOrder.includes(key)) {
            sortedShortJson[key] = shortJson[key];
            keysOrder.push(key);
        }
    }

    return { data: sortedShortJson, order: keysOrder };
}