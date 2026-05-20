
import { showToast } from "../components/toast.js";
import { loadScript } from './scriptLoader.js';
import { buildValuesToDisplay } from "./updateFieldsAndValues.js";
import { validateFormInput } from "./validateUtils.js";
import { getEnvVersion } from "../getEnv.js";

let _isTestEnv = false;
getEnvVersion().then(v => {
    _isTestEnv = (v === 'Testowa');
    console.log('Wersja środowiska:', v, '| _isTestEnv:', _isTestEnv);
});
function formatNumberForDisplay(value) {
    const num = parseFloat(value);

    if (num % 1 === 0) {
        return num.toString();
    }
    return num.toFixed(2);
}

/**
 * Format raw _S script expression into "computed_numbers, (CODES)" form.
 * Outer multiplier is applied to each number and never shown.
 * e.g. "(416(PG3))*1.1"  → "457.6, (PG3)"
 *      "(55(KUHGMBS150)+70(KUHGMBSG250)+49.28(PROWADNICAUS2))*1.1"
 *        → "(60.5 + 77 + 54.21), (KUHGMBS150 + KUHGMBSG250 + PROWADNICAUS2)"
 *      "0.6(VALUE)" → "0.6, (VALUE)"
 */
function formatSpecDisplay(raw) {
    let s = String(raw).trim();

    // Detect outer multiplier: ...)*number at the end
    let multiplier = 1;
    const multMatch = s.match(/\)\s*\*\s*(\d+\.?\d*)\s*$/);
    if (multMatch) {
        multiplier = parseFloat(multMatch[1]);
        // Strip outer (...)*multiplier wrapper
        s = s.replace(/\)\s*\*\s*\d+\.?\d*\s*$/, '').replace(/^\(/, '');
    }

    // Extract number(CODE) tokens with operators
    const tokens = [];
    const regex = /([+\-])?\s*(\d+\.?\d*)\(([A-Za-z0-9_]+)\)/g;
    let match;
    while ((match = regex.exec(s)) !== null) {
        tokens.push({ op: match[1] || '+', num: parseFloat(match[2]), code: match[3] });
    }

    if (tokens.length === 0) return s;

    const fmt = v => parseFloat(v.toFixed(2)).toString();

    // Numeric part: each number × multiplier
    const numStrs = tokens.map((t, i) => {
        const val = fmt(t.num * multiplier);
        return i === 0 ? val : (t.op === '-' ? ' - ' : ' + ') + val;
    });
    // Code part
    const codeStrs = tokens.map((t, i) => {
        return i === 0 ? t.code : (t.op === '-' ? ' - ' : ' + ') + t.code;
    });

    const numPart = tokens.length > 1 ? '(' + numStrs.join('') + ')' : numStrs.join('');
    const codePart = '(' + codeStrs.join('') + ')';
    return numPart + ', ' + codePart;
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
                
                if (scriptResult) {
                    for (const [scriptParamName, scriptValue] of Object.entries(scriptResult)) {
                        console.log('Ustawiamy wartość ze SCRIPT u:', scriptParamName, scriptValue);

                        // If param ends with _S and no input exists, create a hidden clone from the parent param
                        const isNewSuffix = _isTestEnv && !inputs[scriptParamName] && scriptParamName.endsWith('_S');
                        if (isNewSuffix) {
                            const parentName = scriptParamName.slice(0, -2);
                            const parentInput = inputs[parentName];
                            if (parentInput) {
                                const clone = parentInput.cloneNode(true);
                                clone.id = scriptParamName;
                                clone.name = scriptParamName;
                                clone.style.display = 'none';
                                parentInput.parentNode.appendChild(clone);
                                inputs[scriptParamName] = clone;
                            }
                        }

                        if (inputs && inputs[scriptParamName]) {
                            let strVal;
                            if (param.FORMAT == 'n%' && !isNewSuffix) {
                                const numericValue = parseFloat(scriptValue);
                                strVal = `${parseInt(numericValue * 100)}%`;
                                inputs[scriptParamName].value = numericValue;
                            } else if (isNewSuffix) {
                                strVal = formatSpecDisplay(scriptValue);
                                inputs[scriptParamName].value = scriptValue;
                            } else {
                                strVal = String(scriptValue);
                                inputs[scriptParamName].value = scriptValue;
                            }

                            values[scriptParamName] = scriptValue;
                            buildValuesToDisplay(allOptionsByParameter, strVal, scriptParamName, displayValues, 'INPUT', true);

                            // Mirror value to SUB___ variant if it exists (e.g. CENA → SUB___CENA)
                            const subVariantName = 'SUB___' + scriptParamName;
                            if (inputs[subVariantName] && !scriptParamName.startsWith('SUB___')) {
                                inputs[subVariantName].value = scriptValue;
                                values[subVariantName] = scriptValue;
                                buildValuesToDisplay(allOptionsByParameter, strVal, subVariantName, displayValues, 'INPUT', true);
                            }

                            // For auto-created _S params, set description from parent with -spec suffix
                            if (isNewSuffix) {
                                const parentName = scriptParamName.slice(0, -2);
                                const parentDisplay = displayValues.get(parentName);
                                const entry = displayValues.get(scriptParamName);
                                if (entry) {
                                    entry.param_description = (parentDisplay?.param_description || parentName) + '-spec';
                                    entry.row = '2';
                                    entry.locked = true;
                                    displayValues.set(scriptParamName, entry);
                                }
                                // Also register in global lockedParams so template recognizes it
                                if (window.lockedParams && !window.lockedParams.includes(scriptParamName)) {
                                    window.lockedParams = [...new Set([...window.lockedParams, scriptParamName])];
                                }
                            }

                            console.log('Ustawiamy display', displayValues);
                        }
                    }
                }

                
                if (onComplete && typeof onComplete === 'function') {
                    onComplete();
                }
            });
        } catch (error) {

            if (inputs[param.NAME]) {
                inputs[param.NAME].value = '0';
            }
            values[param.NAME] = 0;

            
            if (onComplete && typeof onComplete === 'function') {
                onComplete();
            }
        }
    } else {
        if (inputs[param.NAME]) {
            inputs[param.NAME].value = '0';
        }
        values[param.NAME] = 0;

        
        if (onComplete && typeof onComplete === 'function') {
            onComplete();

        }
    }
    return paramName;
}


export function calculateFromFormula(param, values, inputs, displayValues, groupNumber, allOptionsByParameter, key, paramName) {
    if (param.FORMULA.includes('RABAT')) {
    }
    try {
        let result = window.FormulaHandler.evaluateFormula(
            param.FORMULA,
            values,
            "formula");
        console.log('Wynik formuły:', result, 'dla parametru', param.NAME, 'z formułą', param.FORMULA);
        if (result === false || result === null || result < 0) {

            if (inputs[param.NAME]) {
                inputs[param.NAME].value = '0';
            }
            values[param.NAME] = 0;
        } else {
            
            result = parseFloat(result);
            
            if (inputs[param.NAME]) {
                inputs[param.NAME].value = formatNumberForDisplay(result);
                
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



