import { isEnabled } from '../components/htmlManipulator.js';
import { showToast } from '../components/toast.js';
import { logFunctionName, resetAllDOM } from './formTools.js';
import {
    buildValuesToDisplay,
    findParamFromValues,
    searchForParameter,
    resetSelectValues,
    setDescription,
    normalizeFilename,
    setWar
} from './formTools.js';


export function getProcedures(inputs, allOptionsByParameter, values, options, actualParameter, value, tagName, displayValues, params) {
    logFunctionName('getProceduresEEEEEEE');

    // Inicjalizacja głównego obiektu walidatorów
    if (!window.inputsValidators) {
        window.inputsValidators = {};
    }
    // PROBLEM JEST Z RESETOWANIEM DOM KILKA RAZY NIEPOTRZEBNIE

    if (tagName != "INPUT") {
        // Sprawdź czy actualParameter istnieje w allOptionsByParameter
        if (!allOptionsByParameter || !allOptionsByParameter[actualParameter]) {
            console.warn(`Parametr ${actualParameter} nie istnieje w allOptionsByParameter`);
            return;
        }

        // console.log(actualParameter, 'siema')
        let selectedValue = allOptionsByParameter[actualParameter].find(v => v.VALUE == value);

        // Sprawdź czy znaleziono selectedValue
        if (!selectedValue) {
            console.warn(`Nie znaleziono wartości ${value} dla parametru ${actualParameter}`);
            return;
        }

        window.actualParam = actualParameter;
        window.actualValue = value;

        // Inicjalizacja struktury dla aktualnego parametru
        if (!window.inputsValidators[window.actualParam]) {
            window.inputsValidators[window.actualParam] = {};
        }

        if (!window.inputsValidators[window.actualParam][window.actualValue]) {
            window.inputsValidators[window.actualParam][window.actualValue] = {};
        }


        try {
            //    console.log('essa', selectedValue.PROC, '2');
            const checkProcedure = window.FormulaHandler.evaluateFormula(
                selectedValue.PROC,
                values,
                "PROCEDURE"
            );

            values = setWar(values, params, inputs)

            const prodecuresResults = [window.inputsValidators,
            window.inputsDefaults]


        } catch (error) {
            console.error('Błąd ewaluacji procedury:', error);
        }

        setDefaultValues(inputs, values, allOptionsByParameter, displayValues);
    }

    if (window.checkedParams) {
        //    console.log('jestem w środku');

        Object.entries(window.checkedParams).forEach(([paramName, paramValue]) => {

            try {

                if (paramValue?.PROC) {

                    if (!window.inputsValidators[paramName]) {
                        window.inputsValidators[paramName] = {};
                    }

                    // 
                    if (paramValue.VALUE) {
                        if (!window.inputsValidators[paramName][paramValue.VALUE]) {
                            window.inputsValidators[paramName][paramValue.VALUE] = {};
                        }

                        //tu jest probem 
                        window.ignoreDom = true

                        // Zapisz obecne wartości
                        const prevParam = window.actualParam;
                        const prevValue = window.actualValue;

                        // Ustaw kontekst dla tego parametru
                        window.actualParam = paramName;
                        window.actualValue = paramValue.VALUE;

                        try {
                            //    console.log('essa', paramName, paramValue.PROC, '1');
                            const checkProcedure = window.FormulaHandler.evaluateFormula(
                                paramValue.PROC,
                                values,
                                "PROCEDURE",
                                true

                            );

                            resetAllDOM()
                        } catch (error) {
                            console.error(`Błąd procedury dla ${paramName}/${paramValue.VALUE}:`, error);
                        } finally {
                            // Przywróć poprzednie wartości
                            window.actualParam = prevParam;
                            window.actualValue = prevValue;
                            window.ignoreDom = false;
                        }
                    } else {
                        console.warn(`Brak wartości VALUE dla parametru: ${paramName}`);
                    }
                }
            } catch (error) {
                console.error('Krytyczny błąd przetwarzania:', error);
            }
        });
        setDefaultValues(inputs, values, allOptionsByParameter, displayValues, true);

    }
}


export function setDefaultValues(inputs, values, allOptionsByParameter, displayValues, fromChecked = false) {
    logFunctionName('setDefaultValues');
    let resetFlag = true;
    if (fromChecked) { return false }
    Object.entries(inputsDefaults).forEach(([firstParam, models]) => {
        Object.entries(models).forEach(([modelName, defaults]) => {
            Object.entries(defaults).forEach(([param, functions]) => {
                const input = inputs[param];
                let currentParam = searchForParameter(functions.DOM, allOptionsByParameter, param);
                if (!currentParam && input && input.tagName != "INPUT") {

                    if (typeof functions.DOM === 'string') {
                        functions.DOM = 'Puste pole'
                    }
                    return;
                }
                if ('DOM' in functions && functions.DOM) {
                    const domValue = functions.DOM;
                    values[param] = domValue;
                    setDescription(values, domValue, allOptionsByParameter, param)
                    // console.log(domValue, input?.id, 'domValue w setDefaultValues');
                    try {
                        const curPar = buildValuesToDisplay(allOptionsByParameter, domValue, input?.id, displayValues, input.tagName);
                        // console.log(curPar, 'domValue w setDefaultValues 1')
                        // Ustawianie wartości DOM w UI
                        if (input.tagName === 'INPUT') {
                            input.value = domValue;
                        }
                        else if (input.tagName === 'BUTTON') {
                            let buttonLabel;
                            let buttonVal;
                            if (currentParam?.ALIAS) {
                                buttonLabel = `${currentParam?.ALIAS ?? ''}-${currentParam?.ALIAS_DESCRIPTION ?? ''}`
                                buttonVal = currentParam?.ALIAS ?? '';
                            }
                            else {
                                if (domValue === '<NONE>') {
                                    // console.log(curPar, 'domValue w setDefaultValues 2')
                                    buttonLabel = currentParam?.DESCRIPTION ?? ""
                                }
                                else {
                                    buttonLabel = `${domValue} - ${currentParam?.DESCRIPTION ?? ""}`;
                                }
                                buttonVal = domValue;
                            }
                            input.textContent = buttonLabel;
                            input.value = buttonVal

                        }
                        else if (input.tagName === "SELECT") {
                            const options = input.options;
                            for (let i = 0; i < options.length; i++) {
                                if (options[i].value == domValue) {
                                    input.selectedIndex = i;
                                    options[i].selected = true;
                                    break;
                                }
                            }
                        }
                    }
                    catch (error) {

                    }
                }
            });
        });
    });
    if (resetFlag) {
        resetAllDOM()
    }

}


export function checkFlags() {
    const notTrue = Object.entries(inputFlags)

        .filter(([key, value]) => value !== true);

    if (notTrue.length === 0) {
        return true;
    } else {
        return notTrue.map(([key, value]) => ({ key, value }));
    }
}



export function validateFormInput(values, actualInput) {
    logFunctionName('validateFormInput');

    let flag;
    const validatorList = findAllValidatorsForInput(actualInput, values);

    if (validatorList.length === 0 && actualInput.value != '') {
        setInputValid(actualInput, true);
        return;
    }

    let min = 0;
    let max = Infinity;

    validatorList.forEach(validator => {
        const vMin = validator[actualInput.name]?.MIN;
        const vMax = validator[actualInput.name]?.MAX;

        if (vMin !== undefined) min = Math.max(min, vMin);
        if (vMax !== undefined) max = Math.min(max, vMax);
    });

    const value = parseFloat(actualInput.value);

    let result;
    if (value > max || value < min) {
        result = setInputValid(actualInput, false, min, max);
        return result
    } else {

        result = setInputValid(actualInput, true);
        return result
    }

}


export function findAllValidatorsForInput(actualInput, values) {
    logFunctionName('findAllValidatorsForInput');
    const result = [];

    for (const [param, models] of Object.entries(inputsValidators)) {
        for (const [model, validators] of Object.entries(models)) {
            if (Object.values(values).includes(model) && Object.keys(validators).length !== 0) {
                result.push(validators);
            }
        }
    }
    return result;
}

export function setInputValid(input, isValid, min, max) {
    let res = isValid;
    const labelId = `${input.id}-label`;
    const existingLabel = document.getElementById(labelId);
    if (existingLabel) existingLabel.remove();

    const parent = input.parentNode;

    // Dodaj klasę do rodzica, żeby ustawić pozycjonowanie
    if (!parent.classList.contains('input-with-icon')) {
        parent.classList.add('input-with-icon');
    }


    const existingIcon = parent.querySelector('.warning-icon');
    if (existingIcon) existingIcon.remove();

    inputFlags[input.name] = isValid;


    input.classList.remove("invalid-input", "warning-warranty-input");
    const label = document.createElement('label');

    if (!isValid) {
        //    console.log('ustawiam na invalid');
        label.id = labelId;
        label.setAttribute('for', input.id);
        res = false;
        if (input.type === "number" && min !== undefined && max !== undefined) {
            res = false;
            inputFlags[input.name] = false;
            input.classList.add("invalid-input");
            label.textContent = `min: ${min} - max: ${max}`;
            // 
            //             // input.classList.add("warning-warranty-input");
            // label.classList.remove("invalid-label");
            // label.classList.add("warning-warranty-label");
            // const icon = document.createElement('span');
            // icon.classList.add('warning-icon', 'has-tooltip');
            // 
            // icon.setAttribute('data-tooltip', t('form.warranty_info'));
            // icon.textContent = '⚠️';
            // parent.appendChild(icon);
            // res = true;
            // inputFlags[input.name] = true;


        } else {
            input.classList.add("invalid-input");
            label.classList.remove("warning-warranty-label");
            label.classList.add("invalid-label");
            label.textContent = t('form.obligo_field');
            res = false;
        }

        parent.appendChild(label);

    } else {

        parent.classList.remove('input-with-icon');
    }

    return res;
}

export function validateAllFieldsOnSubmit(inputs, values) {

    for (const key of Object.keys(inputFlags)) {

        if (!enabledParams.hasOwnProperty(key)) {
            delete inputFlags[key];

        }
    }



    for (const param of Object.keys(enabledParams)) {


        if (window.calculatedParams && window.calculatedParams.has(param)) {
            inputFlags[param] = true;
            continue;
        }

        let invalidLabel;

        const input = inputs[param];
        if (!input) continue;
        let isValid = true;

        if (input.tagName === 'BUTTON') {
            isValid = !!input.value && input.value.trim() !== '';

            if (!isValid) { invalidLabel = t('form.obligo_value'); }
        }
        else {

            isValid = !!input.value && input.value.trim() !== '';
            if (!isValid) { invalidLabel = t('form.obligo_field'); }
            if (input.type === "number") {
                invalidLabel = t('form.numeric_obligo_field');
                const numVal = Number(input.value);
                isValid = input.value !== "" && !isNaN(numVal);

            }
        }


        input.classList.toggle("invalid-input", !isValid);
        let fullParam = window.params.find(p => p.NAME === param);
        let isRequired = fullParam?.REQUIRED ?? true;
        if (!isRequired){
            isValid = true;
        }

        const labelId = `${input.id}-label`;
        const existingLabel = document.getElementById(labelId);
        if (existingLabel) existingLabel.remove();

        if (!isValid) {
            const label = document.createElement('label');
            label.id = labelId;
            label.classList.add('invalid-label');
            label.setAttribute('for', input.id);
            label.textContent = invalidLabel;
            input.parentNode.appendChild(label);
        }

        else if (isValid) {

            let extraValidation = findAllValidatorsForInput(inputs[param], values)
            const paramsToValidate = extraValidation[0]

            if (paramsToValidate?.[param]) {
                isValid = validateFormInput(values, inputs[param])


            }
        }
        // console.log(inputFlags, param, inputFlags[param], 'inputFlags[param] przed ustawieniem')
        inputFlags[param] = isValid;

    }



    afterSend = true;

}

// POPRCUJ TUTAJ
export function clearDisabledValues(values, displayValues) {
    const enabledParamsKeys = new Set(Object.keys(enabledParams));
    //    console.log('CLEAR DISABLED VALUES')
    for (const key of Object.keys(values)) {

        const baseParam = key.replace(/___DESCRIPTION$/, '');

        if (key.includes('___VISIBLE') || baseParam.includes('___TITLE') || baseParam.includes('___DICT')) {
            // console.log(key, 'baseParam w clearDisabledValues')
            continue;
        }

        if (!enabledParamsKeys.has(baseParam) && !baseParam.endsWith('_ALIAS')) {
            const desc = `${baseParam}___DESCRIPTION`;
            const visibleKey = `${baseParam}___VISIBLE`;
            const alias_desc = `${baseParam}_ALIAS___DESCRIPTION`;
            const alias_key = `${baseParam}_ALIAS`;
            values[visibleKey] = false;

            // Usuń lub ustaw na pusty string zarówno dla klucza jak i desc
            if (values[desc] !== undefined) {
                values[desc] = '';
            }
            if (values[key] !== undefined && key !== desc) {
                values[key] = '';
            }
            if (values[alias_desc] !== undefined) {
                values[alias_desc] = '';
            }
            if (values[alias_key] !== undefined) {
                values[alias_key] = '';
            }


            const isDescription = key.endsWith('___DESCRIPTION');
            const displayKey = isDescription ? baseParam : key;
            const displayParam = displayValues.get(displayKey);
            // console.log(displayKey, displayParam, 'displayParam przed oczyszczeniem', (displayParam && displayParam.locked !== true) );

            if (displayParam && displayParam.locked !== true) {
                isDescription || displayParam.option_value != 'undefined' || !displayParam.option_value
                    ? delete displayParam.option_description
                    : delete displayParam.option_value;
            }
            if (displayParam && displayParam.locked !== true && (displayParam.row == '1' || displayParam.row == '0')) {
                delete displayParam.option_description
                delete displayParam.option_value;
            }

            for (const skipParam of window.skipCountParams) {
                if (displayKey === skipParam) {
                    // Zamiast usuwać, ustaw row = '0' dla kalkulowanych parametrów
                    const displayParam = displayValues.get(displayKey);
                    if (displayParam) {
                        displayParam.row = '0';
                        displayValues.set(displayKey, displayParam);
                    }
                    // console.log(`Ustawiono row='0' dla ${displayKey}`);
                }
            }

        } else if (enabledParamsKeys.has(baseParam)) {
            // Ustawiamy ___VISIBLE na true dla enabled parametrów
            const visibleKey = `${baseParam}___VISIBLE`;
            values[visibleKey] = true;
        }
    }

    return { values, displayValues };

}
