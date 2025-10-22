import {
    setDescription
} from "./formTools.js";
export function loadScript(scriptFile, values, displayValues, groupNumber, allOptionsByParameter, callback) {

    const scriptPath = scriptFile;
    const script = document.createElement('script');

    // kluczowe: dla lepszego przechwytywania błędów z obcych domen
    script.crossOrigin = 'anonymous';
    script.src = scriptPath;

    const scriptInput = prepareValuesForScript(values, displayValues,allOptionsByParameter);

    // Flaga czy callback już wywołany
    let finished = false;

    // Globalny listener błędów (także syntax error)
    const handleGlobalError = (event) => {
        if (event.filename && event.filename.includes(scriptPath) && !finished) {
            console.error('Globalny błąd skryptu:', event.message || event.error);
            finished = true;
            window.removeEventListener('error', handleGlobalError);
            callback(errorShield(scriptPath));
        }
    };
    window.addEventListener('error', handleGlobalError);

    script.onload = () => {
        if (finished) return; // błąd już wcześniej złapany
        try {
            if (typeof f === 'function') {
                const result = f(scriptInput);
                finished = true;
                callback(result);
                
            } else {
                console.error('Funkcja f nie została znaleziona!');
                finished = true;
                callback(errorShield(scriptPath));
            }
        } catch (err) {
            console.error('Błąd podczas wykonywania f:', err);
            finished = true;
            callback(errorShield(scriptPath));
        } finally {
            window.removeEventListener('error', handleGlobalError);
        }
    };

    script.onerror = () => {
        if (!finished) {
            console.error('Błąd ładowania lub parsowania skryptu:', scriptFile);
            finished = true;
            window.removeEventListener('error', handleGlobalError);
            callback(errorShield(scriptPath));
        }
    };

    document.body.appendChild(script);
}

function prepareValuesForScript(values, displayValues, allOptionsByParameter) {
    console.log('ALLLL:', allOptionsByParameter);
    for (let [paramName, value] of Object.entries(values)) {
        values = setDescription(values, value, allOptionsByParameter, paramName, 'scriptLoader');
       
    }
     console.log("SCRIPT VALUES:", values);
    return JSON.stringify(values, null, 2);
}

function errorShield(scriptPath) {

    if (scriptPath.includes("DOPLATA_RABAT")) {
        return { 'DOPLATA-RABAT': 0 };
    }
    if (scriptPath.includes("DOPLATA-")) {
        return { 'DOPLATA': 0 };
    }
    if (scriptPath.includes("CENA_RABAT")) {
        return { 'CENA_RABAT': 0 };
    }
    if (scriptPath.includes("CENA-")) {
        return { 'CENA': 0 };
    }
    return { "CENA": 0 };
}
