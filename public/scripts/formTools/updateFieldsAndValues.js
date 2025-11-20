import { findParamFromValues, logFunctionName } from './formTools.js';
import { getProcedures, searchForParameter } from './formTools.js';
import { createDialog } from './dialogUtils_copy.js';
import { isEnabled } from '../components/htmlManipulator.js';
import { validateFormInput, setInputValid } from './validateUtils.js';
import { showToast } from '../components/toast.js';
import { loadScript } from './scriptLoader.js';
import { findAllValidatorsForInput } from './validateUtils.js'




export function resetDependences([params, display], name, inputs, values, allOptionsByParameter) {
    logFunctionName('resetDependences');

    let param = params.find((obj) => obj.NAME === name);
    if (param && param.DEPENDENCES && typeof param.DEPENDENCES === "string") {

        // Rozdzielenie stringa na kopię tablicy (na której nie iterujemy bezpośrednio w pętli)
        let paramsToCheck = param.DEPENDENCES.split(",");
        let paramsToReset = [...paramsToCheck]; // kopiujemy listę

        for (let depParam of paramsToCheck) {
            let valueToReset = values[depParam];

            let x = searchForParameter(valueToReset, allOptionsByParameter, depParam);

            // Usuwanie, jeśli warunki spełnione
            if (x && isEnabled(x.ENABLE, values)) {
                paramsToReset = paramsToReset.filter(p => p !== depParam);
            }

            if (inputs[depParam]?.tagName == 'INPUT' && typeof valueToReset == 'number') {
                let allValidators = (findAllValidatorsForInput(depParam, values))[0];
                let validators = allValidators && allValidators[depParam];
                if (
                    validators &&
                    parseInt(validators.MIN) < values[depParam] &&
                    values[depParam] < parseInt(validators.MAX)
                ) {
                    paramsToReset = paramsToReset.filter(param => param !== depParam);
                }

            }
        }

        resetSelectValues([paramsToReset, display], inputs, values);
    }
}



//tu zajrzyj 
export function resetSelectValues([parameters, display], inputs, values) {
    logFunctionName('resetSelectValues')

    window.checkedParams = {}
    for (let idx = 0; idx < parameters.length; idx++) {
        let paramName = parameters[idx];
        const param = params.find(obj => obj.NAME === paramName);
        // console.log('reset input', paramName)
        if (inputs[paramName]) {
            inputs[paramName].selectedIndex = 0;
            values[paramName] = "";


            if (inputs[paramName].tagName == 'BUTTON') {

                inputs[paramName].innerHTML = `${t('form.check_word')}`;
                inputs[paramName].value = '';
            }
            if (inputs[paramName].tagName == 'INPUT') {
                inputs[paramName].value = '';

            }
        } else {
            console.warn(`Pole ${paramName} nie istnieje w inputs`);
        }
    }
    for (let idx = 0; idx < parameters.length; idx++) {
        let param = parameters[idx];
        resetDisplayEntry(param, display);
    }
}

export function resetDisplayEntry(param, display) {
    logFunctionName('resetDisplayEntry')

    if (display.has(param)) {
        const existing = display.get(param);
        display.set(param, { param_description: existing.param_description });
    }
}

export function buildValuesToDisplay(dictValues, value, paramName, displayValues, tagName) {


    logFunctionName('buildValuesToDisplay');


    // Pobieramy aktualny obiekt z displayValues lub tworzymy pusty
    let currentValue = displayValues.get(paramName) || {};
    console.log('currentValue before:', currentValue);
    if (currentValue['option_value'] || currentValue['option_value'] != undefined
    ) {

        currentValue['option_value'] = String(currentValue['option_value'])
    }

    if (value === '<NONE>') {

        let currentValue = displayValues.get(paramName) || {};
        // Wyczyść wszystkie właściwości obiektu
        for (let key in currentValue) {
            currentValue['locked'] = false;
            currentValue['option_value'] = '';
            currentValue['option_description'] = '';
            currentValue['row'] = '';
        }
        // Upewnij się, że podstawowe właściwości istnieją jako puste
        currentValue['option_value'] = '';
        currentValue['option_description'] = '';
        displayValues.set(paramName, currentValue);
        // console.log('NONE - cleared values for:', paramName, currentValue);
        return;
    }

    // 1. Obsługa wartości jako OBIEKTU (SourceWindow)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const valueParts = [];
        const descParts = [];

        for (let [fieldName, fieldVal] of Object.entries(value)) {
            if (!fieldVal || value === '<NONE>') {

                // Zamiast usuwać klucz, wyczyść wszystkie wartości w obiekcie
                let currentValue = displayValues.get(paramName) || {};
                // Wyczyść wszystkie właściwości obiektu
                for (let key in currentValue) {
                    currentValue[key] = '';
                }
                // Upewnij się, że podstawowe właściwości istnieją jako puste
                currentValue['option_value'] = '';
                currentValue['option_description'] = '';
                displayValues.set(paramName, currentValue);
                continue;
            }            // zapisz surową wartość do valueParts
            valueParts.push(fieldVal);

            // spróbuj znaleźć opis
            if (dictValues[fieldName]) {
                const match = dictValues[fieldName].find(v => v.VALUE === fieldVal);
                if (match) {

                    if (match.ALIAS) {
                        descParts.push(match.ALIAS_DESCRIPTION ?? '');
                    } else {
                        descParts.push(match.DESCRIPTION ?? '');
                    }
                } else {
                    descParts.push(fieldVal); // brak w słowniku → surowa wartość
                }
            } else {
                descParts.push(fieldVal);
            }
        }

        currentValue['option_value'] = valueParts.join(', ');
        currentValue['option_description'] = descParts.join(' / ');

        displayValues.set(paramName, currentValue);

        return;
    }


    if (value != '<NONE>') {
        const valOBj = searchForParameter(value, dictValues, paramName);
        currentValue['option_value'] = value;

        if (tagName != "INPUT") {
            const currentParam = dictValues[paramName]?.find(v => v.VALUE === value);
            if (currentParam?.ALIAS) {
                currentValue['option_description'] = currentParam?.ALIAS_DESCRIPTION ?? "";
                currentValue['option_value'] = currentParam.ALIAS;
            } else {
                currentValue['option_description'] = currentParam?.DESCRIPTION ?? "";
            }
        }

    }
}


export async function updateFieldInputs(params, inputs, values, displayValues, allOptionsByParameter, options, actualParameter, value, tagName, filters, attrVals) {

    enabledParams = {}
    logFunctionName('updateFieldInputs')

    getProcedures(inputs, allOptionsByParameter, values, options, actualParameter, value, tagName, displayValues, params)
    let btns = [];
    const allowedOptions = {};
    const allowedParameters = {};
    for (const paramName in inputs) {
        // BUTTON
        if (inputs[paramName].tagName == 'BUTTON') {
            btns.push(inputs[paramName])
        }

        allowedOptions[paramName] = new Set();
        allowedParameters[paramName] = [];
    }
    // sprawdzenie enable za pomoca formuly
    for (const paramName in allOptionsByParameter) {

        const paramArray = allOptionsByParameter[paramName];
        if (!inputs[paramName]) continue;


        for (const param of paramArray) {
            let isEnabled = false;
            try {
                isEnabled = await window.FormulaHandler.evaluateFormula(
                    param.ENABLE,
                    values,
                    "paramdict",
                    param,
                    paramName
                );
                let expression = param
                // console.log(param, 'param enable', isEnabled, values, param.ENABLE)
            }

            catch (error) {
                console.log('mamy error')

                showToast('error', `Parametr: ${param.VALUE}.  ${error.message}`)
            }
            // TUTAJ PRZYCISKI DALEJ SIĘ WYŚWIETLAJ
            if (isEnabled && param.VALUE != '-') {
                if (param.ROW_NUM) {
                    const idAndValue = `${param.ROW_NUM}-${paramName}`;
                    allowedOptions[paramName].add(idAndValue);
                    allowedParameters[paramName].push(param);
                }

            }
        }

    }

    for (const paramName in inputs) {

        let param = params.find((param) => param.NAME === paramName);
        const currentSelect = inputs[paramName];

        if (currentSelect.tagName === "INPUT") {
        }

        const allowed = allowedOptions[paramName];

        if (currentSelect.tagName === 'BUTTON' & !(param.SOURCE == param.NAME)) {

            currentSelect.onclick = function () {
                createDialog(param, allowedParameters[paramName], tempGroupNumber, filters[paramName], attrVals);
            };
        }

        for (const child of currentSelect.children) {

            const optionValue = child.id.replace(/\s+/g, " ").trim();

            if (!allowed.has(optionValue)) {
                child.style.display = "none";
                child.disabled = true;
            } else {
                child.style.display = "grid";
                child.disabled = false;
            }
        }
    }
}


export function updateFieldStates(params, inputs, values, displayValues, groupNumber, allOptionsByParameter, name, value) {

    logFunctionName('updateFieldStates')
    for (let key in inputs) {
        let param;
        for (let i = 0; i < params.length; i++) {
            if (params[i].NAME === key) {
                param = params[i];
                break;
            }
        }

        if (!param) continue;
        let shouldEnable = false;
        try {
            shouldEnable = window.FormulaHandler.evaluateFormula(
                param.ENABLE,
                values,
                "param",
                param.NAME
            );

            if (param.SOURCE != "<NULL>" && param.NAME != param.SOURCE && !shouldEnable) {
                window.skipCountParams.push(param.NAME)
            }

            if (shouldEnable == 'password') { shouldEnable = false }

        }
        catch (error) {
            console.log('mamy error')
            showToast('error', `Parametr: ${param.VALUE}.  ${error.message}`)
        }
        let paramDiv = inputs[key].parentNode;

        if (shouldEnable) {
            paramDiv.style.display = 'grid';
            window.enabledParams[param.NAME] = true;
        }
        else {
            paramDiv.style.display = 'none';
            delete window.enabledParams[param.NAME]
        }

        paramDiv.children[0].innerHTML;
        if (inputs[key].tagName == 'INPUT') {
            validateFormInput(values, inputs[key]);
        }
        let paramName;

        if (param.SOURCE != "<NULL>" && param.NAME != param.SOURCE) {

            const wrongValues = ['', 0, null, undefined, NaN]
            const checkParams = ['SZEROKOSC', 'WYSOKOSC'].filter(p => {
                let input = inputs[p];
                if (input !== undefined) {

                    let parentDiv = input.parentNode;
                    return parentDiv && parentDiv.style.display !== 'none';
                }
                return false;
            });
            const hasValidValues = checkParams.length === 0 || checkParams.every(p => !wrongValues.includes(values[p]));

            if (hasValidValues &&
                !(window.skipCountParams.includes(param.NAME))) {

                try {
                    // console.log(param.NAME, "SKRyPTy2")
                    loadScript(param.SOURCE, values, displayValues, groupNumber, allOptionsByParameter, param, function (scriptResult) {

                        if (scriptResult) {

                            for ([paramName, value] of Object.entries(scriptResult)) {
                                if (inputs && inputs[paramName]) {
                                    let key = Object.keys(scriptResult)[0]
                                    let val = Object.values(scriptResult)[0]

                                    let strVal;
                                    if (param.FORMAT == 'n%') {
                                        strVal = `${parseInt(val * 100)}%`;
                                        inputs[paramName].value = val;
                                    }
                                    else {
                                        strVal = String(value)
                                        inputs[paramName].value = value;
                                    }

                                    values[paramName] = value;
                                    buildValuesToDisplay(allOptionsByParameter, strVal, param.NAME, displayValues, 'INPUT ');

                                }
                            }
                        }
                    });
                }
                catch (error) {
                    console.log('mamy error')
                    inputs[paramName].value = '0'
                    values[param.NAME] = 0
                    // console.log('PARAM NAME:', param.NAME);
                }
            }
            else {
                inputs[param.NAME].value = '0'
                values[param.NAME] = 0
                // setTimeout(() => {
                // console.log('PARAM NAME:', param.NAME, values);
                // }, 1000);
            }
        }

        if (param.FORMULA != "<NULL>" &&
            !(window.skipCountParams.includes(param.NAME))

        ) {
            setTimeout(() => {
                if (param.FORMULA.includes('RABAT')) {
                }
                try {
                    let result = window.FormulaHandler.evaluateFormula(
                        param.FORMULA,
                        values,
                        "formula"

                    );
                    // console.log(values['CENA'], values['DOPLATA'], values['CENA_RABAT'],values['DOPLATA_EL'],values['DOPLATA_EL_RABAT'], values, '=>', param.FORMULA)
                    console.log(`${param.NAME} ==== `, param.FORMULA, '=>', result)
                    if (result === false || result === null || result < 0) {
                        inputs[key].value = '0';
                        values[key] = 0;
                    } else {
                        result = parseFloat(result);
                        inputs[key].value = result?.toFixed(2) ?? '0';
                        values[key] = parseFloat(result?.toFixed(2)) ?? 0;
                        buildValuesToDisplay(allOptionsByParameter, result.toFixed(2), param.NAME, displayValues, 'INPUT ');
                    }
                    validateFormInput(values, inputs[key]);
                } catch (error) {
                    const result = window.FormulaHandler.evaluateFormula(
                        param.FORMULA,
                        values,
                        "formula"

                    );
                    console.log('mamy error', error, param.FORMULA, param.NAME, result, typeof result);
                    showToast('error', `Parametr: ${param.VALUE}.  ${error.message}`);
                }
            }, 300); // tutaj ustawiasz liczbę milisekund opóźnienia
        }



    }
}

export function setListRow(params, displayValues) {
    for (let param of params) {
        let displayParam = displayValues.get(param.NAME)
        let listRow = param?.LISTROW ?? '1'
        if (displayParam) {
            displayParam['row'] = listRow
            if (param.LISTSUM == 'true') {
                displayParam['listsum'] = true
            }
        }
    }

    return displayValues;
}

export function setWar(values, params, inputs) {

    function setNestedValue(obj, path, value, param, inputs) {

        const keys = path.split('.');
        let current = obj;
        let currentInput = inputs[param.NAME];
        for (let i = 0; i < keys.length - 1; i++) {

            if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        if (param.NAME == param.SOURCE) {

            param.modal.setTyp(value);


        }
        else if (param.TYPE == 'link') {
            currentInput.value = `/photos/${window.tempGroupNumber}/${param.NAME}/${value}`
            currentInput.target = "_blank";
            currentInput.href = `/photos/${window.tempGroupNumber}/${param.NAME}/${value}`

        }
        else {

            if (currentInput) {
                // Sprawdź typ elementu i ustaw odpowiednią właściwość
                if (currentInput.tagName === 'INPUT' || currentInput.tagName === 'TEXTAREA' || currentInput.tagName === 'SELECT') {
                    currentInput.value = value;
                } else {
                    currentInput.innerHTML = value;
                }
            } else {
                console.warn(`Input element for ${param.NAME} not found`);
            }
        }

        current[keys[keys.length - 1]] = value;

    }

    for (const key in window.constValues) {
        const keys = key.split('.');
        let paramName = keys[0]
        const param = params.find(p => p.NAME == paramName);

        if (param) {
            setNestedValue(values, key, window.constValues[key], param, inputs);
        } else {
            console.warn(`Parameter ${paramName} not found in params`);
        }
    }


    return values;
}

export function checkRelated(params, values) {
    logFunctionName('checkRelated')

    let parameters = Object.values(params);

    console.log("checkRelated");
    for (let idx = 0; idx < parameters.length; idx++) {
        let param = parameters[idx];
        let relatedValue = param.RELATED;

        if (relatedValue) {
            if (relatedValue.trim() === "" || relatedValue == null) {
                param.RELATED = false;
            } else {
                param.RELATED = relatedValue;
            }
        } else {
            param.RELATED = false;
        }

        if (param.RELATED) {
            values[param.RELATED] = values[param.NAME];
        }
    }
}

export function resetAllDOM() {
    console.log('resetAllDOM')
    for (const [category, models] of Object.entries(window.inputsDefaults)) {

        for (const [modelName, modelConfig] of Object.entries(models)) {
            for (const [param, paramConfig] of Object.entries(modelConfig)) {
                if (paramConfig.hasOwnProperty('DOM')) {
                    delete paramConfig.DOM;
                }
                if (Object.keys(paramConfig).length == 0) {
                    delete modelConfig[param]
                }
            }
            if (Object.keys(modelConfig).length == 0) {
                delete models[modelName];
                continue;
            }
        }
        if (Object.keys(models).length == 0) {
            delete window.inputsDefaults[category];
        }
    }
}
export function convertIntoPercent(values, name, value, inputs, params) {
    logFunctionName('convertIntoPercent')
    const param = params.find((obj) => obj.NAME === name);

    if (param.FORMAT == 'n%') {
        if (typeof value === 'string') {
            value = value.replace(',', '.');
        }
        if (!isNaN(value)) {
            value = parseFloat(value)
        }
        if (typeof value === 'string' && value.endsWith('%')) {
            let numericPart = parseFloat(value.slice(0, -1));
            if (!isNaN(numericPart) && numericPart <= 100) {
                values[name] = numericPart / 100;
                inputs[name].value = `${numericPart}%`;
            } else {
                values[name] = 0;
                inputs[name].value = '0%';
            }
        } else if (typeof value === 'number' && value >= 1 && value <= 100) {
            values[name] = value / 100;
            inputs[name].value = `${value}%`;
        } else if (typeof value === 'number' && value < 1 && value >= 0) {
            values[name] = value;
            inputs[name].value = `${value * 100}%`;
        }
        else {
            values[name] = 0;
            inputs[name].value = '0%';
        }
    }
    return values;

}