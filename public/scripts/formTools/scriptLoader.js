import {
    setDescription
} from "./formTools.js";
export function loadScript(scriptFile, values, displayValues, groupNumber, allOptionsByParameter, param, callback) {

    // console.log('Ładowanie skryptu:', scriptFile, 'dla grupy:', groupNumber);
    // console.log('odczytuje skrypt', scriptFile)
    const scriptPath = scriptFile;
    const script = document.createElement('script');
    // console.log('Loading script from path cenapodwyzka:', scriptPath);
    script.crossOrigin = 'anonymous';
    script.src = scriptPath;
    //    console.log('scriptOperations to execute:', scriptPath);
    const scriptInput = prepareValuesForScript(values, displayValues, allOptionsByParameter);

    // Flaga czy callback już wywołany
    let finished = false;

    // Globalny listener błędów (także syntax error)
    const handleGlobalError = (event) => {
        if (event.filename && event.filename.includes(scriptPath) && !finished) {
            console.error('Globalny błąd skryptu:', event.message || event.error);
            finished = true;
            window.removeEventListener('error', handleGlobalError);
            callback(errorShield(scriptPath, param));

        }
    };
    window.addEventListener('error', handleGlobalError);

    script.onload = () => {

        if (finished) return; // błąd już wcześniej złapany
        try {
            if (typeof f === 'function') {
                const result = f(scriptInput);
                console.log('Wynik funkcji f ze skryptu', result);
                const roundedResult = roundPrices(result);
                finished = true;
                console.log(roundedResult, 'roundedResult z scriptLoader');
                callback(roundedResult);

            } else {
                console.error('Funkcja f nie została znaleziona!');
                finished = true;
                callback(errorShield(scriptPath, param));
            }
        } catch (err) {
            console.error('Błąd podczas wykonywania f:', err);
            finished = true;
            callback(errorShield(scriptPath, param));
        } finally {
            window.removeEventListener('error', handleGlobalError);
        }
    };

    script.onerror = () => {
        if (!finished) {
            console.error('Błąd ładowania lub parsowania skryptu:', scriptFile);
            finished = true;
            window.removeEventListener('error', handleGlobalError);
            callback(errorShield(scriptPath, param));
        }
    };

    document.body.appendChild(script);
}

function prepareValuesForScript(values, displayValues, allOptionsByParameter) {
    values['uid'] = window.uid;
    for (let [paramName, value] of Object.entries(values)) {
        values = setDescription(values, value, allOptionsByParameter, paramName, 'scriptLoader');

    }

    return JSON.stringify(values, null, 2);
}

function errorShield(scriptPath, param) {
    const badValues = ['undefined', 'NaN', 'Infinity', '-Infinity', null, undefined, ''];
    if (scriptPath.includes("DOPLATA_RABAT")) {
        return { 'DOPLATA-RABAT': 'Według cennika' };
    }
    if (scriptPath.includes("DOPLATA-")) {
        return { 'DOPLATA': 'Według cennika' };
    }
    if (scriptPath.includes('DOPLATA_EL')) {
        return { 'DOPLATA_EL': 'Według cennika' };
    }
    if (scriptPath.includes("CENA_RABAT")) {
        return { 'CENA_RABAT': 'Według cennika' };
    }
    if (scriptPath.includes("DOPLATA_EL_RABAT")) {
        return { 'DOPLATA_EL_RABAT': 'Według cennika' };
    }
    if (scriptPath.includes("CENA-")) {
        return { 'CENA': 'Według cennika' };
    }
    else {
        return { [param.NAME]: 'Według cennika' };

    }

}

function roundPrices(pricesObject) {
    //    console.log()
    if (!pricesObject || typeof pricesObject !== 'object') {
        return pricesObject;
    }

    const rounded = {};
    for (const [key, value] of Object.entries(pricesObject)) {
        if (!isNaN(value) && value !== null && value !== '') {
            //    console.log(key, value, 'liczymy ceny')
            const floatValue = parseFloat(value);
            rounded[key] = Math.round(floatValue * 100) / 100;
        } else {
            // Zachowaj inne typy danych bez zmian
            rounded[key] = value;
        }
    }
    return rounded;
}
