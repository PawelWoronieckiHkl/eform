
import { showToast } from "../components/toast.js";
import { loadScript } from './scriptLoader.js';
import { buildValuesToDisplay } from "./updateFieldsAndValues.js";
import { validateFormInput } from "./validateUtils.js";

// Funkcja formatująca liczby - usuwa .00 dla liczb całkowitych
function formatNumberForDisplay(value) {
    const num = parseFloat(value);

    if (num % 1 === 0) {
        return num.toString();
    }
    return num.toFixed(2);
}

export function checkIfPriceIsCorrect(values, inputs, displayValues) {
    const priceParams = ['CENA', 'CENA_SUMA', 'SUMA_BRUTTO'];
    const destinationParams = ['CENA', 'CENA_SUMA', 'SUMA_BRUTTO', 'DOPLATA', 'CENA_RABAT', 'CENA_RABAT', 'CENA_KONCOWA', 'WARTOSC_KONCOWA', "DOPLATA_EL_RABAT"];
    const wrongValues = ['', 0, null, undefined, NaN];
    const checkParams = ['SZEROKOSC', 'WYSOKOSC'].filter(p => {
        let input = inputs[p];
        if (input !== undefined) {
            let parentDiv = input.parentNode;
            return parentDiv && parentDiv.style.display !== 'none';
        }
        return false;
    });
    const hasValidValues = checkParams.length === 0 || checkParams.every(p => !wrongValues.includes(values[p]));

    const hasZero = priceParams.some(paramName => {
        const value = values[paramName];
        return value == '0' || value == 0;
    });

    if (hasValidValues) {
        setTimeout(() => {

            if (hasZero) {
                destinationParams.forEach(paramName => {

                    let displayValue = displayValues.get(paramName);
                    // console.log('Ustawiamy według cennika dla', paramName, displayValue.locked);
                    if (inputs[paramName]) {
                        inputs[paramName].type = 'text';
                        inputs[paramName].value = t('form.pricelist_info')
                        displayValues.set(paramName, {
                            param_description: displayValue?.param_description ?? '',
                            option_value: t('form.pricelist_info'),
                            option_description: '',
                            locked: displayValue?.locked ?? false,
                            row: '2'
                        });
                    }

                });
            }
        }, 150);
        return displayValues;
    }
}


export function calculateFromScript(param, values, inputs, displayValues, groupNumber, allOptionsByParameter, key, paramName, onComplete) {
    // console.log('SCRIPT to ', param.SOURCE, 'dla', param.NAME);
    const wrongValues = ['', 0, null, undefined, NaN];
    const checkParams = ['SZEROKOSC', 'WYSOKOSC'].filter(p => {
        let input = inputs[p];
        if (input !== undefined) {
            let parentDiv = input.parentNode;
            return parentDiv && parentDiv.style.display !== 'none';
        }
        return false;
    });
    const hasValidValues = checkParams.length === 0 || checkParams.every(p => !wrongValues.includes(values[p]));
    if (hasValidValues && !(window.skipCountParams.includes(param.NAME))) {
        try {
            console.log('Przygotowywanie wartości dla skryptu:', values);

            loadScript(param.SOURCE, values, displayValues, groupNumber, allOptionsByParameter, param, function (scriptResult) {
                // console.log('Wynik SCRIPT u dla', param.NAME, scriptResult);
                if (scriptResult) {
                    for (const [scriptParamName, scriptValue] of Object.entries(scriptResult)) {
                        console.log('Ustawiamy wartość ze SCRIPT u:', scriptParamName, scriptValue);
                        if (inputs && inputs[scriptParamName]) {
                            let strVal;
                            if (param.FORMAT == 'n%') {
                                strVal = `${parseInt(scriptValue * 100)}%`;
                                inputs[scriptParamName].value = scriptValue;
                            } else {
                                strVal = String(scriptValue);
                                inputs[scriptParamName].value = scriptValue;
                            }

                            values[scriptParamName] = scriptValue;
                            buildValuesToDisplay(allOptionsByParameter, strVal, scriptParamName, displayValues, 'INPUT', true);
                            console.log('Ustawiamy display', displayValues);
                        }
                    }
                }

                // Wywołaj callback po zakończeniu skryptu (WEWNĄTRZ callbacka loadScript!)
                if (onComplete && typeof onComplete === 'function') {
                    onComplete();
                }
            });
        } catch (error) {

            if (inputs[param.NAME]) {
                inputs[param.NAME].value = '0';
            }
            values[param.NAME] = 0;

            // Wywołaj callback nawet w przypadku błędu
            if (onComplete && typeof onComplete === 'function') {
                onComplete();
            }
        }
    } else {
        if (inputs[param.NAME]) {
            inputs[param.NAME].value = '0';
        }
        values[param.NAME] = 0;

        // Wywołaj callback gdy warunki nie są spełnione
        if (onComplete && typeof onComplete === 'function') {
            onComplete();

        }
    }
    return paramName;
}

// Funkcja obsługująca FORMULA (formuły) - wykonuje się synchronicznie
export function calculateFromFormula(param, values, inputs, displayValues, groupNumber, allOptionsByParameter, key, paramName) {
    if (param.FORMULA.includes('RABAT')) {
    }
    try {
        let result = window.FormulaHandler.evaluateFormula(
            param.FORMULA,
            values,
            "formula");

        if (result === false || result === null || result < 0) {

            if (inputs[param.NAME]) {
                inputs[param.NAME].value = '0';
            }
            values[param.NAME] = 0;
        } else {
            // console.log(inputs[param.NAME])
            result = parseFloat(result);
            // console.log(result,'wynik po zaokrągleniu')
            if (inputs[param.NAME]) {
                inputs[param.NAME].value = formatNumberForDisplay(result);
                // console.log(inputs[param.NAME].value, 'ustawione')
            }
            values[param.NAME] = parseFloat(result?.toFixed(2)) ?? 0;
            buildValuesToDisplay(allOptionsByParameter, formatNumberForDisplay(result), param.NAME, displayValues, 'INPUT ');
        }

        if (inputs[param.NAME]) {
            validateFormInput(values, inputs[param.NAME]);
        }
    } catch (error) {
        console.error('Błąd podczas obliczania formuły:', error);
        showToast('error', `Parametr: ${param.VALUE}. ${error.message}`);
    }

    return paramName;
}



