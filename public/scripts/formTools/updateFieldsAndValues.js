import { findParamFromValues, logFunctionName } from './formTools.js';
import { getProcedures, searchForParameter } from './formTools.js';
import { createDialog } from './dialogUtils_copy.js';
import { isEnabled } from '../components/htmlManipulator.js';
import { validateFormInput, setInputValid } from './validateUtils.js';
import { showToast } from '../components/toast.js';
import { loadScript } from './scriptLoader.js';

export function resetDependences([params, display], name, inputs, values, allOptionsByParameter) {
    logFunctionName('resetDependences')

    let param = params.find((obj) => obj.NAME === name);
    if (param && param.DEPENDENCES && typeof param.DEPENDENCES === "string") {

        let paramsToReset = param.DEPENDENCES.split(",");
        for (let depParam of paramsToReset) {
            let valueToReset = values[depParam]

            let x = searchForParameter(valueToReset, allOptionsByParameter, depParam)
            if (x && isEnabled(x.ENABLE, values)) {
                paramsToReset = paramsToReset.filter(p => p !== depParam);
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

    currentValue['option_value'] = String(currentValue['option_value'])

    // 1. Obsługa wartości jako OBIEKTU (SourceWindow)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const valueParts = [];
        const descParts = [];

        for (let [fieldName, fieldVal] of Object.entries(value)) {
            if (!fieldVal || fieldVal === '<NONE>') continue;

            // zapisz surową wartość do valueParts
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
        return; // nic więcej nie robimy w tym przypadku
    }

    // 2. Obsługa dotychczasowej logiki — gdy value to string
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
        displayValues.set(paramName, currentValue);
    }
}


export async function updateFieldInputs(params, inputs, values, displayValues, allOptionsByParameter, options, actualParameter, value, tagName, filters) {

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
                    "paramdict"
                );

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
                createDialog(param, allowedParameters[paramName], tempGroupNumber, filters[paramName]);
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

export function updateLink() {

}

export function updateFieldStates(params, inputs, values, displayValues, groupNumber, allOptionsByParameter) {

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
                "param"
            );


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

        if (param.SOURCE != "<NULL>" && param.NAME != param.SOURCE) {
            try {
                loadScript(param.SOURCE, values, displayValues, groupNumber, function (scriptResult) {
                    if (scriptResult) {
                        for (const [paramName, value] of Object.entries(scriptResult)) {
                            if (inputs && inputs[paramName]) {
                                let key = Object.keys(scriptResult)[0]
                                let val = Object.values(scriptResult)[0]
                                console.log(key, 'RABAT SPRAWDZAM')
                                let strVal;
                                if (key.includes('_RABAT')) {
                                    strVal = `${parseInt(val * 100)}%`;
                                    inputs[paramName].value = `${parseInt(val * 100)}%`;
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
                inputs[paramName].value = 0
            }
        }

        if (param.FORMULA != "<NULL>") {
            setTimeout(() => {
                console.log(param.FORMULA, 'siema eniu')
                try {
                    const result = window.FormulaHandler.evaluateFormula(
                        param.FORMULA,
                        values,
                        "formula"
                    );
                    if (result === false || result === null) {
                        inputs[key].value = '0';
                    } else {
                        inputs[key].value = result.toFixed(2);
                        buildValuesToDisplay(allOptionsByParameter, result.toFixed(2), param.NAME, displayValues, 'INPUT ');
                    }
                    validateFormInput(values, inputs[key]);
                } catch (error) {
                    console.log('mamy error');
                    showToast('error', `Parametr: ${param.VALUE}.  ${error.message}`);
                }
            }, 300); // tutaj ustawiasz liczbę milisekund opóźnienia
        }



    }
}


export function setWar(values, params, inputs) {

    function setNestedValue(obj, path, value, param, inputs) {

        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {

            if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        if (param.NAME == param.SOURCE) {
            param.modal.TYP = value;

        }
        else if (param.TYPE == 'link') {
            inputs[param.NAME].value = `/photos/${window.tempGroupNumber}/${param.NAME}/${value}`
            inputs[param.NAME].target = "_blank";
            inputs[param.NAME].href = `/photos/${window.tempGroupNumber}/${param.NAME}/${value}`

        }
        current[keys[keys.length - 1]] = value;

    }

    for (const key in window.constValues) {
        const keys = key.split('.');
        let paramName = keys[0]
        const param = params.find(p => p.NAME == paramName);
        setNestedValue(values, key, window.constValues[key], param, inputs);
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
